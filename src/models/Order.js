'use strict';
const { Schema, model, models } = require('mongoose');

const ItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    nome: { type: String, required: true },
    modelo: { type: String, default: '' },
    cor: { type: String, default: '' },
    armazenamento: { type: String, default: '' },
    sku: { type: String, default: '' },
    quantidade: { type: Number, required: true, min: 1 },
    precoUnitario: { type: Number, required: true }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    numero: { type: String, required: true, unique: true },
    cliente: {
      nome: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      telefone: { type: String, required: true },
      documento: { type: String, default: '' }
    },
    itens: { type: [ItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    frete: { type: Number, default: 0 },
    total: { type: Number, required: true },
    entrega: {
      tipo: { type: String, enum: ['retirada', 'entrega'], default: 'retirada' },
      cep: { type: String, default: '' },
      endereco: { type: String, default: '' },
      numero: { type: String, default: '' },
      complemento: { type: String, default: '' },
      bairro: { type: String, default: '' },
      cidade: { type: String, default: '' },
      uf: { type: String, default: '' }
    },
    pagamento: {
      metodo: { type: String, enum: ['pix', 'cartao', 'boleto'], default: 'pix' },
      gateway: { type: String, default: 'placeholder' },
      status: { type: String, enum: ['pendente', 'aprovado', 'recusado', 'estornado'], default: 'pendente' },
      transacaoId: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['aguardando_pagamento', 'pago', 'separacao', 'pronto_retirada', 'em_transito', 'concluido', 'cancelado'],
      default: 'aguardando_pagamento'
    },
    appointmentId: { type: String, default: null },
    observacoes: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

module.exports = models.Order || model('Order', OrderSchema);
