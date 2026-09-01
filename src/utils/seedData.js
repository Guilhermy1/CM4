'use strict';
const config = require('../config');

const PRECO = config.brand.precoPadrao; // 14999.97 (valor fixo da pre-venda)

// Paleta oficial do lancamento do iPhone 18 Pro / Pro Max
const CORES_BASE = [
  { cor: 'Purple', hex: '#7C6BA8' },
  { cor: 'Coffee', hex: '#6E4E3A' },
  { cor: 'Burgundy', hex: '#6B1F2E' },
  { cor: 'Black', hex: '#1C1C1E' }
];

const CORES = {
  '18 Pro': CORES_BASE,
  '18 Pro Max': CORES_BASE
};

const ARMAZENAMENTOS = {
  '18 Pro': ['256GB', '512GB', '1TB'],
  '18 Pro Max': ['256GB', '512GB', '1TB', '2TB']
};

// Pre-venda com VALOR FIXO (R$ 14.999,97) para todos os modelos/variantes.
// Quando a Apple divulgar a tabela oficial, basta preencher os acrescimos abaixo.
const ADICIONAL = { '256GB': 0, '512GB': 0, '1TB': 0, '2TB': 0 };
const ADICIONAL_MODELO = { '18 Pro': 0, '18 Pro Max': 0 };

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function buildVariantes(modelo) {
  const out = [];
  for (const c of CORES[modelo]) {
    for (const arm of ARMAZENAMENTOS[modelo]) {
      out.push({
        cor: c.cor,
        hex: c.hex,
        armazenamento: arm,
        preco: Number((PRECO + ADICIONAL_MODELO[modelo] + ADICIONAL[arm]).toFixed(2)),
        estoque: 25,
        sku: `CM4-IP18-${slugify(modelo).toUpperCase()}-${slugify(c.cor).toUpperCase()}-${arm}`
      });
    }
  }
  return out;
}

const DESCRICOES = {
  '18 Pro': 'iPhone 18 Pro em titanio, chip A20 Pro, sistema de tres cameras de 48MP e tela ProMotion 120Hz de 6,3".',
  '18 Pro Max': 'O maior e mais avancado: iPhone 18 Pro Max com tela de 6,9", tele-objetiva periscopica 8x e a maior bateria ja feita pela Apple.'
};

const DESTAQUES = {
  '18 Pro': ['Chip A20 Pro', 'Tripla camera 48MP', 'ProMotion 120Hz', 'Corpo em titanio'],
  '18 Pro Max': ['Chip A20 Pro', 'Periscopio 8x', 'Tela 6.9" ProMotion', 'Bateria de longa duracao']
};

const products = ['18 Pro', '18 Pro Max'].map((modelo) => ({
  nome: `iPhone ${modelo}`,
  slug: slugify(`iphone-${modelo}`),
  modelo,
  descricao: DESCRICOES[modelo],
  destaques: DESTAQUES[modelo],
  precoBase: Number((PRECO + ADICIONAL_MODELO[modelo]).toFixed(2)),
  imagem: `/img/iphone-18-${slugify(modelo)}.png`,
  ativo: true,
  variantes: buildVariantes(modelo)
}));

module.exports = { products, PRECO, slugify };
