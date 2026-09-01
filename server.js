'use strict';
const app = require('./src/app');
const config = require('./src/config');
const { getRepos } = require('./src/repositories');

(async () => {
  const repos = await getRepos();
  app.listen(config.port, () => {
    console.log(`\n  CM4STORE rodando em http://localhost:${config.port}`);
    console.log(`  Persistencia: ${repos.mode}`);
    console.log(`  Admin: http://localhost:${config.port}/admin  (${config.admin.email})\n`);
  });
})();
