/* CM4STORE - cliente HTTP da API REST */
(function (global) {
  'use strict';

  const BASE = '/api';

  const TOKEN_KEY = 'cm4_token';
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

  async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
    const opts = { method, headers: { Accept: 'application/json', ...headers } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    if (auth) {
      const t = getToken();
      if (t) opts.headers.Authorization = `Bearer ${t}`;
    }

    const res = await fetch(BASE + path, opts);
    let data = null;
    try { data = await res.json(); } catch { /* resposta sem corpo */ }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Erro ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const API = {
    getToken, setToken,
    health: () => request('/health'),
    config: () => request('/config'),

    produtos: {
      listar: (q = '') => request(`/products${q}`),
      obter: (id) => request(`/products/${id}`),
      criar: (dados) => request('/products', { method: 'POST', body: dados, auth: true }),
      atualizar: (id, dados) => request(`/products/${id}`, { method: 'PATCH', body: dados, auth: true }),
      remover: (id) => request(`/products/${id}`, { method: 'DELETE', auth: true }),
      estoque: (id, sku, estoque) => request(`/products/${id}/estoque`, { method: 'PATCH', body: { sku, estoque }, auth: true })
    },

    pedidos: {
      criar: (dados) => request('/orders', { method: 'POST', body: dados }),
      obter: (id) => request(`/orders/${id}`),
      listar: (q = '') => request(`/orders${q}`, { auth: true }),
      status: (id, patch) => request(`/orders/${id}/status`, { method: 'PATCH', body: patch, auth: true }),
      remover: (id) => request(`/orders/${id}`, { method: 'DELETE', auth: true })
    },

    agendamentos: {
      disponibilidade: (dias = 14) => request(`/appointments/disponibilidade?dias=${dias}`),
      criar: (dados) => request('/appointments', { method: 'POST', body: dados }),
      listar: (q = '') => request(`/appointments${q}`, { auth: true }),
      atualizar: (id, patch) => request(`/appointments/${id}`, { method: 'PATCH', body: patch, auth: true }),
      remover: (id) => request(`/appointments/${id}`, { method: 'DELETE', auth: true })
    },

    auth: {
      login: (email, senha) => request('/auth/login', { method: 'POST', body: { email, senha } }),
      registrar: (dados) => request('/auth/registrar', { method: 'POST', body: dados }),
      eu: () => request('/auth/eu', { auth: true })
    },

    admin: {
      stats: () => request('/admin/stats', { auth: true })
    },

    pagamentos: {
      checkout: (orderId, metodo) => request('/payments/checkout', { method: 'POST', body: { orderId, metodo } })
    }
  };

  global.API = API;
  global.brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
})(window);
