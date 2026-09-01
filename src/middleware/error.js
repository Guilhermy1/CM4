'use strict';

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const notFound = (req, res) =>
  res.status(404).json({ ok: false, error: 'Rota nao encontrada', path: req.originalUrl });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('[erro]', err);
  res.status(status).json({
    ok: false,
    error: err.message || 'Erro interno do servidor',
    details: err.details || undefined
  });
}

/** Envolve handlers async para propagar erros ao errorHandler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, notFound, errorHandler, asyncHandler };
