'use strict';
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'cm4store-dev-secret',
    expiresIn: process.env.JWT_EXPIRES || '7d'
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@cm4store.com',
    password: process.env.ADMIN_PASSWORD || 'cm4store123'
  },
  brand: {
    name: 'CM4STORE',
    neon: '#7FD000',
    precoPadrao: Number(process.env.PRECO_PADRAO || 14999.97)
  }
};

module.exports = config;
