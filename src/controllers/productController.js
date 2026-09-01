'use strict';
const { getRepos } = require('../repositories');
const { ApiError } = require('../middleware/error');
const { slugify } = require('../utils/seedData');

exports.listar = async (req, res) => {
  const repos = await getRepos();
  const filter = {};
  if (req.query.modelo) filter.modelo = req.query.modelo;
  if (req.query.ativo !== undefined) filter.ativo = req.query.ativo === 'true';
  else if (!req.query.todos) filter.ativo = true;

  const produtos = await repos.products.find(filter, { sort: { precoBase: 1 } });
  res.json({ ok: true, total: produtos.length, data: produtos });
};

exports.obter = async (req, res) => {
  const repos = await getRepos();
  const { id } = req.params;
  const produto = (await repos.products.findById(id)) || (await repos.products.findOne({ slug: String(id).toLowerCase() }));
  if (!produto) throw new ApiError(404, 'Produto nao encontrado');
  res.json({ ok: true, data: produto });
};

exports.criar = async (req, res) => {
  const repos = await getRepos();
  const body = req.body || {};
  if (!body.nome || !body.modelo) throw new ApiError(400, 'nome e modelo sao obrigatorios');
  const produto = await repos.products.create({
    ...body,
    slug: body.slug ? slugify(body.slug) : slugify(body.nome),
    precoBase: Number(body.precoBase || 0),
    variantes: body.variantes || [],
    ativo: body.ativo !== false
  });
  res.status(201).json({ ok: true, data: produto });
};

exports.atualizar = async (req, res) => {
  const repos = await getRepos();
  const patch = { ...req.body };
  delete patch._id;
  delete patch.id;
  if (patch.slug) patch.slug = slugify(patch.slug);
  const produto = await repos.products.updateById(req.params.id, patch);
  if (!produto) throw new ApiError(404, 'Produto nao encontrado');
  res.json({ ok: true, data: produto });
};

exports.remover = async (req, res) => {
  const repos = await getRepos();
  const produto = await repos.products.deleteById(req.params.id);
  if (!produto) throw new ApiError(404, 'Produto nao encontrado');
  res.json({ ok: true, data: produto });
};

/** Ajuste de estoque de uma variante (por SKU). PATCH /api/products/:id/estoque */
exports.ajustarEstoque = async (req, res) => {
  const repos = await getRepos();
  const { sku, estoque } = req.body || {};
  if (!sku || estoque === undefined) throw new ApiError(400, 'sku e estoque sao obrigatorios');

  const produto = await repos.products.findById(req.params.id);
  if (!produto) throw new ApiError(404, 'Produto nao encontrado');

  const variantes = (produto.variantes || []).map((v) =>
    v.sku === sku ? { ...v, estoque: Math.max(0, Number(estoque)) } : v
  );
  if (!variantes.some((v) => v.sku === sku)) throw new ApiError(404, 'Variante (SKU) nao encontrada');

  const atualizado = await repos.products.updateById(req.params.id, { variantes });
  res.json({ ok: true, data: atualizado });
};
