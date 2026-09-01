'use strict';
const { getRepos } = require('../repositories');
const { ApiError } = require('../middleware/error');
const { gerarNumeroPedido, isEmail, isDataValida, isHoraValida } = require('../utils/helpers');
const appointmentService = require('../services/appointmentService');

const STATUS_VALIDOS = [
  'aguardando_pagamento', 'pago', 'separacao', 'pronto_retirada', 'em_transito', 'concluido', 'cancelado'
];

/** Valida itens do carrinho contra o catalogo e devolve itens normalizados. */
async function resolverItens(repos, itens) {
  if (!Array.isArray(itens) || itens.length === 0) throw new ApiError(400, 'Carrinho vazio');

  const resolvidos = [];
  for (const item of itens) {
    const produto = await repos.products.findById(item.productId);
    if (!produto) throw new ApiError(404, `Produto ${item.productId} nao encontrado`);

    const variante = (produto.variantes || []).find((v) => v.sku === item.sku);
    if (!variante) throw new ApiError(400, `Variante (SKU ${item.sku}) indisponivel`);

    const quantidade = Math.max(1, Number(item.quantidade || 1));
    if (variante.estoque < quantidade) {
      throw new ApiError(409, `Estoque insuficiente para ${produto.nome} ${variante.cor} ${variante.armazenamento}`);
    }

    resolvidos.push({
      productId: String(produto._id || produto.id),
      nome: produto.nome,
      modelo: produto.modelo,
      cor: variante.cor,
      armazenamento: variante.armazenamento,
      sku: variante.sku,
      quantidade,
      precoUnitario: variante.preco
    });
  }
  return resolvidos;
}

async function baixarEstoque(repos, itens) {
  for (const item of itens) {
    const produto = await repos.products.findById(item.productId);
    const variantes = (produto.variantes || []).map((v) =>
      v.sku === item.sku ? { ...v, estoque: Math.max(0, v.estoque - item.quantidade) } : v
    );
    await repos.products.updateById(item.productId, { variantes });
  }
}

async function devolverEstoque(repos, itens) {
  for (const item of itens) {
    const produto = await repos.products.findById(item.productId);
    if (!produto) continue;
    const variantes = (produto.variantes || []).map((v) =>
      v.sku === item.sku ? { ...v, estoque: v.estoque + item.quantidade } : v
    );
    await repos.products.updateById(item.productId, { variantes });
  }
}

