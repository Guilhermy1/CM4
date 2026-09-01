/* CM4STORE - checkout + agendamento + pagamento */
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

  /* ---------- Overlay de pagamento ---------- */
  const overlay = $('#payOverlay');
  const passos = $$('#paySteps li');

  const Pay = {
    abrir() { overlay?.classList.add('on'); passos.forEach((p) => p.classList.remove('ativo', 'feito')); },
    fechar() { overlay?.classList.remove('on'); },
    passo(nome) {
      let passou = true;
      passos.forEach((p) => {
        if (p.dataset.passo === nome) { p.classList.add('ativo'); p.classList.remove('feito'); passou = false; }
        else if (passou) { p.classList.add('feito'); p.classList.remove('ativo'); }
        else { p.classList.remove('ativo', 'feito'); }
      });
    },
    sucesso(numero) {
      passos.forEach((p) => { p.classList.remove('ativo'); p.classList.add('feito'); });
      $('#paySpinner')?.remove();
      $('#payTitulo').textContent = 'Pagamento aprovado!';
      $('#payTexto').textContent = `Pedido ${numero} confirmado. Redirecionando…`;
    }
  };

  /* ---------- Resumo do carrinho ---------- */
  function renderResumo() {
    const itens = Cart.itens();
    const box = $('#resumoItens');
    if (!box) return;

    if (!itens.length) {
      box.innerHTML = '<p class="estoque-info">Sua sacola está vazia. <a href="/" class="neon">Escolher um modelo</a>.</p>';
      if (btn) btn.disabled = true;
    } else {
      box.innerHTML = itens.map((i) => `
        <div class="cart-item" style="grid-template-columns:44px 1fr auto;padding:12px">
          <div class="thumb" style="width:44px;height:44px;background:${i.hex || '#D8D8DC'}"></div>
          <div><h4>${i.nome}</h4><p>${i.cor} · ${i.armazenamento} · ${i.quantidade}x</p></div>
          <div class="preco">${window.brl(i.precoUnitario * i.quantidade)}</div>
        </div>`).join('');
      if (btn) btn.disabled = false;
    }

    const total = Cart.total();
    $('#subtotal').textContent = window.brl(total);
    $('#total').textContent = window.brl(total);
    atualizarBotao();
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

  /* ---------- Metodo de pagamento ---------- */
  const TEXTO_GATEWAY = {
    pix: 'Ao confirmar, geramos o QR Code PIX no ambiente do gateway. A aprovação costuma levar poucos segundos.',
    cartao: 'Ao confirmar, os dados do cartão são coletados diretamente pelo gateway (MercadoPago/Stripe) em ambiente PCI-DSS. A CM4STORE não tem acesso a eles.',
    boleto: 'Ao confirmar, o boleto é emitido pelo gateway e enviado para o seu e-mail. A compensação leva até 2 dias úteis.'
  };
  function metodoPagamento() {
    return $$('input[name="metodo"]').find((r) => r.checked)?.value || 'pix';
  }
  function atualizarBotao() {
    if (!btn || btn.dataset.ocupado) return;
    const total = Cart.total();
    btn.textContent = total > 0 ? `Pagar ${window.brl(total)}` : 'Pagar';
  }
  $$('input[name="metodo"]').forEach((r) =>
    r.addEventListener('change', () => {
      const t = $('#gatewayTexto');
      if (t) t.textContent = TEXTO_GATEWAY[metodoPagamento()] || TEXTO_GATEWAY.pix;
    })
  );

  /* ---------- Agenda ---------- */
  function renderDatas() {
    const box = $('#datas');
    box.innerHTML = agenda.map((d) => {
      const [a, m, dia] = d.data.split('-');
      const dt = new Date(Number(a), Number(m) - 1, Number(dia));
      const cheio = d.horarios.every((h) => !h.disponivel);
      return `<button type="button" class="date-chip" data-data="${d.data}" aria-pressed="${selecao.data === d.data}" ${cheio ? 'disabled' : ''}>
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
    const nome = $('#nome').value.trim();
    const email = $('#email').value.trim();
    const telefone = $('#telefone').value.replace(/\D/g, '');

    const nomeOk = nome.split(' ').filter(Boolean).length >= 2;
    marcar('nome', !nomeOk);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    marcar('email', !emailOk);

    const telOk = telefone.length >= 10;
    marcar('telefone', !telOk);

    let ok = nomeOk && emailOk && telOk;

    if (tipoEntrega() === 'entrega') {
      ['cep', 'cidade', 'endereco', 'numero'].forEach((id) => {
        const vazio = !$(`#${id}`).value.trim();
        marcar(id, vazio);
        if (vazio) ok = false;
      });
    }
    return ok;
  }

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Envio + pagamento ---------- */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparAlerta();

    if (!Cart.itens().length) return mostrarAlerta('Sua sacola está vazia. Escolha um modelo antes de finalizar.');
    if (!validar()) return mostrarAlerta('Confira os campos destacados antes de continuar.');
    if (!selecao.data || !selecao.hora) return mostrarAlerta('Selecione uma data e um horário para o agendamento.');

    const metodo = metodoPagamento();
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
      pagamento: { metodo },
      agendamento: { data: selecao.data, hora: selecao.hora, observacoes: $('#obs').value.trim() },
      observacoes: $('#obs').value.trim()
    };

    btn.dataset.ocupado = '1';
    btn.disabled = true;
    btn.textContent = 'Processando…';
    Pay.abrir();

    try {
      /* 1) Registra o pedido (reserva estoque + agendamento) */
      Pay.passo('pedido');
      const resp = await API.pedidos.criar(payload);
      const pedido = resp.data.pedido;
      const orderId = pedido.id || pedido._id;
      const numero = pedido.numero;

      /* 2) Abre a sessao de pagamento no gateway.
            PLACEHOLDER: quando MercadoPago/Stripe estiverem plugados, o backend
            devolve `checkoutUrl` (redirect) ou `clientSecret` (SDK embutido). */
      Pay.passo('gateway');
      const sessao = await API.pagamentos.checkout(orderId, metodo);
      await espera(700);

      if (sessao?.data?.checkoutUrl) {
        // Fluxo real: redireciona para o ambiente do gateway.
        location.href = sessao.data.checkoutUrl;
        return;
      }

      /* 3) Autorizacao da cobranca.
            PLACEHOLDER: no fluxo real quem confirma e o webhook do gateway. */
      Pay.passo('cobranca');
      await API.pagamentos.confirmar(orderId, sessao?.data?.transacaoId).catch(() => null);
      await espera(900);

      /* 4) Agendamento ja gravado junto com o pedido */
      Pay.passo('agenda');
      await espera(500);

      Pay.sucesso(numero);
      Cart.limpar();
      await espera(900);
      location.href = `/confirmacao?pedido=${encodeURIComponent(numero)}`;
    } catch (err) {
      Pay.fechar();
      mostrarAlerta(err.message || 'Não foi possível concluir o pagamento. Tente novamente.');
      delete btn.dataset.ocupado;
      btn.disabled = false;
      atualizarBotao();
      if (err.status === 409) carregarAgenda();
    }
  });

  renderResumo();
  carregarAgenda();
})();
