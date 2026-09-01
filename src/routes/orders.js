'use strict';
const router = require('express').Router();
const c = require('../controllers/orderController');
const { asyncHandler } = require('../middleware/error');
const { autenticar, somenteAdmin } = require('../middleware/auth');

router.post('/', asyncHandler(c.criar));            // checkout publico
router.get('/:id', asyncHandler(c.obter));          // consulta por id ou numero do pedido

router.get('/', autenticar, somenteAdmin, asyncHandler(c.listar));
router.patch('/:id/status', autenticar, somenteAdmin, asyncHandler(c.atualizarStatus));
router.delete('/:id', autenticar, somenteAdmin, asyncHandler(c.remover));

module.exports = router;
