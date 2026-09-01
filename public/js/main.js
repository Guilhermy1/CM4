/* CM4STORE - landing page */
(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  /* ---------- Header / navegação ---------- */
  const header = $('#header');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger');
  const nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  const ano = $('#ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Animações de entrada ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    reveals.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`; io.observe(el); });
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  // brilho que segue o mouse nos cards
  $$('.feature').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Cena 3D ---------- */
  let cena3d = null;
  const stage = $('#stage3d');
  if (stage) {
    cena3d = window.iPhone3D(stage, { cor: '#b8b0a5' });
    const loader = $('#stageLoader');
    if (loader) setTimeout(() => loader.classList.add('hidden'), cena3d ? 500 : 200);
    if (!cena3d) $('.stage-fallback', stage)?.classList.add('on');
  }

  /* ---------- Carrinho ---------- */
  const overlay = $('#overlay');
  const drawer = $('#drawer');
  const abrir = () => { overlay?.classList.add('open'); drawer?.classList.add('open'); };
  const fechar = () => { overlay?.classList.remove('open'); drawer?.classList.remove('open'); };
  $('#abrirCarrinho')?.addEventListener('click', abrir);
  $('#fecharCarrinho')?.addEventListener('click', fechar);
  overlay?.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fechar());

  function renderCarrinho(itens) {
    const body = $('#cartBody');
    const count = $('#cartCount');
    const total = $('#cartTotal');
    const btn = $('#irCheckout');
    if (!body) return;

    const qtd = itens.reduce((a, i) => a + i.quantidade, 0);
    if (count) { count.textContent = qtd; count.hidden = qtd === 0; }
    if (total) total.textContent = window.brl(Cart.total());
    if (btn) btn.classList.toggle('btn-primary', qtd > 0);

    if (!itens.length) {
      body.innerHTML = '<div class="cart-empty">Sua sacola está vazia.<br>Escolha um modelo para comprar.</div>';
      return;
    }

    body.innerHTML = itens.map((i) => `
      <div class="cart-item">
        <div class="thumb" style="background:${i.hex || '#D8D8DC'}"></div>
        <div>
          <h4>${i.nome}</h4>
          <p>${i.cor} · ${i.armazenamento}</p>
          <div class="qty">
            <button data-menos="${i.sku}" aria-label="Diminuir">−</button>
            <span>${i.quantidade}</span>
            <button data-mais="${i.sku}" aria-label="Aumentar">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div class="preco">${window.brl(i.precoUnitario * i.quantidade)}</div>
          <button class="icon-btn" data-remover="${i.sku}" aria-label="Remover" style="font-size:.75rem">remover</button>
        </div>
      </div>`).join('');

    $$('[data-mais]', body).forEach((b) => b.addEventListener('click', () => Cart.alterarQtd(b.dataset.mais, 1)));
    $$('[data-menos]', body).forEach((b) => b.addEventListener('click', () => Cart.alterarQtd(b.dataset.menos, -1)));
    $$('[data-remover]', body).forEach((b) => b.addEventListener('click', () => Cart.remover(b.dataset.remover)));
  }
  Cart.onChange(renderCarrinho);

  /* ---------- Catálogo ---------- */
  const grid = $('#modelsGrid');

  const estadoSelecao = new Map(); // productId -> { cor, armazenamento }

  function variantesDe(produto, cor, armazenamento) {
    return (produto.variantes || []).find((v) => v.cor === cor && v.armazenamento === armazenamento);
  }

  function cardHTML(produto, idx) {
    const id = produto.id || produto._id;
    const cores = [...new Map((produto.variantes || []).map((v) => [v.cor, v])).values()];
    const armazenamentos = [...new Set((produto.variantes || []).map((v) => v.armazenamento))];
    const sel = estadoSelecao.get(id);
    const corSel = sel?.cor || cores[0]?.cor;
    const armSel = sel?.armazenamento || armazenamentos[0];
    const variante = variantesDe(produto, corSel, armSel);
    const estoque = variante?.estoque ?? 0;

    const classeEstoque = estoque === 0 ? 'zero' : estoque <= 5 ? 'baixo' : '';
    const textoEstoque = estoque === 0 ? 'Esgotado nesta configuração'
      : estoque <= 5 ? `Últimas ${estoque} unidades` : `${estoque} unidades disponíveis`;

    return `
    <article class="model-card reveal ${idx === 1 ? 'destaque' : ''}" data-produto="${id}">
      ${idx === 1 ? '<span class="tag">Mais procurado</span>' : '<span class="tag" style="visibility:hidden">.</span>'}
      <h3>${produto.nome}</h3>
      <p class="desc">${produto.descricao || ''}</p>

      <div class="opt-group">
        <span class="opt-label">Cor</span>
        <div class="colors">
          ${cores.map((c) => `<button class="color-dot" title="${c.cor}" data-cor="${c.cor}" aria-pressed="${c.cor === corSel}" style="background:${c.hex}"></button>`).join('')}
        </div>
      </div>

      <div class="opt-group">
        <span class="opt-label">Armazenamento</span>
        <div class="storages">
          ${armazenamentos.map((a) => {
            const v = variantesDe(produto, corSel, a);
            return `<button class="chip" data-arm="${a}" aria-pressed="${a === armSel}" ${v ? '' : 'disabled'}>${a}</button>`;
          }).join('')}
        </div>
      </div>

      <span class="estoque-info ${classeEstoque}">${textoEstoque}</span>

      <div class="preco">${window.brl(variante?.preco ?? produto.precoBase)}<small>ou 12x sem juros</small></div>

      <button class="btn btn-primary btn-block" data-add="${id}" ${estoque === 0 ? 'disabled' : ''}>
        ${estoque === 0 ? 'Indisponível' : 'Adicionar à sacola'}
      </button>
    </article>`;
  }

  let catalogo = [];

  function render() {
    if (!grid) return;
    grid.innerHTML = catalogo.map(cardHTML).join('');
    $$('.model-card', grid).forEach((card) => {
      const id = card.dataset.produto;
      const produto = catalogo.find((p) => String(p.id || p._id) === id);

      $$('[data-cor]', card).forEach((b) => b.addEventListener('click', () => {
        const atual = estadoSelecao.get(id) || {};
        estadoSelecao.set(id, { ...atual, cor: b.dataset.cor });
        const hex = (produto.variantes.find((v) => v.cor === b.dataset.cor) || {}).hex;
        if (cena3d && hex) cena3d.definirCor(hex);
        render();
      }));

      $$('[data-arm]', card).forEach((b) => b.addEventListener('click', () => {
        const atual = estadoSelecao.get(id) || {};
        estadoSelecao.set(id, { ...atual, armazenamento: b.dataset.arm });
        render();
      }));

      $('[data-add]', card)?.addEventListener('click', () => {
        const sel = estadoSelecao.get(id) || {};
        const cor = sel.cor || produto.variantes[0].cor;
        const arm = sel.armazenamento || produto.variantes[0].armazenamento;
        const variante = variantesDe(produto, cor, arm);
        if (!variante || variante.estoque === 0) return;

        Cart.adicionar({
          productId: id,
          nome: produto.nome,
          modelo: produto.modelo,
          cor: variante.cor,
          hex: variante.hex,
          armazenamento: variante.armazenamento,
          sku: variante.sku,
          precoUnitario: variante.preco,
          quantidade: 1
        });
        abrir();
      });
    });

    $$('.reveal', grid).forEach((el) => el.classList.add('visible'));
  }

  async function carregar() {
    try {
      const [{ data: produtos }, cfg] = await Promise.all([
        API.produtos.listar(),
        API.config().catch(() => null)
      ]);
      catalogo = produtos;
      render();

      const menor = Math.min(...produtos.flatMap((p) => (p.variantes || []).map((v) => v.preco)));
      const preco = window.brl(Number.isFinite(menor) ? menor : cfg?.data?.precoPadrao || 14999.97);
      const heroPreco = $('#heroPreco'); if (heroPreco) heroPreco.textContent = preco;
      const destaque = $('#precoDestaque'); if (destaque) destaque.textContent = preco;
    } catch (e) {
      console.error(e);
      if (grid) grid.innerHTML = `<div class="model-card"><p class="desc">Não foi possível carregar o catálogo agora. Atualize a página em instantes.</p></div>`;
    }
  }

  carregar();
})();
