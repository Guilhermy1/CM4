'use strict';
const { getRepos } = require('../repositories');

const hoje = () => new Date().toISOString().slice(0, 10);

/** GET /api/admin/stats - metricas do dashboard. */
exports.dashboard = async (req, res) => {
  const repos = await getRepos();
  const [pedidos, agendamentos, produtos, usuarios] = await Promise.all([
    repos.orders.all(),
    repos.appointments.all(),
    repos.products.all(),
    repos.users.all()
  ]);

  const ativos = pedidos.filter((p) => p.status !== 'cancelado');
  const faturamento = ativos.reduce((a, p) => a + (p.total || 0), 0);
  const pagos = pedidos.filter((p) => p.pagamento?.status === 'aprovado');

  const porStatus = pedidos.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {});
  const porModelo = {};
  const estoquePorProduto = produtos.map((p) => ({
    id: String(p._id || p.id),
    nome: p.nome,
    modelo: p.modelo,
    estoque: (p.variantes || []).reduce((a, v) => a + (v.estoque || 0), 0),
    variantesCriticas: (p.variantes || []).filter((v) => (v.estoque || 0) <= 5).length
  }));

  for (const p of ativos) {
    for (const i of p.itens || []) {
      porModelo[i.modelo || i.nome] = (porModelo[i.modelo || i.nome] || 0) + i.quantidade;
    }
  }

  const ultimos7 = [...Array(7)].map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const dia = d.toISOString().slice(0, 10);
    const doDia = ativos.filter((p) => String(p.createdAt).slice(0, 10) === dia);
    return { dia, pedidos: doDia.length, valor: Number(doDia.reduce((a, p) => a + (p.total || 0), 0).toFixed(2)) };
  });

  res.json({
    ok: true,
    data: {
      modo: repos.mode,
      resumo: {
        totalPedidos: pedidos.length,
        pedidosAtivos: ativos.length,
        pedidosPagos: pagos.length,
        faturamento: Number(faturamento.toFixed(2)),
        ticketMedio: ativos.length ? Number((faturamento / ativos.length).toFixed(2)) : 0,
        totalAgendamentos: agendamentos.length,
        agendamentosHoje: agendamentos.filter((a) => a.data === hoje()).length,
        totalProdutos: produtos.length,
        estoqueTotal: estoquePorProduto.reduce((a, p) => a + p.estoque, 0),
        totalClientes: usuarios.filter((u) => u.role === 'cliente').length
      },
      porStatus,
      porModelo,
      estoquePorProduto,
      ultimos7,
      ultimosPedidos: pedidos.slice(0, 8),
      proximosAgendamentos: agendamentos
        .filter((a) => ['agendado', 'confirmado'].includes(a.status))
        .sort((a, b) => `${a.data}${a.hora}`.localeCompare(`${b.data}${b.hora}`))
        .slice(0, 8)
    }
  });
};
