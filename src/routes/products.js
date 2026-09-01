'use strict';
const router = require('express').Router();
const c = require('../controllers/productController');
const { asyncHandler } = require('../middleware/error');
const { autenticar, somenteAdmin } = require('../middleware/auth');

router.get('/', asyncHandler(c.listar));
router.get('/:id', asyncHandler(c.obter));

router.post('/', autenticar, somenteAdmin, asyncHandler(c.criar));
router.put('/:id', autenticar, somenteAdmin, asyncHandler(c.atualizar));
router.patch('/:id', autenticar, somenteAdmin, asyncHandler(c.atualizar));
router.patch('/:id/estoque', autenticar, somenteAdmin, asyncHandler(c.ajustarEstoque));
router.delete('/:id', autenticar, somenteAdmin, asyncHandler(c.remover));

module.exports = router;
