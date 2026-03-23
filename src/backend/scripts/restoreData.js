#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { EJSON } = require('bson');
const { execSync } = require('child_process');

const { connect, mongoose } = require('../db');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const BACKUP_DIR = path.resolve(ROOT_DIR, 'backups');
const FILE_PATH = process.argv[2] ? path.resolve(ROOT_DIR, process.argv[2]) : null;
const USER_FILES_DIRS = (process.env.USER_FILES_DIRS || 'uploads src/backend/uploads src/frontend/public/uploads')
  .split(' ')
  .map((part) => part.trim())
  .filter(Boolean);

function listBackupArchives() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => /^ftree_\d{8}_\d{6}\.tar\.gz$/.test(name))
    .sort()
    .map((name) => path.resolve(BACKUP_DIR, name));
}

function runOrFail(command) {
  execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

function clearDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }
  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.resolve(dirPath, entry), { recursive: true, force: true });
  }
}

function parseJsonl(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) return [];
  const text = fs.readFileSync(jsonlPath, 'utf8').trim();
  if (!text) return [];
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => EJSON.parse(line, { relaxed: false }));
}

async function main() {
  process.chdir(path.resolve(__dirname, '..'));

  const chosenArchive = FILE_PATH || listBackupArchives().slice(-1)[0];
  if (!chosenArchive) {
    throw new Error('No backup files found in ./backups');
  }
  if (!fs.existsSync(chosenArchive)) {
    throw new Error(`Backup file not found: ${chosenArchive}`);
  }

  const stamp = Date.now();
  const tmpDir = path.resolve(ROOT_DIR, `.restore_tmp_${stamp}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    runOrFail(`tar -xzf "${chosenArchive}" -C "${tmpDir}"`);

    const manifestPath = path.resolve(tmpDir, 'manifest.json');
    const dbDir = path.resolve(tmpDir, 'db');
    const filesDir = path.resolve(tmpDir, 'files');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(dbDir)) {
      throw new Error('Invalid backup archive: expected manifest.json and db/ directory');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.format !== 'ftree-backup-v1') {
      throw new Error(`Unsupported backup format: ${manifest.format || 'unknown'}`);
    }

    await connect();
    const db = mongoose.connection.db;
    const jsonlFiles = fs.readdirSync(dbDir).filter((name) => name.endsWith('.jsonl')).sort();

    for (const fileName of jsonlFiles) {
      const collectionName = fileName.replace(/\.jsonl$/, '');
      const docs = parseJsonl(path.resolve(dbDir, fileName));
      const collection = db.collection(collectionName);
      await collection.deleteMany({});
      if (docs.length) {
        await collection.insertMany(docs, { ordered: false });
      }
      console.log(`[restore] restored ${collectionName}: ${docs.length} docs`);
    }

    if (fs.existsSync(filesDir)) {
      for (const relDir of USER_FILES_DIRS) {
        const srcDir = path.resolve(filesDir, relDir);
        if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
          continue;
        }
        const dstDir = path.resolve(ROOT_DIR, relDir);
        clearDir(dstDir);
        fs.mkdirSync(dstDir, { recursive: true });
        runOrFail(`cp -a "${srcDir}/." "${dstDir}/"`);
        console.log(`[restore] restored files into ${relDir}`);
      }
    }

    console.log(`[restore] completed from ${chosenArchive}`);
  } finally {
    runOrFail(`rm -rf "${tmpDir}"`);
  }
}

main()
  .catch((err) => {
    console.error('[restore] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (err) {
      // no-op
    }
  });
