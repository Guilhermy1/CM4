'use strict';
const router = require('express').Router();
const { getRepos } = require('../repositories');
const { asyncHandler, ApiError } = require('../middleware/error');

/* ============================================================
   GATEWAY DE PAGAMENTO - PLACEHOLDER
   ------------------------------------------------------------
   O contrato abaixo ja e o contrato final consumido pelo front.
   Para plugar o gateway real basta implementar as tres funcoes
   de `gateway` (criarSessao / consultar / interpretarWebhook)
   usando o SDK escolhido:

   MercadoPago:
     const { MercadoPagoConfig, Preference } = require('mercadopago');
     const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
     const pref = await new Preference(mp).create({ body: {...} });
     -> checkoutUrl = pref.init_point

   Stripe:
     const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
     const intent = await stripe.paymentIntents.create({ amount, currency: 'brl' });
     -> clientSecret = intent.client_secret

   Variaveis de ambiente esperadas (ver .env.example):
     PAYMENT_GATEWAY = placeholder | mercadopago | stripe
     MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET
     STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
     PUBLIC_URL (para montar as URLs de retorno)
   ============================================================ */

const PROVEDOR = process.env.PAYMENT_GATEWAY || 'placeholder';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const METODOS = ['pix', 'cartao', 'boleto'];

const gateway = {
  nome: PROVEDOR,

  /** Cria a sessao/preferencia de pagamento no provedor. */
  async criarSessao(pedido, metodo) {
    const transacaoId = `SIM-${Date.now().toString(36).toUpperCase()}`;

    if (PROVEDOR === 'mercadopago') {
      // TODO: criar Preference e devolver init_point como checkoutUrl.
      throw new ApiError(501, 'Integracao MercadoPago ainda nao configurada');
    }
    if (PROVEDOR === 'stripe') {
      // TODO: criar PaymentIntent e devolver client_secret.
      throw new ApiError(501, 'Integracao Stripe ainda nao configurada');
    }

    // Modo placeholder: nenhuma cobranca real e feita.
    return {
      transacaoId,
      metodo,
      valor: pedido.total,
      moeda: 'BRL',
      checkoutUrl: null,   // gateway real: URL de redirect
      clientSecret: null,  // gateway real: segredo do SDK embutido
      qrCodePix: null,     // gateway real: payload copia-e-cola do PIX
      expiraEm: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      retorno: {
        sucesso: `${PUBLIC_URL}/confirmacao?pedido=${pedido.numero}`,
        falha: `${PUBLIC_URL}/checkout?erro=pagamento`
      }
    };
  },

  /** Traduz o payload do webhook para o formato interno. */
  interpretarWebhook(body = {}) {
    if (PROVEDOR === 'mercadopago') {
      // TODO: consultar o pagamento pelo data.id e mapear o status.
      return { orderId: body.orderId, status: body.status, transacaoId: body.transacaoId };
    }
    if (PROVEDOR === 'stripe') {
      // TODO: validar assinatura (stripe.webhooks.constructEvent) e mapear o evento.
      return { orderId: body.orderId, status: body.status, transacaoId: body.transacaoId };
    }
    return {
      orderId: body.orderId,
      status: body.status || 'aprovado',
      transacaoId: body.transacaoId || ''
    };
  }
};

/** Traduz o status do gateway para o status do pedido. */
function statusDoPedido(statusPagamento, atual) {
  if (statusPagamento === 'aprovado') return 'pago';
  if (statusPagamento === 'recusado' || statusPagamento === 'cancelado') return 'cancelado';
  return atual;
}

async function buscarPedido(repos, id) {
  if (!id) throw new ApiError(400, 'orderId nao informado');
  const pedido = (await repos.orders.findById(id)) || (await repos.orders.findOne({ numero: String(id).toUpperCase() }));
  if (!pedido) throw new ApiError(404, 'Pedido nao encontrado');
  return pedido;
}

/**
 * POST /api/payments/checkout
 * Abre a sessao de pagamento para um pedido ja registrado.
 */
router.post(
  '/checkout',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    const { orderId, metodo } = req.body || {};
    const pedido = await buscarPedido(repos, orderId);

    if (pedido.status === 'pago') throw new ApiError(409, 'Este pedido ja foi pago');
    if (pedido.status === 'cancelado') throw new ApiError(409, 'Este pedido foi cancelado');

    const metodoFinal = METODOS.includes(metodo) ? metodo : (pedido.pagamento?.metodo || 'pix');
    const sessao = await gateway.criarSessao(pedido, metodoFinal);
    const id = String(pedido._id || pedido.id);

    await repos.orders.updateById(id, {
      pagamento: {
        ...pedido.pagamento,
        metodo: metodoFinal,
        gateway: gateway.nome,
        status: 'processando',
        transacaoId: sessao.transacaoId
      }
    });

    res.json({ ok: true, gateway: gateway.nome, data: { orderId: id, numero: pedido.numero, ...sessao } });
  })
);

/**
 * POST /api/payments/confirmar
 * Confirmacao da cobranca. Em producao com gateway real, quem confirma
 * e o webhook - esta rota cobre o modo placeholder e testes manuais.
 */
router.post(
  '/confirmar',
  asyncHandler(async (req, res) => {
    if (PROVEDOR !== 'placeholder') {
      throw new ApiError(409, 'Com gateway real a confirmacao ocorre pelo webhook');
    }

    const repos = await getRepos();
    const { orderId, transacaoId } = req.body || {};
    const pedido = await buscarPedido(repos, orderId);
    const id = String(pedido._id || pedido.id);

    if (pedido.status === 'pago') {
      return res.json({ ok: true, data: { orderId: id, numero: pedido.numero, status: 'aprovado', jaPago: true } });
    }

    const atualizado = await repos.orders.updateById(id, {
      pagamento: {
        ...pedido.pagamento,
        gateway: gateway.nome,
        status: 'aprovado',
        transacaoId: transacaoId || pedido.pagamento?.transacaoId || '',
        pagoEm: new Date().toISOString()
      },
      status: 'pago'
    });

    res.json({
      ok: true,
      data: {
        orderId: id,
        numero: pedido.numero,
        status: 'aprovado',
        valor: pedido.total,
        pedido: atualizado
      }
    });
  })
);

/** GET /api/payments/status/:orderId - consulta o status do pagamento. */
router.get(
  '/status/:orderId',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    const pedido = await buscarPedido(repos, req.params.orderId);
    res.json({
      ok: true,
      data: {
        orderId: String(pedido._id || pedido.id),
        numero: pedido.numero,
        statusPedido: pedido.status,
        pagamento: pedido.pagamento || null,
        total: pedido.total
      }
    });
  })
);

/**
 * POST /api/payments/webhook
 * Endpoint do gateway (MercadoPago/Stripe).
 * Em producao: validar a assinatura antes de confiar no payload.
 */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    const evento = gateway.interpretarWebhook(req.body || {});
    if (!evento.orderId) return res.json({ ok: true, ignorado: true });

    const pedido = (await repos.orders.findById(evento.orderId)) || null;
    if (!pedido) return res.json({ ok: true, ignorado: true });

    const id = String(pedido._id || pedido.id);
    await repos.orders.updateById(id, {
      pagamento: {
        ...pedido.pagamento,
        gateway: gateway.nome,
        status: evento.status,
        transacaoId: evento.transacaoId || pedido.pagamento?.transacaoId || ''
      },
      status: statusDoPedido(evento.status, pedido.status)
    });

    res.json({ ok: true });
  })
);

module.exports = router;
