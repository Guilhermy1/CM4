/* CM4STORE - carrinho persistido em localStorage */
(function (global) {
  'use strict';

  const KEY = 'cm4_cart';
  const listeners = new Set();

  function ler() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function gravar(itens) {
    try { localStorage.setItem(KEY, JSON.stringify(itens)); } catch {}
    listeners.forEach((fn) => fn(itens));
  }

  const Cart = {
    itens: ler,
    onChange(fn) { listeners.add(fn); fn(ler()); return () => listeners.delete(fn); },

    adicionar(item) {
      const itens = ler();
      const existente = itens.find((i) => i.sku === item.sku);
      if (existente) existente.quantidade += item.quantidade || 1;
      else itens.push({ ...item, quantidade: item.quantidade || 1 });
      gravar(itens);
      return itens;
    },
    alterarQtd(sku, delta) {
      const itens = ler().map((i) => (i.sku === sku ? { ...i, quantidade: i.quantidade + delta } : i))
                         .filter((i) => i.quantidade > 0);
      gravar(itens);
      return itens;
    },
    remover(sku) { gravar(ler().filter((i) => i.sku !== sku)); },
    limpar() { gravar([]); },

    total() { return ler().reduce((a, i) => a + i.precoUnitario * i.quantidade, 0); },
    quantidade() { return ler().reduce((a, i) => a + i.quantidade, 0); },

    /** Formato aceito por POST /api/orders */
    paraPedido() { return ler().map((i) => ({ productId: i.productId, sku: i.sku, quantidade: i.quantidade })); }
  };

  global.Cart = Cart;
})(window);
