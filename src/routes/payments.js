'use strict';
const router = require('express').Router();
const { getRepos } = require('../repositories');
const { asyncHandler, ApiError } = require('../middleware/error');

/**
 * PLACEHOLDER de gateway de pagamento.
 * Substituir por MercadoPago (preference) ou Stripe (PaymentIntent).
 * Contrato mantido para nao quebrar o front quando o gateway real entrar.
 */
router.post(
  '/checkout',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    const { orderId, metodo = 'pix' } = req.body || {};
    const pedido = await repos.orders.findById(orderId);
    if (!pedido) throw new ApiError(404, 'Pedido nao encontrado');

    res.json({
      ok: true,
      gateway: 'placeholder',
      data: {
        orderId,
        numero: pedido.numero,
        metodo,
        valor: pedido.total,
        checkoutUrl: null,
        qrCodePix: null,
        mensagem: 'Gateway ainda nao integrado. Pedido registrado como aguardando pagamento.'
      }
    });
  })
);

/** Webhook do gateway (MercadoPago/Stripe) - confirma pagamento. */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    const { orderId, status = 'aprovado', transacaoId = '' } = req.body || {};
    const pedido = await repos.orders.findById(orderId);
    if (!pedido) return res.json({ ok: true, ignorado: true });

    await repos.orders.updateById(orderId, {
      pagamento: { ...pedido.pagamento, status, transacaoId },
      status: status === 'aprovado' ? 'pago' : pedido.status
    });
    res.json({ ok: true });
  })
);

module.exports = router;
