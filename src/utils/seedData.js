'use strict';
const config = require('../config');

const PRECO = config.brand.precoPadrao; // 14999.97 (valor fixo da pre-venda)

const CORES = {
  '18': [
    { cor: 'Preto Grafite', hex: '#1c1c1e' },
    { cor: 'Branco Estelar', hex: '#f2f2f0' },
    { cor: 'Verde CM4', hex: '#7FD000' },
    { cor: 'Azul Ultramar', hex: '#2b4a8b' }
  ],
  '18 Pro': [
    { cor: 'Titanio Natural', hex: '#b8b0a5' },
    { cor: 'Titanio Preto', hex: '#22222a' },
    { cor: 'Titanio Branco', hex: '#e8e6e1' },
    { cor: 'Titanio Verde CM4', hex: '#7FD000' }
  ],
  '18 Pro Max': [
    { cor: 'Titanio Natural', hex: '#b8b0a5' },
    { cor: 'Titanio Preto', hex: '#22222a' },
    { cor: 'Titanio Deserto', hex: '#c6a887' },
    { cor: 'Titanio Verde CM4', hex: '#7FD000' }
  ]
};

const ARMAZENAMENTOS = {
  '18': ['128GB', '256GB', '512GB'],
  '18 Pro': ['256GB', '512GB', '1TB'],
  '18 Pro Max': ['256GB', '512GB', '1TB', '2TB']
};

// Pre-venda com VALOR FIXO (R$ 14.999,97) para todos os modelos/variantes.
// Quando a Apple divulgar a tabela oficial, basta preencher os acrescimos abaixo.
const ADICIONAL = { '128GB': 0, '256GB': 0, '512GB': 0, '1TB': 0, '2TB': 0 };
const ADICIONAL_MODELO = { '18': 0, '18 Pro': 0, '18 Pro Max': 0 };

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
  '18': 'O iPhone 18 chega com o novo chip A20, camera dupla de 48MP e bateria com autonomia estendida.',
  '18 Pro': 'iPhone 18 Pro em titanio, chip A20 Pro, sistema de tres cameras e tela ProMotion 120Hz.',
  '18 Pro Max': 'O maior e mais avancado: iPhone 18 Pro Max com tele-objetiva periscopica e a maior bateria ja feita pela Apple.'
};

const DESTAQUES = {
  '18': ['Chip A20', 'Camera dupla 48MP', 'Tela Super Retina XDR 6.3"', 'USB-C 3.0'],
  '18 Pro': ['Chip A20 Pro', 'Tripla camera 48MP', 'ProMotion 120Hz', 'Corpo em titanio'],
  '18 Pro Max': ['Chip A20 Pro', 'Periscopio 8x', 'Tela 6.9" ProMotion', 'Bateria de longa duracao']
};

const products = ['18', '18 Pro', '18 Pro Max'].map((modelo) => ({
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
