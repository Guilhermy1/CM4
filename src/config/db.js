'use strict';
const mongoose = require('mongoose');
const config = require('./index');

const state = { mode: 'memory', connected: false, promise: null };

/**
 * Conecta ao MongoDB quando MONGODB_URI existir.
 * Sem URI a aplicacao continua funcionando com repositorio em memoria,
 * o que permite rodar o esboco localmente / preview na Vercel sem banco.
 * A conexao e cacheada (importante para funcoes serverless).
 */
async function connect() {
  if (!config.mongoUri) {
    state.mode = 'memory';
    return state;
  }
  if (state.promise) return state.promise;

  mongoose.set('strictQuery', true);
  state.promise = mongoose
    .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 })
    .then(() => {
      state.mode = 'mongo';
      state.connected = true;
      console.log('[db] MongoDB conectado');
      return state;
    })
    .catch((err) => {
      console.error('[db] Falha ao conectar no MongoDB, usando memoria:', err.message);
      state.mode = 'memory';
      state.connected = false;
      state.promise = null;
      return state;
    });

  return state.promise;
}

module.exports = { connect, state, mongoose };
