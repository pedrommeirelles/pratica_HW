// Interface da prática de endogamia e fluxo gênico: passos, estado, simulações, gráficos e registro.

(function () {
  'use strict';

  var M = window.MODELO, G = window.GRAFICO;
  var CHAVE = 'bioc10_fluxo_19nov_v1';
  var K = 4, R = 400, SEMENTE = 1911;
  // Valores da prática: os problemas P1 a P9 usam estes números.
  var PADRAO = { N: 10, G: 50, Nm: 1, nT: 3, tT: 10, rep: 0 };
  var OPCOES = { Nm: [0.1, 0.5, 1, 2, 5], nT: [1, 2, 3, 5], tT: [5, 10, 20], rep: [0, 5, 10] };
  var TOL = 0.015; // tolerância para conferir um número digitado com duas casas

  var Fi = '<i>F</i>', FST = '<i>F</i><sub>ST</sub>', FIS = '<i>F</i><sub>IS</sub>', Ni = '<i>N</i>';

  // ---------- Utilidades ----------
  function $(id) { return document.getElementById(id); }
  function num(x, casas) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  function numLivre(x, max) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: max });
  }
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
  function copia(o) { var c = {}; Object.keys(o).forEach(function (k) { c[k] = o[k]; }); return c; }
  function junto(a, b) { var c = copia(a); Object.keys(b).forEach(function (k) { c[k] = b[k]; }); return c; }

  // Tamanho do gráfico conforme a largura da caixa: no celular, o texto do SVG fica legível.
  function tamanho(idCaixa, proporcao) {
    var caixa = $(idCaixa);
    var w = caixa && caixa.clientWidth ? caixa.clientWidth - 12 : 640;
    var largura = Math.max(320, Math.min(640, Math.round(w)));
    var altura = Math.max(230, Math.round(largura * (proporcao || 0.5)));
    return { largura: largura, altura: altura };
  }

  // Lê um número digitado com vírgula ou ponto decimal.
  function lerNumero(t) {
    if (t === null || t === undefined) return null;
    var s = String(t).trim().replace(/%/g, '').replace(/\s/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  // F e FST vão de 0 a 1: quem digita 79 (em %) recebe o mesmo que quem digita 0,79.
  function lerFracao(t) {
    var v = lerNumero(t);
    if (v !== null && v > 1 && v <= 100) v /= 100;
    return v;
  }

  function plural(n, um, varios) { return (n >= 2 ? varios : um); }
  function rotuloNm(v) { return numLivre(v, 1) + ' ' + plural(v, 'migrante', 'migrantes'); }
  function rotuloNT(v) { return v + ' ' + plural(v, 'mico', 'micos'); }
  function rotuloRep(v) { return v === 0 ? 'uma vez só' : 'a cada ' + v + ' gerações'; }

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      versao: 1,
      nome: '',
      projecao: false,
      ultimoPasso: '#passo-1',
      previsao: { a: null, b: null },
      sim: copia(PADRAO),
      ler: 30,
      campos: {},
      resp: {},
      sintese: ''
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

  function naLista(v, lista, padrao) {
    v = Number(v);
    for (var i = 0; i < lista.length; i++) if (Math.abs(lista[i] - v) < 1e-9) return lista[i];
    return padrao;
  }

  // Corrige valores fora da faixa (estado antigo ou alterado à mão).
  function sanear(e) {
    if (!e.sim || typeof e.sim !== 'object') e.sim = copia(PADRAO);
    var s = e.sim;
    s.N = inteiro(s.N, PADRAO.N, 5, 50);
    s.G = limitar(arred(inteiro(s.G, PADRAO.G, 30, 100), 10), 30, 100);
    s.Nm = naLista(s.Nm, OPCOES.Nm, PADRAO.Nm);
    s.nT = naLista(s.nT, OPCOES.nT, PADRAO.nT);
    s.tT = naLista(s.tT, OPCOES.tT, PADRAO.tT);
    s.rep = naLista(s.rep, OPCOES.rep, PADRAO.rep);
    e.ler = inteiro(e.ler, 30, 0, s.G);
    if (!e.previsao || typeof e.previsao !== 'object') e.previsao = { a: null, b: null };
    if (!e.campos || typeof e.campos !== 'object') e.campos = {};
    if (!e.resp || typeof e.resp !== 'object') e.resp = {};
    if (typeof e.nome !== 'string') e.nome = '';
    if (typeof e.sintese !== 'string') e.sintese = '';
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

  // ---------- Simulações (guardadas na memória: a mesma entrada dá sempre o mesmo resultado) ----------
  var cache = {}, nCache = 0;

  function chaveOp(op) { return [op.cenario, op.N, op.G, op.Nm, op.nT, op.tT, op.repetir].join('|'); }

  function resultado(op) {
    var k = chaveOp(op);
    if (!(k in cache)) {
      if (nCache > 60) { cache = {}; nCache = 0; }
      cache[k] = M.simular(op);
      nCache++;
    }
    return cache[k];
  }

  function emCache(op) { return chaveOp(op) in cache; }

  function cenarios(s) {
    var base = { K: K, N: s.N, G: s.G, R: R, semente: SEMENTE };
    return {
      iso: junto(base, { cenario: 'isolados' }),
      cor: junto(base, { cenario: 'corredor', Nm: s.Nm }),
      tra: junto(base, { cenario: 'translocacao', nT: s.nT, tT: s.tT, repetir: s.rep })
    };
  }

  // Resultados com os valores da prática (ou com uma mudança neles), para conferir os problemas.
  function pratica(mudanca) {
    var o = cenarios(mudanca ? junto(PADRAO, mudanca) : PADRAO);
    return { iso: resultado(o.iso), cor: resultado(o.cor), tra: resultado(o.tra) };
  }
  function praticaCenario(mudanca, chave) { return resultado(cenarios(junto(PADRAO, mudanca))[chave]); }

  // ---------- Navegação ----------
  var TELAS = ['#passo-1', '#passo-2', '#passo-3', '#passo-4'];

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
      case 2: return todos(['P1', 'P2', 'P3a', 'P3b', 'P6a', 'P6b', 'P6c'], preenchido) && todos(['P4', 'P5', 'P7', 'P8', 'P9'], respondida);
      case 3: return todos(['P10', 'P11', 'P12'], respondida);
      case 4: return !!estado.sintese.trim() && [1, 2, 3].every(passoFeito);
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
  var atrasoCalculo = 30; // ms antes de calcular uma rodada nova (maior enquanto o controle desliza)

  function controle(cfg) {
    CONTROLES.push(cfg);
    var input = $(cfg.id);
    function aplicar(v, deslizando) {
      if (!isFinite(v)) return;
      var min = valorDe(cfg.min), max = valorDe(cfg.max);
      v = limitar(arred(v, cfg.passo), min, max);
      var o = cfg.obj();
      if (o[cfg.chave] === v) return;
      o[cfg.chave] = v;
      if (cfg.aoMudar) cfg.aoMudar();
      salvar();
      atrasoCalculo = deslizando ? 300 : 30;
      renderAtivo();
    }
    input.addEventListener('input', function () { aplicar(parseFloat(input.value), true); });
    $(cfg.id + '-menos').addEventListener('click', function () { aplicar(cfg.obj()[cfg.chave] - cfg.passo, false); });
    $(cfg.id + '-mais').addEventListener('click', function () { aplicar(cfg.obj()[cfg.chave] + cfg.passo, false); });
  }

  function renderControles() {
    CONTROLES.forEach(function (cfg) {
      var input = $(cfg.id), min = valorDe(cfg.min), max = valorDe(cfg.max), v = cfg.obj()[cfg.chave];
      input.min = min;
      input.max = max;
      if (parseFloat(input.value) !== v) input.value = v;
      $(cfg.id + '-valor').textContent = num(v, 0);
      $(cfg.id + '-menos').disabled = v <= min;
      $(cfg.id + '-mais').disabled = v >= max;
    });
  }

  // Põe o HTML na caixa só se algo mudou (evita refazer gráficos a cada toque).
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

  // Texto simples de um botão, com subscritos em Unicode quando existem (para o registro em .txt).
  var SUBSCRITOS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', 'e': 'ₑ', 'o': 'ₒ' };
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
      if (!caixa.closest('.tela.ativa')) return;
      marcar(caixa, resp);
      var ret = caixa.querySelector('.retorno');
      if (!resp) { ret.hidden = true; return; }
      ret.hidden = false;
      ret.innerHTML = (resp === def.certa ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + def.rotuloCerta + '.</strong> ') + valorDe(def.explicacao);
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
      var ret = $(def.id);
      if (!ret.closest('.tela.ativa')) return;
      var html = def.texto();
      ret.hidden = !html;
      ret.innerHTML = html || '';
    });
  }

  function perto(v, x) { return v !== null && Math.abs(v - x) <= TOL; }

  // ---------- Passo 1 ----------
  ligarEscolha('botoes-prev-a', function (v) { estado.previsao.a = v; });
  ligarEscolha('botoes-prev-b', function (v) { estado.previsao.b = v; });
  $('campo-nome').addEventListener('input', function () { estado.nome = this.value; salvar(); });

  function renderPasso1() {
    marcar($('botoes-prev-a'), estado.previsao.a);
    marcar($('botoes-prev-b'), estado.previsao.b);
    if ($('campo-nome').value !== estado.nome && document.activeElement !== $('campo-nome')) $('campo-nome').value = estado.nome || '';
    $('eco-previsao').textContent = (estado.previsao.a && estado.previsao.b) ?
      'Previsões guardadas. Você confere as duas no Passo 4.' : '';
  }

  // ---------- Passo 2: o simulador ----------
  function ajustarLeitura() { if (estado.ler > estado.sim.G) estado.ler = estado.sim.G; }

  controle({ id: 's-N', obj: function () { return estado.sim; }, chave: 'N', passo: 1, min: 5, max: 50 });
  controle({ id: 's-G', obj: function () { return estado.sim; }, chave: 'G', passo: 10, min: 30, max: 100, aoMudar: ajustarLeitura });
  controle({ id: 'l-g', obj: function () { return estado; }, chave: 'ler', passo: 1, min: 0, max: function () { return estado.sim.G; } });

  function montarOpcoes(id, chave, rotulo) {
    var caixa = $(id);
    caixa.innerHTML = OPCOES[chave].map(function (v) {
      return '<button type="button" class="escolha" data-valor="' + v + '" aria-pressed="false">' + esc(rotulo(v)) + '</button>';
    }).join('');
    caixa.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = Number(b.getAttribute('data-valor'));
        if (estado.sim[chave] === v) return;
        estado.sim[chave] = v;
        salvar();
        atrasoCalculo = 30;
        renderAtivo();
      });
    });
  }

  montarOpcoes('botoes-Nm', 'Nm', rotuloNm);
  montarOpcoes('botoes-nT', 'nT', rotuloNT);
  montarOpcoes('botoes-tT', 'tT', function (v) { return 'geração ' + v; });
  montarOpcoes('botoes-rep', 'rep', rotuloRep);

  $('botao-padrao').addEventListener('click', function () {
    estado.sim = copia(PADRAO);
    estado.ler = 30;
    salvar();
    atrasoCalculo = 30;
    renderAtivo();
  });

  function atalhosLeitura() {
    var s = estado.sim, L = [];
    if (s.tT - 1 >= 0) L.push({ g: s.tT - 1, t: 'logo antes da translocação, geração ' + (s.tT - 1) });
    L.push({ g: s.tT, t: 'logo depois, geração ' + s.tT });
    if (s.tT !== 30) L.push({ g: 30, t: 'geração 30' });
    if (s.G !== 30) L.push({ g: s.G, t: 'última, geração ' + s.G });
    return L;
  }

  $('botoes-ler').addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    estado.ler = limitar(Number(b.getAttribute('data-valor')), 0, estado.sim.G);
    salvar();
    renderAtivo();
  });

  function descricaoCenario(chave, s) {
    if (chave === 'iso') return 'Isolados';
    if (chave === 'cor') return 'Corredor, ' + rotuloNm(s.Nm) + ' por geração';
    return 'Translocação, ' + rotuloNT(s.nT) + ' na geração ' + s.tT + (s.rep ? ', repetida a cada ' + s.rep : '');
  }

  function resumoRodada(s) {
    return 'Rodada: 4 fragmentos com ' + Ni + ' = ' + s.N + ' micos que se reproduzem, ' + s.G + ' gerações; corredor com ' + rotuloNm(s.Nm) +
      ' por geração; translocação de ' + rotuloNT(s.nT) + ' por fragmento na geração ' + s.tT + ', ' + rotuloRep(s.rep) +
      '; 400 rodadas por cenário.';
  }

  function ticksGeracao(Gmax) {
    var passo = Gmax <= 50 ? 10 : 20, t = [];
    for (var x = 0; x <= Gmax; x += passo) t.push(x);
    return t;
  }

  function grafico(idCaixa, res, medida, s, rotuloY) {
    var t = tamanho(idCaixa, 0.5), g = estado.ler;
    var gT = M.geracoesTranslocacao(s.tT, s.rep, s.G);
    var chave = [medida, chaveOp(res.iso.op), chaveOp(res.cor.op), chaveOp(res.tra.op), g, t.largura].join('#');
    porNaCaixa(idCaixa, chave, function () {
      function serie(r, classe, traco, rotulo) {
        return { pontos: r[medida].map(function (v, i) { return [i, v]; }), classe: classe, traco: traco, rotulo: rotulo };
      }
      return G.linhas({
        largura: t.largura, altura: t.altura,
        x: { min: 0, max: s.G, ticks: ticksGeracao(s.G), rotulo: 'Geração' },
        y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], rotulo: rotuloY },
        series: [serie(res.iso, 'iso', 'cheio', 'isolados'), serie(res.cor, 'cor', 'cheio', 'corredor'), serie(res.tra, 'tra', 'tracejado', 'translocação')],
        marcas: [
          { x: g, y: res.iso[medida][g], classe: 'iso', raio: 5 },
          { x: g, y: res.cor[medida][g], classe: 'cor', raio: 5 },
          { x: g, y: res.tra[medida][g], classe: 'tra', raio: 5 }
        ],
        verticais: gT.length ? [{ x: gT[0], rotulo: s.rep ? '1ª translocação' : 'translocação' }] : [],
        descricao: rotuloY + ' ao longo de ' + s.G + ' gerações nos três cenários: isolados, corredor e translocação, com N ' + s.N
      });
    });
  }

  var esperaCalculo = null;

  function renderPasso2() {
    renderControles();
    ['Nm', 'nT', 'tT', 'rep'].forEach(function (k) { marcar($('botoes-' + k), estado.sim[k]); });
    var s = estado.sim, o = cenarios(s);
    var faltam = ['iso', 'cor', 'tra'].filter(function (k) { return !emCache(o[k]); });
    if (faltam.length) {
      $('resumo-rodada').textContent = 'Calculando 400 rodadas de cada cenário…';
      clearTimeout(esperaCalculo);
      esperaCalculo = setTimeout(function () {
        faltam.forEach(function (k) { resultado(o[k]); });
        if (estado.ultimoPasso === '#passo-2') renderAtivo();
      }, atrasoCalculo);
      return;
    }
    var res = { iso: resultado(o.iso), cor: resultado(o.cor), tra: resultado(o.tra) };
    $('resumo-rodada').innerHTML = resumoRodada(s);
    grafico('grafico-F', res, 'F', s, 'F dentro dos fragmentos');
    grafico('grafico-FST', res, 'FST', s, 'FST entre os fragmentos');

    // Leitura de uma geração
    var g = estado.ler;
    var atalhos = atalhosLeitura();
    porNaCaixa('botoes-ler', JSON.stringify(atalhos) + '#' + g, function () {
      return atalhos.map(function (a) {
        return '<button type="button" class="escolha pequeno" data-valor="' + a.g + '" aria-pressed="' + (a.g === g) + '">' + esc(a.t) + '</button>';
      }).join('');
    });
    $('tabela-valores').innerHTML = '<caption>Geração ' + g + '</caption>' +
      '<thead><tr><th>Cenário</th><th class="num">' + Fi + '</th><th class="num">' + FST + '</th><th class="num">Alelos (de 6)</th></tr></thead><tbody>' +
      ['iso', 'cor', 'tra'].map(function (k) {
        var r = res[k];
        return '<tr><th scope="row"><span class="cor-legenda ' + k + '" aria-hidden="true"></span>' + esc(descricaoCenario(k, s)) + '</th>' +
          '<td class="num">' + num(r.F[g], 2) + '</td><td class="num">' + num(r.FST[g], 2) + '</td><td class="num">' + num(r.A[g], 1) + '</td></tr>';
      }).join('') + '</tbody>';
    $('teoria-iso').innerHTML = 'Isolados, pela teoria: ' + Fi + ' = 1 − (1 − 1/2' + Ni + ')<sup><i>t</i></sup> = ' + num(M.Fteorico(s.N, g), 2) +
      ' na geração ' + g + ' (<i>t</i>, o número de gerações).';
  }

  // Dados das curvas em CSV (ponto e vírgula, vírgula decimal: abre direto na planilha em português).
  function textoCSV() {
    var s = estado.sim, o = cenarios(s);
    var r = { iso: resultado(o.iso), cor: resultado(o.cor), tra: resultado(o.tra) };
    var d = function (x, c) { return x.toFixed(c).replace('.', ','); };
    var L = ['geracao;F_isolados;F_corredor;F_translocacao;FST_isolados;FST_corredor;FST_translocacao;alelos_isolados;alelos_corredor;alelos_translocacao'];
    for (var g = 0; g <= s.G; g++) {
      L.push([g, d(r.iso.F[g], 4), d(r.cor.F[g], 4), d(r.tra.F[g], 4), d(r.iso.FST[g], 4), d(r.cor.FST[g], 4), d(r.tra.FST[g], 4),
        d(r.iso.A[g], 3), d(r.cor.A[g], 3), d(r.tra.A[g], 3)].join(';'));
    }
    return L.join('\r\n') + '\r\n';
  }

  function nomeCSV() {
    var s = estado.sim;
    return 'fluxo_mico_4fragmentos_N' + s.N + '_corredor' + String(s.Nm).replace('.', '_') + '_translocacao' + s.nT + '_g' + s.tT +
      (s.rep ? '_cada' + s.rep : '') + '_' + s.G + 'geracoes.csv';
  }

  function baixar(conteudo, tipo, nome) {
    var blob = new Blob([conteudo], { type: tipo });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  $('botao-csv').addEventListener('click', function () {
    baixar(textoCSV(), 'text/csv;charset=utf-8', nomeCSV());
    $('msg-csv').textContent = 'Arquivo baixado: ' + nomeCSV() + '. Os parâmetros estão no nome do arquivo.';
  });

  // Problemas do Passo 2
  function abertura(certo, esperado) {
    return certo ? '<strong>Isso.</strong> ' : '<strong>Com os valores da prática, o simulador dá ' + esperado + '.</strong> ';
  }

  campo({ id: 'ret-P1', texto: function () {
    var v = lerFracao(estado.campos.P1);
    if (v === null) return '';
    var x = pratica().iso.F[30];
    return abertura(perto(v, x), num(x, 2)) +
      'Sem migrantes, cada fragmento é uma população fechada de 10 micos: a cada geração, perde-se 1/(2' + Ni + ') = 5% da heterozigosidade que resta. ' +
      'A teoria dá 1 − (1 − 1/20)<sup>30</sup> = ' + num(M.Fteorico(10, 30), 2) + '; o simulador, ' + num(x, 3) + ' (média de 400 rodadas).';
  } });

  campo({ id: 'ret-P2', texto: function () {
    var v = lerFracao(estado.campos.P2);
    if (v === null) return '';
    var x = pratica().iso.FST[30];
    return abertura(perto(v, x), num(x, 2)) +
      'Cada fragmento derivou para um lado: num, um alelo ficou mais comum; noutro, esse mesmo alelo sumiu. Sem migrantes, os fragmentos ficam cada vez mais diferentes, e o ' + FST +
      ' sobe junto com o ' + Fi + '. Com o tempo, cada fragmento fica com um só alelo, e o ' + FST + ' chega perto de 1.';
  } });

  campo({ id: 'ret-P3', texto: function () {
    var a = lerFracao(estado.campos.P3a), b = lerFracao(estado.campos.P3b);
    if (a === null && b === null) return '';
    var c = pratica(), xa = c.cor.F[30], xb = c.cor.FST[30];
    return abertura(perto(a, xa) && perto(b, xb), num(xa, 2) + ' e ' + num(xb, 2)) +
      'Com 1 migrante por geração, a curva azul do ' + FST + ' fica plana, perto de ' + num(xb, 2) + ', e o ' + Fi + ' sobe bem mais devagar que nos isolados (' +
      num(xa, 2) + ' contra ' + num(c.iso.F[30], 2) + '). A conta da aula, ' + FST + ' ≈ 1/(1 + 4' + Ni + '<i>m</i>) = 0,20, vale para muitas ilhas; com só 4 fragmentos, ' +
      'cada um pesa um quarto na média do conjunto e recebe migrantes só dos outros três, e o equilíbrio fica um pouco abaixo, perto de 0,14. ' +
      'A mensagem é a mesma: os alelos que um fragmento perde voltam com os migrantes.';
  } });

  pergunta({ id: 'q-P4', chave: 'P4', certa: 'b', rotuloCerta: 'o corredor junta os fragmentos numa população de 40 micos, que ainda é pequena',
    explicacao: 'O fluxo gênico impede que os fragmentos fiquem diferentes, mas não cria variação. Os quatro fragmentos ligados funcionam como uma população de cerca de 40 micos, ' +
      'que perde perto de 1/(2 × 40) da heterozigosidade por geração, contra 1/(2 × 10) nos isolados. Para o ' + Fi + ' parar de subir, o conjunto precisa ser grande ou receber micos de fora dele.' });

  pergunta({ id: 'q-P5', chave: 'P5', certa: 'c', rotuloCerta: '1 migrante por geração',
    explicacao: function () {
      var v = [0.1, 0.5, 1, 5].map(function (nm) { return num(praticaCenario({ Nm: nm }, 'cor').FST[30], 2); });
      return 'Na geração 30, o ' + FST + ' fica em ' + v[0] + ' com 0,1 migrante por geração (um mico a cada 10 gerações), ' + v[1] + ' com 0,5, ' + v[2] + ' com 1 e ' + v[3] +
        ' com 5. Daí vem a regra prática da conservação: cerca de um migrante por geração. O que conta é o número de migrantes, e não a fração da população (P9).';
    } });

  campo({ id: 'ret-P6', texto: function () {
    var a = lerFracao(estado.campos.P6a), b = lerFracao(estado.campos.P6b), c = lerFracao(estado.campos.P6c);
    if (a === null && b === null && c === null) return '';
    var r = pratica(), t = r.tra;
    return abertura(perto(a, t.F[9]) && perto(b, t.F[10]) && perto(c, t.F[30]), num(t.F[9], 2) + ', ' + num(t.F[10], 2) + ' e ' + num(t.F[30], 2)) +
      'Até a geração 9, a curva laranja coincide com a dos isolados (são os mesmos sorteios). Na geração 10, 3 dos 10 micos de cada fragmento vieram dos outros: o ' + Fi +
      ' cai de ' + num(t.F[9], 2) + ' para ' + num(t.F[10], 2) + ', e o número médio de alelos por fragmento sobe de ' + num(t.A[9], 1) + ' para ' + num(t.A[10], 1) +
      '. Depois, sem novos migrantes, o ' + Fi + ' volta a subir: ' + num(t.F[30], 2) + ' na geração 30, perto dos isolados (' + num(r.iso.F[30], 2) + ').';
  } });

  pergunta({ id: 'q-P7', chave: 'P7', certa: 'b', rotuloCerta: 'o F caiu na hora e depois voltou a subir',
    explicacao: 'Os micos trazidos devolvem alelos que o fragmento tinha perdido, e o ' + Fi + ' cai na hora. Mas a translocação não muda o tamanho do fragmento: com 10 micos e sem novos migrantes, ' +
      'a deriva volta a agir, e em 20 gerações o ' + Fi + ' volta para perto do valor dos isolados. Foi o que se viu com os lobos da Ilha Royale (aula de 17/11): um migrante só trouxe alívio por pouco tempo.' });

  pergunta({ id: 'q-P8', chave: 'P8', certa: 'b', rotuloCerta: 'cai a cada translocação e volta a subir, sem disparar',
    explicacao: function () {
      var r = praticaCenario({ rep: 5 }, 'tra'), c = pratica(), meio = praticaCenario({ Nm: 0.5 }, 'cor');
      var min = 1, max = 0, soma = 0, n = 0, g;
      for (g = PADRAO.tT + 5; g <= PADRAO.G; g++) { min = Math.min(min, r.FST[g]); max = Math.max(max, r.FST[g]); soma += r.FST[g]; n++; }
      return 'Com 3 micos a cada 5 gerações, o ' + FST + ' faz um dente de serra: cai para cerca de ' + num(min, 2) + ' logo depois de cada translocação e sobe até cerca de ' + num(max, 2) +
        ' antes da seguinte, sem disparar como nos isolados (' + num(c.iso.FST[30], 2) + ' na geração 30). Da geração ' + (PADRAO.tT + 5) + ' à ' + PADRAO.G + ', a média fica em ' + num(soma / n, 2) +
        ', entre o corredor com 0,5 migrante por geração (' + num(meio.FST[30], 2) + ') e o com 1 (' + num(c.cor.FST[30], 2) + '): 3 micos a cada 5 gerações dão 0,6 migrante por geração. ' +
        'Translocações repetidas fazem o papel do corredor, mas cada uma exige captura, transporte, quarentena e monitoramento.';
    } });

  pergunta({ id: 'q-P9', chave: 'P9', certa: 'a', rotuloCerta: 'sobe bem menos, porque a deriva é mais fraca',
    explicacao: function () {
      var iso30 = praticaCenario({ N: 30 }, 'iso'), cor30 = praticaCenario({ N: 30 }, 'cor'), r10 = pratica();
      return 'Com 30 micos por fragmento, o ' + Fi + ' na geração 30 fica em ' + num(iso30.F[30], 2) + ', cerca de metade do valor com 10 micos (' + num(r10.iso.F[30], 2) +
        '): a deriva tira 1/(2' + Ni + ') da heterozigosidade por geração, 5% com ' + Ni + ' = 10 e 1,7% com ' + Ni + ' = 30. Repare também no corredor: com 1 migrante por geração, o ' + FST +
        ' fica em ' + num(cor30.FST[30], 2) + ' com ' + Ni + ' = 30 e em ' + num(r10.cor.FST[30], 2) + ' com ' + Ni + ' = 10. O que segura a diferença entre os fragmentos é o número de migrantes, e não a fração da população.';
    } });

  // ---------- Passo 3: o que os dados mostram ----------
  pergunta({ id: 'q-P10', chave: 'P10', certa: 'b', rotuloCerta: 'efeito Wahlund',
    explicacao: 'Juntar numa só amostra grupos com frequências diferentes faz faltar heterozigotos em relação ao esperado pela frequência média, mesmo com cruzamento ao acaso dentro de cada grupo (aula de 27/10). ' +
      'Moraes et al. (2017) atribuem ao efeito Wahlund os desvios de Hardy-Weinberg da amostra antiga de União: parte do 0,38 vem da mistura de origens, e não só de parentesco.' });

  pergunta({ id: 'q-P11', chave: 'P11', certa: 'b', rotuloCerta: 'translocação: filhotes de pais de fragmentos diferentes',
    explicacao: 'Na mesma reserva, micos das quatro origens formaram casais: os filhotes recebem alelos de origens diferentes e são heterozigotos com mais frequência, e a amostra deixou de juntar grupos separados. ' +
      'É o que o simulador mostra na geração da translocação: o ' + Fi + ' cai. O P7 lembra o resto: com tamanho efetivo perto de 14 e sem novos migrantes, a deriva volta a agir.' });

  pergunta({ id: 'q-P12', chave: 'P12', certa: 'b', rotuloCerta: 'corredor a 3 km; translocações repetidas, com monitoramento, a 20 km',
    explicacao: 'A 3 km, dentro da distância que os micos percorrem de fato (até cerca de 8 km), e com pasto de resistência média, um corredor ou árvores isoladas no pasto mantêm o fluxo sem captura. ' +
      'A 20 km e com a BR-101, de resistência máxima, os micos não passam: só translocações repetidas, com monitoramento genético antes e depois, mantêm o fluxo (P8).' });

  // ---------- Passo 4: fechamento e registro ----------
  var ESPERADA = { a: 'c', b: 'c' };

  function renderPrevisoes() {
    var a = estado.previsao.a, b = estado.previsao.b;
    if (!a && !b) { $('previsoes-volta').innerHTML = ''; return; }
    var c = pratica();
    $('previsoes-volta').innerHTML = '<h3>Suas previsões do Passo 1</h3>' +
      '<p><strong>a.</strong> Você escolheu: ' + esc(textoDaEscolha('botoes-prev-a', a)) + '. ' +
      (a === ESPERADA.a ? '<strong>Isso.</strong> ' : '<strong>Esperado: (c) sobe muito, para perto de 0,8.</strong> ') +
      'No P1, o ' + Fi + ' dos isolados chegou a ' + num(c.iso.F[30], 2) + ' em 30 gerações, com 10 micos por fragmento.</p>' +
      '<p><strong>b.</strong> Você escolheu: ' + esc(textoDaEscolha('botoes-prev-b', b)) + '. ' +
      (b === ESPERADA.b ? '<strong>Isso.</strong> ' : '<strong>Esperado: (c) os dois.</strong> ') +
      'A translocação devolve alelos na hora (P6), mas uma só alivia por pouco tempo (P7); o corredor mantém o fluxo sem novas capturas (P3 e P5), quando os fragmentos estão ao alcance da dispersão dos micos (P12).</p>';
  }

  $('campo-P13').addEventListener('input', function () {
    estado.sintese = this.value;
    salvar();
    $('registro-texto').textContent = textoRegistro();
    renderBarra();
  });

  function campoTexto(k) {
    var v = lerFracao(estado.campos[k]);
    return v === null ? '(sem resposta)' : numLivre(v, 3);
  }

  function acertos() {
    var n = 0;
    PERGUNTAS.forEach(function (def) { if (estado.resp[def.chave] === def.certa) n++; });
    return n;
  }

  function textoRegistro() {
    var e = estado, c = pratica(), L = [];
    L.push('BIOC10 Genética II · Prática de 19/11/2026 · Corredor ou translocação? Endogamia e fluxo gênico no mico-leão-dourado');
    L.push('Nome: ' + (e.nome && e.nome.trim() ? e.nome.trim() : '(não informado)'));
    L.push('Registro gerado em: ' + new Date().toLocaleString('pt-BR'));
    L.push('');
    L.push('1. Previsões');
    L.push('a) F de quatro fragmentos isolados de 10 micos, em 30 gerações: ' + textoDaEscolha('botoes-prev-a', e.previsao.a) +
      (e.previsao.a ? (e.previsao.a === ESPERADA.a ? ' (esperada)' : ' (esperada: (c) Sobe muito, para perto de 0,8)') : ''));
    L.push('b) Para recuperar a variação genética e não voltar a perdê-la: ' + textoDaEscolha('botoes-prev-b', e.previsao.b) +
      (e.previsao.b ? (e.previsao.b === ESPERADA.b ? ' (esperada)' : ' (esperada: (c) Os dois)') : ''));
    L.push('');
    L.push('2. Simulador (valores da prática: 4 fragmentos, N 10, 400 rodadas por cenário)');
    L.push('P1 isolados, F na geração 30: você anotou ' + campoTexto('P1') + '; simulador ' + num(c.iso.F[30], 2) + '; teoria ' + num(M.Fteorico(10, 30), 2));
    L.push('P2 isolados, FST na geração 30: você anotou ' + campoTexto('P2') + '; simulador ' + num(c.iso.FST[30], 2));
    L.push('P3 corredor com 1 migrante por geração, geração 30: F ' + campoTexto('P3a') + ' (simulador ' + num(c.cor.F[30], 2) + '); FST ' + campoTexto('P3b') + ' (simulador ' + num(c.cor.FST[30], 2) + ')');
    L.push('P6 translocação de 3 micos na geração 10, F nas gerações 9, 10 e 30: você anotou ' + campoTexto('P6a') + ', ' + campoTexto('P6b') + ' e ' + campoTexto('P6c') +
      '; simulador ' + num(c.tra.F[9], 2) + ', ' + num(c.tra.F[10], 2) + ' e ' + num(c.tra.F[30], 2));
    var s = e.sim;
    L.push('Parâmetros na tela ao gerar o registro: N ' + s.N + ', ' + s.G + ' gerações, corredor com ' + rotuloNm(s.Nm) + ' por geração, translocação de ' + rotuloNT(s.nT) +
      ' na geração ' + s.tT + ', ' + rotuloRep(s.rep));
    L.push('');
    L.push('3. Perguntas de um toque: ' + acertos() + ' de ' + PERGUNTAS.length + ' na resposta esperada');
    PERGUNTAS.forEach(function (def) {
      var r = e.resp[def.chave];
      L.push(def.chave + ': ' + textoDaEscolha(def.id, r) + (r ? (r === def.certa ? ' (esperada)' : ' (esperada: ' + def.rotuloCerta + ')') : ''));
    });
    L.push('');
    L.push('4. P13. Corredor ou translocação?');
    L.push(e.sintese && e.sintese.trim() ? e.sintese.trim() : '(sem resposta)');
    L.push('');
    L.push('Fontes: Moraes AM et al. (2017) Conservation Genetics 18(5):995-1009, doi:10.1007/s10592-017-0948-4. Moraes AM et al. (2018) Biological Conservation 224:178-187, doi:10.1016/j.biocon.2018.05.023.');
    return L.join('\n');
  }

  function renderPasso4() {
    renderPrevisoes();
    var ta = $('campo-P13');
    if (ta.value !== estado.sintese && document.activeElement !== ta) ta.value = estado.sintese;
    $('registro-texto').textContent = textoRegistro();
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
    baixar(textoRegistro(), 'text/plain;charset=utf-8',
      'registro_fluxo_19nov' + (estado.nome && estado.nome.trim() ? '_' + estado.nome.trim().replace(/\s+/g, '_') : '') + '.txt');
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
          $('campo-P13').value = '';
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
  var RENDER = { '#passo-1': renderPasso1, '#passo-2': renderPasso2, '#passo-3': function () {}, '#passo-4': renderPasso4 };

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
