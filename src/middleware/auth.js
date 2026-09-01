'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('./error');

function assinarToken(user) {
  return jwt.sign(
    { sub: String(user._id || user.id), email: user.email, role: user.role, nome: user.nome },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Token nao informado'));
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    next(new ApiError(401, 'Token invalido ou expirado'));
  }
}

const somenteAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError(403, 'Acesso restrito ao administrador'));

module.exports = { assinarToken, autenticar, somenteAdmin };
