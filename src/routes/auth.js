'use strict';
const router = require('express').Router();
const c = require('../controllers/authController');
const { asyncHandler } = require('../middleware/error');
const { autenticar, somenteAdmin } = require('../middleware/auth');

router.post('/registrar', asyncHandler(c.registrar));
router.post('/login', asyncHandler(c.login));
router.get('/eu', autenticar, asyncHandler(c.eu));
router.get('/usuarios', autenticar, somenteAdmin, asyncHandler(c.listar));

module.exports = router;
