'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
  },
  name: {
    type: String,
    trim: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  telegramId: {
    type: String,
    sparse: true,
    unique: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifyToken: {
    type: String,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual id field
userSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Strip sensitive fields from JSON output
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.emailVerifyToken;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  },
});

// Instance method: compare a plain-text password against stored hash
userSchema.methods.comparePassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

// Static method: hash a plain-text password
userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
