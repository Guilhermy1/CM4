/* ============================================================
   CM4STORE - iPhone 17 Pro Max em 3D (Three.js r128)
   ------------------------------------------------------------
   Modelo 100% procedural (nenhum .glb / nenhuma textura externa),
   redesenhado para acompanhar o formato real do iPhone 17 Pro Max:
   corpo em squircle, PLATÔ DE CÂMERA horizontal (a mudança de
   design mais visível da geração 17 Pro em diante, substituindo
   o antigo módulo quadrado no canto), Dynamic Island e botões
   no layout atual (Power, volume, Action Button, Camera Control).

   Mantém a mesma API pública do arquivo anterior para não quebrar
   main.js:
     const cena = window.iPhone3D('#stage3d', { cor: '#7C6BA8' });
     cena.definirCor('#6B1F2E', { girar: true });
     cena.destruir();

   MATERIAIS
     - moldura em alumínio/titânio polido (metalness alto,
       roughness baixo) com leve tingimento pela cor escolhida
     - platô de câmera no mesmo tom da moldura (acabamento
       fosco, como no aparelho real — bicolor com o vidro)
     - vidro traseiro fosco com clearcoat, cor = swatch escolhido
     - tela: preto profundo, bezel fino, reflexo só do ambiente
     - câmeras: domo em LatheGeometry (curvatura real), anel
       metálico escovado e reflexo especular duplo por lente

   ILUMINAÇÃO
     - HDRI de estúdio procedural (softboxes) + PMREM
     - key / fill / rim, sombra de contato na base

   PERFORMANCE
     - perfil "alto" (desktop) e "leve" (mobile / GPU fraca)
     - PMREM em lazy-load após o primeiro frame
     - pausa o loop quando o container sai da viewport
   ============================================================ */
