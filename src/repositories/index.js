'use strict';
const bcrypt = require('bcryptjs');
const config = require('../config');
const { connect, state } = require('../config/db');
const { createMemoryRepository } = require('./memoryRepository');
const { createMongoRepository } = require('./mongoRepository');

const Product = require('../models/Product');
const Order = require('../models/Order');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

const { products: seedProducts } = require('../utils/seedData');

let repos = null;
let initPromise = null;

async function build() {
  await connect();

  if (state.mode === 'mongo') {
    const r = {
      mode: 'mongo',
      products: createMongoRepository('products', Product),
      orders: createMongoRepository('orders', Order),
      appointments: createMongoRepository('appointments', Appointment),
      users: createMongoRepository('users', User)
    };
    await ensureSeed(r);
    return r;
  }

  const r = {
    mode: 'memory',
    products: createMemoryRepository('products', seedProducts),
    orders: createMemoryRepository('orders'),
    appointments: createMemoryRepository('appointments'),
    users: createMemoryRepository('users')
  };
  await ensureAdmin(r);
  return r;
}

async function ensureSeed(r) {
  if ((await r.products.count()) === 0) {
    for (const p of seedProducts) await r.products.create(p);
    console.log('[seed] produtos criados');
  }
  await ensureAdmin(r);
}

async function ensureAdmin(r) {
  const existing = await r.users.findOne({ email: config.admin.email });
  if (existing) return;
  await r.users.create({
    nome: 'Administrador CM4STORE',
    email: config.admin.email,
    senhaHash: bcrypt.hashSync(config.admin.password, 10),
    role: 'admin',
    ativo: true
  });
  console.log(`[seed] admin criado: ${config.admin.email}`);
}

/** Inicializa (uma unica vez) e devolve os repositorios. */
async function getRepos() {
  if (repos) return repos;
  if (!initPromise) initPromise = build().then((r) => (repos = r));
  return initPromise;
}

module.exports = { getRepos };
