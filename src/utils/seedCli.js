'use strict';
/** Executa o seed manualmente: npm run seed */
const { getRepos } = require('../repositories');

(async () => {
  const repos = await getRepos();
  const produtos = await repos.products.count();
  const usuarios = await repos.users.count();
  console.log(`Modo: ${repos.mode} | produtos: ${produtos} | usuarios: ${usuarios}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
