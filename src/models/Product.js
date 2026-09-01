'use strict';
const { Schema, model, models } = require('mongoose');

const VariantSchema = new Schema(
  {
    cor: { type: String, required: true },
    hex: { type: String, default: '#1c1c1e' },
    armazenamento: { type: String, required: true, enum: ['128GB', '256GB', '512GB', '1TB', '2TB'] },
    preco: { type: Number, required: true },
    estoque: { type: Number, default: 0, min: 0 },
    sku: { type: String, required: true }
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    modelo: { type: String, required: true, enum: ['18', '18 Pro', '18 Pro Max'] },
    descricao: { type: String, default: '' },
    destaques: { type: [String], default: [] },
    precoBase: { type: Number, required: true },
    imagem: { type: String, default: '' },
    ativo: { type: Boolean, default: true },
    variantes: { type: [VariantSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

ProductSchema.virtual('estoqueTotal').get(function () {
  return (this.variantes || []).reduce((acc, v) => acc + (v.estoque || 0), 0);
});
ProductSchema.set('toJSON', { virtuals: true });

module.exports = models.Product || model('Product', ProductSchema);
