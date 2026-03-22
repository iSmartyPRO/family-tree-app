'use strict';

const mongoose = require('mongoose');

const smtpSchema = new mongoose.Schema(
  {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    user: { type: String, default: '' },
    password: { type: String, default: '' },
    from: { type: String, default: '' },
  },
  { _id: false }
);

const systemConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  appName: { type: String, default: 'Rodolog' },
  logoUrl: { type: String, default: '' },
  baseUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#4f6ef7' },
  customCss: { type: String, default: '' },
  smtp: { type: smtpSchema, default: () => ({}) },
  telegramBotToken: { type: String, default: '' },
  telegramBotName: { type: String, default: '' },
  whatsappEnabled: { type: Boolean, default: false },
});

// Static: get the singleton config (create with defaults if missing)
systemConfigSchema.statics.get = async function () {
  let cfg = await this.findById('global');
  if (!cfg) {
    cfg = await this.create({ _id: 'global' });
  }
  return cfg;
};

// Static: update the singleton config (upsert)
systemConfigSchema.statics.set = async function (data) {
  const updated = await this.findByIdAndUpdate(
    'global',
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
  return updated;
};

systemConfigSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    // Don't expose SMTP password in API responses
    if (ret.smtp) {
      ret.smtp = { ...ret.smtp, password: ret.smtp.password ? '***' : '' };
    }
    return ret;
  },
});

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

module.exports = SystemConfig;
