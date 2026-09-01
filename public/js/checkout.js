/* CM4STORE - checkout + agendamento */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const form = $('#formCheckout');
  const alerta = $('#alerta');
  const btn = $('#btnFinalizar');

  const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const selecao = { data: null, hora: null };
  let agenda = [];

  function mostrarAlerta(msg, tipo = 'erro') {
    if (!alerta) return;
    alerta.className = `alert alert-${tipo} on`;
    alerta.textContent = msg;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const limparAlerta = () => alerta && alerta.classList.remove('on');

  /* ---------- Resumo do carrinho ---------- */
  function renderResumo() {
    const itens = Cart.itens();
    const box = $('#resumoItens');
    if (!box) return;

    if (!itens.length) {
      box.innerHTML = '<p class="estoque-info">Seu carrinho está vazio. <a href="/" class="neon">Escolher um modelo</a>.</p>';
      if (btn) btn.disabled = true;
    } else {
      box.innerHTML = itens.map((i) => `
        <div class="cart-item" style="grid-template-columns:44px 1fr auto;padding:12px">
          <div class="thumb" style="width:44px;height:44px;background:linear-gradient(150deg, ${i.hex || '#2c3138'}, #101216)"></div>
          <div><h4>${i.nome}</h4><p>${i.cor} · ${i.armazenamento} · ${i.quantidade}x</p></div>
          <div class="preco">${window.brl(i.precoUnitario * i.quantidade)}</div>
        </div>`).join('');
      if (btn) btn.disabled = false;
    }

    const total = Cart.total();
    $('#subtotal').textContent = window.brl(total);
    $('#total').textContent = window.brl(total);
  }
  Cart.onChange(renderResumo);

  /* ---------- Entrega ---------- */
  const camposEndereco = $('#camposEndereco');
  const subAgenda = $('#subAgenda');
  function tipoEntrega() {
    return $$('input[name="tipoEntrega"]').find((r) => r.checked)?.value || 'retirada';
  }
  $$('input[name="tipoEntrega"]').forEach((r) =>
    r.addEventListener('change', () => {
      const entrega = tipoEntrega() === 'entrega';
      camposEndereco.hidden = !entrega;
      if (subAgenda) subAgenda.textContent = entrega
        ? 'Escolha quando quer receber seu iPhone 18 em casa.'
        : 'Escolha quando quer retirar seu iPhone 18.';
    })
  );

  /* ---------- Agenda ---------- */
  function renderDatas() {
    const box = $('#datas');
    box.innerHTML = agenda.map((d) => {
      const [a, m, dia] = d.data.split('-');
      const dt = new Date(Number(a), Number(m) - 1, Number(dia));
      const cheio = d.horarios.every((h) => !h.disponivel);
      return `<button type="button" class="date-chip" data-data="${d.data}" aria-pressed="${selecao.data === d.data}" ${cheio ? 'disabled style="opacity:.35"' : ''}>
        <span class="dia-sem">${DIAS_SEMANA[dt.getDay()]}</span>
        <span class="dia">${dia}</span>
        <span class="mes">${MESES[dt.getMonth()]}</span>
      </button>`;
    }).join('');

    $$('[data-data]', box).forEach((b) => b.addEventListener('click', () => {
      selecao.data = b.dataset.data;
      selecao.hora = null;
      renderDatas();
      renderHoras();
    }));
  }

  function renderHoras() {
    const box = $('#horas');
    const dia = agenda.find((d) => d.data === selecao.data);
    if (!dia) { box.innerHTML = ''; return; }

    box.innerHTML = dia.horarios.map((h) =>
      `<button type="button" class="hour-chip" data-hora="${h.hora}" aria-pressed="${selecao.hora === h.hora}" ${h.disponivel ? '' : 'disabled'}>${h.hora}</button>`
    ).join('');

    $$('[data-hora]', box).forEach((b) => b.addEventListener('click', () => {
      selecao.hora = b.dataset.hora;
      renderHoras();
    }));
  }

  async function carregarAgenda() {
    try {
      const { data } = await API.agendamentos.disponibilidade(14);
      agenda = data;
      selecao.data = agenda[0]?.data || null;
      renderDatas();
      renderHoras();
    } catch (e) {
      $('#datas').innerHTML = '<span class="estoque-info zero">Não foi possível carregar a agenda.</span>';
    }
  }

  /* ---------- Máscaras simples ---------- */
  const mascara = (el, fn) => el && el.addEventListener('input', () => { el.value = fn(el.value); });
  mascara($('#telefone'), (v) => v.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'));
  mascara($('#documento'), (v) => v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2'));
  mascara($('#cep'), (v) => v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'));
  mascara($('#uf'), (v) => v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2));

  /* ---------- Validação ---------- */
  const marcar = (id, invalido) => $(`#${id}`)?.closest('.field')?.classList.toggle('invalido', invalido);

  function validar() {
    let ok = true;
    const nome = $('#nome').value.trim();
    const email = $('#email').value.trim();
    const telefone = $('#telefone').value.replace(/\D/g, '');

    const nomeOk = nome.split(' ').filter(Boolean).length >= 2;
    marcar('nome', !nomeOk);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    marcar('email', !emailOk);

    const telOk = telefone.length >= 10;
    marcar('telefone', !telOk);

    ok = nomeOk && emailOk && telOk;

    if (tipoEntrega() === 'entrega') {
      const req = ['cep', 'cidade', 'endereco', 'numero'];
      req.forEach((id) => {
        const vazio = !$(`#${id}`).value.trim();
        marcar(id, vazio);
        if (vazio) ok = false;
      });
    }
    return ok;
  }

  /* ---------- Envio ---------- */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparAlerta();

    if (!Cart.itens().length) return mostrarAlerta('Seu carrinho está vazio. Escolha um modelo antes de finalizar.');
    if (!validar()) return mostrarAlerta('Confira os campos destacados antes de continuar.');
    if (!selecao.data || !selecao.hora) return mostrarAlerta('Selecione uma data e um horário para o agendamento.');

    const payload = {
      cliente: {
        nome: $('#nome').value.trim(),
        email: $('#email').value.trim(),
        telefone: $('#telefone').value.trim(),
        documento: $('#documento').value.trim()
      },
      itens: Cart.paraPedido(),
      entrega: {
        tipo: tipoEntrega(),
        cep: $('#cep').value.trim(),
        endereco: $('#endereco').value.trim(),
        numero: $('#numero').value.trim(),
        complemento: $('#complemento').value.trim(),
        bairro: $('#bairro').value.trim(),
        cidade: $('#cidade').value.trim(),
        uf: $('#uf').value.trim()
      },
      pagamento: { metodo: $$('input[name="metodo"]').find((r) => r.checked)?.value || 'pix' },
      agendamento: { data: selecao.data, hora: selecao.hora, observacoes: $('#obs').value.trim() },
      observacoes: $('#obs').value.trim()
    };

    btn.disabled = true;
    btn.textContent = 'Confirmando…';
    try {
      const resp = await API.pedidos.criar(payload);
      const numero = resp.data.pedido.numero;

      // placeholder do gateway (MercadoPago / Stripe entram aqui)
      await API.pagamentos.checkout(resp.data.pedido.id || resp.data.pedido._id, payload.pagamento.metodo).catch(() => null);

      Cart.limpar();
      location.href = `/confirmacao?pedido=${encodeURIComponent(numero)}`;
    } catch (err) {
      mostrarAlerta(err.message || 'Não foi possível concluir a reserva. Tente novamente.');
      btn.disabled = false;
      btn.textContent = 'Confirmar reserva';
      if (err.status === 409) carregarAgenda();
    }
  });

  renderResumo();
  carregarAgenda();
})();
