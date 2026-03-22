#!/usr/bin/env node
'use strict';

/**
 * Create an admin user.
 * Usage:
 *   node scripts/createAdmin.js <email> <password> <name>
 *   node scripts/createAdmin.js  (interactive mode via readline)
 */

const path = require('path');
// Resolve config relative to the script location
process.chdir(path.resolve(__dirname, '..'));

const readline = require('readline');
const { connect } = require('../db');
const User = require('../models/User');

async function prompt(question, rl) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  let email = process.argv[2];
  let password = process.argv[3];
  let name = process.argv[4];

  if (!email || !password || !name) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('Create Admin User (interactive mode)');
    email = email || (await prompt('Email: ', rl));
    password = password || (await prompt('Password: ', rl));
    name = name || (await prompt('Name: ', rl));
    rl.close();
  }

  email = email.trim().toLowerCase();
  name = name.trim();

  if (!email || !password || !name) {
    console.error('Error: email, password, and name are all required.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Error: password must be at least 6 characters.');
    process.exit(1);
  }

  await connect();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User ${email} already exists. Updating to admin...`);
    existing.isAdmin = true;
    existing.emailVerified = true;
    if (name) existing.name = name;
    await existing.save();
    console.log(`User ${email} is now an admin.`);
    process.exit(0);
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    email,
    passwordHash,
    name,
    isAdmin: true,
    emailVerified: true,
  });

  console.log(`Admin user created successfully:`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name:  ${user.name}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error creating admin:', err.message);
  process.exit(1);
});
