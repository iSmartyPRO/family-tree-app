'use strict';

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const publicLinkSchema = new mongoose.Schema(
  {
    token: { type: String },
    passwordHash: { type: String },
    expiresAt: { type: Date },
    active: { type: Boolean, default: false },
  },
  { _id: false }
);

const treeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    nodes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    relations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    publicLink: { type: publicLinkSchema, default: null },
  },
  {
    timestamps: true,
  }
);

treeSchema.index({ owner: 1 });

// Transform _id to id, strip __v and publicLink.passwordHash (replace with hasPassword bool)
treeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;

    if (ret.publicLink) {
      const hasPassword = Boolean(ret.publicLink.passwordHash);
      delete ret.publicLink.passwordHash;
      ret.publicLink.hasPassword = hasPassword;
    }

    // Populate owner to plain object if it's a document
    if (ret.owner && typeof ret.owner === 'object' && ret.owner._id) {
      ret.owner = {
        id: ret.owner._id.toString(),
        name: ret.owner.name,
        email: ret.owner.email,
      };
    }

    return ret;
  },
});

const Tree = mongoose.model('Tree', treeSchema);

module.exports = Tree;
