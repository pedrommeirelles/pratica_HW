// Interface da prática de deriva: passos, estado, simulações, gráficos e registro.

(function () {
  'use strict';

  var M = window.MODELO, D = window.DADOS, G = window.GRAFICO;
  var CHAVE = 'bioc10_deriva_12nov_v1';
  var MS = D.MICROSSATELITE;
  var NFRAG = D.FRAGMENTOS_GARGALO;
  // Cor do texto sobre cada cor de alelo (branco nas escuras, quase preto nas claras).
  var TEXTO_SOBRE = ['#FFFFFF', '#1E1E1C', '#FFFFFF', '#1E1E1C', '#FFFFFF', '#1E1E1C'];

  var HE = '<i>H</i><sub>e</sub>', NE = '<i>N</i><sub>e</sub>', NB = '<i>N</i><sub>b</sub>', N0 = '<i>N</i><sub>0</sub>', P0 = '<i>p</i><sub>0</sub>';

  // ---------- Utilidades ----------
  function $(id) { return document.getElementById(id); }
  function num(x, casas) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  function numLivre(x, max) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: max });
  }
  function pct(x, casas) { return num(100 * x, casas) + '%'; }
  function pctCurta(x) { return pct(x, x > 0 && x < 0.01 ? 1 : 0); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function limitar(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function arred(x, passo) { return Math.round(x / passo) * passo; }
  function inteiro(x, padrao, a, b) {
    var v = Math.round(Number(x));
    if (!isFinite(v)) v = padrao;
    return limitar(v, a, b);
  }
  function valorDe(x) { return typeof x === 'function' ? x() : x; }
  function nomeAlelo(i) { return 'A<sub>' + (i + 1) + '</sub>'; }

  // Tamanho do gráfico conforme a largura da caixa: no celular, o texto do SVG fica legível.
  function tamanho(idCaixa, proporcao) {
    var caixa = $(idCaixa);
    var w = caixa && caixa.clientWidth ? caixa.clientWidth - 12 : 640;
    var largura = Math.max(320, Math.min(640, Math.round(w)));
    var altura = Math.max(230, Math.round(largura * (proporcao || 0.5)));
    return { largura: largura, altura: altura };
  }

  // Lê um número digitado com vírgula ou ponto decimal; aceita "%".
  function lerNumero(t) {
    if (t === null || t === undefined) return null;
    var s = String(t).trim().replace(/%/g, '').replace(/\s/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  // Campos em %: quem digita a fração (0,85) recebe o mesmo que quem digita 85.
  function lerPorcentagem(t) {
    var v = lerNumero(t);
    if (v !== null && v > 0 && v < 1) v *= 100;
    return v;
  }

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      versao: 1,
      nome: '',
      projecao: false,
      ultimoPasso: '#passo-1',
      previsao: { a: null, b: null },
      sorteio: { N: 10, p0: 0.5, frag: 20, ger: 30 },
      um: { g: 0, semente: D.SEMENTES.um },
      varios: { semente: D.SEMENTES.varios, rodada: null },
      gar: { N0: 100, Nb: 10, t: 10, semente: D.SEMENTES.gargalo, rodada: null, exemplo: 0 },
      ne: { grupos: 5, femeas: 1, machos: 1, t: 10 },
      canon: { P1: null, P2: null, P3: null, P5: null, P7: null },
      campos: {},
      resp: {}
    };
  }

  function mesclar(base, salvo) {
    Object.keys(salvo).forEach(function (k) {
      if (salvo[k] && typeof salvo[k] === 'object' && !Array.isArray(salvo[k]) && base[k] && typeof base[k] === 'object') {
        base[k] = mesclar(base[k], salvo[k]);
      } else {
        base[k] = salvo[k];
      }
    });
    return base;
  }

  function semente(x, padrao) {
    var v = Number(x);
    return isFinite(v) && v >= 0 ? Math.floor(v) % 4294967296 : padrao;
  }

  // Corrige valores fora da faixa (estado antigo ou alterado à mão).
  function sanear(e) {
    var s = e.sorteio;
    s.N = inteiro(s.N, 10, 4, 200);
    s.p0 = Math.round(limitar(arred(Number(s.p0) || 0.5, 0.05), 0.05, 0.95) * 100) / 100;
    s.frag = inteiro(s.frag, 20, 1, 50);
    s.ger = limitar(arred(inteiro(s.ger, 30, 10, 200), 10), 10, 200);
    e.um.g = inteiro(e.um.g, 0, 0, 500);
    e.um.semente = semente(e.um.semente, D.SEMENTES.um);
    e.varios.semente = semente(e.varios.semente, D.SEMENTES.varios);
    var r = e.varios.rodada;
    if (r && typeof r === 'object') {
      e.varios.rodada = {
        N: inteiro(r.N, 10, 4, 200), p0: Math.round(limitar(Number(r.p0) || 0.5, 0.05, 0.95) * 100) / 100,
        frag: inteiro(r.frag, 20, 1, 50), ger: inteiro(r.ger, 30, 10, 200), semente: semente(r.semente, D.SEMENTES.varios)
      };
    } else e.varios.rodada = null;
    var g = e.gar;
    g.N0 = limitar(arred(inteiro(g.N0, 100, 20, 400), 10), 20, 400);
    g.Nb = inteiro(g.Nb, 10, 2, g.N0);
    g.t = inteiro(g.t, 10, 0, 30);
    g.semente = semente(g.semente, D.SEMENTES.gargalo);
    g.exemplo = inteiro(g.exemplo, 0, 0, 49);
    var rg = g.rodada;
    if (rg && typeof rg === 'object') {
      var n0 = limitar(arred(inteiro(rg.N0, 100, 20, 400), 10), 20, 400);
      g.rodada = { N0: n0, Nb: inteiro(rg.Nb, 10, 2, n0), t: inteiro(rg.t, 10, 0, 30), semente: semente(rg.semente, D.SEMENTES.gargalo) };
    } else g.rodada = null;
    var n = e.ne;
    n.grupos = inteiro(n.grupos, 5, 1, 100);
    n.femeas = inteiro(n.femeas, 1, 1, 3);
    n.machos = inteiro(n.machos, 1, 1, 3);
    n.t = inteiro(n.t, 10, 1, 50);
    if (!e.campos || typeof e.campos !== 'object') e.campos = {};
    if (!e.resp || typeof e.resp !== 'object') e.resp = {};
    if (!e.canon || typeof e.canon !== 'object') e.canon = estadoInicial().canon;
    if (typeof e.nome !== 'string') e.nome = '';
    return e;
  }

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        var e = JSON.parse(bruto);
        if (e && e.versao === 1) return sanear(mesclar(estadoInicial(), e));
      }
    } catch (err) { /* sem armazenamento ou estado ilegível: começa do zero */ }
    return estadoInicial();
  }

  var estado = carregar();

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (err) { /* segue só na memória */ }
  }

  // ---------- Simulações (resultados guardados na memória: a mesma semente dá o mesmo resultado) ----------
  var cache = {}, nCache = 0;
  function memo(chave, fn) {
    if (!(chave in cache)) {
      if (nCache > 300) { cache = {}; nCache = 0; }
      cache[chave] = fn();
      nCache++;
    }
    return cache[chave];
  }

  function resultadoVarios(r) {
    return memo(['v', r.N, r.p0, r.frag, r.ger, r.semente].join('|'), function () {
      return M.variosFragmentos(r.N, r.p0, r.frag, r.ger, r.semente);
    });
  }

  function resultadoGargalo(r) {
    return memo(['g', r.N0, r.Nb, r.t, r.semente].join('|'), function () {
      return M.gargalo(MS.freqs, r.N0, r.Nb, r.t, NFRAG, r.semente);
    });
  }

  function geracoesUm() { return Math.max(30, Math.ceil(estado.um.g / 10) * 10); }

  function trajetoriaUm() {
    var s = estado.sorteio, u = estado.um, gmax = geracoesUm();
    return memo(['u', s.N, s.p0, gmax, u.semente].join('|'), function () {
      return M.trajetoria(s.N, s.p0, gmax, u.semente);
    });
  }

  function nSorteio(sem, bloco) {
    var n = sem - D.SEMENTES[bloco] + 1;
    return n >= 1 ? String(n) : String(sem);
  }

  function igual(a, b) { return Math.abs(a - b) < 1e-9; }

  // Guarda o resultado do aplicativo quando a rodada tem os controles de um problema.
  function capturarVarios(r, res) {
    var info = { fixou: res.fixou, perdeu: res.perdeu, ambos: res.ambos, media: res.media[r.ger], ger: r.ger, semente: r.semente };
    if (r.N === 10 && igual(r.p0, 0.5) && r.frag === 20 && r.ger === 30) estado.canon.P1 = info;
    if (r.N === 100 && igual(r.p0, 0.5) && r.frag === 20 && r.ger === 30) estado.canon.P2 = info;
    if (r.N === 10 && igual(r.p0, 0.2) && r.frag === 50 && r.ger >= 100) estado.canon.P3 = info;
  }

  function capturarGargalo(r, res) {
    var info = { A: res.A[1] / res.A0, H: res.H[1] / res.H0, N0: r.N0, Nb: r.Nb, t: r.t, semente: r.semente };
    if (r.Nb === 10) estado.canon.P5 = info;
    if (r.Nb === Math.round(2 * r.N0 / 3)) estado.canon.P7 = info;
  }

  // ---------- Navegação ----------
  var TELAS = ['#passo-1', '#passo-2', '#passo-3', '#passo-4', '#passo-5', '#passo-6', '#passo-7'];

  function mostrarTela(hash, focar) {
    if (TELAS.indexOf(hash) < 0) hash = '#passo-1';
    document.querySelectorAll('.tela').forEach(function (t) { t.classList.remove('ativa'); });
    var tela = $('tela-' + hash.slice(1));
    tela.classList.add('ativa');
    document.querySelectorAll('.barra a').forEach(function (a) {
      if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    estado.ultimoPasso = hash;
    salvar();
    renderAtivo();
    if (focar) {
      var h2 = tela.querySelector('h2');
      if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }
  }

  function ir(hash) {
    if (location.hash !== hash) location.hash = hash; else mostrarTela(hash, true);
  }

  window.addEventListener('hashchange', function () { mostrarTela(location.hash, true); });
  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); });
  });

  function preenchido(k) { return lerNumero(estado.campos[k]) !== null; }
  function respondida(k) { return !!estado.resp[k]; }
  function todos(lista, f) { return lista.every(f); }

  function passoFeito(n) {
    switch (n) {
      case 1: return !!(estado.previsao.a && estado.previsao.b);
      case 2: return todos(['P1', 'P2', 'P3'], preenchido) && todos(['P2q', 'P4'], respondida);
      case 3: return todos(['P5a', 'P5b'], preenchido) && todos(['P6', 'P7', 'P8'], respondida);
      case 4: return todos(['P9a', 'P9b', 'P10a', 'P10b', 'P11a', 'P11b'], preenchido) && respondida('P12');
      case 5: return preenchido('P13') && todos(['P14', 'P15'], respondida);
      case 6: return [1, 2, 3, 4, 5].every(passoFeito);
      default: return false;
    }
  }

  function renderBarra() {
    document.querySelectorAll('#lista-passos a').forEach(function (a) {
      a.classList.toggle('feito', passoFeito(parseInt(a.getAttribute('data-passo'), 10)));
    });
  }

  // ---------- Controles deslizantes com botões − e + ----------
  var CONTROLES = [];

  function controle(cfg) {
    CONTROLES.push(cfg);
    var input = $(cfg.id);
    function aplicar(v) {
      if (!isFinite(v)) return;
      var min = valorDe(cfg.min), max = valorDe(cfg.max);
      v = limitar(arred(v, cfg.passo), min, max);
      v = Math.round(v * 1000) / 1000;
      var o = cfg.obj();
      if (o[cfg.chave] === v) return;
      o[cfg.chave] = v;
      if (cfg.aoMudar) cfg.aoMudar();
      salvar();
      renderAtivo();
    }
    input.addEventListener('input', function () { aplicar(parseFloat(input.value)); });
    $(cfg.id + '-menos').addEventListener('click', function () { aplicar(cfg.obj()[cfg.chave] - cfg.passo); });
    $(cfg.id + '-mais').addEventListener('click', function () { aplicar(cfg.obj()[cfg.chave] + cfg.passo); });
  }

  function renderControles(prefixo) {
    CONTROLES.forEach(function (cfg) {
      if (cfg.id.indexOf(prefixo) !== 0) return;
      var input = $(cfg.id), min = valorDe(cfg.min), max = valorDe(cfg.max), v = cfg.obj()[cfg.chave];
      input.min = min;
      input.max = max;
      if (parseFloat(input.value) !== v) input.value = v;
      $(cfg.id + '-valor').textContent = num(v, cfg.casas || 0);
      $(cfg.id + '-menos').disabled = v <= min;
      $(cfg.id + '-mais').disabled = v >= max;
    });
  }

  // Põe o HTML na caixa só se algo mudou (evita refazer gráficos grandes a cada toque).
  function porNaCaixa(id, chave, gerar) {
    var caixa = $(id);
    if (caixa.getAttribute('data-chave') === chave) return;
    caixa.innerHTML = gerar();
    caixa.setAttribute('data-chave', chave);
  }

  // ---------- Botões de escolha (um toque) ----------
  function marcar(grupo, valor) {
    grupo.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === String(valor)));
    });
  }

  function ligarEscolha(idGrupo, aoEscolher) {
    $(idGrupo).querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { aoEscolher(b.getAttribute('data-valor')); salvar(); renderAtivo(); });
    });
  }

  // Texto simples de um botão, com Hₑ e Nₑ em subscrito Unicode (para o registro em .txt).
  var SUBSCRITOS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', 'e': 'ₑ', 'm': 'ₘ' };
  function textoPlano(el) {
    var t = '';
    el.childNodes.forEach(function (n) {
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeName === 'SUB') t += n.textContent.replace(/./g, function (c) { return SUBSCRITOS[c] || c; });
      else t += textoPlano(n);
    });
    return t;
  }

  function textoDaEscolha(idCaixa, valor) {
    if (!valor) return 'sem resposta';
    var b = $(idCaixa).querySelector('button[data-valor="' + valor + '"]');
    return b ? textoPlano(b).replace(/\s+/g, ' ').trim() : valor;
  }

  var PERGUNTAS = [];

  function pergunta(def) {
    PERGUNTAS.push(def);
    $(def.id).querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.resp[def.chave] = b.getAttribute('data-valor');
        salvar();
        renderAtivo();
      });
    });
  }

  function renderPerguntas() {
    PERGUNTAS.forEach(function (def) {
      var caixa = $(def.id), resp = estado.resp[def.chave];
      marcar(caixa, resp);
      var ret = caixa.querySelector('.retorno');
      if (!resp) { ret.hidden = true; return; }
      ret.hidden = false;
      ret.innerHTML = (resp === def.certa ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + def.rotuloCerta + '.</strong> ') + def.explicacao;
    });
  }

  // ---------- Campos numéricos dos problemas ----------
  var RETORNOS = [];

  function campo(def) { RETORNOS.push(def); }

  document.querySelectorAll('input[data-campo]').forEach(function (inp) {
    var k = inp.getAttribute('data-campo');
    inp.addEventListener('input', function () { estado.campos[k] = inp.value; salvar(); renderBarra(); });
    inp.addEventListener('change', function () { renderCampos(); renderBarra(); });
  });

  function renderCampos() {
    document.querySelectorAll('input[data-campo]').forEach(function (inp) {
      var v = estado.campos[inp.getAttribute('data-campo')] || '';
      if (inp.value !== v && document.activeElement !== inp) inp.value = v;
    });
    RETORNOS.forEach(function (def) {
      var ret = $(def.id), html = def.texto();
      ret.hidden = !html;
      ret.innerHTML = html || '';
    });
  }

  // ---------- Passo 1 ----------
  ligarEscolha('botoes-prev-a', function (v) { estado.previsao.a = v; });
  ligarEscolha('botoes-prev-b', function (v) { estado.previsao.b = v; });
  $('campo-nome').addEventListener('input', function () { estado.nome = this.value; salvar(); });

  function renderPasso1() {
    marcar($('botoes-prev-a'), estado.previsao.a);
    marcar($('botoes-prev-b'), estado.previsao.b);
    if ($('campo-nome').value !== estado.nome && document.activeElement !== $('campo-nome')) $('campo-nome').value = estado.nome || '';
    $('eco-previsao').textContent = (estado.previsao.a && estado.previsao.b) ?
      'Previsões guardadas. Você confere as duas no fim do Passo 3.' : '';
  }

  // ---------- Passo 2: o sorteio de cada geração ----------
  function zerarUm() { estado.um.g = 0; }
  controle({ id: 's-N', obj: function () { return estado.sorteio; }, chave: 'N', passo: 1, min: 4, max: 200, aoMudar: zerarUm });
  controle({ id: 's-p0', obj: function () { return estado.sorteio; }, chave: 'p0', passo: 0.05, min: 0.05, max: 0.95, casas: 2, aoMudar: zerarUm });
  controle({ id: 's-frag', obj: function () { return estado.sorteio; }, chave: 'frag', passo: 1, min: 1, max: 50 });
  controle({ id: 's-ger', obj: function () { return estado.sorteio; }, chave: 'ger', passo: 10, min: 10, max: 200 });

  function absorcao(copias, n2, ate) {
    for (var g = 0; g <= ate && g < copias.length; g++) if (copias[g] === 0 || copias[g] === n2) return g;
    return null;
  }

  $('um-proxima').addEventListener('click', function () { estado.um.g = Math.min(estado.um.g + 1, 500); salvar(); renderAtivo(); });
  $('um-mais10').addEventListener('click', function () { estado.um.g = Math.min(estado.um.g + 10, 500); salvar(); renderAtivo(); });
  $('um-recomecar').addEventListener('click', function () {
    estado.um.g = 0;
    estado.um.semente = (estado.um.semente + 1) % 4294967296;
    salvar(); renderAtivo();
  });

  function renderUm() {
    var s = estado.sorteio, u = estado.um, tr = trajetoriaUm(), g = u.g, n2 = 2 * s.N;
    var k = tr.copiasA[g], p = k / n2;
    var html = '';
    for (var i = 0; i < n2; i++) html += '<span class="copia ' + (i < k ? 'A' : 'a') + '"></span>';
    porNaCaixa('um-copias', [s.N, k].join('|'), function () { return html; });
    $('um-copias').classList.toggle('grandes', n2 <= 60);

    var txt = '<strong>Geração ' + g + '</strong>: ' + k + (k === 1 ? ' cópia' : ' cópias') + ' de A e ' + (n2 - k) + ' de a, em ' + n2 +
      ' (' + s.N + ' micos). <i>p</i> = ' + num(p, 2) + '.';
    var abs = absorcao(tr.copiasA, n2, g);
    if (abs !== null) {
      txt += k === n2 ? ' O A se fixou na geração ' + abs + ': daqui em diante, só há A.' : ' O A foi perdido na geração ' + abs + ': daqui em diante, só há a.';
    }
    if (g === 0 && !igual(p, s.p0)) txt += ' Com ' + n2 + ' cópias, o mais perto de ' + num(s.p0, 2) + ' é ' + num(p, 3) + '.';
    $('um-texto').innerHTML = txt;
    $('um-proxima').disabled = abs !== null || g >= 500;
    $('um-mais10').disabled = abs !== null || g >= 500;

    var gmax = geracoesUm(), t = tamanho('um-grafico', 0.42);
    var passoX = gmax <= 60 ? 10 : (gmax <= 150 ? 25 : 50), ticks = [];
    for (var x = 0; x <= gmax; x += passoX) ticks.push(x);
    porNaCaixa('um-grafico', ['u', s.N, s.p0, u.semente, g, gmax, t.largura].join('|'), function () {
      return G.linhas({
        largura: t.largura, altura: t.altura,
        x: { min: 0, max: gmax, ticks: ticks, rotulo: 'Geração' },
        y: { min: 0, max: 1, ticks: [0, 0.5, 1], rotulo: 'p (A)' },
        series: [{ pontos: tr.p.slice(0, g + 1).map(function (v, i) { return [i, v]; }), classe: 's', traco: 'cheio' }],
        marcas: [{ x: g, y: p, classe: 'atual', rotulo: num(p, 2), abaixo: p > 0.8 }],
        descricao: 'Frequência de A neste fragmento da geração 0 até a geração ' + g
      });
    });
  }

  function rodarVarios() {
    var s = estado.sorteio;
    var r = { N: s.N, p0: s.p0, frag: s.frag, ger: s.ger, semente: estado.varios.semente };
    estado.varios.rodada = r;
    capturarVarios(r, resultadoVarios(r));
    salvar();
    renderAtivo();
  }

  function atalhoVarios(N, p0, frag, ger) {
    var s = estado.sorteio;
    if (s.N !== N || !igual(s.p0, p0)) estado.um.g = 0;
    s.N = N; s.p0 = p0; s.frag = frag; s.ger = ger;
    rodarVarios();
  }

  $('v-rodar').addEventListener('click', rodarVarios);
  $('v-sortear').addEventListener('click', function () {
    estado.varios.semente = (estado.varios.semente + 1) % 4294967296;
    rodarVarios();
  });
  $('v-P1').addEventListener('click', function () { atalhoVarios(10, 0.5, 20, 30); });
  $('v-P2').addEventListener('click', function () { atalhoVarios(100, 0.5, 20, 30); });
  $('v-P3').addEventListener('click', function () { atalhoVarios(10, 0.2, 50, 200); });

  function renderVarios() {
    var s = estado.sorteio, r = estado.varios.rodada;
    var mudou = !!r && (r.N !== s.N || !igual(r.p0, s.p0) || r.frag !== s.frag || r.ger !== s.ger);
    $('v-aviso').hidden = !mudou;
    if (!r) {
      porNaCaixa('v-grafico', 'vazio', function () { return '<p class="vazio">Toque em Rodar ou num dos atalhos.</p>'; });
      $('v-contadores').innerHTML = '';
      $('v-rodada').textContent = '';
      return;
    }
    var res = resultadoVarios(r), t = tamanho('v-grafico', 0.5);
    var passoX = r.ger <= 50 ? 10 : (r.ger <= 100 ? 20 : 50), ticks = [];
    for (var x = 0; x <= r.ger; x += passoX) ticks.push(x);
    porNaCaixa('v-grafico', ['v', r.N, r.p0, r.frag, r.ger, r.semente, t.largura].join('|'), function () {
      var series = res.trajetorias.map(function (tr) {
        return { pontos: tr.map(function (p, g) { return [g, p]; }), classe: 'frag', traco: 'cheio' };
      });
      series.push({ pontos: res.media.map(function (p, g) { return [g, p]; }), classe: 'media', traco: 'tracejado', rotulo: 'média' });
      return G.linhas({
        largura: t.largura, altura: t.altura,
        x: { min: 0, max: r.ger, ticks: ticks, rotulo: 'Geração' },
        y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], rotulo: 'Frequência de A (p)' },
        series: series,
        refs: [{ y: res.p0, rotulo: 'p₀ = ' + num(res.p0, 2), lado: 'esquerda' }],
        descricao: r.frag + ' fragmentos com N ' + r.N + ' e p0 ' + num(res.p0, 2) + ' ao longo de ' + r.ger + ' gerações'
      });
    });
    $('v-contadores').innerHTML =
      '<div><span class="n">' + res.fixou + '</span>fixaram A</div>' +
      '<div><span class="n">' + res.perdeu + '</span>perderam A</div>' +
      '<div><span class="n">' + res.ambos + '</span>ainda com os dois</div>' +
      '<div><span class="n">' + num(res.media[r.ger], 2) + '</span>média de <i>p</i> no fim</div>';
    $('v-rodada').innerHTML = 'Rodada: <i>N</i> = ' + r.N + ', ' + P0 + ' = ' + num(res.p0, 2) + ', ' + r.frag +
      (r.frag === 1 ? ' fragmento, ' : ' fragmentos, ') + r.ger + ' gerações, sorteio ' + nSorteio(r.semente, 'varios') + '.';
  }

  function renderPasso2() {
    renderControles('s-');
    renderUm();
    renderVarios();
  }

  campo({ id: 'ret-P1', texto: function () {
    var v = lerNumero(estado.campos.P1);
    if (v === null) return '';
    var c = estado.canon.P1;
    var teoria = ' Pela teoria, com <i>N</i> = 10, cerca de 70% dos fragmentos fixam ou perdem A em 30 gerações: 14 de 20, em média. O número muda de uma rodada para outra.';
    if (!c) return 'Para conferir, toque no atalho P1.' + teoria;
    var tot = c.fixou + c.perdeu;
    return (v === tot ? '<strong>Confere com a sua rodada.</strong> ' : '<strong>Na sua rodada foram ' + tot + '.</strong> ') +
      'O A se fixou em ' + c.fixou + ' e foi perdido em ' + c.perdeu + ' dos 20 fragmentos (sorteio ' + nSorteio(c.semente, 'varios') + ').' + teoria;
  } });

  campo({ id: 'ret-P2', texto: function () {
    var v = lerNumero(estado.campos.P2);
    if (v === null) return '';
    var c = estado.canon.P2;
    var teoria = ' Pela teoria, com <i>N</i> = 100, quase nenhum fragmento fixa ou perde A em 30 gerações (menos de 0,1%).';
    if (!c) return 'Para conferir, toque no atalho P2.' + teoria;
    var tot = c.fixou + c.perdeu;
    return (v === tot ? '<strong>Confere com a sua rodada.</strong> ' : '<strong>Na sua rodada foram ' + tot + '.</strong> ') +
      'Com <i>N</i> = 100, o A se fixou em ' + c.fixou + ' e foi perdido em ' + c.perdeu + ' dos 20 fragmentos (sorteio ' + nSorteio(c.semente, 'varios') + ').' + teoria;
  } });

  campo({ id: 'ret-P3', texto: function () {
    var v = lerNumero(estado.campos.P3);
    if (v === null) return '';
    if (v > 1) return 'Digite a fração, de 0 a 1. Por exemplo, 9 de 50 fragmentos = 0,18.';
    var c = estado.canon.P3;
    var teoria = ' A teoria diz 0,20: a chance de um alelo neutro se fixar é a frequência dele no começo. Com 50 fragmentos, o resultado muda de uma rodada para outra, em geral entre 0,10 e 0,30.';
    if (!c) return 'Para conferir, toque no atalho P3.' + teoria;
    var f = c.fixou / 50;
    return (Math.abs(v - f) < 0.011 ? '<strong>Confere com a sua rodada.</strong> ' : '<strong>Na sua rodada foi ' + num(f, 2) + '.</strong> ') +
      'O A se fixou em ' + c.fixou + ' dos 50 fragmentos (sorteio ' + nSorteio(c.semente, 'varios') + ').' + teoria;
  } });

  pergunta({ id: 'q-P2', chave: 'P2q', certa: 'c', rotuloCerta: 'com menos micos, o sorteio de cada geração erra mais',
    explicacao: 'A mudança de <i>p</i> numa geração tem variância <i>pq</i>/2<i>N</i>. Com <i>p</i> = 0,50, o desvio padrão dessa mudança é 0,11 com <i>N</i> = 10 e 0,035 com <i>N</i> = 100. Num fragmento pequeno, cada sorteio afasta mais a frequência, e ela chega antes a 0 ou a 1. No modelo não há seleção nem mutação.' });
  pergunta({ id: 'q-P4', chave: 'P4', certa: 'b', rotuloCerta: 'quase não: a deriva não tem direção',
    explicacao: 'Cada fragmento vai para um lado, mas a média entre eles fica perto de ' + P0 + '. A deriva muda as frequências ao acaso, sem direção: a chance de A se fixar é a própria ' + P0 + '. Quem tem direção é a seleção, como na prática de 05/11.' });

  // ---------- Passo 3: a febre amarela num fragmento ----------
  $('alelos-legenda').innerHTML = MS.freqs.map(function (f, i) {
    return '<span><i class="cor" style="background:' + MS.cores[i] + '"></i><span>' + nomeAlelo(i) + ' ' + num(f, 2) + '</span></span>';
  }).join('');

  function nbTerco() { return Math.round(2 * estado.gar.N0 / 3); }

  controle({ id: 'g-N0', obj: function () { return estado.gar; }, chave: 'N0', passo: 10, min: 20, max: 400,
    aoMudar: function () { if (estado.gar.Nb > estado.gar.N0) estado.gar.Nb = estado.gar.N0; } });
  controle({ id: 'g-Nb', obj: function () { return estado.gar; }, chave: 'Nb', passo: 1, min: 2, max: function () { return estado.gar.N0; } });
  controle({ id: 'g-t', obj: function () { return estado.gar; }, chave: 't', passo: 1, min: 0, max: 30 });

  function rodarGargalo() {
    var g = estado.gar;
    var r = { N0: g.N0, Nb: g.Nb, t: g.t, semente: g.semente };
    g.rodada = r;
    g.exemplo = 0;
    capturarGargalo(r, resultadoGargalo(r));
    salvar();
    renderAtivo();
  }

  $('g-rodar').addEventListener('click', rodarGargalo);
  $('g-sortear').addEventListener('click', function () {
    estado.gar.semente = (estado.gar.semente + 1) % 4294967296;
    rodarGargalo();
  });
  $('g-terco').addEventListener('click', function () { estado.gar.Nb = nbTerco(); rodarGargalo(); });
  $('g-cinco').addEventListener('click', function () { estado.gar.Nb = 10; rodarGargalo(); });
  $('g-dois').addEventListener('click', function () { estado.gar.Nb = 4; rodarGargalo(); });
  $('g-outro').addEventListener('click', function () {
    estado.gar.exemplo = (estado.gar.exemplo + 1) % 50;
    salvar(); renderAtivo();
  });

  function rotuloMomento(g, r) {
    if (g === 0) return 'Antes';
    if (g === 1) return 'Logo depois';
    return r.t + (r.t === 1 ? ' geração depois' : ' gerações depois');
  }

  function barraEmpilhada(freqs) {
    return '<div class="empilhada">' + freqs.map(function (f, i) {
      if (f <= 0) return '';
      return '<span style="width:' + (100 * f).toFixed(2) + '%;background:' + MS.cores[i] + ';color:' + TEXTO_SOBRE[i] + '" title="' + MS.nomes[i] + ': ' + num(f, 2) + '">' +
        (f >= 0.12 ? MS.nomes[i] : '') + '</span>';
    }).join('') + '</div>';
  }

  function listaAlelos(indices) {
    var nomes = indices.map(nomeAlelo);
    if (nomes.length <= 1) return nomes.join('');
    return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
  }

  function renderGargalo() {
    renderControles('g-');
    var g = estado.gar, r = g.rodada;
    $('g-terco').innerHTML = '<span>Morreu um terço (' + NB + ' = ' + nbTerco() + ')</span>';
    var mudou = !!r && (r.N0 !== g.N0 || r.Nb !== g.Nb || r.t !== g.t);
    $('g-aviso').hidden = !mudou;
    if (!r) {
      $('g-resultados').hidden = true;
      $('g-rodada').innerHTML = 'Toque em Rodar ou num dos atalhos.';
      renderPrevisoes();
      return;
    }
    $('g-resultados').hidden = false;
    var res = resultadoGargalo(r), ult = res.tamanhos.length - 1;

    // Tabela: antes, logo depois e t gerações depois
    var momentos = [0, 1];
    if (ult > 1) momentos.push(ult);
    $('g-tabela').innerHTML = '<table class="momentos"><thead><tr><th>Momento</th><th class="num"><i>N</i></th><th class="num">Alelos (de 6)</th><th class="num">' + HE + '</th></tr></thead><tbody>' +
      momentos.map(function (m) {
        return '<tr><th scope="row">' + rotuloMomento(m, r) + '</th><td class="num">' + res.tamanhos[m] + '</td>' +
          '<td class="num">' + num(res.A[m], 2) + '<span class="pc suave">' + pct(res.A[m] / res.A0, 0) + '</span></td>' +
          '<td class="num">' + num(res.H[m], 3) + '<span class="pc suave">' + pct(res.H[m] / res.H0, 0) + '</span></td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="pequeno suave">Médias de ' + NFRAG + ' fragmentos. Embaixo de cada média, a porcentagem do valor de antes do surto.</p>';

    // Gráfico em % do valor de antes. O eixo y começa abaixo do menor valor (múltiplo de 10).
    var t = tamanho('g-grafico', 0.5), ticks = [], passoX = ult <= 12 ? 1 : 5;
    if (t.largura < 480 && ult > 8 && ult <= 12) passoX = 2;
    for (var x = 0; x <= ult; x += passoX) ticks.push(x);
    var menor = 100;
    for (var m = 0; m <= ult; m++) menor = Math.min(menor, 100 * res.A[m] / res.A0, 100 * res.H[m] / res.H0);
    var yMin = Math.max(0, Math.min(90, Math.floor((menor - 3) / 10) * 10));
    var passoY = 100 - yMin <= 30 ? 5 : (100 - yMin <= 60 ? 10 : 25), ticksY = [];
    for (var yv = yMin; yv <= 100; yv += passoY) ticksY.push(yv);
    porNaCaixa('g-grafico', ['g', r.N0, r.Nb, r.t, r.semente, t.largura].join('|'), function () {
      return G.linhas({
        largura: t.largura, altura: t.altura,
        x: { min: 0, max: Math.max(1, ult), ticks: ticks, rotulo: 'Geração (o surto é a geração 1)' },
        y: { min: yMin, max: 100, ticks: ticksY, rotulo: '% do valor de antes', fmt: function (v) { return v + '%'; } },
        series: [
          { pontos: res.A.map(function (a, i) { return [i, 100 * a / res.A0]; }), classe: 'r', traco: 'cheio', rotulo: 'alelos' },
          { pontos: res.H.map(function (h, i) { return [i, 100 * h / res.H0]; }), classe: 's', traco: 'cheio', rotulo: 'Hₑ' }
        ],
        verticais: [{ x: 1, rotulo: 'surto' }],
        descricao: 'Número médio de alelos e Hₑ, em porcentagem do valor antes do surto, com N0 ' + r.N0 + ' e Nb ' + r.Nb
      });
    });

    // Chance de cada alelo ter sumido
    var depois = ult > 1;
    $('g-barras').innerHTML = '<p class="pequeno suave">Barra cheia: logo depois do surto' + (depois ? '. Barra clara: ' + rotuloMomento(ult, r) : '') + '.</p>' +
      '<div class="perdas">' + MS.freqs.map(function (f, i) {
        var a = res.sumiuLogo[i], b = res.sumiuFim[i];
        return '<span class="rotulo"><i class="cor" style="background:' + MS.cores[i] + '"></i><span>' + nomeAlelo(i) + ' (' + num(f, 2) + ')</span></span>' +
          '<span class="barras-par"><span class="barra-h"><span style="width:' + (100 * a).toFixed(1) + '%;background:' + MS.cores[i] + '"></span></span>' +
          (depois ? '<span class="barra-h depois"><span style="width:' + (100 * b).toFixed(1) + '%;background:' + MS.cores[i] + '"></span></span>' : '') + '</span>' +
          '<span class="valor">' + pctCurta(a) + (depois ? ' e ' + pctCurta(b) : '') + '</span>';
      }).join('') + '</div>';

    // Um fragmento de exemplo
    var idx = g.exemplo % res.exemplos.length, ex = res.exemplos[idx];
    var sumiuLogo = [], sumiuDepois = [];
    MS.freqs.forEach(function (f, i) {
      if (ex.logo[i] === 0) sumiuLogo.push(i);
      else if (ex.fim[i] === 0) sumiuDepois.push(i);
    });
    var linhas = [['Antes', MS.freqs], ['Logo depois', ex.logo]];
    if (depois) linhas.push([rotuloMomento(ult, r), ex.fim]);
    var frase = 'Fragmento ' + (idx + 1) + ' de ' + NFRAG + '. ' +
      (sumiuLogo.length ? 'Logo depois do surto, ' + (sumiuLogo.length === 1 ? 'sumiu ' : 'sumiram ') + listaAlelos(sumiuLogo) + '.' : 'Logo depois do surto, nenhum alelo sumiu.');
    if (depois) {
      var nas = r.t === 1 ? ' Na geração seguinte, ' : ' Nas ' + r.t + ' gerações seguintes, ';
      var tambem = sumiuLogo.length ? ' também ' : ' ';
      frase += sumiuDepois.length ? nas + (sumiuDepois.length === 1 ? 'sumiu' : 'sumiram') + tambem + listaAlelos(sumiuDepois) + '.' :
        nas + (sumiuLogo.length ? 'nenhum outro sumiu.' : 'nenhum sumiu.');
    }
    $('g-exemplo').innerHTML = '<div class="composicao">' + linhas.map(function (l) {
      return '<span class="rotulo">' + l[0] + '</span>' + barraEmpilhada(l[1]);
    }).join('') + '</div><p>' + frase + '</p>';

    $('g-rodada').innerHTML = 'Rodada: ' + N0 + ' = ' + r.N0 + ', ' + NB + ' = ' + r.Nb + ', ' + r.t + (r.t === 1 ? ' geração' : ' gerações') +
      ' depois do surto, ' + NFRAG + ' fragmentos, sorteio ' + nSorteio(r.semente, 'gargalo') + '.';
    renderPrevisoes();
  }

  function renderPrevisoes() {
    var caixa = $('g-previsoes');
    if (!estado.gar.rodada) { caixa.innerHTML = ''; return; }
    var a = estado.previsao.a, b = estado.previsao.b;
    caixa.innerHTML = '<h3>Suas previsões do Passo 1</h3>' +
      '<p><strong>1a.</strong> Você escolheu: ' + esc(textoDaEscolha('botoes-prev-a', a)) + '. ' +
      (a === 'a' ? '<strong>Isso.</strong> ' : '<strong>Esperado: (a) o número de alelos.</strong> ') +
      'Com cinco casais (' + NB + ' = 10), restam cerca de 85% dos alelos e 95% do ' + HE + ' logo depois do surto: os que somem são os raros, que pesam pouco no ' + HE +
      '. Se ficam muitos micos ("Morreu um terço"), os dois quase não mudam: o que decide é quantos micos ficam. E a volta do crescimento não devolve alelo perdido.</p>' +
      '<p><strong>1b.</strong> Você escolheu: ' + esc(textoDaEscolha('botoes-prev-b', b)) + '. ' +
      (b === 'c' ? '<strong>Isso.</strong> ' : '<strong>Esperado: (c) pode chegar a 0% ou a 100% por acaso.</strong> ') +
      'Com 10 micos, cerca de 70% dos fragmentos fixam ou perdem o alelo em 30 gerações (P1), e a média entre os fragmentos fica perto de 50% (P4): o acaso não tem direção.</p>';
  }

  campo({ id: 'ret-P5', texto: function () {
    var a = lerPorcentagem(estado.campos.P5a), b = lerPorcentagem(estado.campos.P5b);
    if (a === null && b === null) return '';
    var c = estado.canon.P5;
    var teoria = ' A teoria espera 85% dos alelos e 95% do ' + HE + ': o número de alelos cai mais, em proporção.';
    if (!c) return 'Para conferir, toque no atalho "Cinco casais".' + teoria;
    var ca = 100 * c.A, cb = 100 * c.H;
    var confere = a !== null && b !== null && Math.abs(a - ca) <= 1.5 && Math.abs(b - cb) <= 1.5;
    return (confere ? '<strong>Confere com a sua rodada.</strong> ' : '<strong>Na sua rodada: ' + num(ca, 0) + '% e ' + num(cb, 0) + '%.</strong> ') +
      'Logo depois do surto, restaram ' + num(ca, 1) + '% dos alelos e ' + num(cb, 1) + '% do ' + HE + ' (sorteio ' + nSorteio(c.semente, 'gargalo') + ').' + teoria;
  } });

  pergunta({ id: 'q-P6', chave: 'P6', certa: 'c', rotuloCerta: 'os raros, de 6% e 4%',
    explicacao: 'A chance de um alelo de frequência <i>p</i> sumir num sorteio de 2<i>N</i> cópias é (1 − <i>p</i>)<sup>2<i>N</i></sup>. Com cinco casais (20 cópias), ela é de 44% para o alelo de 4%, de 29% para o de 6% e quase zero para o de 40%. Os alelos raros pesam pouco no ' + HE + ': quando eles somem, o ' + HE + ' quase não cai.' });
  pergunta({ id: 'q-P7', chave: 'P7', certa: 'b', rotuloCerta: 'quase nada se perde logo depois',
    explicacao: 'Com 67 micos (134 cópias), até o alelo de 4% tem só 0,4% de chance de sumir, e o ' + HE + ' cai 1/(2 × 67) = 0,7%. Para a deriva, pesa quantos micos ficam, e não a fração que morreu. Num fragmento pequeno, como Poço das Antas, o mesmo surto deixa poucos casais.' });
  pergunta({ id: 'q-P8', chave: 'P8', certa: 'c', rotuloCerta: 'não: só voltam por mutação ou pela chegada de micos de fora',
    explicacao: 'Um alelo que sumiu não está em nenhuma cópia para ser sorteado de novo. Na tabela, o número médio de alelos não sobe depois do surto, mesmo com a população de volta a ' + N0 + ': ele continua caindo devagar. O alelo perdido só volta por mutação, que é rara, ou com micos vindos de outra população.' });

  // ---------- Passo 4: quantos micos se reproduzem ----------
  controle({ id: 'ne-grupos', obj: function () { return estado.ne; }, chave: 'grupos', passo: 1, min: 1, max: 100 });
  controle({ id: 'ne-t', obj: function () { return estado.ne; }, chave: 't', passo: 1, min: 1, max: 50 });
  controle({ id: 'ne-femeas', obj: function () { return estado.ne; }, chave: 'femeas', passo: 1, min: 1, max: 3 });
  controle({ id: 'ne-machos', obj: function () { return estado.ne; }, chave: 'machos', passo: 1, min: 1, max: 3 });

  function renderPasso4() {
    renderControles('ne-');
    var n = estado.ne, Nm = n.grupos * n.machos, Nf = n.grupos * n.femeas;
    var Ne = M.tamanhoEfetivo(Nm, Nf), perda = M.perdaPorGeracao(Ne), resta = M.resta(Ne, n.t);
    var casasNe = Math.abs(Ne - Math.round(Ne)) < 1e-9 ? 0 : 1;
    $('ne-saida').innerHTML =
      '<p><i>N</i><sub>m</sub> = ' + Nm + (Nm === 1 ? ' macho' : ' machos') + ' e <i>N</i><sub>f</sub> = ' + Nf + (Nf === 1 ? ' fêmea' : ' fêmeas') + ' que se reproduzem.</p>' +
      '<p>' + NE + ' = 4 × ' + Nm + ' × ' + Nf + ' / (' + Nm + ' + ' + Nf + ') = <strong>' + num(Ne, casasNe) + '</strong></p>' +
      '<p>Perda de heterozigosidade por geração: 1/(2' + NE + ') = <strong>' + num(100 * perda, 2) + '%</strong></p>' +
      '<p>Resta depois de ' + n.t + (n.t === 1 ? ' geração' : ' gerações') + ': (1 − 1/(2' + NE + '))<sup>' + n.t + '</sup> = <strong>' + num(100 * resta, 1) + '%</strong> da heterozigosidade</p>';
  }

  function okPar(a, b, alvoA, tolA, alvoB, tolB) {
    return a !== null && b !== null && Math.abs(a - alvoA) <= tolA && Math.abs(b - alvoB) <= tolB;
  }

  campo({ id: 'ret-P9', texto: function () {
    var a = lerNumero(estado.campos.P9a), b = lerPorcentagem(estado.campos.P9b);
    if (a === null && b === null) return '';
    return (okPar(a, b, 10, 0.4, 5, 0.15) ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + NE + ' = 10 e 5% por geração.</strong> ') +
      'Com 5 grupos e um casal em cada, <i>N</i><sub>m</sub> = <i>N</i><sub>f</sub> = 5: ' + NE + ' = 4 × 5 × 5 / (5 + 5) = 10. A perda por geração é 1/(2 × 10) = 0,05, ou 5%.';
  } });
  campo({ id: 'ret-P10', texto: function () {
    var a = lerNumero(estado.campos.P10a), b = lerPorcentagem(estado.campos.P10b);
    if (a === null && b === null) return '';
    return (okPar(a, b, 26, 0.4, 1.923, 0.1) ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + NE + ' = 26 e 1,9% por geração.</strong> ') +
      'Com 13 grupos, <i>N</i><sub>m</sub> = <i>N</i><sub>f</sub> = 13: ' + NE + ' = 4 × 13 × 13 / (13 + 13) = 26. A perda é 1/(2 × 26) = 0,019, ou 1,9% por geração.';
  } });
  campo({ id: 'ret-P11', texto: function () {
    var a = lerPorcentagem(estado.campos.P11a), b = lerPorcentagem(estado.campos.P11b);
    if (a === null && b === null) return '';
    return (okPar(a, b, 59.87, 1.5, 82.35, 1.5) ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: cerca de 60% e 82%.</strong> ') +
      'Com ' + NE + ' = 10: (1 − 0,05)<sup>10</sup> = 0,599, restam 60%. Com ' + NE + ' = 26: (1 − 0,019)<sup>10</sup> = 0,824, restam 82%. Perder os 8 grupos acelera a perda de heterozigosidade.';
  } });

  pergunta({ id: 'q-P12', chave: 'P12', certa: 'a', rotuloCerta: 'só os casais dominantes deixam filhotes',
    explicacao: 'O ' + NE + ' conta quem passa genes para a próxima geração. Os 16 micos estavam em 5 grupos, com um casal reprodutor em cada: 10 reprodutores. Os outros 6 ajudam a criar os filhotes, mas quase não deixam descendentes.' });

  // ---------- Passo 5: o que os dados mostram ----------
  campo({ id: 'ret-P13', texto: function () {
    var v = lerPorcentagem(estado.campos.P13);
    if (v === null) return '';
    var q = 100 * M.queda(D.CENSO.n1, D.CENSO.n2);
    return (v >= 30 && v <= 33.5 ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: cerca de 32%.</strong> ') +
      '(3.706 − 2.516) / 3.706 = ' + num(q / 100, 3) + ': queda de ' + num(q, 0) + '%, cerca de um terço. Os autores dão 30% ou 32%, conforme o método de estimativa.';
  } });

  pergunta({ id: 'q-P14', chave: 'P14', certa: 'b', rotuloCerta: 'sim: os alelos caem antes da heterozigosidade',
    explicacao: 'No Passo 3, com cinco casais, restaram cerca de 85% dos alelos e 95% do ' + HE + '. Os alelos que somem são os raros, que pesam pouco no ' + HE + '. Grativol et al. (2001) viram o mesmo padrão em populações reais isoladas havia pouco tempo.' });
  pergunta({ id: 'q-P15', chave: 'P15', certa: 'd', rotuloCerta: 'a chegada de micos de outra população, por translocação ou por corredor',
    explicacao: 'Um alelo perdido só volta por mutação, que é rara, ou com genes vindos de fora: fluxo gênico. A vacina protege os micos que restam, mas não devolve alelos, e o crescimento só multiplica os alelos que sobraram. Por isso Dietz et al. (2019) recomendam translocações e corredores entre as unidades de manejo. Fluxo gênico é o assunto de 17/11 e da prática de 19/11.' });

  // ---------- Passo 6: seus números ----------
  function campoTexto(k, tipo) {
    var v = tipo === '%' ? lerPorcentagem(estado.campos[k]) : lerNumero(estado.campos[k]);
    if (v === null) return '(sem resposta)';
    if (tipo === '%') return numLivre(v, 2) + '%';
    if (tipo === 'fracao') return numLivre(v, 3);
    return numLivre(v, 2);
  }

  function acertos() {
    var n = 0;
    PERGUNTAS.forEach(function (def) { if (estado.resp[def.chave] === def.certa) n++; });
    return n;
  }

  function linhasNumeros() {
    var k = estado.canon, L = [];
    L.push('P1 (N 10): você anotou ' + campoTexto('P1') + (k.P1 ? '; rodada: ' + (k.P1.fixou + k.P1.perdeu) + ' de 20 (' + k.P1.fixou + ' fixaram, ' + k.P1.perdeu + ' perderam; sorteio ' + nSorteio(k.P1.semente, 'varios') + ')' : ''));
    L.push('P2 (N 100): você anotou ' + campoTexto('P2') + (k.P2 ? '; rodada: ' + (k.P2.fixou + k.P2.perdeu) + ' de 20 (sorteio ' + nSorteio(k.P2.semente, 'varios') + ')' : ''));
    L.push('P3 (p₀ 0,20): você anotou ' + campoTexto('P3', 'fracao') + (k.P3 ? '; rodada: ' + k.P3.fixou + ' de 50 fixaram (' + num(k.P3.fixou / 50, 2) + '; sorteio ' + nSorteio(k.P3.semente, 'varios') + '); teoria 0,20' : ''));
    L.push('P5 (cinco casais, logo depois): alelos ' + campoTexto('P5a', '%') + ', Hₑ ' + campoTexto('P5b', '%') +
      (k.P5 ? '; rodada: ' + num(100 * k.P5.A, 1) + '% e ' + num(100 * k.P5.H, 1) + '% (sorteio ' + nSorteio(k.P5.semente, 'gargalo') + ')' : ''));
    if (k.P7) L.push('P7 (morreu um terço, Nb ' + k.P7.Nb + ', logo depois): rodada: alelos ' + num(100 * k.P7.A, 1) + '%, Hₑ ' + num(100 * k.P7.H, 1) + '%');
    L.push('P9 (5 grupos): Nₑ ' + campoTexto('P9a') + '; perda ' + campoTexto('P9b', '%') + ' por geração');
    L.push('P10 (13 grupos): Nₑ ' + campoTexto('P10a') + '; perda ' + campoTexto('P10b', '%') + ' por geração');
    L.push('P11 (10 gerações): restam ' + campoTexto('P11a', '%') + ' com 5 grupos e ' + campoTexto('P11b', '%') + ' com 13 grupos');
    L.push('P13 (queda da população, 2014 a 2018): ' + campoTexto('P13', '%'));
    L.push('Perguntas de um toque (P2, P4, P6, P7, P8, P12, P14, P15): ' + acertos() + ' de ' + PERGUNTAS.length + ' na resposta esperada');
    return L;
  }

  function renderPasso6() {
    $('seus-numeros').innerHTML = '<ul>' + linhasNumeros().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
  }

  // ---------- Passo 7: registro ----------
  function textoRegistro() {
    var e = estado, L = [];
    L.push('BIOC10 Genética II · Prática de 12/11/2026 · Deriva e febre amarela no mico-leão-dourado');
    L.push('Nome: ' + (e.nome && e.nome.trim() ? e.nome.trim() : '(não informado)'));
    L.push('Registro gerado em: ' + new Date().toLocaleString('pt-BR'));
    L.push('');
    L.push('1. Previsões');
    L.push('1a) O que cai mais, em proporção: ' + textoDaEscolha('botoes-prev-a', e.previsao.a) + (e.previsao.a ? (e.previsao.a === 'a' ? ' (esperada)' : ' (esperada: (a) o número de alelos)') : ''));
    L.push('1b) Alelo neutro, 10 micos, 30 gerações: ' + textoDaEscolha('botoes-prev-b', e.previsao.b) + (e.previsao.b ? (e.previsao.b === 'c' ? ' (esperada)' : ' (esperada: (c) pode chegar a 0% ou a 100% por acaso)') : ''));
    L.push('');
    L.push('2 a 5. Números');
    linhasNumeros().forEach(function (l) { L.push(l); });
    L.push('');
    L.push('Perguntas de um toque');
    PERGUNTAS.forEach(function (def) {
      var r = e.resp[def.chave];
      L.push(def.chave.replace('q', '') + ': ' + textoDaEscolha(def.id, r) + (r ? (r === def.certa ? ' (esperada)' : ' (esperada: ' + def.rotuloCerta + ')') : ''));
    });
    L.push('');
    L.push('Fontes: ' + D.FONTES.dietz2019 + '. ' + D.FONTES.grativol2001 + '. ' + D.FONTES.dietzBaker1993 + '. ' + D.FONTES.henry2013 + '.');
    return L.join('\n');
  }

  function renderPasso7() {
    $('registro-texto').textContent = textoRegistro();
    var link = $('botao-moodle');
    if (D.MOODLE_URL) { link.href = D.MOODLE_URL; link.hidden = false; } else { link.hidden = true; }
  }

  $('botao-copiar').addEventListener('click', function () {
    var texto = textoRegistro();
    var ok = function () { $('msg-copiar').textContent = 'Registro copiado.'; };
    var falha = function () {
      var pre = $('registro-texto');
      var sel = window.getSelection(), faixa = document.createRange();
      faixa.selectNodeContents(pre); sel.removeAllRanges(); sel.addRange(faixa);
      try { document.execCommand('copy'); ok(); } catch (err) { $('msg-copiar').textContent = 'Selecione o texto e copie à mão.'; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, falha); else falha();
  });

  $('botao-baixar').addEventListener('click', function () {
    var blob = new Blob([textoRegistro()], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'registro_deriva_12nov' + (estado.nome && estado.nome.trim() ? '_' + estado.nome.trim().replace(/\s+/g, '_') : '') + '.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    $('msg-copiar').textContent = 'Arquivo baixado.';
  });

  // ---------- Recomeçar ----------
  function montarRecomecar(id) {
    var el = $(id);
    function inicial() {
      el.innerHTML = '<button type="button" class="pequeno">Recomeçar tudo</button>';
      el.querySelector('button').addEventListener('click', function () {
        el.innerHTML = '<div class="confirmacao"><span>Apagar tudo o que você fez?</span>' +
          '<button type="button" class="pequeno sim">Sim, apagar</button><button type="button" class="pequeno nao">Não</button></div>';
        el.querySelector('.sim').addEventListener('click', function () {
          var proj = estado.projecao;
          estado = estadoInicial(); estado.projecao = proj;
          document.querySelectorAll('input[data-campo]').forEach(function (inp) { inp.value = ''; });
          $('campo-nome').value = '';
          salvar(); inicial(); ir('#passo-1');
        });
        el.querySelector('.nao').addEventListener('click', inicial);
      });
    }
    inicial();
  }
  montarRecomecar('recomecar-tudo');
  montarRecomecar('recomecar-fim');

  // ---------- Projeção ----------
  $('botao-projecao').addEventListener('click', function () {
    estado.projecao = !estado.projecao; salvar(); aplicarProjecao(); renderAtivo();
  });
  function aplicarProjecao() {
    document.documentElement.classList.toggle('projecao', !!estado.projecao);
    $('botao-projecao').setAttribute('aria-pressed', String(!!estado.projecao));
  }

  // ---------- Desenho da tela ativa ----------
  var RENDER = {
    '#passo-1': renderPasso1, '#passo-2': renderPasso2, '#passo-3': renderGargalo, '#passo-4': renderPasso4,
    '#passo-5': function () {}, '#passo-6': renderPasso6, '#passo-7': renderPasso7
  };

  function renderAtivo() {
    var f = RENDER[estado.ultimoPasso];
    if (f) f();
    renderPerguntas();
    renderCampos();
    renderBarra();
  }

  var espera = null;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(renderAtivo, 150);
  });

  aplicarProjecao();
  var inicio = TELAS.indexOf(location.hash) >= 0 ? location.hash : (estado.ultimoPasso || '#passo-1');
  if (location.hash !== inicio) history.replaceState(null, '', inicio);
  mostrarTela(inicio, false);
})();
