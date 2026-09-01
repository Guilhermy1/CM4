/* ============================================================
   CM4STORE - iPhone 18 Pro em 3D (Three.js r128)
   ------------------------------------------------------------
   Modelo 100% procedural (nenhum .glb / nenhuma textura externa).

   MATERIAIS
     - moldura em aco inox polido (metalness 1, roughness ~0.1)
       com normal map de micro-riscos gerado em canvas e gradiente
       sutil de tonalidade ao longo das laterais (vertex colors)
     - vidro traseiro fosco (roughness 0.4) com clearcoat, IOR 1.5
       e intensidade de reflexo diferente por cor do aparelho
     - tela: preto profundo, sem emissao, bezel fino e reflexo
       apenas do ambiente
     - cameras: domo de safira em LatheGeometry (curvatura real),
       iris interna f/1.8, anel metalico escovado e duplo reflexo
       especular por lente

   GEOMETRIA (medidas reais, ver bloco MM)
     - corpo 71.5 x 149.6 x 7.8 mm
     - raio das bordas 3.8 mm / cantos 8.1 mm em squircle continuo
     - modulo de cameras extrudado, botoes com volume real,
       sulcos de antena na moldura

   ILUMINACAO
     - HDRI de estudio procedural (softboxes) + PMREM
     - key (soft, 60 graus) / fill (oposto, 40%) / rim (traseira, 30%)
     - ambiente baixo para nao lavar o contraste

   SOMBRA
     - shadow map 2048x2048 com bordas suaves
     - contact shadow em gradiente na base

   PERFORMANCE
     - perfil "alto" (desktop) e "leve" (mobile / GPU fraca)
     - PMREM em lazy-load apos o primeiro frame
     - pausa o loop quando o container sai da viewport

   API PUBLICA (inalterada)
     const cena = window.iPhone3D('#stage3d', { cor: '#7C6BA8' });
     cena.definirCor('#6B1F2E', { girar: true });
     cena.destruir();
   ============================================================ */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------
     Medidas reais em milimetros e conversao para unidades de cena.
     A largura de 71.5 mm equivale a 3.05 unidades (escala herdada do
     enquadramento original da camera).
     ------------------------------------------------------------------ */
  const ESCALA = 3.05 / 71.5;              // unidades de cena por milimetro
  const mm = (v) => v * ESCALA;

  const MM = {
    largura: 71.5,
    altura: 149.6,
    espessura: 7.8,       // espessura real pedida
    raioBorda: 3.8,       // arredondamento do trilho lateral
    raioCanto: 8.1,       // raio nominal dos cantos (squircle)
    bezel: 2.0,           // moldura preta ao redor da tela
    moduloCam: 35.5,      // lado do modulo de cameras
    lente: 10.5           // diametro externo do anel da lente
  };

  /* Paleta oficial CM4STORE (reflexo calibrado por cor). */
  const PALETA = {
    '#7c6ba8': { nome: 'Purple',   reflexo: 1.18, clear: 0.22 },
    '#6e4e3a': { nome: 'Coffee',   reflexo: 1.02, clear: 0.26 },
    '#6b1f2e': { nome: 'Burgundy', reflexo: 1.10, clear: 0.20 },
    '#1c1c1e': { nome: 'Black',    reflexo: 1.38, clear: 0.12 }
  };

  function perfilDaCor(hex) {
    const chave = String(hex || '').toLowerCase();
    if (PALETA[chave]) return PALETA[chave];
    return { nome: 'Custom', reflexo: 1.12, clear: 0.22 };
  }

  /* ------------------------------------------------------------------
     Deteccao de capacidade: desktop recebe o caminho completo,
     mobile / GPU fraca recebe materiais simplificados.
     ------------------------------------------------------------------ */
  function detectarPerfil() {
    const nav = global.navigator || {};
    const telaPequena = (global.innerWidth || 1024) < 820;
    const toqueGrosso = global.matchMedia
      ? global.matchMedia('(pointer: coarse)').matches
      : false;
    const poucosNucleos = (nav.hardwareConcurrency || 8) <= 4;
    const poucaMemoria = (nav.deviceMemory || 8) <= 4;
    const economia = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    const leve = telaPequena || (toqueGrosso && poucosNucleos) || poucaMemoria;

    return {
      leve,
      animacaoReduzida: economia,
      pixelRatioMax: leve ? 1.75 : 2,
      envSize: leve ? 512 : 1024,
      pmremSize: leve ? 128 : 256,
      sombras: !leve,
      sombraRes: 2048,
      texturas: !leve,               // normal / roughness maps
      fisico: !leve,                 // MeshPhysicalMaterial (clearcoat)
      segCurva: leve ? 14 : 32,      // segmentos das curvas do contorno
      segLente: leve ? 20 : 48,
      bevelSeg: leve ? 3 : 8
    };
  }

  /* ==================================================================
     TEXTURAS PROCEDURAIS
     ================================================================== */

  /* HDRI de estudio: gradiente de fundo + softboxes + bandeiras escuras.
     Serve tanto de environment (via PMREM) quanto de fonte dos reflexos
     alongados caracteristicos de foto de produto. */
  function canvasEstudio(largura) {
    const c = document.createElement('canvas');
    c.width = largura;
    c.height = largura / 2;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;

    // ceu de estudio: teto claro -> horizonte -> chao escuro
    const fundo = g.createLinearGradient(0, 0, 0, H);
    fundo.addColorStop(0.00, '#ffffff');
    fundo.addColorStop(0.30, '#f2f3f6');
    fundo.addColorStop(0.48, '#c9cbd2');
    fundo.addColorStop(0.52, '#6f727a');
    fundo.addColorStop(0.78, '#33353b');
    fundo.addColorStop(1.00, '#141518');
    g.fillStyle = fundo;
    g.fillRect(0, 0, W, H);

    // softbox: retangulo com falloff suave nas bordas
    function softbox(x, y, w, h, forca) {
      const r = g.createLinearGradient(x, y, x, y + h);
      r.addColorStop(0, `rgba(255,255,255,0)`);
      r.addColorStop(0.5, `rgba(255,255,255,${forca})`);
      r.addColorStop(1, `rgba(255,255,255,0)`);
      const anterior = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      g.filter = `blur(${Math.round(W * 0.012)}px)`;
      g.fillStyle = r;
      g.fillRect(x, y, w, h);
      g.filter = 'none';
      g.globalCompositeOperation = anterior;
    }

    // key: softbox grande a 60 graus (esquerda-alta)
    softbox(W * 0.06, H * 0.06, W * 0.30, H * 0.34, 1.0);
    // fill: softbox menor no lado oposto
    softbox(W * 0.58, H * 0.12, W * 0.22, H * 0.24, 0.45);
    // strip vertical (da o risco longo no trilho de aco)
    softbox(W * 0.42, H * 0.02, W * 0.05, H * 0.46, 0.85);
    // rim: softbox atras
    softbox(W * 0.86, H * 0.10, W * 0.12, H * 0.22, 0.55);

    // bandeiras (negative fill) - criam o contraste escuro no metal
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.filter = `blur(${Math.round(W * 0.02)}px)`;
    g.fillRect(W * 0.24, H * 0.42, W * 0.12, H * 0.5);
    g.fillRect(W * 0.66, H * 0.40, W * 0.10, H * 0.5);
    g.filter = 'none';

    return c;
  }

  /* Normal map de micro-riscos para o aco inox. */
  function canvasMicroRiscos(tam) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const g = c.getContext('2d');
    g.fillStyle = '#8080ff';           // normal neutra
    g.fillRect(0, 0, tam, tam);

    g.lineWidth = 1;
    for (let i = 0; i < tam * 1.6; i++) {
      const x = Math.random() * tam;
      const y = Math.random() * tam;
      const comp = 4 + Math.random() * (tam * 0.09);
      const ang = (Math.random() - 0.5) * 0.5 + Math.PI / 2; // riscos quase verticais
      const forca = 4 + Math.random() * 10;
      g.strokeStyle = `rgb(${128 + forca},${128 - forca * 0.4},255)`;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp);
      g.stroke();
    }
    // poeira fina
    for (let i = 0; i < tam * 0.5; i++) {
      const forca = 3 + Math.random() * 6;
      g.fillStyle = `rgb(${128 - forca},${128 + forca},255)`;
      g.fillRect(Math.random() * tam, Math.random() * tam, 1, 1);
    }
    return c;
  }

  /* Metal escovado radial (anel das lentes). */
  function canvasEscovado(tam) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const g = c.getContext('2d');
    g.fillStyle = '#8080ff';
    g.fillRect(0, 0, tam, tam);
    g.lineWidth = 1;
    for (let i = 0; i < tam * 2.2; i++) {
      const y = Math.random() * tam;
      const forca = 3 + Math.random() * 9;
      g.strokeStyle = `rgb(${128 + forca},${128 - forca},255)`;
      g.beginPath();
      g.moveTo(Math.random() * tam, y);
      g.lineTo(Math.random() * tam, y + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    return c;
  }

  /* Variacao de rugosidade (deixa o reflexo "vivo", nao plastico). */
  function canvasRugosidade(tam, base, amplitude) {
    const c = document.createElement('canvas');
    c.width = c.height = tam;
    const g = c.getContext('2d');
    const img = g.createImageData(tam, tam);
    for (let i = 0; i < tam * tam; i++) {
      const n = base + (Math.random() - 0.5) * amplitude;
      const v = Math.max(0, Math.min(255, Math.round(n * 255)));
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // suaviza para virar variacao de larga escala, nao ruido de pixel
    g.filter = 'blur(2px)';
    g.drawImage(c, 0, 0);
    g.filter = 'none';
    return c;
  }

  /* Gradiente radial usado na contact shadow. */
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

  /* ==================================================================
     CENA
     ================================================================== */
  function criarCena(container, opcoes = {}) {
    if (!global.THREE) return null;
    const THREE = global.THREE;
    const P = detectarPerfil();

    const largura = container.clientWidth || 480;
    const altura = container.clientHeight || 520;

    const cena = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(29, largura / altura, 0.1, 120);
    camera.position.set(0, 0.55, 13.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
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

    const descartaveis = [];   // texturas / geometrias para liberar no destruir()
    const registra = (o) => { descartaveis.push(o); return o; };

    /* ---------------- Environment (HDRI procedural) ---------------- */
    const texEstudio = registra(new THREE.CanvasTexture(canvasEstudio(P.envSize)));
    texEstudio.mapping = THREE.EquirectangularReflectionMapping;
    if (THREE.sRGBEncoding !== undefined) texEstudio.encoding = THREE.sRGBEncoding;

    // usa a equirect crua no primeiro frame e troca pelo PMREM depois
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
          if (o.material && 'envMap' in o.material) {
            o.material.envMap = envMap;
            o.material.needsUpdate = true;
          }
        });
      } catch (e) {
        // mantem a textura crua se o PMREM nao estiver disponivel
      }
    }

    /* ---------------- Texturas de superficie ---------------- */
    let normalMetal = null, rugMetal = null, normalEscovado = null, rugVidro = null;
    if (P.texturas) {
      normalMetal = registra(new THREE.CanvasTexture(canvasMicroRiscos(512)));
      normalMetal.wrapS = normalMetal.wrapT = THREE.RepeatWrapping;
      normalMetal.repeat.set(3, 8);

      rugMetal = registra(new THREE.CanvasTexture(canvasRugosidade(256, 0.13, 0.10)));
      rugMetal.wrapS = rugMetal.wrapT = THREE.RepeatWrapping;
      rugMetal.repeat.set(2, 5);

      normalEscovado = registra(new THREE.CanvasTexture(canvasEscovado(256)));
      normalEscovado.wrapS = normalEscovado.wrapT = THREE.RepeatWrapping;
      normalEscovado.repeat.set(6, 1);

      rugVidro = registra(new THREE.CanvasTexture(canvasRugosidade(256, 0.42, 0.14)));
      rugVidro.wrapS = rugVidro.wrapT = THREE.RepeatWrapping;
    }

    /* ==================================================================
       GEOMETRIA
       ================================================================== */

    /* Contorno "squircle" (curvatura continua, como o corpo real da Apple).
       Cada canto e uma superelipse de expoente 5 amostrada, o que evita a
       quebra visivel de curvatura de um arco circular simples. */
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
        // percurso anti-horario: quadrantes "positivos" vao de 0 a 90 graus,
        // os "negativos" percorrem o quadrante ao contrario
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

    /* Placa extrudada com bordas arredondadas de raio real. */
    function placa(l, a, prof, raio, opts = {}) {
      const bevel = opts.bevel !== false;
      const bt = opts.bevelThickness ?? mm(0.4);
      const bs = opts.bevelSize ?? mm(0.4);
      // o bevel do ExtrudeGeometry cresce para FORA do contorno: encolhe a
      // forma base para que as medidas finais sejam exatamente l x a x prof
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

    /* Gradiente de tonalidade gravado em vertex colors (multiplica a cor
       do material, entao independe da variante escolhida). */
    function gradienteVertical(geo, topo, base, eixo = 'y') {
      const pos = geo.attributes.position;
      const ler = eixo === 'y' ? (i) => pos.getY(i) : (i) => pos.getX(i);
      const cores = new Float32Array(pos.count * 3);
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const v = ler(i);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const amp = (max - min) || 1;
      for (let i = 0; i < pos.count; i++) {
        const t = (ler(i) - min) / amp;
        const k = base + (topo - base) * t;
        cores[i * 3] = cores[i * 3 + 1] = cores[i * 3 + 2] = k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
      return geo;
    }

    /* ==================================================================
       CORES DERIVADAS
       ================================================================== */
    const corBase = new THREE.Color(opcoes.cor || '#7C6BA8');
    let perfilCor = perfilDaCor(opcoes.cor || '#7C6BA8');

    /* Moldura: aco inox tingido pela variante.
       Mantem a matiz, dessatura e sobe a luminancia (metal reflete),
       e aplica os -5% de lightness pedidos na especificacao. */
    function tomMoldura(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      const l = Math.min(0.58 + hsl.l * 0.30, 0.84) - 0.05;
      return new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.38, 0.26), Math.max(l, 0.18));
    }

    /* Substrato sob o vidro traseiro (parte mais escura do gradiente). */
    function tomProfundo(c) {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return new THREE.Color().setHSL(hsl.h, hsl.s * 0.92, Math.max(hsl.l * 0.62, 0.04));
    }

    /* ==================================================================
       MATERIAIS
       ================================================================== */
    const Fisico = P.fisico && THREE.MeshPhysicalMaterial
      ? THREE.MeshPhysicalMaterial
      : THREE.MeshStandardMaterial;

    function aplicarIOR(mat, valor) {
      if (mat && 'ior' in mat) mat.ior = valor;        // r137+
      else if (mat && 'reflectivity' in mat) mat.reflectivity = 0.5; // r128: IOR 1.5 equivale a reflectivity 0.5
    }

    // --- aco inox polido (moldura, botoes) ---
    const matMoldura = new Fisico({
      color: tomMoldura(corBase),
      metalness: 1,
      roughness: 0.10,
      envMap,
      envMapIntensity: 1.85,
      vertexColors: true
    });
    if (normalMetal) {
      matMoldura.normalMap = normalMetal;
      matMoldura.normalScale = new THREE.Vector2(0.16, 0.16);
    }
    if (rugMetal) matMoldura.roughnessMap = rugMetal;
    if ('clearcoat' in matMoldura) { matMoldura.clearcoat = 0.35; matMoldura.clearcoatRoughness = 0.08; }

    const matBotao = new Fisico({
      color: tomMoldura(corBase),
      metalness: 1,
      roughness: 0.13,
      envMap,
      envMapIntensity: 1.7
    });
    if (normalMetal) {
      matBotao.normalMap = normalMetal;
      matBotao.normalScale = new THREE.Vector2(0.1, 0.1);
    }

    // --- vidro traseiro fosco (frosted) ---
    const matVidroTraseiro = new Fisico({
      color: corBase.clone(),
      metalness: 0.12,
      roughness: 0.40,
      envMap,
      envMapIntensity: perfilCor.reflexo,
      vertexColors: true
    });
    if (rugVidro) matVidroTraseiro.roughnessMap = rugVidro;
    if ('clearcoat' in matVidroTraseiro) {
      matVidroTraseiro.clearcoat = 1.0;                  // camada de vidro sobre o pigmento
      matVidroTraseiro.clearcoatRoughness = perfilCor.clear;
    }
    aplicarIOR(matVidroTraseiro, 1.5);

    // camada anti-reflexo: filme finissimo, quase invisivel, so quebra o
    // brilho especular puro (como o AR coating real do vidro traseiro)
    const matAntiReflexo = P.fisico
      ? new Fisico({
        color: 0xffffff, metalness: 0, roughness: 0.28,
        transparent: true, opacity: 0.05, envMap, envMapIntensity: 0.5,
        depthWrite: false
      })
      : null;
    if (matAntiReflexo) aplicarIOR(matAntiReflexo, 1.35);

    // --- vidro frontal / bezel ---
    const matBezel = new THREE.MeshStandardMaterial({
      color: 0x050506, metalness: 0.35, roughness: 0.22, envMap, envMapIntensity: 0.55
    });

    // tela desligada: preto profundo, sem emissao, apenas reflexo ambiente
    const matTela = new Fisico({
      color: 0x000000,
      metalness: 0.0,
      roughness: 0.06,
      envMap,
      envMapIntensity: 0.60
    });
    if ('clearcoat' in matTela) { matTela.clearcoat = 1; matTela.clearcoatRoughness = 0.03; }
    aplicarIOR(matTela, 1.5);

    const matPretoFosco = new THREE.MeshStandardMaterial({
      color: 0x000000, metalness: 0, roughness: 0.5
    });

    // --- modulo de cameras ---
    const matVidroModulo = new Fisico({
      color: tomProfundo(corBase),
      metalness: 0.25,
      roughness: 0.30,
      envMap,
      envMapIntensity: perfilCor.reflexo * 0.9
    });
    if ('clearcoat' in matVidroModulo) { matVidroModulo.clearcoat = 0.8; matVidroModulo.clearcoatRoughness = 0.15; }

    const matAnel = new Fisico({
      color: 0xb6b9c0, metalness: 1, roughness: 0.18, envMap, envMapIntensity: 1.9
    });
    if (normalEscovado) {
      matAnel.normalMap = normalEscovado;                // textura escovada
      matAnel.normalScale = new THREE.Vector2(0.25, 0.25);
    }

    const matSafira = new Fisico({
      color: 0x05070c, metalness: 0.9, roughness: 0.03, envMap, envMapIntensity: 2.1
    });
    if ('clearcoat' in matSafira) { matSafira.clearcoat = 1; matSafira.clearcoatRoughness = 0.02; }
    aplicarIOR(matSafira, 1.77);                          // safira

    const matIris = new THREE.MeshStandardMaterial({
      color: 0x0b1524, metalness: 1, roughness: 0.16, envMap, envMapIntensity: 1.4
    });
    const matPupila = new THREE.MeshStandardMaterial({
      color: 0x01030a, metalness: 0.4, roughness: 0.45
    });
    const matEspecular = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false
    });
    const matEspecular2 = new THREE.MeshBasicMaterial({
      color: 0xcfe6ff, transparent: true, opacity: 0.45, depthWrite: false
    });

    const materiais = [
      matMoldura, matBotao, matVidroTraseiro, matBezel, matTela, matPretoFosco,
      matVidroModulo, matAnel, matSafira, matIris, matPupila, matEspecular,
      matEspecular2, matAntiReflexo
    ].filter(Boolean);
    function registraMaterial(m) { materiais.push(m); return m; }

    /* ==================================================================
       MONTAGEM DO APARELHO
       ================================================================== */
    const L = mm(MM.largura);
    const A = mm(MM.altura);
    const E = mm(MM.espessura);
    const RC = mm(MM.raioCanto);
    const RB = mm(MM.raioBorda);

    const telefone = new THREE.Group();

    /* 1) Corpo / moldura de aco: trilho lateral com perfil arredondado
          de 3.8 mm (praticamente meio circulo, como o aparelho real). */
    const geoMoldura = placa(L, A, E, RC, {
      bevelThickness: RB,
      bevelSize: RB,
      bevelSegments: P.bevelSeg
    });
    gradienteVertical(geoMoldura, 1.06, 0.86);   // laterais levemente mais escuras embaixo
    const moldura = new THREE.Mesh(geoMoldura, matMoldura);
    moldura.castShadow = P.sombras;
    moldura.receiveShadow = P.sombras;
    telefone.add(moldura);

    const zFrente = E / 2;
    const zVerso = -E / 2;

    /* 2) Sulcos de antena: faixas que acompanham exatamente a curvatura
          do trilho (cilindro de mesmo raio da borda, altura de ~0.9 mm). */
    const matSulco = registraMaterial(new THREE.MeshStandardMaterial({
      color: 0xd7dae0, metalness: 0.25, roughness: 0.62, envMap, envMapIntensity: 0.6
    }));
    const geoSulco = registra(
      new THREE.CylinderGeometry(RB * 1.006, RB * 1.006, mm(0.9), 28, 1, true)
    );
    function sulcoLateral(lado, yMM) {
      const s = new THREE.Mesh(geoSulco, matSulco);
      s.position.set(lado * (L / 2 - RB), mm(yMM), 0);
      telefone.add(s);
    }
    function sulcoTopo(xMM, cima) {
      const s = new THREE.Mesh(geoSulco, matSulco);
      s.rotation.z = Math.PI / 2;
      s.position.set(mm(xMM), (cima ? 1 : -1) * (A / 2 - RB), 0);
      telefone.add(s);
    }
    sulcoLateral(-1, 51);
    sulcoLateral(-1, -51);
    sulcoLateral(1, 51);
    sulcoLateral(1, -37);
    sulcoTopo(-16, true);
    sulcoTopo(16, false);

    /* 3) Vidro traseiro fosco (recuado dentro do trilho) */
    const larguraVidro = L - RB * 2 + mm(0.6);
    const alturaVidro = A - RB * 2 + mm(0.6);
    const geoTraseira = placa(larguraVidro, alturaVidro, mm(0.9), RC - mm(1.2), {
      bevelThickness: mm(0.25), bevelSize: mm(0.25), bevelSegments: 3
    });
    gradienteVertical(geoTraseira, 1.12, 0.72);  // gradiente natural topo -> base
    const traseira = new THREE.Mesh(geoTraseira, matVidroTraseiro);
    traseira.position.z = zVerso + mm(0.2);
    traseira.receiveShadow = P.sombras;
    telefone.add(traseira);

    // filme anti-reflexo sobre o vidro traseiro
    if (matAntiReflexo) {
      const ar = new THREE.Mesh(
        placa(larguraVidro - mm(0.4), alturaVidro - mm(0.4), mm(0.06), RC - mm(1.4), { bevel: false }),
        matAntiReflexo
      );
      ar.position.z = zVerso - mm(0.32);
      telefone.add(ar);
    }

    /* 4) Vidro frontal + bezel + tela */
    const bezel = new THREE.Mesh(
      placa(larguraVidro, alturaVidro, mm(0.8), RC - mm(1.2), {
        bevelThickness: mm(0.2), bevelSize: mm(0.2), bevelSegments: 3
      }),
      matBezel
    );
    bezel.position.z = zFrente - mm(0.2);
    telefone.add(bezel);

    const BEZEL = 0.085;                       // ~2 mm de moldura preta
    const tela = new THREE.Mesh(
      placa(larguraVidro - BEZEL * 2, alturaVidro - BEZEL * 2, mm(0.35), RC - mm(3.2), { bevel: false }),
      matTela
    );
    tela.position.z = zFrente + mm(0.15);
    telefone.add(tela);

    /* 5) Dynamic Island */
    const ilha = new THREE.Mesh(
      placa(mm(26), mm(8.2), mm(0.3), mm(4.1), { bevel: false, segCanto: 12 }),
      matPretoFosco
    );
    ilha.position.set(0, A / 2 - mm(15.5), zFrente + mm(0.32));
    telefone.add(ilha);

    // camera frontal + sensor dentro da ilha
    const camFrontal = new THREE.Mesh(
      new THREE.CircleGeometry(mm(1.5), 24),
      new THREE.MeshStandardMaterial({
        color: 0x081321, metalness: 1, roughness: 0.07, envMap, envMapIntensity: 1.8
      })
    );
    camFrontal.position.set(mm(7), ilha.position.y, zFrente + mm(0.42));
    telefone.add(camFrontal);

    const brilhoFrontal = new THREE.Mesh(
      new THREE.CircleGeometry(mm(0.45), 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })
    );
    brilhoFrontal.position.set(mm(6.5), ilha.position.y + mm(0.5), zFrente + mm(0.5));
    telefone.add(brilhoFrontal);

    /* 6) Reflexo da janela de estudio no vidro frontal.
          Desenhado em canvas e mapeado sobre a propria geometria da tela,
          para que fique recortado pelos cantos arredondados (nada de
          planos brancos escapando pela silhueta). */
    const larguraTela = larguraVidro - BEZEL * 2;
    const alturaTela = alturaVidro - BEZEL * 2;

    const cvBrilho = document.createElement('canvas');
    cvBrilho.width = 256; cvBrilho.height = 512;
    (function (g) {
      g.clearRect(0, 0, 256, 512);
      g.filter = 'blur(9px)';
      g.save();
      g.translate(128, 256);
      g.rotate(-0.28);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(-118, -420, 78, 840);      // janela larga
      g.fillStyle = 'rgba(255,255,255,0.11)';
      g.fillRect(52, -420, 24, 840);        // reflexo secundario
      g.restore();
      g.filter = 'none';
    })(cvBrilho.getContext('2d'));

    const texBrilho = registra(new THREE.CanvasTexture(cvBrilho));
    if (THREE.sRGBEncoding !== undefined) texBrilho.encoding = THREE.sRGBEncoding;
    texBrilho.repeat.set(1 / larguraTela, 1 / alturaTela);
    texBrilho.offset.set(0.5, 0.5);

    const brilhoTela = new THREE.Mesh(
      placa(larguraTela, alturaTela, mm(0.05), RC - mm(3.2), { bevel: false }),
      registraMaterial(new THREE.MeshBasicMaterial({
        map: texBrilho, transparent: true, opacity: 0.9, depthWrite: false
      }))
    );
    brilhoTela.position.z = zFrente + mm(0.62);   // a frente da ilha e da camera
    telefone.add(brilhoTela);

    /* 7) Marca discreta gravada no verso (mesma cor, rugosidade diferente) */
    const emblema = new THREE.Mesh(
      new THREE.CircleGeometry(mm(6), 48),
      new THREE.MeshStandardMaterial({
        color: tomProfundo(corBase), metalness: 0.3, roughness: 0.62,
        envMap, envMapIntensity: 0.5
      })
    );
    emblema.position.set(0, mm(4), zVerso - mm(0.45));
    emblema.rotation.y = Math.PI;
    telefone.add(emblema);

    /* 8) Modulo de cameras */
    const ladoModulo = mm(MM.moduloCam);
    const modulo = new THREE.Mesh(
      placa(ladoModulo, ladoModulo, mm(2.6), mm(11), {
        bevelThickness: mm(0.5), bevelSize: mm(0.5), bevelSegments: P.bevelSeg
      }),
      matVidroModulo
    );
    modulo.position.set(
      -L / 2 + mm(22.5),
      A / 2 - mm(25.5),
      zVerso - mm(1.6)
    );
    modulo.castShadow = P.sombras;
    telefone.add(modulo);

    const zModulo = modulo.position.z - mm(0.9);

    /* Perfil real da lente: domo de safira em LatheGeometry.
       O domo tem curvatura continua e a lateral reta do barril. */
    function geoDomo(raio, alturaDomo) {
      const pts = [];
      const passos = P.leve ? 10 : 18;
      for (let i = 0; i <= passos; i++) {
        const a = (i / passos) * (Math.PI / 2);
        pts.push(new THREE.Vector2(Math.sin(a) * raio, Math.cos(a) * alturaDomo));
      }
      pts.push(new THREE.Vector2(raio, -mm(1.2)));       // barril
      return registra(new THREE.LatheGeometry(pts, P.segLente));
    }

    const rAnel = mm(MM.lente / 2);
    const rLente = rAnel * 0.76;
    const geoDomoLente = geoDomo(rLente, mm(0.8));

    const posLentes = [
      [-mm(8), mm(8)],
      [mm(8), mm(8)],
      [0, -mm(9)]
    ];

    posLentes.forEach(([dx, dy]) => {
      const cx = modulo.position.x + dx;
      const cy = modulo.position.y + dy;
      const grupo = new THREE.Group();
      grupo.position.set(cx, cy, zModulo);

      // anel metalico escovado
      const anel = new THREE.Mesh(
        new THREE.CylinderGeometry(rAnel, rAnel * 1.04, mm(2.8), P.segLente, 1, true),
        matAnel
      );
      anel.rotation.x = Math.PI / 2;
      anel.position.z = mm(0.4);
      grupo.add(anel);

      const aro = new THREE.Mesh(
        new THREE.RingGeometry(rLente * 1.01, rAnel, P.segLente),
        matAnel
      );
      aro.position.z = -mm(1.0);
      aro.rotation.y = Math.PI;
      grupo.add(aro);

      // domo de safira (curvatura real, voltado para -Z)
      const domo = new THREE.Mesh(geoDomoLente, matSafira);
      domo.rotation.x = -Math.PI / 2;
      domo.position.z = -mm(1.0);
      grupo.add(domo);

      // iris f/1.8 - abertura interna visivel dentro do barril
      const iris = new THREE.Mesh(
        new THREE.RingGeometry(rLente * 0.34, rLente * 0.80, P.leve ? 18 : 36),
        matIris
      );
      iris.position.z = -mm(0.2);
      iris.rotation.y = Math.PI;
      grupo.add(iris);

      const pupila = new THREE.Mesh(
        new THREE.CircleGeometry(rLente * 0.34, P.leve ? 16 : 28),
        matPupila
      );
      pupila.position.z = -mm(0.1);
      pupila.rotation.y = Math.PI;
      grupo.add(pupila);

      // duplo reflexo especular (janela grande + ponto pequeno),
      // exatamente o que aparece nas fotos de produto
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

    /* Flash LED duplo + LiDAR */
    const flashCorpo = new THREE.Mesh(
      new THREE.CylinderGeometry(mm(2.6), mm(2.6), mm(1.2), 24),
      matAnel
    );
    flashCorpo.rotation.x = Math.PI / 2;
    flashCorpo.position.set(modulo.position.x + mm(11), modulo.position.y - mm(8), zModulo + mm(1.2));
    telefone.add(flashCorpo);

    const flash = new THREE.Mesh(
      new THREE.CircleGeometry(mm(2.2), 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2d2 })
    );
    flash.position.set(modulo.position.x + mm(11), modulo.position.y - mm(8), zModulo + mm(0.4));
    flash.rotation.y = Math.PI;
    telefone.add(flash);

    const lidar = new THREE.Mesh(
      new THREE.CircleGeometry(mm(1.9), 20),
      new THREE.MeshStandardMaterial({
        color: 0x11151c, metalness: 1, roughness: 0.09, envMap, envMapIntensity: 1.6
      })
    );
    lidar.position.set(modulo.position.x + mm(11), modulo.position.y + mm(9), zModulo + mm(0.4));
    lidar.rotation.y = Math.PI;
    telefone.add(lidar);

    /* 9) Botoes laterais com volume real (levemente salientes) */
    function botao(alturaMM, yMM, lado) {
      const h = mm(alturaMM);
      // largura 3.2 mm sobre o trilho, saliencia real de ~0.5 mm
      const g = placa(mm(3.2), h, mm(2.2), mm(1.0), {
        bevelThickness: mm(0.35), bevelSize: mm(0.35), bevelSegments: 4
      });
      const b = new THREE.Mesh(g, matBotao);
      b.rotation.y = Math.PI / 2;
      b.position.set(lado * (L / 2 - mm(0.6)), mm(yMM), 0);
      b.castShadow = P.sombras;
      telefone.add(b);
    }
    botao(28, 30, 1);      // power
    botao(16, 40, -1);     // volume +
    botao(16, 27, -1);     // volume -
    botao(9, 53, -1);      // action button

    telefone.rotation.set(0.08, -0.42, 0);
    cena.add(telefone);

    /* ==================================================================
       ILUMINACAO
       ================================================================== */
    cena.add(new THREE.AmbientLight(0xffffff, 0.18));            // ambiente baixo
    if (THREE.HemisphereLight) cena.add(new THREE.HemisphereLight(0xf4f6ff, 0xb9bcc4, 0.28));

    // Key light suave a 60 graus
    const key = new THREE.DirectionalLight(0xffffff, 1.55);
    key.position.set(6.5, 9.5, 8.0);
    if (P.sombras) {
      key.castShadow = true;
      key.shadow.mapSize.set(P.sombraRes, P.sombraRes);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 40;
      key.shadow.camera.left = -6;
      key.shadow.camera.right = 6;
      key.shadow.camera.top = 8;
      key.shadow.camera.bottom = -8;
      key.shadow.bias = -0.0009;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 6;                                     // bordas suaves
    }
    cena.add(key);

    // Fill light no lado oposto, 40% da key
    const fill = new THREE.DirectionalLight(0xeef2ff, 0.62);
    fill.position.set(-8, -2.5, 6);
    cena.add(fill);

    // Rim light traseira, 30% da key - separa o aparelho do fundo
    const rim = new THREE.DirectionalLight(0xffffff, 0.47);
    rim.position.set(-4.5, 5.5, -8);
    cena.add(rim);

    // acento discreto da marca (nao interfere no realismo)
    const acento = new THREE.PointLight(0x7fd000, 0.55, 26);
    acento.position.set(-6, 2.5, -3.5);
    cena.add(acento);

    /* ==================================================================
       SOMBRA
       ================================================================== */
    const yChao = -A / 2 - 0.28;

    let chaoSombra = null;
    if (P.sombras && THREE.ShadowMaterial) {
      chaoSombra = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 14),
        new THREE.ShadowMaterial({ opacity: 0.20 })
      );
      chaoSombra.rotation.x = -Math.PI / 2;
      chaoSombra.position.set(0, yChao, 0);
      chaoSombra.receiveShadow = true;
      cena.add(chaoSombra);
    }

    // contact shadow (nucleo escuro logo abaixo do aparelho)
    const texSombra = registra(new THREE.CanvasTexture(canvasSombra(256)));
    const contato = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 2.1, L * 2.1),
      new THREE.MeshBasicMaterial({
        map: texSombra, transparent: true, opacity: 0.85, depthWrite: false
      })
    );
    contato.rotation.x = -Math.PI / 2;
    contato.position.set(0, yChao + 0.005, 0);
    contato.scale.set(1, 0.85, 1);
    cena.add(contato);

    // halo suave da marca atras do aparelho
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 48),
      new THREE.MeshBasicMaterial({ color: 0x7fd000, transparent: true, opacity: 0.03, depthWrite: false })
    );
    halo.position.z = -3.6;
    cena.add(halo);

    /* ==================================================================
       INTERACAO
       ================================================================== */
    const estado = {
      alvoY: -0.42, alvoX: 0.08,
      arrastando: false, ultX: 0, ultY: 0,
      autoRotacao: !P.animacaoReduzida,
      timer: null
    };

    const inicio = (x, y) => {
      estado.arrastando = true;
      estado.autoRotacao = false;
      estado.ultX = x; estado.ultY = y;
    };
    const mover = (x, y) => {
      if (!estado.arrastando) return;
      estado.alvoY += (x - estado.ultX) * 0.008;
      estado.alvoX = Math.max(-0.9, Math.min(0.9, estado.alvoX + (y - estado.ultY) * 0.006));
      estado.ultX = x; estado.ultY = y;
    };
    const fim = () => {
      estado.arrastando = false;
      clearTimeout(estado.timer);
      if (!P.animacaoReduzida) {
        estado.timer = setTimeout(() => { estado.autoRotacao = true; }, 2600);
      }
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

    /* ==================================================================
       TROCA DE COR
       ================================================================== */
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
      matVidroModulo.color.copy(tomProfundo(c));
      emblema.material.color.copy(tomProfundo(c));
      if (perfil) {
        matVidroTraseiro.envMapIntensity = perfil.reflexo;
        matVidroModulo.envMapIntensity = perfil.reflexo * 0.9;
        if ('clearcoatRoughness' in matVidroTraseiro) {
          matVidroTraseiro.clearcoatRoughness = perfil.clear;
        }
      }
    }
    aplicarCor(corBase, perfilCor);

    /* ==================================================================
       LOOP
       ================================================================== */
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

      // lazy-load do PMREM: so depois que o primeiro frame ja foi pintado
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
        const e = transicao.t < 0.5
          ? 4 * transicao.t ** 3
          : 1 - (-2 * transicao.t + 2) ** 3 / 2;                 // easeInOutCubic
        const cor = transicao.de.clone().lerp(transicao.para, e);
        const p = {
          reflexo: transicao.dePerfil.reflexo + (transicao.paraPerfil.reflexo - transicao.dePerfil.reflexo) * e,
          clear: transicao.dePerfil.clear + (transicao.paraPerfil.clear - transicao.dePerfil.clear) * e
        };
        aplicarCor(cor, p);
        if (transicao.t >= 1) {
          transicao.ativa = false;
          perfilCor = transicao.paraPerfil;
          aplicarCor(transicao.para, perfilCor);
        }
      }

      const flutuar = P.animacaoReduzida ? 0 : Math.sin(t * 0.85) * 0.10;
      telefone.position.y = flutuar;

      // a sombra acompanha a altura do aparelho
      const s = 1 - flutuar * 0.28;
      contato.scale.set(s, s * 0.85, 1);
      contato.material.opacity = 0.85 - flutuar * 0.9;
      if (chaoSombra) chaoSombra.material.opacity = 0.20 - flutuar * 0.10;

      renderer.render(cena, camera);
    }
    animar();

    /* Pausa quando sai da viewport (bateria / CPU) */
    let observer = null;
    if ('IntersectionObserver' in global) {
      observer = new IntersectionObserver(
        (entradas) => { ativo = entradas[0].isIntersecting; },
        { threshold: 0.05 }
      );
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
      /**
       * Troca a cor do aparelho com transicao suave.
       * @param {string} hex  cor destino
       * @param {object} opts { girar:true } faz o aparelho dar uma volta
       */
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
