#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { EJSON } = require('bson');

const { connect, mongoose } = require('../db');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const BACKUP_DIR = path.resolve(ROOT_DIR, 'backups');
const USER_FILES_DIRS = (process.env.USER_FILES_DIRS || 'uploads src/backend/uploads src/frontend/public/uploads')
  .split(' ')
  .map((part) => part.trim())
  .filter(Boolean);
const DB_COLLECTIONS = (process.env.BACKUP_COLLECTIONS || '')
  .split(' ')
  .map((part) => part.trim())
  .filter(Boolean);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function timestamp() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(
    d.getMinutes()
  )}${p2(d.getSeconds())}`;
}

function runOrFail(command) {
  const { execSync } = require('child_process');
  execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

async function exportCollectionToJsonl(collection, outPath) {
  const docs = await collection.find({}).toArray();
  const lines = docs.map((doc) => EJSON.stringify(doc, { relaxed: false }));
  fs.writeFileSync(outPath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  return docs.length;
}

async function main() {
  process.chdir(path.resolve(__dirname, '..'));
  await connect();

  ensureDir(BACKUP_DIR);
  const ts = timestamp();
  const tmpDir = path.resolve(ROOT_DIR, `.backup_tmp_${ts}`);
  const tmpDbDir = path.resolve(tmpDir, 'db');
  const tmpFilesDir = path.resolve(tmpDir, 'files');
  const archivePath = path.resolve(BACKUP_DIR, `ftree_${ts}.tar.gz`);

  ensureDir(tmpDbDir);
  ensureDir(tmpFilesDir);

  const db = mongoose.connection.db;
  const availableCollections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((it) => it.name)
    .sort();
  const selectedCollections = DB_COLLECTIONS.length
    ? availableCollections.filter((name) => DB_COLLECTIONS.includes(name))
    : availableCollections;

  const exported = [];
  for (const collectionName of selectedCollections) {
    const collection = db.collection(collectionName);
    const outPath = path.resolve(tmpDbDir, `${collectionName}.jsonl`);
    const count = await exportCollectionToJsonl(collection, outPath);
    exported.push({ collection: collectionName, documents: count });
    console.log(`[backup] exported ${collectionName}: ${count} docs`);
  }

  const copiedDirs = [];
  for (const relDir of USER_FILES_DIRS) {
    const absDir = path.resolve(ROOT_DIR, relDir);
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
      continue;
    }

    const target = path.resolve(tmpFilesDir, relDir);
    ensureDir(target);
    runOrFail(`cp -a "${absDir}/." "${target}/"`);
    copiedDirs.push(relDir);
    console.log(`[backup] copied files from ${relDir}`);
  }

  const manifest = {
    format: 'ftree-backup-v1',
    createdAt: new Date().toISOString(),
    mongoUrl: mongoose.connection.host,
    collections: exported,
    files: copiedDirs,
  };
  fs.writeFileSync(path.resolve(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  runOrFail(`tar -czf "${archivePath}" -C "${tmpDir}" .`);
  runOrFail(`rm -rf "${tmpDir}"`);

  console.log(`[backup] archive created: ${archivePath}`);
}

main()
  .catch((err) => {
    console.error('[backup] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (err) {
      // no-op
    }
  });
