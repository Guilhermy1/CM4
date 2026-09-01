'use strict';
const { ApiError } = require('../middleware/error');
const { HORARIOS_PADRAO, CAPACIDADE_POR_SLOT, proximasDatas } = require('../utils/helpers');

const OCUPADOS = ['agendado', 'confirmado'];

/** Quantos agendamentos ativos existem em um slot. */
async function ocupacao(repos, data, hora) {
  const lista = await repos.appointments.find({ data, hora });
  return lista.filter((a) => OCUPADOS.includes(a.status)).length;
}

async function garantirDisponibilidade(repos, data, hora, ignorarId = null) {
  const lista = await repos.appointments.find({ data, hora });
  const ativos = lista.filter((a) => OCUPADOS.includes(a.status) && String(a._id || a.id) !== String(ignorarId));
  if (ativos.length >= CAPACIDADE_POR_SLOT) {
    throw new ApiError(409, `Horario ${hora} em ${data} ja esta lotado. Escolha outro.`);
  }
  return true;
}

/** Agenda completa (proximos dias) com vagas restantes por horario. */
async function disponibilidade(repos, dias = 14) {
  const datas = proximasDatas(dias);
  const agenda = [];
  for (const data of datas) {
    const doDia = (await repos.appointments.find({ data })).filter((a) => OCUPADOS.includes(a.status));
    agenda.push({
      data,
      horarios: HORARIOS_PADRAO.map((hora) => {
        const usados = doDia.filter((a) => a.hora === hora).length;
        return { hora, vagas: Math.max(0, CAPACIDADE_POR_SLOT - usados), disponivel: usados < CAPACIDADE_POR_SLOT };
      })
    });
  }
  return agenda;
}

module.exports = { ocupacao, garantirDisponibilidade, disponibilidade, CAPACIDADE_POR_SLOT, HORARIOS_PADRAO };
