'use strict';
const bcrypt = require('bcryptjs');
const { getRepos } = require('../repositories');
const { ApiError } = require('../middleware/error');
const { assinarToken } = require('../middleware/auth');
const { isEmail } = require('../utils/helpers');

const publico = (u) => ({ id: String(u._id || u.id), nome: u.nome, email: u.email, role: u.role, telefone: u.telefone || '' });

exports.registrar = async (req, res) => {
  const repos = await getRepos();
  const { nome, email, senha, telefone = '' } = req.body || {};
  if (!nome || !isEmail(email) || !senha || senha.length < 6) {
    throw new ApiError(400, 'Informe nome, email valido e senha com pelo menos 6 caracteres');
  }
  if (await repos.users.findOne({ email: String(email).toLowerCase() })) {
    throw new ApiError(409, 'Email ja cadastrado');
  }
  const user = await repos.users.create({
    nome,
    email: String(email).toLowerCase(),
    senhaHash: bcrypt.hashSync(senha, 10),
    telefone,
    role: 'cliente',
    ativo: true
  });
  res.status(201).json({ ok: true, data: { user: publico(user), token: assinarToken(user) } });
};

exports.login = async (req, res) => {
  const repos = await getRepos();
  const { email, senha } = req.body || {};
  if (!isEmail(email) || !senha) throw new ApiError(400, 'Email e senha sao obrigatorios');

  const user = await repos.users.findOne({ email: String(email).toLowerCase() }, { select: '+senhaHash' });
  if (!user || !user.ativo) throw new ApiError(401, 'Credenciais invalidas');
  if (!bcrypt.compareSync(senha, user.senhaHash || '')) throw new ApiError(401, 'Credenciais invalidas');

  res.json({ ok: true, data: { user: publico(user), token: assinarToken(user) } });
};

exports.eu = async (req, res) => {
  const repos = await getRepos();
  const user = await repos.users.findById(req.user.sub);
  if (!user) throw new ApiError(404, 'Usuario nao encontrado');
  res.json({ ok: true, data: publico(user) });
};

exports.listar = async (req, res) => {
  const repos = await getRepos();
  const users = await repos.users.find({});
  res.json({ ok: true, total: users.length, data: users.map(publico) });
};
