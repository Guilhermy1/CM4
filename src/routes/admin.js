'use strict';
const router = require('express').Router();
const stats = require('../controllers/statsController');
const { asyncHandler } = require('../middleware/error');
const { autenticar, somenteAdmin } = require('../middleware/auth');

router.use(autenticar, somenteAdmin);
router.get('/stats', asyncHandler(stats.dashboard));

module.exports = router;