(function (global) {
  'use strict';

  /* Medidas reais do iPhone 17 Pro Max, em milímetros. */
  const ESCALA = 3.05 / 77.6;
  const mm = (v) => v * ESCALA;

  const MM = {
    largura: 77.6,
    altura: 163.4,
    espessura: 8.75,
    raioBorda: 4.2,
    raioCanto: 10.5,
    bezel: 2.0,
    platoAltura: 38,       // altura (vertical) do platô de câmera
    platoMargem: 7.5,      // distância do platô até a borda lateral
    platoTopo: 9,          // distância do platô até o topo do aparelho
    platoRaio: 16,
    lente: 12.6
  };

  /* Paleta de referência (a CM4STORE injeta o hex do swatch clicado;
     qualquer cor fora dessa lista cai no perfil "Custom" abaixo). */
  const PALETA = {
    '#7c6ba8': { nome: 'Purple', reflexo: 1.18, clear: 0.22 },
    '#6e4e3a': { nome: 'Coffee', reflexo: 1.02, clear: 0.26 },
    '#6b1f2e': { nome: 'Burgundy', reflexo: 1.10, clear: 0.20 },
    '#1c1c1e': { nome: 'Black', reflexo: 1.38, clear: 0.12 }
  };

  function perfilDaCor(hex) {
    const chave = String(hex || '').toLowerCase();
    if (PALETA[chave]) return PALETA[chave];
    return { nome: 'Custom', reflexo: 1.12, clear: 0.22 };
  }

  function detectarPerfil() {
    const nav = global.navigator || {};
    const telaPequena = (global.innerWidth || 1024) < 820;
    const toqueGrosso = global.matchMedia ? global.matchMedia('(pointer: coarse)').matches : false;
    const poucosNucleos = (nav.hardwareConcurrency || 8) <= 4;
    const poucaMemoria = (nav.deviceMemory || 8) <= 4;
    const economia = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    const leve = telaPequena || (toqueGrosso && poucosNucleos) || poucaMemoria;

    return {
      leve,
      animacaoReduzida: economia,
      pixelRatioMax: leve ? 1.75 : 2,
      envSize: leve ? 512 : 1024,
      sombras: !leve,
      sombraRes: 2048,
      fisico: !leve,
      segCurva: leve ? 14 : 32,
      segLente: leve ? 20 : 48,
      bevelSeg: leve ? 3 : 8
    };
  }

  /* ================= TEXTURAS PROCEDURAIS ================= */
  function canvasEstudio(largura) {
    const c = document.createElement('canvas');
    c.width = largura; c.height = largura / 2;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;

    const fundo = g.createLinearGradient(0, 0, 0, H);
    fundo.addColorStop(0.00, '#ffffff');
    fundo.addColorStop(0.30, '#f2f3f6');
    fundo.addColorStop(0.48, '#c9cbd2');
    fundo.addColorStop(0.52, '#6f727a');
    fundo.addColorStop(0.78, '#33353b');
    fundo.addColorStop(1.00, '#141518');
    g.fillStyle = fundo;
    g.fillRect(0, 0, W, H);

    function softbox(x, y, w, h, forca) {
      const r = g.createLinearGradient(x, y, x, y + h);
      r.addColorStop(0, 'rgba(255,255,255,0)');
      r.addColorStop(0.5, `rgba(255,255,255,${forca})`);
      r.addColorStop(1, 'rgba(255,255,255,0)');
      const anterior = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      g.filter = `blur(${Math.round(W * 0.012)}px)`;
      g.fillStyle = r;
      g.fillRect(x, y, w, h);
      g.filter = 'none';
      g.globalCompositeOperation = anterior;
    }

    softbox(W * 0.06, H * 0.06, W * 0.30, H * 0.34, 1.0);
    softbox(W * 0.58, H * 0.12, W * 0.22, H * 0.24, 0.45);
    softbox(W * 0.42, H * 0.02, W * 0.05, H * 0.46, 0.85);
    softbox(W * 0.86, H * 0.10, W * 0.12, H * 0.22, 0.55);

    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.filter = `blur(${Math.round(W * 0.02)}px)`;
    g.fillRect(W * 0.24, H * 0.42, W * 0.12, H * 0.5);
    g.fillRect(W * 0.66, H * 0.40, W * 0.10, H * 0.5);
    g.filter = 'none';

    return c;
  }

  function canvasSombra(tam) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
    r.addColorStop(0.00, 'rgba(0,0,0,0.55)');
    r.addColorStop(0.35, 'rgba(0,0,0,0.30)');
    r.addColorStop(0.70, 'rgba(0,0,0,0.08)');
    r.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, tam, tam);
    return c;
  }

  function canvasFundoTela(larguraPx, alturaPx) {
    const c = document.createElement('canvas');
    c.width = larguraPx; c.height = alturaPx;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, larguraPx, alturaPx);
    grad.addColorStop(0, '#0c0716');
    grad.addColorStop(0.55, '#1c1030');
    grad.addColorStop(1, '#341a3d');
    g.fillStyle = grad;
    g.fillRect(0, 0, larguraPx, alturaPx);
    return c;
  }

  /* ================= CENA ================= */
  function criarCena(container, opcoes = {}) {
    if (!global.THREE) return null;
    const THREE = global.THREE;
    const P = detectarPerfil();

    const largura = container.clientWidth || 480;
    const altura = container.clientHeight || 520;

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, largura / altura, 0.1, 120);
    camera.position.set(0, 0.5, 13.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(largura, altura);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, P.pixelRatioMax));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
    }
    if (P.sombras) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    container.appendChild(renderer.domElement);

    const descartaveis = [];
    const registra = (o) => { descartaveis.push(o); return o; };

    /* ---- Environment (HDRI procedural) ---- */
    const texEstudio = registra(new THREE.CanvasTexture(canvasEstudio(P.envSize)));
    texEstudio.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.sRGBEncoding !== undefined) texEstudio.encoding = THREE.sRGBEncoding;

    let envMap = texEstudio;
    cena.environment = envMap;

    let alvoPMREM = null;
    function gerarPMREM() {
      if (!THREE.PMREMGenerator) return;
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();
        alvoPMREM = pmrem.fromEquirectangular(texEstudio);
        pmrem.dispose();
        envMap = alvoPMREM.texture;
        cena.environment = envMap;
        cena.traverse((o) => {
          if (o.material && 'envMap' in o.material) { o.material.envMap = envMap; o.material.needsUpdate = true; }
        });
      } catch (e) { /* mantém a textura crua se PMREM falhar */ }
    }

    /* ================= GEOMETRIA ================= */
    function contornoSquircle(l, a, raio, segCanto) {
      const R = Math.min(raio * 1.55, Math.min(l, a) / 2);
      const n = 5;
      const forma = new THREE.Shape();
      const x = l / 2, y = a / 2;
      const cantos = [
        { cx: x - R, cy: y - R, sx: 1, sy: 1 },
        { cx: -x + R, cy: y - R, sx: -1, sy: 1 },
        { cx: -x + R, cy: -y + R, sx: -1, sy: -1 },
        { cx: x - R, cy: -y + R, sx: 1, sy: -1 }
      ];
      let primeiro = true;
      cantos.forEach((c) => {
        const direto = c.sx * c.sy > 0;
        for (let i = 0; i <= segCanto; i++) {
          const t = i / segCanto;
          const th = (direto ? t : 1 - t) * Math.PI / 2;
          const px = c.cx + c.sx * R * Math.pow(Math.abs(Math.cos(th)), 2 / n);
          const py = c.cy + c.sy * R * Math.pow(Math.abs(Math.sin(th)), 2 / n);
          if (primeiro) { forma.moveTo(px, py); primeiro = false; }
          else forma.lineTo(px, py);
        }
      });
      forma.closePath();
      return forma;
    }

    function placa(l, a, prof, raio, opts = {}) {
      const bevel = opts.bevel !== false;
      const bt = opts.bevelThickness ?? mm(0.4);
      const bs = opts.bevelSize ?? mm(0.4);
      const fl = bevel ? l - bs * 2 : l;
      const fa = bevel ? a - bs * 2 : a;
      const fr = bevel ? Math.max(raio - bs, 0.001) : raio;
      const forma = contornoSquircle(fl, fa, fr, opts.segCanto ?? P.segCurva);
      const geo = new THREE.ExtrudeGeometry(forma, {
        depth: Math.max(prof - (bevel ? bt * 2 : 0), 0.001),
        bevelEnabled: bevel,
        bevelThickness: bt,
        bevelSize: bs,
        bevelOffset: 0,
        bevelSegments: opts.bevelSegments ?? P.bevelSeg,
        curveSegments: 1
      });
      geo.center();
      geo.computeVertexNormals();
      return registra(geo);
    }

    function gradienteVertical(geo, topo, base) {
      const pos = geo.attributes.position;
      const cores = new Float32Array(pos.count * 3);
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < pos.count; i++) { const v = pos.getY(i); if (v < min) min = v; if (v > max) max = v; }
      const amp = (max - min) || 1;
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) - min) / amp;
        const k = base + (topo - base) * t;
        cores[i * 3] = cores[i * 3 + 1] = cores[i * 3 + 2] = k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
      return geo;
    }

    /* ================= CORES DERIVADAS ================= */
    const corBase = new THREE.Color(opcoes.cor || '#7C6BA8');
    let perfilCor = perfilDaCor(opcoes.cor || '#7C6BA8');

    function tomMoldura(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      const l = Math.min(0.58 + hsl.l * 0.30, 0.84) - 0.05;
      return new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.30, 0.20), Math.max(l, 0.62));
    }
    function tomProfundo(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return new THREE.Color().setHSL(hsl.h, hsl.s * 0.92, Math.max(hsl.l * 0.62, 0.04));
    }

    /* ================= MATERIAIS ================= */
    const Fisico = P.fisico && THREE.MeshPhysicalMaterial ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    function aplicarIOR(mat, valor) {
      if (mat && 'ior' in mat) mat.ior = valor;
      else if (mat && 'reflectivity' in mat) mat.reflectivity = 0.5;
    }

    const matMoldura = new Fisico({ color: tomMoldura(corBase), metalness: 1, roughness: 0.16, envMap, envMapIntensity: 1.7, vertexColors: true });
    if ('clearcoat' in matMoldura) { matMoldura.clearcoat = 0.3; matMoldura.clearcoatRoughness = 0.12; }

    const matBotao = new Fisico({ color: tomMoldura(corBase), metalness: 1, roughness: 0.18, envMap, envMapIntensity: 1.6 });

    const matVidroTraseiro = new Fisico({
      color: corBase.clone(), metalness: 0.12, roughness: 0.40, envMap, envMapIntensity: perfilCor.reflexo, vertexColors: true
    });
    if ('clearcoat' in matVidroTraseiro) { matVidroTraseiro.clearcoat = 1.0; matVidroTraseiro.clearcoatRoughness = perfilCor.clear; }
    aplicarIOR(matVidroTraseiro, 1.5);

    // platô de câmera: mesmo acabamento fosco/metálico da moldura (design bicolor real)
    const matPlato = new Fisico({ color: tomMoldura(corBase), metalness: 0.85, roughness: 0.30, envMap, envMapIntensity: 1.3, vertexColors: true });
    if ('clearcoat' in matPlato) { matPlato.clearcoat = 0.25; matPlato.clearcoatRoughness = 0.2; }

    const matBezel = new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.35, roughness: 0.22, envMap, envMapIntensity: 0.55 });

    const texTela = registra(new THREE.CanvasTexture(canvasFundoTela(512, 1080)));
    const matTela = new THREE.MeshStandardMaterial({ map: texTela, roughness: 0.2, metalness: 0, envMap, envMapIntensity: 0.35 });

    const matPretoFosco = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.5 });

    const matAnel = new Fisico({ color: 0xb6b9c0, metalness: 1, roughness: 0.2, envMap, envMapIntensity: 1.9 });

    const matSafira = new Fisico({ color: 0x05070c, metalness: 0.9, roughness: 0.04, envMap, envMapIntensity: 2.1 });
    if ('clearcoat' in matSafira) { matSafira.clearcoat = 1; matSafira.clearcoatRoughness = 0.02; }
    aplicarIOR(matSafira, 1.77);

    const matIris = new THREE.MeshStandardMaterial({ color: 0x0b1524, metalness: 1, roughness: 0.16, envMap, envMapIntensity: 1.4 });
    const matPupila = new THREE.MeshStandardMaterial({ color: 0x01030a, metalness: 0.4, roughness: 0.45 });
    const matEspecular = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    const matEspecular2 = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.45, depthWrite: false });

    const materiais = [matMoldura, matBotao, matVidroTraseiro, matPlato, matBezel, matTela, matPretoFosco, matAnel, matSafira, matIris, matPupila, matEspecular, matEspecular2];

    /* ================= MONTAGEM ================= */
    const L = mm(MM.largura);
    const A = mm(MM.altura);
    const E = mm(MM.espessura);
    const RC = mm(MM.raioCanto);
    const RB = mm(MM.raioBorda);

    const telefone = new THREE.Group();

    /* 1) Corpo / moldura */
    const geoMoldura = placa(L, A, E, RC, { bevelThickness: RB, bevelSize: RB, bevelSegments: P.bevelSeg });
    gradienteVertical(geoMoldura, 1.05, 0.90);
    const moldura = new THREE.Mesh(geoMoldura, matMoldura);
    moldura.castShadow = P.sombras;
    moldura.receiveShadow = P.sombras;
    telefone.add(moldura);

    const zFrente = E / 2;
    const zVerso = -E / 2;

    /* 2) Vidro traseiro fosco */
    const larguraVidro = L - RB * 2 + mm(0.6);
    const alturaVidro = A - RB * 2 + mm(0.6);
    const geoTraseira = placa(larguraVidro, alturaVidro, mm(0.9), RC - mm(1.2), { bevelThickness: mm(0.25), bevelSize: mm(0.25), bevelSegments: 3 });
    gradienteVertical(geoTraseira, 1.10, 0.78);
    const traseira = new THREE.Mesh(geoTraseira, matVidroTraseiro);
    traseira.position.z = zVerso + mm(0.2);
    traseira.receiveShadow = P.sombras;
    telefone.add(traseira);

    /* 3) Vidro frontal + bezel + tela */
    const bezel = new THREE.Mesh(
      placa(larguraVidro, alturaVidro, mm(0.8), RC - mm(1.2), { bevelThickness: mm(0.2), bevelSize: mm(0.2), bevelSegments: 3 }),
      matBezel
    );
    bezel.position.z = zFrente - mm(0.2);
    telefone.add(bezel);

    const BEZEL = 0.09;
    const tela = new THREE.Mesh(
      placa(larguraVidro - BEZEL * 2, alturaVidro - BEZEL * 2, mm(0.35), RC - mm(3.2), { bevel: false }),
      matTela
    );
    tela.position.z = zFrente + mm(0.15);
    telefone.add(tela);

    /* 4) Dynamic Island */
    const ilha = new THREE.Mesh(placa(mm(26), mm(8.2), mm(0.3), mm(4.1), { bevel: false, segCanto: 12 }), matPretoFosco);
    ilha.position.set(0, A / 2 - mm(16), zFrente + mm(0.32));
    telefone.add(ilha);

    const camFrontal = new THREE.Mesh(
      new THREE.CircleGeometry(mm(1.5), 24),
      new THREE.MeshStandardMaterial({ color: 0x081321, metalness: 1, roughness: 0.07, envMap, envMapIntensity: 1.8 })
    );
    camFrontal.position.set(mm(7), ilha.position.y, zFrente + mm(0.42));
    telefone.add(camFrontal);

    /* 5) Emblema discreto no verso */
    const emblema = new THREE.Mesh(
      new THREE.CircleGeometry(mm(6), 48),
      new THREE.MeshStandardMaterial({ color: tomProfundo(corBase), metalness: 0.3, roughness: 0.62, envMap, envMapIntensity: 0.5 })
    );
    emblema.position.set(0, -A / 2 + mm(24), zVerso - mm(0.45));
    emblema.rotation.y = Math.PI;
    telefone.add(emblema);

    /* 6) PLATÔ DE CÂMERA — barra horizontal no topo do verso
          (design do iPhone 17 Pro / Pro Max: substitui o antigo
          módulo quadrado por uma faixa que atravessa quase toda
          a largura do aparelho). */
    const largPlato = L - mm(MM.platoMargem) * 2;
    const altPlato = mm(MM.platoAltura);
    const plato = new THREE.Mesh(
      placa(largPlato, altPlato, mm(2.6), mm(MM.platoRaio), { bevelThickness: mm(0.5), bevelSize: mm(0.5), bevelSegments: P.bevelSeg }),
      matPlato
    );
    gradienteVertical(plato.geometry, 1.04, 0.94);
    plato.position.set(0, A / 2 - mm(MM.platoTopo) - altPlato / 2, zVerso - mm(1.5));
    plato.castShadow = P.sombras;
    telefone.add(plato);

    const zPlato = plato.position.z - mm(0.85);

    function geoDomo(raio, alturaDomo) {
      const pts = [];
      const passos = P.leve ? 10 : 18;
      for (let i = 0; i <= passos; i++) {
        const a = (i / passos) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.sin(a) * raio, Math.cos(a) * alturaDomo));
      }
      pts.push(new THREE.Vector2(raio, -mm(1.2)));
      return registra(new THREE.LatheGeometry(pts, P.segLente));
    }

    const rAnel = mm(MM.lente / 2);
    const rLente = rAnel * 0.76;
    const geoDomoLente = geoDomo(rLente, mm(0.85));

    // três lentes em linha, alinhadas à esquerda do platô
    const espacoLente = mm(16.5);
    const inicioX = -largPlato / 2 + mm(15);
    const posLentes = [
      [inicioX, 0],
      [inicioX + espacoLente, 0],
      [inicioX + espacoLente * 2, 0]
    ];

    posLentes.forEach(([dx, dy]) => {
      const cx = plato.position.x + dx;
      const cy = plato.position.y + dy;
      const grupo = new THREE.Group();
      grupo.position.set(cx, cy, zPlato);

      const anel = new THREE.Mesh(new THREE.CylinderGeometry(rAnel, rAnel * 1.04, mm(2.8), P.segLente, 1, true), matAnel);
      anel.rotation.x = Math.PI / 2;
      anel.position.z = mm(0.4);
      grupo.add(anel);

      const aro = new THREE.Mesh(new THREE.RingGeometry(rLente * 1.01, rAnel, P.segLente), matAnel);
      aro.position.z = -mm(1.0);
      aro.rotation.y = Math.PI;
      grupo.add(aro);

      const domo = new THREE.Mesh(geoDomoLente, matSafira);
      domo.rotation.x = -Math.PI / 2;
      domo.position.z = -mm(1.0);
      grupo.add(domo);

      const iris = new THREE.Mesh(new THREE.RingGeometry(rLente * 0.34, rLente * 0.80, P.leve ? 18 : 36), matIris);
      iris.position.z = -mm(0.2);
      iris.rotation.y = Math.PI;
      grupo.add(iris);

      const pupila = new THREE.Mesh(new THREE.CircleGeometry(rLente * 0.34, P.leve ? 16 : 28), matPupila);
      pupila.position.z = -mm(0.1);
      pupila.rotation.y = Math.PI;
      grupo.add(pupila);

      const r1 = new THREE.Mesh(new THREE.CircleGeometry(rLente * 0.30, 18), matEspecular);
      r1.position.set(-rLente * 0.36, rLente * 0.36, -mm(1.95));
      r1.rotation.y = Math.PI;
      grupo.add(r1);

      const r2 = new THREE.Mesh(new THREE.CircleGeometry(rLente * 0.13, 14), matEspecular2);
      r2.position.set(rLente * 0.40, -rLente * 0.40, -mm(1.95));
      r2.rotation.y = Math.PI;
      grupo.add(r2);

      telefone.add(grupo);
    });

    // flash + LiDAR à direita das lentes, dentro do platô
    const xSensores = inicioX + espacoLente * 3.05;
    const flashCorpo = new THREE.Mesh(new THREE.CylinderGeometry(mm(2.4), mm(2.4), mm(1.2), 24), matAnel);
    flashCorpo.rotation.x = Math.PI / 2;
    flashCorpo.position.set(plato.position.x + xSensores, plato.position.y + mm(6), zPlato + mm(1.2));
    telefone.add(flashCorpo);

    const flash = new THREE.Mesh(new THREE.CircleGeometry(mm(2.0), 24), new THREE.MeshBasicMaterial({ color: 0xfff2d2 }));
    flash.position.set(plato.position.x + xSensores, plato.position.y + mm(6), zPlato + mm(0.4));
    flash.rotation.y = Math.PI;
    telefone.add(flash);

    const lidar = new THREE.Mesh(
      new THREE.CircleGeometry(mm(1.7), 20),
      new THREE.MeshStandardMaterial({ color: 0x11151c, metalness: 1, roughness: 0.09, envMap, envMapIntensity: 1.6 })
    );
    lidar.position.set(plato.position.x + xSensores, plato.position.y - mm(6), zPlato + mm(0.4));
    lidar.rotation.y = Math.PI;
    telefone.add(lidar);

    /* 7) Botões laterais (layout iPhone 17 Pro Max) */
    function botao(alturaMM, yMM, lado) {
      const h = mm(alturaMM);
      const g = placa(mm(3.2), h, mm(2.2), mm(1.0), { bevelThickness: mm(0.35), bevelSize: mm(0.35), bevelSegments: 4 });
      const b = new THREE.Mesh(g, matBotao);
      b.rotation.y = Math.PI / 2;
      b.position.set(lado * (L / 2 - mm(0.6)), mm(yMM), 0);
      b.castShadow = P.sombras;
      telefone.add(b);
    }
    botao(30, 32, 1);       // power / side button
    botao(9, 58, -1);       // action button
    botao(16, 44, -1);      // volume +
    botao(16, 31, -1);      // volume -
    botao(11, 8, 1);        // camera control

    telefone.rotation.set(0.08, -0.42, 0);
    cena.add(telefone);

    /* ================= ILUMINAÇÃO ================= */
    cena.add(new THREE.AmbientLight(0xffffff, 0.18));
    if (THREE.HemisphereLight) cena.add(new THREE.HemisphereLight(0xf4f6ff, 0xb9bcc4, 0.28));

    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    key.position.set(6.5, 9.5, 8.0);
    if (P.sombras) {
      key.castShadow = true;
      key.shadow.mapSize.set(P.sombraRes, P.sombraRes);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 40;
      key.shadow.camera.left = -6; key.shadow.camera.right = 6;
      key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
      key.shadow.bias = -0.0009;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 6;
    }
    cena.add(key);

    const fill = new THREE.DirectionalLight(0xeef2ff, 0.62);
    fill.position.set(-8, -2.5, 6);
    cena.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.47);
    rim.position.set(-4.5, 5.5, -8);
    cena.add(rim);

    const acento = new THREE.PointLight(0x7fd000, 0.5, 26);
    acento.position.set(-6, 2.5, -3.5);
    cena.add(acento);

    /* ================= SOMBRA ================= */
    const yChao = -A / 2 - 0.28;
    let chaoSombra = null;
    if (P.sombras && THREE.ShadowMaterial) {
      chaoSombra = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.20 }));
      chaoSombra.rotation.x = -Math.PI / 2;
      chaoSombra.position.set(0, yChao, 0);
      chaoSombra.receiveShadow = true;
      cena.add(chaoSombra);
    }

    const texSombra = registra(new THREE.CanvasTexture(canvasSombra(256)));
    const contato = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 2.1, L * 2.1),
      new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: 0.85, depthWrite: false })
    );
    contato.rotation.x = -Math.PI / 2;
    contato.position.set(0, yChao + 0.005, 0);
    contato.scale.set(1, 0.85, 1);
    cena.add(contato);

    /* ================= INTERAÇÃO (arrastar para girar) ================= */
    const estado = { alvoY: -0.42, alvoX: 0.08, arrastando: false, ultX: 0, ultY: 0, autoRotacao: !P.animacaoReduzida, timer: null };
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
      if (!P.animacaoReduzida) estado.timer = setTimeout(() => { estado.autoRotacao = true; }, 2600);
    };

    const el = renderer.domElement;
    const onDown = (e) => { try { el.setPointerCapture(e.pointerId); } catch (_) {} inicio(e.clientX, e.clientY); };
    const onMove = (e) => mover(e.clientX, e.clientY);
    const onTouch = (e) => { if (estado.arrastando) e.preventDefault(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', fim);
    el.addEventListener('pointercancel', fim);
    el.addEventListener('touchmove', onTouch, { passive: false });

    /* ================= TROCA DE COR ================= */
    const transicao = {
      ativa: false, t: 0, dur: 0.85,
      de: corBase.clone(), para: corBase.clone(),
      dePerfil: { reflexo: perfilCor.reflexo, clear: perfilCor.clear },
      paraPerfil: { reflexo: perfilCor.reflexo, clear: perfilCor.clear }
    };

    function aplicarCor(c, perfil) {
      matVidroTraseiro.color.copy(c);
      matMoldura.color.copy(tomMoldura(c));
      matBotao.color.copy(tomMoldura(c));
      matPlato.color.copy(tomMoldura(c));
      emblema.material.color.copy(tomProfundo(c));
      if (perfil) {
        matVidroTraseiro.envMapIntensity = perfil.reflexo;
        if ('clearcoatRoughness' in matVidroTraseiro) matVidroTraseiro.clearcoatRoughness = perfil.clear;
      }
    }
    aplicarCor(corBase, perfilCor);

    /* ================= LOOP ================= */
    let rafId = null;
    let ativo = true;
    let frames = 0;
    let pmremFeito = false;
    const relogio = new THREE.Clock();

    function animar() {
      rafId = requestAnimationFrame(animar);
      if (!ativo) return;

      const dt = Math.min(relogio.getDelta(), 0.05);
      const t = relogio.getElapsedTime();

      if (!pmremFeito && ++frames === 2) {
        pmremFeito = true;
        const agenda = global.requestIdleCallback || ((f) => setTimeout(f, 60));
        agenda(gerarPMREM);
      }

      if (estado.autoRotacao) estado.alvoY += 0.0042;

      const suavidade = transicao.ativa ? 0.045 : 0.08;
      telefone.rotation.y += (estado.alvoY - telefone.rotation.y) * suavidade;
      telefone.rotation.x += (estado.alvoX - telefone.rotation.x) * suavidade;

      if (transicao.ativa) {
        transicao.t = Math.min(transicao.t + dt / transicao.dur, 1);
        const e = transicao.t < 0.5 ? 4 * transicao.t ** 3 : 1 - (-2 * transicao.t + 2) ** 3 / 2;
        const cor = transicao.de.clone().lerp(transicao.para, e);
        const p = {
          reflexo: transicao.dePerfil.reflexo + (transicao.paraPerfil.reflexo - transicao.dePerfil.reflexo) * e,
          clear: transicao.dePerfil.clear + (transicao.paraPerfil.clear - transicao.dePerfil.clear) * e
        };
        aplicarCor(cor, p);
        if (transicao.t >= 1) { transicao.ativa = false; perfilCor = transicao.paraPerfil; aplicarCor(transicao.para, perfilCor); }
      }

      const flutuar = P.animacaoReduzida ? 0 : Math.sin(t * 0.85) * 0.10;
      telefone.position.y = flutuar;

      const s = 1 - flutuar * 0.28;
      contato.scale.set(s, s * 0.85, 1);
      contato.material.opacity = 0.85 - flutuar * 0.9;
      if (chaoSombra) chaoSombra.material.opacity = 0.20 - flutuar * 0.10;

      renderer.render(cena, camera);
    }
    animar();

    let observer = null;
    if ('IntersectionObserver' in global) {
      observer = new IntersectionObserver((entradas) => { ativo = entradas[0].isIntersecting; }, { threshold: 0.05 });
      observer.observe(container);
    }

    function redimensionar() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, P.pixelRatioMax));
    }
    global.addEventListener('resize', redimensionar);

    return {
      perfil: P,
      definirCor(hex, opts = {}) {
        const destino = new THREE.Color(hex || '#7C6BA8');
        transicao.de = matVidroTraseiro.color.clone();
        transicao.para = destino;
        transicao.dePerfil = { reflexo: perfilCor.reflexo, clear: perfilCor.clear };
        transicao.paraPerfil = perfilDaCor(hex);
        transicao.t = 0;
        transicao.ativa = true;

        if (opts.girar !== false && !P.animacaoReduzida) {
          estado.autoRotacao = false;
          estado.alvoY += Math.PI * 2;
          clearTimeout(estado.timer);
          estado.timer = setTimeout(() => { estado.autoRotacao = true; }, 3200);
        }
      },
      destruir() {
        cancelAnimationFrame(rafId);
        clearTimeout(estado.timer);
        if (observer) observer.disconnect();
        global.removeEventListener('resize', redimensionar);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', fim);
        el.removeEventListener('pointercancel', fim);
        el.removeEventListener('touchmove', onTouch);
        materiais.forEach((m) => m && m.dispose && m.dispose());
        descartaveis.forEach((o) => o && o.dispose && o.dispose());
        if (alvoPMREM) alvoPMREM.dispose();
        renderer.dispose();
        el.remove();
      }
    };
  }

  global.iPhone3D = function initIphone3D(seletor, opcoes) {
    const container = typeof seletor === 'string' ? document.querySelector(seletor) : seletor;
    if (!container) return null;
    try {
      const cena = criarCena(container, opcoes);
      if (!cena) throw new Error('Three.js indisponível');
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