/** POST /api/orders - checkout completo (pedido + agendamento opcional). */
exports.criar = async (req, res) => {
  const repos = await getRepos();
  const { cliente = {}, itens = [], entrega = {}, pagamento = {}, agendamento = null, observacoes = '' } = req.body || {};

  if (!cliente.nome || !isEmail(cliente.email) || !cliente.telefone) {
    throw new ApiError(400, 'Dados do cliente incompletos (nome, email valido e telefone)');
  }

  const tipo = entrega.tipo === 'entrega' ? 'entrega' : 'retirada';
  if (tipo === 'entrega' && (!entrega.cep || !entrega.endereco || !entrega.numero || !entrega.cidade)) {
    throw new ApiError(400, 'Endereco de entrega incompleto');
  }

  const itensResolvidos = await resolverItens(repos, itens);
  const subtotal = Number(itensResolvidos.reduce((a, i) => a + i.precoUnitario * i.quantidade, 0).toFixed(2));
  const frete = tipo === 'entrega' ? 0 : 0; // entrega cortesia na regiao durante a pre-venda
  const total = Number((subtotal + frete).toFixed(2));

  if (agendamento) {
    if (!isDataValida(agendamento.data) || !isHoraValida(agendamento.hora)) {
      throw new ApiError(400, 'Data ou horario de agendamento invalido');
    }
    await appointmentService.garantirDisponibilidade(repos, agendamento.data, agendamento.hora);
  }

  const pedido = await repos.orders.create({
    numero: gerarNumeroPedido(),
    cliente: {
      nome: cliente.nome,
      email: String(cliente.email).toLowerCase(),
      telefone: cliente.telefone,
      documento: cliente.documento || ''
    },
    itens: itensResolvidos,
    subtotal,
    frete,
    total,
    entrega: { ...entrega, tipo },
    pagamento: {
      metodo: ['pix', 'cartao', 'boleto'].includes(pagamento.metodo) ? pagamento.metodo : 'pix',
      gateway: 'placeholder',      // MercadoPago / Stripe entram aqui
      status: 'pendente',
      transacaoId: ''
    },
    status: 'aguardando_pagamento',
    observacoes
  });

  await baixarEstoque(repos, itensResolvidos);

  let agendamentoCriado = null;
  if (agendamento) {
    agendamentoCriado = await repos.appointments.create({
      orderId: String(pedido._id || pedido.id),
      orderNumero: pedido.numero,
      cliente: { nome: cliente.nome, email: String(cliente.email).toLowerCase(), telefone: cliente.telefone },
      tipo,
      data: agendamento.data,
      hora: agendamento.hora,
      unidade: agendamento.unidade || 'CM4STORE - Loja Central',
      status: 'agendado',
      observacoes: agendamento.observacoes || ''
    });
    await repos.orders.updateById(pedido._id || pedido.id, {
      appointmentId: String(agendamentoCriado._id || agendamentoCriado.id)
    });
    pedido.appointmentId = String(agendamentoCriado._id || agendamentoCriado.id);
  }

  res.status(201).json({
    ok: true,
    data: { pedido, agendamento: agendamentoCriado },
    pagamento: {
      // placeholder: substituir pela preference do MercadoPago ou PaymentIntent do Stripe
      instrucoes: 'Checkout em modo esboco. Integracao de gateway sera plugada em /api/payments.',
      checkoutUrl: null
    }
  });
};

exports.listar = async (req, res) => {
  const repos = await getRepos();
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.email) filter['cliente.email'] = String(req.query.email).toLowerCase();
  const pedidos = await repos.orders.find(filter, { limit: Number(req.query.limit || 200) });
  res.json({ ok: true, total: pedidos.length, data: pedidos });
};

exports.obter = async (req, res) => {
  const repos = await getRepos();
  const { id } = req.params;
  const pedido = (await repos.orders.findById(id)) || (await repos.orders.findOne({ numero: id.toUpperCase() }));
  if (!pedido) throw new ApiError(404, 'Pedido nao encontrado');
  const agendamento = pedido.appointmentId ? await repos.appointments.findById(pedido.appointmentId) : null;
  res.json({ ok: true, data: { ...pedido, agendamento } });
};

exports.atualizarStatus = async (req, res) => {
  const repos = await getRepos();
  const { status, pagamentoStatus } = req.body || {};
  const pedido = await repos.orders.findById(req.params.id);
  if (!pedido) throw new ApiError(404, 'Pedido nao encontrado');

  const patch = {};
  if (status) {
    if (!STATUS_VALIDOS.includes(status)) throw new ApiError(400, 'Status invalido');
    patch.status = status;
    if (status === 'cancelado' && pedido.status !== 'cancelado') await devolverEstoque(repos, pedido.itens || []);
  }
  if (pagamentoStatus) patch.pagamento = { ...pedido.pagamento, status: pagamentoStatus };

  const atualizado = await repos.orders.updateById(req.params.id, patch);
  res.json({ ok: true, data: atualizado });
};

exports.remover = async (req, res) => {
  const repos = await getRepos();
  const pedido = await repos.orders.deleteById(req.params.id);
  if (!pedido) throw new ApiError(404, 'Pedido nao encontrado');
  if (pedido.appointmentId) await repos.appointments.deleteById(pedido.appointmentId);
  res.json({ ok: true, data: pedido });
};
