'use strict';
const router = require('express').Router();
const c = require('../controllers/appointmentController');
const { asyncHandler } = require('../middleware/error');
const { autenticar, somenteAdmin } = require('../middleware/auth');

router.get('/disponibilidade', asyncHandler(c.disponibilidade));
router.post('/', asyncHandler(c.criar));

router.get('/', autenticar, somenteAdmin, asyncHandler(c.listar));
router.get('/:id', asyncHandler(c.obter));
router.patch('/:id', autenticar, somenteAdmin, asyncHandler(c.atualizar));
router.delete('/:id', autenticar, somenteAdmin, asyncHandler(c.remover));

module.exports = router;
