/* ============================================================
   CM4STORE - iPhone 18 Pro em 3D (Three.js)
   Modelo gerado proceduralmente (sem download de .glb):
   - moldura em aco/titanio com brilho especular
   - vidro traseiro com gradiente natural por cor
   - tela com bezel fino, Dynamic Island e reflexo
   - modulo de cameras com lentes, anel metalico e reflexo real
   - troca de cor animada (lerp) + giro suave do aparelho
   ============================================================ */
(function (global) {
  'use strict';

  function criarCena(container, opcoes = {}) {
    if (!global.THREE) return null;
    const THREE = global.THREE;

    const largura = container.clientWidth || 480;
    const altura = container.clientHeight || 520;

    const cena = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(30, largura / altura, 0.1, 100);
    camera.position.set(0, 0, 13.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(largura, altura);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    /* ---------- Ambiente refletido (studio) ----------
       Um envMap procedural em canvas da o brilho "de vitrine" nos metais
       e nas lentes, sem depender de nenhum arquivo externo.            */
    function criarEnvMap() {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 256;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0.00, '#ffffff');
      grad.addColorStop(0.42, '#e9e9ee');
      grad.addColorStop(0.52, '#9a9aa2');
      grad.addColorStop(1.00, '#2c2c30');
      g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
      // faixas de softbox (reflexos alongados tipicos de estudio)
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.fillRect(40, 24, 150, 60);
      g.fillRect(300, 40, 120, 44);
      g.fillStyle = 'rgba(0,0,0,.28)';
      g.fillRect(210, 96, 70, 160);
      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;

      // PMREM deixa o reflexo fisicamente correto nos materiais PBR
      try {
        if (THREE.PMREMGenerator) {
          const pmrem = new THREE.PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const alvo = pmrem.fromEquirectangular(tex);
          tex.dispose();
          pmrem.dispose();
          return alvo.texture;
        }
      } catch (e) { /* usa a textura crua se o PMREM falhar */ }
      return tex;
    }
    const envMap = criarEnvMap();
    cena.environment = envMap;

    /* ---------- Luzes ---------- */
    cena.add(new THREE.AmbientLight(0xffffff, 0.55));
    if (THREE.HemisphereLight) cena.add(new THREE.HemisphereLight(0xffffff, 0xd2d2d8, 0.7));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 9);
    cena.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(-7, 4, -6);
    cena.add(rimLight);

    // Rim verde CM4STORE - discreto sobre fundo claro
    const rimNeon = new THREE.PointLight(0x7fd000, 1.4, 40);
    rimNeon.position.set(-6, 3, -3);
    cena.add(rimNeon);

    const fill = new THREE.PointLight(0xffffff, 1.5, 40);
    fill.position.set(6, -4, 5);
    cena.add(fill);

    /* ---------- Geometria: retangulo arredondado extrudado ---------- */
    function placaArredondada(l, a, prof, raio, opts = {}) {
      const forma = new THREE.Shape();
      const x = -l / 2, y = -a / 2;
      forma.moveTo(x + raio, y);
      forma.lineTo(x + l - raio, y);
      forma.quadraticCurveTo(x + l, y, x + l, y + raio);
      forma.lineTo(x + l, y + a - raio);
      forma.quadraticCurveTo(x + l, y + a, x + l - raio, y + a);
      forma.lineTo(x + raio, y + a);
      forma.quadraticCurveTo(x, y + a, x, y + a - raio);
      forma.lineTo(x, y + raio);
      forma.quadraticCurveTo(x, y, x + raio, y);

      const geo = new THREE.ExtrudeGeometry(forma, {
        depth: prof,
        bevelEnabled: opts.bevel !== false,
        bevelThickness: opts.bevelThickness ?? 0.03,
        bevelSize: opts.bevelSize ?? 0.03,
        bevelSegments: opts.bevelSegments ?? 6,
        curveSegments: opts.curveSegments ?? 24
      });
      geo.center();
      return geo;
    }

    /* ---------- Cores derivadas da variante ---------- */
    const corBase = new THREE.Color(opcoes.cor || '#7C6BA8');

    // moldura metalica: mesma matiz, bem mais clara e dessaturada (titanio tingido)
    function tonalMoldura(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.42, 0.28), Math.min(0.62 + hsl.l * 0.22, 0.82));
    }
    // vidro traseiro inferior: versao mais escura, cria o gradiente natural
    function tonalFundo(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l * 0.55, 0.045));
    }

    /* ---------- Materiais ---------- */
    const matVidroTraseiro = new THREE.MeshStandardMaterial({
      color: corBase.clone(), metalness: 0.35, roughness: 0.34, envMap, envMapIntensity: 0.85
    });
    const matMoldura = new THREE.MeshStandardMaterial({
      color: tonalMoldura(corBase), metalness: 1, roughness: 0.16, envMap, envMapIntensity: 1.5
    });
    const matSombraFundo = new THREE.MeshStandardMaterial({
      color: tonalFundo(corBase), metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0.55, envMap
    });
    const matBezel = new THREE.MeshStandardMaterial({ color: 0x08090b, metalness: 0.5, roughness: 0.3 });
    const matTela = new THREE.MeshStandardMaterial({
      color: 0x05070a, metalness: 0.05, roughness: 0.06,
      emissive: new THREE.Color(0x0d1a05), emissiveIntensity: 0.9, envMap, envMapIntensity: 0.35
    });
    const matVidroModulo = new THREE.MeshStandardMaterial({
      color: tonalFundo(corBase), metalness: 0.55, roughness: 0.22, envMap, envMapIntensity: 1.1
    });
    const matAnel = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 1, roughness: 0.14, envMap, envMapIntensity: 1.6 });
    const matLenteVidro = new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: 0.95, roughness: 0.04, envMap, envMapIntensity: 1.8 });
    const matBotao = new THREE.MeshStandardMaterial({ color: tonalMoldura(corBase), metalness: 1, roughness: 0.2, envMap, envMapIntensity: 1.4 });
    const matNeon = new THREE.MeshBasicMaterial({ color: 0x7fd000 });
    const matEspecular = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    /* ---------- Montagem do aparelho ---------- */
    const L = 3.05, A = 6.42, P = 0.36, R = 0.62;
    const telefone = new THREE.Group();

    // 1) Moldura (banda lateral) - um pouco maior e mais espessa
    const moldura = new THREE.Mesh(
      placaArredondada(L, A, P, R, { bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 8 }),
      matMoldura
    );
    telefone.add(moldura);

    // 2) Vidro traseiro (levemente recuado dentro da moldura)
    const traseira = new THREE.Mesh(
      placaArredondada(L - 0.075, A - 0.075, 0.04, R - 0.035, { bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4 }),
      matVidroTraseiro
    );
    traseira.position.z = -P / 2 - 0.028;
    telefone.add(traseira);

    // 2b) Gradiente natural: sombreamento na metade inferior do vidro
    const gradienteFundo = new THREE.Mesh(
      placaArredondada(L - 0.09, (A - 0.09) * 0.52, 0.005, R - 0.06, { bevel: false }),
      matSombraFundo
    );
    gradienteFundo.position.set(0, -(A - 0.09) * 0.24, -P / 2 - 0.052);
    telefone.add(gradienteFundo);

    // 3) Vidro frontal / bezel preto
    const bezel = new THREE.Mesh(
      placaArredondada(L - 0.07, A - 0.07, 0.035, R - 0.03, { bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4 }),
      matBezel
    );
    bezel.position.z = P / 2 + 0.026;
    telefone.add(bezel);

    // 4) Tela ativa (bezel fino e uniforme, como no aparelho real)
    const BEZEL = 0.085;
    const tela = new THREE.Mesh(
      placaArredondada(L - 0.07 - BEZEL * 2, A - 0.07 - BEZEL * 2, 0.012, R - 0.09, { bevel: false }),
      matTela
    );
    tela.position.z = P / 2 + 0.05;
    telefone.add(tela);

    // 5) Reflexo diagonal no vidro frontal
    const brilho = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 0.5, A * 1.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055 })
    );
    brilho.position.set(-0.42, 0, P / 2 + 0.058);
    brilho.rotation.z = 0.3;
    telefone.add(brilho);

    const brilho2 = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 0.16, A * 1.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 })
    );
    brilho2.position.set(0.42, 0, P / 2 + 0.058);
    brilho2.rotation.z = 0.3;
    telefone.add(brilho2);

    // 6) Dynamic Island
    const ilha = new THREE.Mesh(
      placaArredondada(0.62, 0.2, 0.02, 0.1, { bevel: false }),
      new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.2, roughness: 0.25 })
    );
    ilha.position.set(0, A / 2 - 0.52, P / 2 + 0.056);
    telefone.add(ilha);

    // camera frontal dentro da ilha
    const camFrontal = new THREE.Mesh(
      new THREE.CircleGeometry(0.052, 20),
      new THREE.MeshStandardMaterial({ color: 0x0a1620, metalness: 1, roughness: 0.08, envMap, envMapIntensity: 1.6 })
    );
    camFrontal.position.set(0.19, ilha.position.y, P / 2 + 0.068);
    telefone.add(camFrontal);

    // 7) Logo neon discreto no verso
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), matNeon);
    logo.position.set(0, 0.1, -P / 2 - 0.056);
    logo.rotation.y = Math.PI;
    telefone.add(logo);

    // 8) Modulo de cameras (verso)
    const modulo = new THREE.Mesh(
      placaArredondada(1.5, 1.5, 0.13, 0.46, { bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 5 }),
      matVidroModulo
    );
    modulo.position.set(-L / 2 + 0.94, A / 2 - 1.06, -P / 2 - 0.1);
    telefone.add(modulo);

    const posLentes = [[-0.31, 0.31], [0.31, 0.31], [0, -0.33]];
    posLentes.forEach(([x, y]) => {
      const cx = modulo.position.x + x, cy = modulo.position.y + y;

      // anel metalico externo
      const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.30, 0.14, 40), matAnel);
      anel.rotation.x = Math.PI / 2;
      anel.position.set(cx, cy, -P / 2 - 0.2);
      telefone.add(anel);

      // vidro da lente (levemente abaulado)
      const lente = new THREE.Mesh(new THREE.SphereGeometry(0.215, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.35), matLenteVidro);
      lente.rotation.x = Math.PI / 2;
      lente.position.set(cx, cy, -P / 2 - 0.245);
      telefone.add(lente);

      // iris interna
      const iris = new THREE.Mesh(
        new THREE.CircleGeometry(0.115, 28),
        new THREE.MeshStandardMaterial({ color: 0x0a1a2e, metalness: 1, roughness: 0.12, envMap, envMapIntensity: 1.4 })
      );
      iris.position.set(cx, cy, -P / 2 - 0.245);
      iris.rotation.y = Math.PI;
      telefone.add(iris);

      // reflexo especular principal (brilho de estudio)
      const reflexo = new THREE.Mesh(new THREE.CircleGeometry(0.062, 20), matEspecular);
      reflexo.position.set(cx - 0.085, cy + 0.085, -P / 2 - 0.33);
      reflexo.rotation.y = Math.PI;
      telefone.add(reflexo);

      // segundo reflexo, menor
      const reflexo2 = new THREE.Mesh(
        new THREE.CircleGeometry(0.028, 16),
        new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.6 })
      );
      reflexo2.position.set(cx + 0.09, cy - 0.09, -P / 2 - 0.33);
      reflexo2.rotation.y = Math.PI;
      telefone.add(reflexo2);
    });

    // Flash LED duplo + sensor LiDAR
    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff4cf })
    );
    flash.position.set(modulo.position.x + 0.42, modulo.position.y - 0.3, -P / 2 - 0.18);
    flash.rotation.y = Math.PI;
    telefone.add(flash);

    const lidar = new THREE.Mesh(
      new THREE.CircleGeometry(0.062, 18),
      new THREE.MeshStandardMaterial({ color: 0x14181f, metalness: 1, roughness: 0.1, envMap, envMapIntensity: 1.5 })
    );
    lidar.position.set(modulo.position.x + 0.42, modulo.position.y + 0.34, -P / 2 - 0.18);
    lidar.rotation.y = Math.PI;
    telefone.add(lidar);

    // 9) Botoes laterais em aco
    const botao = (h, y, x) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, 0.19), matBotao);
      b.position.set(x, y, 0);
      telefone.add(b);
    };
    botao(0.8, 1.3, L / 2 + 0.012);    // power
    botao(0.44, 1.72, -L / 2 - 0.012); // volume +
    botao(0.44, 1.16, -L / 2 - 0.012); // volume -
    botao(0.3, 2.3, -L / 2 - 0.012);   // action button

    telefone.rotation.set(0.1, -0.4, 0);
    cena.add(telefone);

    // Halo suave atras do aparelho
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 64),
      new THREE.MeshBasicMaterial({ color: 0x7fd000, transparent: true, opacity: 0.035 })
    );
    halo.position.z = -3.4;
    cena.add(halo);

    // Sombra de contato (dois niveis: nucleo + difusa) para dar profundidade
    const sombraNucleo = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x1d1d1f, transparent: true, opacity: 0.16 })
    );
    sombraNucleo.rotation.x = -Math.PI / 2;
    sombraNucleo.position.set(0, -3.72, 0);
    sombraNucleo.scale.set(1, 0.42, 1);
    cena.add(sombraNucleo);

    const sombraDifusa = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 48),
      new THREE.MeshBasicMaterial({ color: 0x1d1d1f, transparent: true, opacity: 0.07 })
    );
    sombraDifusa.rotation.x = -Math.PI / 2;
    sombraDifusa.position.set(0, -3.76, 0);
    sombraDifusa.scale.set(1, 0.45, 1);
    cena.add(sombraDifusa);

    /* ---------- Interacao (arrastar) ---------- */
    const estado = { alvoY: -0.4, alvoX: 0.1, arrastando: false, ultX: 0, ultY: 0, autoRotacao: true };

    const inicio = (x, y) => { estado.arrastando = true; estado.autoRotacao = false; estado.ultX = x; estado.ultY = y; };
    const mover = (x, y) => {
      if (!estado.arrastando) return;
      estado.alvoY += (x - estado.ultX) * 0.008;
      estado.alvoX = Math.max(-0.9, Math.min(0.9, estado.alvoX + (y - estado.ultY) * 0.006));
      estado.ultX = x; estado.ultY = y;
    };
    const fim = () => {
      estado.arrastando = false;
      clearTimeout(estado.timer);
      estado.timer = setTimeout(() => { estado.autoRotacao = true; }, 2600);
    };

    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); inicio(e.clientX, e.clientY); });
    el.addEventListener('pointermove', (e) => mover(e.clientX, e.clientY));
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', fim);
    el.addEventListener('touchmove', (e) => { if (estado.arrastando) e.preventDefault(); }, { passive: false });

    /* ---------- Transicao de cor animada ---------- */
    const transicao = { ativa: false, t: 0, dur: 0.85, de: corBase.clone(), para: corBase.clone() };

    function aplicarCor(c) {
      matVidroTraseiro.color.copy(c);
      matMoldura.color.copy(tonalMoldura(c));
      matBotao.color.copy(tonalMoldura(c));
      matSombraFundo.color.copy(tonalFundo(c));
      matVidroModulo.color.copy(tonalFundo(c));
    }
    aplicarCor(corBase);

    /* ---------- Loop ---------- */
    let rafId = null;
    let ativo = true;
    const relogio = new THREE.Clock();

    function animar() {
      rafId = requestAnimationFrame(animar);
      if (!ativo) return;

      const dt = relogio.getDelta();
      const t = relogio.getElapsedTime();

      if (estado.autoRotacao) estado.alvoY += 0.0045;

      // easing da rotacao (mais suave durante a troca de cor)
      const suavidade = transicao.ativa ? 0.045 : 0.08;
      telefone.rotation.y += (estado.alvoY - telefone.rotation.y) * suavidade;
      telefone.rotation.x += (estado.alvoX - telefone.rotation.x) * suavidade;

      // interpolacao da cor
      if (transicao.ativa) {
        transicao.t = Math.min(transicao.t + dt / transicao.dur, 1);
        const e = transicao.t < 0.5
          ? 4 * transicao.t ** 3
          : 1 - (-2 * transicao.t + 2) ** 3 / 2; // easeInOutCubic
        aplicarCor(transicao.de.clone().lerp(transicao.para, e));
        if (transicao.t >= 1) { transicao.ativa = false; aplicarCor(transicao.para); }
      }

      const flutuar = Math.sin(t * 0.9) * 0.12;
      telefone.position.y = flutuar;
      matTela.emissiveIntensity = 0.85 + Math.sin(t * 1.5) * 0.15;
      rimNeon.intensity = 1.3 + Math.sin(t * 1.2) * 0.35;

      const s = 1 - flutuar * 0.3;
      sombraNucleo.scale.set(s, s * 0.42, 1);
      sombraNucleo.material.opacity = 0.16 - flutuar * 0.035;
      sombraDifusa.scale.set(s * 1.04, s * 0.45, 1);

      renderer.render(cena, camera);
    }
    animar();

    // Pausa quando fora da viewport (economia de bateria/CPU)
    if ('IntersectionObserver' in global) {
      new IntersectionObserver((entradas) => { ativo = entradas[0].isIntersecting; }, { threshold: 0.05 })
        .observe(container);
    }

    function redimensionar() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    global.addEventListener('resize', redimensionar);

    return {
      /**
       * Troca a cor do aparelho.
       * @param {string} hex  cor destino
       * @param {object} opts { girar:true } faz o iPhone dar uma volta suave
       */
      definirCor(hex, opts = {}) {
        const destino = new THREE.Color(hex || '#7C6BA8');
        transicao.de = matVidroTraseiro.color.clone();
        transicao.para = destino;
        transicao.t = 0;
        transicao.ativa = true;

        if (opts.girar !== false) {
          estado.autoRotacao = false;
          estado.alvoY += Math.PI * 2; // giro completo, suavizado pelo lerp do loop
          clearTimeout(estado.timer);
          estado.timer = setTimeout(() => { estado.autoRotacao = true; }, 3200);
        }
      },
      destruir() { cancelAnimationFrame(rafId); renderer.dispose(); el.remove(); }
    };
  }

  /** Inicializa no container informado; devolve null se WebGL/Three indisponivel. */
  global.iPhone3D = function initIphone3D(seletor, opcoes) {
    const container = typeof seletor === 'string' ? document.querySelector(seletor) : seletor;
    if (!container) return null;
    try {
      const cena = criarCena(container, opcoes);
      if (!cena) throw new Error('Three.js indisponivel');
      container.classList.add('pronto');
      return cena;
    } catch (e) {
      console.warn('[3D] fallback CSS ativado:', e.message);
      const fb = container.querySelector('.stage-fallback');
      if (fb) fb.classList.add('on');
      return null;
    }
  };
})(window);
