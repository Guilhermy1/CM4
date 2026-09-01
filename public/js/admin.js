/* CM4STORE - painel administrativo */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const estado = { stats: null, pedidos: [], agendamentos: [], produtos: [], usuario: null };

  const dataBR = (d) => (d ? String(d).split('-').reverse().join('/') : '—');
  const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function toast(msg, erro = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast on${erro ? ' erro' : ''}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('on'), 2800);
  }

  const PILL_PEDIDO = {
    aguardando_pagamento: ['pill-amarelo', 'Aguardando pagamento'],
    pago: ['pill-neon', 'Pago'],
    separacao: ['pill-azul', 'Em separação'],
    pronto_retirada: ['pill-azul', 'Pronto p/ retirada'],
    em_transito: ['pill-azul', 'Em trânsito'],
    concluido: ['pill-neon', 'Concluído'],
    cancelado: ['pill-vermelho', 'Cancelado']
  };
  const PILL_AG = {
    agendado: ['pill-amarelo', 'Agendado'],
    confirmado: ['pill-neon', 'Confirmado'],
    concluido: ['pill-neon', 'Concluído'],
    cancelado: ['pill-vermelho', 'Cancelado'],
    nao_compareceu: ['pill-vermelho', 'Não compareceu']
  };
  const pill = (mapa, v) => {
    const [cls, txt] = mapa[v] || ['pill-cinza', v || '—'];
    return `<span class="pill ${cls}">${txt}</span>`;
  };

  /* ================== LOGIN ================== */
  const telaLogin = $('#telaLogin');
  const telaAdmin = $('#telaAdmin');

  async function entrar(email, senha) {
    const { data } = await API.auth.login(email, senha);
    if (data.user.role !== 'admin') throw new Error('Este usuário não é administrador');
    API.setToken(data.token);
    estado.usuario = data.user;
    return data.user;
  }

  function mostrarPainel() {
    telaLogin.hidden = true;
    telaLogin.style.display = 'none';
    telaAdmin.hidden = false;
    $('#infoUsuario').textContent = estado.usuario?.nome || '';
    carregarTudo();
  }

  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = $('#loginErro');
    erro.classList.remove('on');
    const btn = $('#btnLogin');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await entrar($('#email').value.trim(), $('#senha').value);
      mostrarPainel();
    } catch (err) {
      erro.textContent = err.message || 'Falha no login';
      erro.classList.add('on');
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  $('#btnSair').addEventListener('click', () => { API.setToken(null); location.reload(); });

  /* ================== ABAS ================== */
  const TITULOS = {
    dashboard: ['Dashboard', 'Visão geral da pré-venda do iPhone 18'],
    pedidos: ['Pedidos', 'Acompanhe e atualize o status de cada reserva'],
    agendamentos: ['Agendamentos', 'Retiradas e entregas com data e hora'],
    estoque: ['Estoque', 'Disponibilidade por cor e capacidade'],
    produtos: ['Produtos', 'Cadastro e edição do catálogo']
  };

  $$('#sideNav button').forEach((b) => b.addEventListener('click', () => {
    const aba = b.dataset.aba;
    $$('#sideNav button').forEach((x) => x.classList.toggle('ativo', x === b));
    $$('[data-painel]').forEach((p) => (p.hidden = p.dataset.painel !== aba));
    $('#tituloAba').textContent = TITULOS[aba][0];
    $('#subAba').textContent = TITULOS[aba][1];
  }));

  $('#btnAtualizar').addEventListener('click', () => carregarTudo(true));

  /* ================== DASHBOARD ================== */
  function renderDashboard() {
    const d = estado.stats;
    if (!d) return;
    const r = d.resumo;

    $('#infoModo').textContent = `Persistência: ${d.modo}`;

    $('#statsGrid').innerHTML = [
      ['Faturamento reservado', window.brl(r.faturamento), `${r.pedidosAtivos} pedidos ativos`],
      ['Pedidos', r.totalPedidos, `${r.pedidosPagos} pagos`],
      ['Ticket médio', window.brl(r.ticketMedio), 'por reserva'],
      ['Agendamentos', r.totalAgendamentos, `${r.agendamentosHoje} para hoje`],
      ['Estoque total', r.estoqueTotal, `${r.totalProdutos} produtos`],
      ['Clientes', r.totalClientes, 'cadastrados']
    ].map(([rot, val, sub]) => `<div class="stat"><div class="rotulo">${rot}</div><div class="valor">${val}</div><div class="sub">${sub}</div></div>`).join('');

    const max = Math.max(1, ...d.ultimos7.map((x) => x.pedidos));
    $('#chart7').innerHTML = d.ultimos7.map((x) => `
      <div class="col">
        <span class="qtd">${x.pedidos}</span>
        <div class="barra" style="height:${(x.pedidos / max) * 100}%"></div>
        <span class="rotulo">${x.dia.slice(8)}/${x.dia.slice(5, 7)}</span>
      </div>`).join('');

    const modelos = Object.entries(d.porModelo);
    $('#porModelo').innerHTML = modelos.length
      ? modelos.map(([m, q]) => `<div class="linha-item"><span>iPhone ${esc(m)}</span><strong class="neon">${q} un.</strong></div>`).join('')
      : '<div class="vazio">Nenhuma venda registrada ainda.</div>';

    $('#ultimosPedidos').innerHTML = d.ultimosPedidos.length
      ? d.ultimosPedidos.map((p) => `<div class="linha-item">
          <div><strong>${esc(p.numero)}</strong><small>${esc(p.cliente.nome)} · ${dataHora(p.createdAt)}</small></div>
          <div style="text-align:right"><strong>${window.brl(p.total)}</strong><small>${PILL_PEDIDO[p.status]?.[1] || p.status}</small></div>
        </div>`).join('')
      : '<div class="vazio">Nenhum pedido ainda.</div>';

    $('#proximosAg').innerHTML = d.proximosAgendamentos.length
      ? d.proximosAgendamentos.map((a) => `<div class="linha-item">
          <div><strong>${dataBR(a.data)} · ${a.hora}</strong><small>${esc(a.cliente.nome)} · ${a.tipo}</small></div>
          ${pill(PILL_AG, a.status)}
        </div>`).join('')
      : '<div class="vazio">Nenhum agendamento futuro.</div>';
  }

  /* ================== PEDIDOS ================== */
  function renderPedidos() {
    const filtro = $('#filtroStatus').value;
    const busca = $('#buscaPedido').value.toLowerCase().trim();

    const lista = estado.pedidos.filter((p) => {
      if (filtro && p.status !== filtro) return false;
      if (!busca) return true;
      return [p.numero, p.cliente.nome, p.cliente.email].join(' ').toLowerCase().includes(busca);
    });

    const tabela = $('#tabelaPedidos');
    if (!lista.length) { tabela.innerHTML = '<tbody><tr><td class="vazio">Nenhum pedido encontrado.</td></tr></tbody>'; return; }

    tabela.innerHTML = `
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Modalidade</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${lista.map((p) => `
        <tr>
          <td><strong>${esc(p.numero)}</strong><br><small style="color:var(--cinza-txt)">${dataHora(p.createdAt)}</small></td>
          <td>${esc(p.cliente.nome)}<br><small style="color:var(--cinza-txt)">${esc(p.cliente.email)}</small></td>
          <td>${(p.itens || []).map((i) => `${i.quantidade}x ${esc(i.nome)}<br><small style="color:var(--cinza-txt)">${esc(i.cor)} ${esc(i.armazenamento)}</small>`).join('<br>')}</td>
          <td><strong>${window.brl(p.total)}</strong><br><small style="color:var(--cinza-txt)">${(p.pagamento?.metodo || '').toUpperCase()}</small></td>
          <td>${p.entrega?.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</td>
          <td>${pill(PILL_PEDIDO, p.status)}</td>
          <td class="acoes">
            <select class="mini" data-status-pedido="${p.id || p._id}">
              ${Object.keys(PILL_PEDIDO).map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${PILL_PEDIDO[s][1]}</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-mini" data-excluir-pedido="${p.id || p._id}">Excluir</button>
          </td>
        </tr>`).join('')}
      </tbody>`;

    $$('[data-status-pedido]', tabela).forEach((sel) => sel.addEventListener('change', async () => {
      try {
        await API.pedidos.status(sel.dataset.statusPedido, { status: sel.value, pagamentoStatus: sel.value === 'pago' ? 'aprovado' : undefined });
        toast('Status atualizado');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));

    $$('[data-excluir-pedido]', tabela).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir este pedido? A ação não pode ser desfeita.')) return;
      try {
        await API.pedidos.remover(b.dataset.excluirPedido);
        toast('Pedido excluído');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));
  }
  $('#filtroStatus').addEventListener('change', renderPedidos);
  $('#buscaPedido').addEventListener('input', renderPedidos);

  /* ================== AGENDAMENTOS ================== */
  function renderAgendamentos() {
    const data = $('#filtroData').value;
    const status = $('#filtroStatusAg').value;

    const lista = estado.agendamentos.filter((a) => (!data || a.data === data) && (!status || a.status === status));
    const tabela = $('#tabelaAgendamentos');
    if (!lista.length) { tabela.innerHTML = '<tbody><tr><td class="vazio">Nenhum agendamento encontrado.</td></tr></tbody>'; return; }

    tabela.innerHTML = `
      <thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th>Pedido</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${lista.map((a) => `
        <tr>
          <td><input class="mini" type="date" value="${a.data}" data-nova-data="${a.id || a._id}"></td>
          <td><input class="mini" type="time" value="${a.hora}" step="1800" data-nova-hora="${a.id || a._id}" style="width:95px"></td>
          <td>${esc(a.cliente.nome)}<br><small style="color:var(--cinza-txt)">${esc(a.cliente.telefone || a.cliente.email)}</small></td>
          <td>${esc(a.orderNumero || '—')}</td>
          <td>${a.tipo === 'entrega' ? 'Entrega' : 'Retirada'}</td>
          <td>${pill(PILL_AG, a.status)}</td>
          <td class="acoes">
            <select class="mini" data-status-ag="${a.id || a._id}">
              ${Object.keys(PILL_AG).map((s) => `<option value="${s}" ${s === a.status ? 'selected' : ''}>${PILL_AG[s][1]}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-mini" data-salvar-ag="${a.id || a._id}">Salvar</button>
          </td>
        </tr>`).join('')}
      </tbody>`;

    $$('[data-status-ag]', tabela).forEach((sel) => sel.addEventListener('change', async () => {
      try {
        await API.agendamentos.atualizar(sel.dataset.statusAg, { status: sel.value });
        toast('Agendamento atualizado');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));

    $$('[data-salvar-ag]', tabela).forEach((b) => b.addEventListener('click', async () => {
      const id = b.dataset.salvarAg;
      const novaData = $(`[data-nova-data="${id}"]`).value;
      const novaHora = $(`[data-nova-hora="${id}"]`).value.slice(0, 5);
      try {
        await API.agendamentos.atualizar(id, { data: novaData, hora: novaHora });
        toast('Horário remarcado');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));
  }
  $('#filtroData').addEventListener('change', renderAgendamentos);
  $('#filtroStatusAg').addEventListener('change', renderAgendamentos);

  /* ================== ESTOQUE ================== */
  function renderEstoque() {
    const busca = $('#buscaSku').value.toLowerCase().trim();
    const linhas = estado.produtos.flatMap((p) =>
      (p.variantes || [])
        .filter((v) => !busca || `${v.cor} ${v.armazenamento} ${v.sku}`.toLowerCase().includes(busca))
        .map((v) => ({ produto: p, v }))
    );

    const tabela = $('#tabelaEstoque');
    if (!linhas.length) { tabela.innerHTML = '<tbody><tr><td class="vazio">Nenhuma variante encontrada.</td></tr></tbody>'; return; }

    tabela.innerHTML = `
      <thead><tr><th>Produto</th><th>Cor</th><th>Capacidade</th><th>SKU</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
      <tbody>${linhas.map(({ produto, v }) => `
        <tr>
          <td>${esc(produto.nome)}</td>
          <td><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${v.hex};vertical-align:middle;margin-right:7px"></span>${esc(v.cor)}</td>
          <td>${esc(v.armazenamento)}</td>
          <td><small style="color:var(--cinza-txt)">${esc(v.sku)}</small></td>
          <td>${window.brl(v.preco)}</td>
          <td><input class="mini" type="number" min="0" value="${v.estoque}" style="width:82px"
                data-estoque="${produto.id || produto._id}" data-sku="${esc(v.sku)}"></td>
          <td><button class="btn btn-primary btn-mini" data-salvar-estoque="${esc(v.sku)}">Salvar</button></td>
        </tr>`).join('')}
      </tbody>`;

    $$('[data-salvar-estoque]', tabela).forEach((b) => b.addEventListener('click', async () => {
      const input = $(`[data-sku="${b.dataset.salvarEstoque}"]`);
      try {
        await API.produtos.estoque(input.dataset.estoque, input.dataset.sku, Number(input.value));
        toast('Estoque atualizado');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));
  }
  $('#buscaSku').addEventListener('input', renderEstoque);

  /* ================== PRODUTOS (CRUD) ================== */
  function renderProdutos() {
    const tabela = $('#tabelaProdutos');
    tabela.innerHTML = `
      <thead><tr><th>Produto</th><th>Modelo</th><th>Preço base</th><th>Variantes</th><th>Estoque</th><th>Situação</th><th>Ações</th></tr></thead>
      <tbody>${estado.produtos.map((p) => `
        <tr>
          <td><strong>${esc(p.nome)}</strong><br><small style="color:var(--cinza-txt)">${esc(p.slug)}</small></td>
          <td>${esc(p.modelo)}</td>
          <td>${window.brl(p.precoBase)}</td>
          <td>${(p.variantes || []).length}</td>
          <td>${(p.variantes || []).reduce((a, v) => a + (v.estoque || 0), 0)}</td>
          <td>${p.ativo ? '<span class="pill pill-neon">Ativo</span>' : '<span class="pill pill-cinza">Inativo</span>'}</td>
          <td class="acoes">
            <button class="btn btn-ghost btn-mini" data-editar="${p.id || p._id}">Editar</button>
            <button class="btn btn-ghost btn-mini" data-remover="${p.id || p._id}">Excluir</button>
          </td>
        </tr>`).join('')}
      </tbody>`;

    $$('[data-editar]', tabela).forEach((b) => b.addEventListener('click', () => abrirModal(estado.produtos.find((p) => String(p.id || p._id) === b.dataset.editar))));
    $$('[data-remover]', tabela).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Excluir este produto do catálogo?')) return;
      try {
        await API.produtos.remover(b.dataset.remover);
        toast('Produto excluído');
        await carregarTudo(true);
      } catch (e) { toast(e.message, true); }
    }));
  }

  const modal = $('#modalProduto');
  function abrirModal(produto = null) {
    $('#modalTitulo').textContent = produto ? 'Editar produto' : 'Novo produto';
    $('#prodId').value = produto ? (produto.id || produto._id) : '';
    $('#prodNome').value = produto?.nome || '';
    $('#prodModelo').value = produto?.modelo || '18';
    $('#prodPreco').value = produto?.precoBase ?? 14999.97;
    $('#prodDesc').value = produto?.descricao || '';
    $('#prodDestaques').value = (produto?.destaques || []).join(', ');
    $('#prodAtivo').value = String(produto ? produto.ativo !== false : true);
    modal.classList.add('open');
  }
  const fecharModal = () => modal.classList.remove('open');
  $('#btnNovoProduto').addEventListener('click', () => abrirModal());
  $('#cancelarProduto').addEventListener('click', fecharModal);
  modal.addEventListener('click', (e) => e.target === modal && fecharModal());

  $('#formProduto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#prodId').value;
    const dados = {
      nome: $('#prodNome').value.trim(),
      modelo: $('#prodModelo').value,
      precoBase: Number($('#prodPreco').value),
      descricao: $('#prodDesc').value.trim(),
      destaques: $('#prodDestaques').value.split(',').map((s) => s.trim()).filter(Boolean),
      ativo: $('#prodAtivo').value === 'true'
    };
    try {
      if (id) await API.produtos.atualizar(id, dados);
      else await API.produtos.criar({ ...dados, slug: dados.nome, variantes: [] });
      toast(id ? 'Produto atualizado' : 'Produto criado');
      fecharModal();
      await carregarTudo(true);
    } catch (err) { toast(err.message, true); }
  });

  /* ================== CARGA ================== */
  async function carregarTudo(silencioso = false) {
    try {
      const [stats, pedidos, agendamentos, produtos] = await Promise.all([
        API.admin.stats(),
        API.pedidos.listar(),
        API.agendamentos.listar(),
        API.produtos.listar('?todos=1')
      ]);
      estado.stats = stats.data;
      estado.pedidos = pedidos.data;
      estado.agendamentos = agendamentos.data;
      estado.produtos = produtos.data;

      renderDashboard();
      renderPedidos();
      renderAgendamentos();
      renderEstoque();
      renderProdutos();
      if (silencioso) toast('Dados atualizados');
    } catch (e) {
      if (e.status === 401) { API.setToken(null); location.reload(); return; }
      toast(e.message || 'Erro ao carregar dados', true);
    }
  }

  /* ================== SESSÃO ================== */
  (async function iniciar() {
    if (!API.getToken()) return;
    try {
      const { data } = await API.auth.eu();
      if (data.role !== 'admin') throw new Error('sem permissão');
      estado.usuario = data;
      mostrarPainel();
    } catch {
      API.setToken(null);
    }
  })();
})();
