/* ============================================================
   CM4STORE - iPhone 18 em 3D (Three.js)
   Modelo gerado proceduralmente: nao depende de download de .glb,
   e a cor do corpo/tela acompanha a variante escolhida na loja.
   ============================================================ */
(function (global) {
  'use strict';

  function criarCena(container, opcoes = {}) {
    if (!global.THREE) return null;
    const THREE = global.THREE;

    const largura = container.clientWidth || 480;
    const altura = container.clientHeight || 520;

    const cena = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(32, largura / altura, 0.1, 100);
    camera.position.set(0, 0, 12.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(largura, altura);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    /* ---------- Luzes ---------- */
    cena.add(new THREE.AmbientLight(0xffffff, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(5, 7, 8);
    cena.add(keyLight);

    const rimNeon = new THREE.PointLight(0x7fd000, 4.2, 40);
    rimNeon.position.set(-6, 3, -4);
    cena.add(rimNeon);

    const fill = new THREE.PointLight(0xffffff, 1.6, 40);
    fill.position.set(6, -4, 4);
    cena.add(fill);

    /* ---------- Geometria utilitaria: retangulo arredondado extrudado ---------- */
    function placaArredondada(l, a, prof, raio, segmentos = 6) {
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
        depth: prof, bevelEnabled: true, bevelThickness: 0.045,
        bevelSize: 0.045, bevelSegments: segmentos, curveSegments: 18
      });
      geo.center();
      return geo;
    }

    /* ---------- Materiais ---------- */
    const matCorpo = new THREE.MeshStandardMaterial({
      color: new THREE.Color(opcoes.cor || '#3a3f47'), metalness: 0.92, roughness: 0.28
    });
    const matTela = new THREE.MeshStandardMaterial({
      color: 0x05070a, metalness: 0.15, roughness: 0.08,
      emissive: new THREE.Color(0x7fd000), emissiveIntensity: 0.14
    });
    const matVidro = new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.6, roughness: 0.12 });
    const matLente = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, metalness: 1, roughness: 0.05 });
    const matAnel = new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 1, roughness: 0.22 });
    const matNeon = new THREE.MeshBasicMaterial({ color: 0x7fd000 });

    /* ---------- Montagem do aparelho ---------- */
    const L = 3.05, A = 6.3, P = 0.42, R = 0.55;
    const telefone = new THREE.Group();

    const corpo = new THREE.Mesh(placaArredondada(L, A, P, R), matCorpo);
    telefone.add(corpo);

    // Tela (frente)
    const tela = new THREE.Mesh(placaArredondada(L - 0.16, A - 0.16, 0.03, R - 0.07), matTela);
    tela.position.z = P / 2 + 0.055;
    telefone.add(tela);

    // Brilho/reflexo diagonal na tela
    const brilhoGeo = new THREE.PlaneGeometry(L * 0.62, A * 0.95);
    const brilhoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.045 });
    const brilho = new THREE.Mesh(brilhoGeo, brilhoMat);
    brilho.position.set(-0.35, 0, P / 2 + 0.08);
    brilho.rotation.z = 0.32;
    telefone.add(brilho);

    // Dynamic Island
    const ilha = new THREE.Mesh(placaArredondada(0.66, 0.23, 0.05, 0.11, 4), matVidro);
    ilha.position.set(0, A / 2 - 0.62, P / 2 + 0.08);
    telefone.add(ilha);

    // Logo neon discreto no verso
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), matNeon);
    logo.position.set(0, 0.1, -P / 2 - 0.056);
    logo.rotation.y = Math.PI;
    telefone.add(logo);

    // Modulo de cameras (verso)
    const modulo = new THREE.Mesh(placaArredondada(1.42, 1.42, 0.14, 0.42), matVidro);
    modulo.position.set(-L / 2 + 0.92, A / 2 - 1.0, -P / 2 - 0.09);
    telefone.add(modulo);

    const posLentes = [[-0.3, 0.3], [0.3, 0.3], [0, -0.32]];
    posLentes.forEach(([x, y]) => {
      const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 28), matAnel);
      anel.rotation.x = Math.PI / 2;
      anel.position.set(modulo.position.x + x, modulo.position.y + y, -P / 2 - 0.2);
      telefone.add(anel);

      const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.13, 28), matLente);
      lente.rotation.x = Math.PI / 2;
      lente.position.set(modulo.position.x + x, modulo.position.y + y, -P / 2 - 0.24);
      telefone.add(lente);

      const reflexo = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: 0x9fe23a }));
      reflexo.position.set(modulo.position.x + x - 0.05, modulo.position.y + y + 0.05, -P / 2 - 0.31);
      reflexo.rotation.y = Math.PI;
      telefone.add(reflexo);
    });

    // Flash
    const flash = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    flash.position.set(modulo.position.x + 0.36, modulo.position.y - 0.34, -P / 2 - 0.17);
    flash.rotation.y = Math.PI;
    telefone.add(flash);

    // Botoes laterais
    const botao = (h, y, x) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.24), matAnel);
      b.position.set(x, y, 0);
      telefone.add(b);
    };
    botao(0.75, 1.35, L / 2 + 0.02);   // power
    botao(0.42, 1.7, -L / 2 - 0.02);   // volume +
    botao(0.42, 1.15, -L / 2 - 0.02);  // volume -
    botao(0.3, 2.25, -L / 2 - 0.02);   // action button

    telefone.rotation.set(0.12, -0.42, 0);
    cena.add(telefone);

    // Halo neon atras do aparelho
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fd000, transparent: true, opacity: 0.055 })
    );
    halo.position.z = -3.2;
    cena.add(halo);

    /* ---------- Interacao (arrastar) ---------- */
    const estado = { alvoY: -0.42, alvoX: 0.12, arrastando: false, ultX: 0, ultY: 0, autoRotacao: true };

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

    /* ---------- Loop ---------- */
    let rafId = null;
    let ativo = true;
    const relogio = new THREE.Clock();

    function animar() {
      rafId = requestAnimationFrame(animar);
      if (!ativo) return;

      const t = relogio.getElapsedTime();
      if (estado.autoRotacao) estado.alvoY += 0.0055;

      telefone.rotation.y += (estado.alvoY - telefone.rotation.y) * 0.08;
      telefone.rotation.x += (estado.alvoX - telefone.rotation.x) * 0.08;
      telefone.position.y = Math.sin(t * 0.9) * 0.13;
      matTela.emissiveIntensity = 0.12 + Math.sin(t * 1.5) * 0.05;
      rimNeon.intensity = 3.6 + Math.sin(t * 1.2) * 0.9;

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
      definirCor(hex) { matCorpo.color = new THREE.Color(hex || '#3a3f47'); },
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
