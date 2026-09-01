'use strict';
const router = require('express').Router();
const config = require('../config');
const { getRepos } = require('../repositories');
const { asyncHandler } = require('../middleware/error');

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const repos = await getRepos();
    res.json({ ok: true, servico: 'CM4STORE API', versao: '1.0.0', persistencia: repos.mode, env: config.env });
  })
);

router.get('/config', (req, res) =>
  res.json({ ok: true, data: { marca: config.brand.name, corPrimaria: config.brand.neon, precoPadrao: config.brand.precoPadrao } })
);

router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/appointments', require('./appointments'));
router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));
router.use('/payments', require('./payments'));

module.exports = router;
