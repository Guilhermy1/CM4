'use strict';
const { Schema, model, models } = require('mongoose');

const UserSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, required: true, select: false },
    telefone: { type: String, default: '' },
    role: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
    ativo: { type: Boolean, default: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = models.User || model('User', UserSchema);
