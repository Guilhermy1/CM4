'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Arquivos estaticos (na Vercel o /public e servido pelo CDN via vercel.json)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

app.use('/api', routes);

// SPA-ish fallback para as paginas do esboco
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'index.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(publicDir, 'checkout.html')));
app.get('/confirmacao', (req, res) => res.sendFile(path.join(publicDir, 'confirmacao.html')));

app.use('/api', notFound);
app.use((req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use(errorHandler);

module.exports = app;
