'use strict';
const { getRepos } = require('../repositories');
const { ApiError } = require('../middleware/error');
const { isDataValida, isHoraValida, isEmail } = require('../utils/helpers');
const service = require('../services/appointmentService');

const STATUS_VALIDOS = ['agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu'];

/** GET /api/appointments/disponibilidade */
exports.disponibilidade = async (req, res) => {
  const repos = await getRepos();
  const dias = Math.min(30, Math.max(1, Number(req.query.dias || 14)));
  res.json({ ok: true, capacidadePorHorario: service.CAPACIDADE_POR_SLOT, data: await service.disponibilidade(repos, dias) });
};

exports.criar = async (req, res) => {
  const repos = await getRepos();
  const { cliente = {}, data, hora, tipo = 'retirada', orderId = null, orderNumero = '', unidade, observacoes = '' } = req.body || {};

  if (!cliente.nome || !isEmail(cliente.email)) throw new ApiError(400, 'Nome e email do cliente sao obrigatorios');
  if (!isDataValida(data)) throw new ApiError(400, 'Data invalida (use YYYY-MM-DD)');
  if (!isHoraValida(hora)) throw new ApiError(400, 'Horario invalido');

  await service.garantirDisponibilidade(repos, data, hora);

  const agendamento = await repos.appointments.create({
    orderId,
    orderNumero,
    cliente: { nome: cliente.nome, email: String(cliente.email).toLowerCase(), telefone: cliente.telefone || '' },
    tipo: tipo === 'entrega' ? 'entrega' : 'retirada',
    data,
    hora,
    unidade: unidade || 'CM4STORE - Loja Central',
    status: 'agendado',
    observacoes
  });
  res.status(201).json({ ok: true, data: agendamento });
};

exports.listar = async (req, res) => {
  const repos = await getRepos();
  const filter = {};
  if (req.query.data) filter.data = req.query.data;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.email) filter['cliente.email'] = String(req.query.email).toLowerCase();
  const lista = await repos.appointments.find(filter, { sort: { data: 1, hora: 1 } });
  res.json({ ok: true, total: lista.length, data: lista });
};

exports.obter = async (req, res) => {
  const repos = await getRepos();
  const ag = await repos.appointments.findById(req.params.id);
  if (!ag) throw new ApiError(404, 'Agendamento nao encontrado');
  res.json({ ok: true, data: ag });
};

exports.atualizar = async (req, res) => {
  const repos = await getRepos();
  const atual = await repos.appointments.findById(req.params.id);
  if (!atual) throw new ApiError(404, 'Agendamento nao encontrado');

  const { data, hora, status, observacoes, unidade } = req.body || {};
  const patch = {};

  if (data || hora) {
    const novaData = data || atual.data;
    const novaHora = hora || atual.hora;
    if (!isDataValida(novaData)) throw new ApiError(400, 'Data invalida');
    if (!isHoraValida(novaHora)) throw new ApiError(400, 'Horario invalido');
    await service.garantirDisponibilidade(repos, novaData, novaHora, req.params.id);
    patch.data = novaData;
    patch.hora = novaHora;
  }
  if (status) {
    if (!STATUS_VALIDOS.includes(status)) throw new ApiError(400, 'Status invalido');
    patch.status = status;
  }
  if (observacoes !== undefined) patch.observacoes = observacoes;
  if (unidade) patch.unidade = unidade;

  res.json({ ok: true, data: await repos.appointments.updateById(req.params.id, patch) });
};

exports.remover = async (req, res) => {
  const repos = await getRepos();
  const ag = await repos.appointments.deleteById(req.params.id);
  if (!ag) throw new ApiError(404, 'Agendamento nao encontrado');
  res.json({ ok: true, data: ag });
};
