'use strict';
const { Schema, model, models } = require('mongoose');

const AppointmentSchema = new Schema(
  {
    orderId: { type: String, default: null },
    orderNumero: { type: String, default: '' },
    cliente: {
      nome: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      telefone: { type: String, default: '' }
    },
    tipo: { type: String, enum: ['retirada', 'entrega'], default: 'retirada' },
    data: { type: String, required: true },   // YYYY-MM-DD
    hora: { type: String, required: true },   // HH:mm
    unidade: { type: String, default: 'CM4STORE - Loja Central' },
    status: { type: String, enum: ['agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu'], default: 'agendado' },
    observacoes: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

AppointmentSchema.index({ data: 1, hora: 1 });

module.exports = models.Appointment || model('Appointment', AppointmentSchema);
