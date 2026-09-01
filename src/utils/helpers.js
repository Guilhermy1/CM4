'use strict';

const HORARIOS_PADRAO = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30'
];

const CAPACIDADE_POR_SLOT = 2;

function gerarNumeroPedido() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CM4-${stamp}-${rand}`;
}

const isDataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isHoraValida = (s) => /^\d{2}:\d{2}$/.test(s) && HORARIOS_PADRAO.includes(s);

/** Datas de segunda a sabado, a partir de amanha. */
function proximasDatas(qtd = 14) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (out.length < qtd) {
    if (d.getDay() !== 0) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

module.exports = { HORARIOS_PADRAO, CAPACIDADE_POR_SLOT, gerarNumeroPedido, isDataValida, isHoraValida, proximasDatas, brl, isEmail };
