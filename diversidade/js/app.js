// Interface da prática de diversidade genética: passos, estado, cartas das onças, tabelas, sorteios e registro.

(function () {
  'use strict';

  var D = window.DADOS, M = window.MODELO;
  var CHAVE = 'bioc10_diversidade_26nov_v1';
  var FR = D.fragmentos;
  var SEMENTE = 2611;
  var TELAS = ['#passo-1', '#passo-2', '#passo-3', '#passo-4', '#passo-5', '#passo-6'];
  var R = {};
  FR.forEach(function (f) { R[f] = M.resumo(f); });

  var Ai = '<i>A</i>', AR = '<i>A</i><sub>R</sub>', Ho = '<i>H</i><sub>o</sub>', He = '<i>H</i><sub>e</sub>',
    FIS = '<i>F</i><sub>IS</sub>', Ne = '<i>N</i><sub>e</sub>', Pi = '<i>P</i>';

  // ---------- Utilidades ----------
  function $(id) { return document.getElementById(id); }
  function num(x, casas) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  function sinal(x, casas) { return (x > 0 ? '+' : (x < 0 ? '−' : '')) + num(Math.abs(x), casas); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function limitar(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerNumero(t) {
    if (t === null || t === undefined) return null;
    var s = String(t).trim().replace(/\s/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  function nOncas(f) { return R[f].n; }
  function liDe(nome) { var i = D.locos.indexOf(nome); return i < 0 ? 0 : i; }
  function lista(xs) {
    if (xs.length <= 1) return xs.join('');
    return xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1];
  }

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      previsao: { a: null, b: null }, nome: '', resp: {}, campos: {}, texto: { P13: '' },
      sel: {
        cFrag: 'Morro do Diabo', cLoco: 'F42', contagem: false,
        sFrag: 'Porto Primavera', sK: 8, sSem: SEMENTE, sUlt: null, sMil: null,
        rar: 8, crit: '95', hFrag: 'Morro do Diabo', hLoco: 'F53', destacar: false, medida: 'Ho'
      },
      ultimoPasso: '#passo-1', projecao: false
    };
  }
  function sanear(e) {
    var base = estadoInicial();
    if (!e || typeof e !== 'object') return base;
    var s = e.sel && typeof e.sel === 'object' ? e.sel : {};
    var sel = base.sel;
    if (FR.indexOf(s.cFrag) >= 0) sel.cFrag = s.cFrag;
    if (D.locos.indexOf(s.cLoco) >= 0) sel.cLoco = s.cLoco;
    sel.contagem = !!s.contagem;
    if (FR.indexOf(s.sFrag) >= 0) sel.sFrag = s.sFrag;
    var k = Math.round(Number(s.sK));
    sel.sK = isFinite(k) ? limitar(k, 2, nOncas(sel.sFrag)) : 8;
    var sem = Math.round(Number(s.sSem));
    sel.sSem = isFinite(sem) && sem > 0 ? sem : SEMENTE;
    if (s.sUlt && typeof s.sUlt === 'object' && isFinite(Number(s.sUlt.A))) sel.sUlt = s.sUlt;
    if (s.sMil && typeof s.sMil === 'object' && isFinite(Number(s.sMil.media))) sel.sMil = s.sMil;
    var rr = Math.round(Number(s.rar));
    sel.rar = isFinite(rr) ? limitar(rr, 2, 9) : 8;
    if (s.crit === '95' || s.crit === '99') sel.crit = s.crit;
    if (FR.indexOf(s.hFrag) >= 0) sel.hFrag = s.hFrag;
    if (D.locos.indexOf(s.hLoco) >= 0) sel.hLoco = s.hLoco;
    sel.destacar = !!s.destacar;
    if (MEDIDAS.some(function (m) { return m.k === s.medida; })) sel.medida = s.medida;
    var out = base;
    out.sel = sel;
    if (e.previsao && typeof e.previsao === 'object') {
      if (FR.indexOf(e.previsao.a) >= 0) out.previsao.a = e.previsao.a;
      if (['A', 'P', 'Ho', 'He'].indexOf(e.previsao.b) >= 0) out.previsao.b = e.previsao.b;
    }
    if (typeof e.nome === 'string') out.nome = e.nome.slice(0, 80);
    if (e.resp && typeof e.resp === 'object') Object.keys(e.resp).forEach(function (q) {
      if (typeof e.resp[q] === 'string') out.resp[q] = e.resp[q];
    });
    if (e.campos && typeof e.campos === 'object') Object.keys(e.campos).forEach(function (q) {
      if (typeof e.campos[q] === 'string') out.campos[q] = e.campos[q].slice(0, 20);
    });
    if (e.texto && typeof e.texto.P13 === 'string') out.texto.P13 = e.texto.P13.slice(0, 1200);
    if (TELAS.indexOf(e.ultimoPasso) >= 0) out.ultimoPasso = e.ultimoPasso;
    out.projecao = !!e.projecao;
    return out;
  }

  var MEDIDAS = [
    { k: 'A', rot: Ai, txt: 'A', casas: 2, desc: 'número médio de alelos por loco, com todas as onças de cada área' },
    { k: 'AR', rot: AR, txt: 'AR', casas: 2, desc: 'riqueza alélica, o número de alelos esperado numa amostra de 8 onças' },
    { k: 'P95', rot: Pi, txt: 'P', casas: 1, suf: '%', desc: 'porcentagem de locos polimórficos (critério de 95%)' },
    { k: 'Ho', rot: Ho, txt: 'Ho', casas: 3, desc: 'heterozigosidade observada' },
    { k: 'He', rot: He, txt: 'He', casas: 3, desc: 'heterozigosidade esperada, com a correção do tamanho da amostra' },
    { k: 'raros', rot: 'Alelos raros', txt: 'alelos raros', casas: 0, desc: 'alelos abaixo de 5%, somados nos 13 locos' },
    { k: 'privados', rot: 'Alelos privados', txt: 'alelos privados', casas: 0, desc: 'alelos que só aparecem nessa área, somados nos 13 locos' }
  ];

  var estado = carregar();
  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      return sanear(bruto ? JSON.parse(bruto) : null);
    } catch (err) { return estadoInicial(); }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (err) { /* segue só na memória */ }
  }

  // ---------- Navegação ----------
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
    renderTudo();
    if (focar) {
      var h2 = tela.querySelector('h2');
      if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }
  }
  function ir(hash) { if (location.hash !== hash) location.hash = hash; else mostrarTela(hash, true); }
  window.addEventListener('hashchange', function () { mostrarTela(location.hash, true); });
  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); });
  });

  var PASSO_FEITO = {
    1: function () { return !!(estado.previsao.a && estado.previsao.b); },
    2: function () { return ['P3', 'P4'].every(respondida) && ['P1', 'P2'].every(preenchido); },
    3: function () { return ['P5', 'P6'].every(respondida); },
    4: function () { return ['P8', 'P9', 'P10'].every(respondida) && preenchido('P7'); },
    5: function () { return ['P11', 'P12'].every(respondida); },
    6: function () { return (estado.texto.P13 || '').trim().length > 0; }
  };
  function respondida(q) { return !!estado.resp[q]; }
  function preenchido(q) { return lerNumero(estado.campos[q]) !== null; }
  function renderBarra() {
    document.querySelectorAll('.barra a').forEach(function (a) {
      a.classList.toggle('feito', PASSO_FEITO[a.getAttribute('data-passo')]());
    });
  }

  // ---------- Botões de escolha ----------
  function marcar(grupo, valor) {
    grupo.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === String(valor)));
    });
  }
  function botoesFragmentos(id, chave, permitidos) {
    var caixa = $(id);
    caixa.innerHTML = (permitidos || FR).map(function (f) {
      return '<button type="button" class="escolha" data-valor="' + esc(f) + '" aria-pressed="false">' + esc(f) + '</button>';
    }).join('');
    caixa.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        estado.sel[chave] = b.getAttribute('data-valor');
        if (chave === 'sFrag') { estado.sel.sK = limitar(estado.sel.sK, 2, nOncas(estado.sel.sFrag)); estado.sel.sUlt = null; estado.sel.sMil = null; }
        salvar(); renderTudo();
      });
    });
  }
  function preencherLocos(id, chave) {
    var s = $(id);
    s.innerHTML = D.locos.map(function (L) { return '<option value="' + L + '">' + L + '</option>'; }).join('');
    s.addEventListener('change', function () { estado.sel[chave] = s.value; salvar(); renderTudo(); });
  }

  // ---------- Cartas ----------
  // Uma cor por alelo, igual em todas as áreas do mesmo loco.
  var CORES = D.locos.map(function (L, li) {
    var todos = {};
    D.oncas.forEach(function (o) { var g = o.g[li]; if (g) g.forEach(function (a) { if (a !== '?') todos[a] = true; }); });
    var ordem = Object.keys(todos).map(Number).sort(function (a, b) { return a - b; });
    var mapa = {};
    ordem.forEach(function (a, i) { mapa[a] = Math.round((i * 137.508 + 20) % 360); });
    return mapa;
  });
  function chip(li, a) {
    if (a === '?') return '<b class="al desconhecido">?</b>';
    return '<b class="al" style="--h:' + CORES[li][a] + '">' + a + '</b>';
  }
  function cartas(frag, li, destacar) {
    var html = [];
    D.oncas.forEach(function (o) {
      if (o.pop !== frag) return;
      var g = o.g[li], cls = 'carta', corpo;
      if (!g) { cls += ' vazia'; corpo = '<span class="gen">sem resultado</span>'; }
      else if (g[0] === '?' || g[1] === '?') { cls += ' incompleta'; corpo = '<span class="gen">' + chip(li, g[1]) + '/' + chip(li, '?') + '</span>'; }
      else {
        if (destacar && g[0] !== g[1]) cls += ' het';
        corpo = '<span class="gen">' + chip(li, g[0]) + '/' + chip(li, g[1]) + '</span>';
      }
      html.push('<div class="' + cls + '"><span class="id">' + esc(o.id) + '</span>' + corpo + '</div>');
    });
    return html.join('');
  }

  // ---------- Passo 1 ----------
  $('tabela-areas').innerHTML = FR.map(function (f) {
    var i = D.info[f];
    return '<tr><th scope="row">' + esc(f) + '</th><td class="num">' + nOncas(f) + '</td><td>' + esc(i.area) + '</td><td>' + esc(i.amostras) + '</td></tr>';
  }).join('');
  ['a', 'b'].forEach(function (k) {
    $('botoes-prev-' + k).querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { estado.previsao[k] = b.getAttribute('data-valor'); salvar(); renderTudo(); });
    });
  });
  $('campo-nome').addEventListener('input', function () { estado.nome = this.value; salvar(); renderRegistro(); });
  function renderPasso1() {
    marcar($('botoes-prev-a'), estado.previsao.a);
    marcar($('botoes-prev-b'), estado.previsao.b);
    if (document.activeElement !== $('campo-nome')) $('campo-nome').value = estado.nome || '';
    $('eco-previsao').textContent = (estado.previsao.a && estado.previsao.b) ? 'Previsões guardadas. Você confere as duas no Passo 6.' : '';
  }

  // ---------- Perguntas de escolha ----------
  var PERGUNTAS = {
    P3: { certa: 'b', rot: '(b)', exp: function () {
      return 'Com 8 onças, a menor frequência possível é 1/16 = 6,25%; com 10, 1/20 = 5%. Abaixo de 5% só aparece com 11 onças ou mais. Por isso o Corredor Verde (' + R['Corredor Verde'].raros + ') e o Porto Primavera (' + R['Porto Primavera'].raros + ') têm alelos raros: têm mais onças na amostra. Contar alelos raros também depende do tamanho da amostra.';
    } },
    P4: { certa: 'b', rot: '(b)', exp: function () {
      var m = M.mediaDeSorteios('Porto Primavera', 8, 1000, SEMENTE);
      return 'Com 8 onças sorteadas, o Porto Primavera mostra em média ' + num(m.media, 2) + ' alelos por loco (de ' + num(m.min, 2) + ' a ' + num(m.max, 2) + ' em 1.000 sorteios), contra ' + num(R['Porto Primavera'].A, 2) + ' com as 23. A riqueza alélica faz essa conta sem sortear: ' + num(R['Porto Primavera'].AR, 2) + ' com 8 onças. Sem ela, comparar ' + Ai + ' de 23 onças com o de 8 seria injusto com o Morro do Diabo.';
    } },
    P5: { certa: 'b', rot: '(b)', exp: function () {
      return 'As 8 onças do Morro do Diabo são 179/179 no FCA741: o loco está fixado nessa amostra, enquanto nas outras áreas tem 3 alelos. Com 8 onças, não dá para saber se os outros alelos sumiram da população ou só não apareceram na amostra.';
    } },
    P6: { certa: 'b', rot: '(b)', exp: function () {
      return 'Isoenzimas têm poucos alelos e muitos locos com um alelo só: quando a população perde alelos, perde locos polimórficos (43,3% contra 20,0%). Microssatélites são escolhidos por serem variáveis e mudam depressa por mutação; nas onças, o alelo mais comum nunca passa de 95%, salvo o FCA741 do Morro do Diabo. Com esse marcador, ' + Pi + ' informa pouco; ' + Ai + ', ' + AR + ' e ' + He + ' informam mais.';
    } },
    P8: { certa: 'Corredor Verde', rot: 'Corredor Verde', exp: function () {
      var c = R['Corredor Verde'];
      return FIS + ' = 1 − ' + num(c.Ho, 3) + '/' + num(c.He, 3) + ' = ' + sinal(c.FIS, 2) + ' no Corredor Verde. Nas outras três áreas, ' + FIS + ' fica entre ' + sinal(R['Ivinhema'].FIS, 2) + ' e ' + sinal(R['Morro do Diabo'].FIS, 2) + ': sobram heterozigotos.';
    } },
    P9: { certa: 'd', rot: '(d)', exp: function () {
      return 'Efeito Wahlund (27/10): juntar numa amostra grupos com frequências diferentes dá falta de heterozigotos sem nenhum cruzamento entre parentes, e as onças do Corredor Verde vêm de 1,1 milhão de ha, de 1992 a 2007. Falha de genotipagem: 7 das 18 onças do Corredor Verde vieram de fezes, e as cartas com "?" mostram DNA difícil de genotipar. O artigo testou Hardy-Weinberg loco a loco e não achou desvio significativo dentro de nenhuma área, depois da correção para muitos testes.';
    } },
    P10: { certa: 'b', rot: '(b)', exp: function () {
      return 'Com poucos pais, as frequências dos alelos dos pais e das mães diferem por acaso, e os filhotes nascem com heterozigotos a mais. Os tamanhos efetivos do artigo são pequenos: ' + Ne + ' de ' + D.info['Morro do Diabo'].Ne + ' no Morro do Diabo, ' + D.info['Ivinhema'].Ne + ' em Ivinhema e ' + D.info['Porto Primavera'].Ne + ' no Porto Primavera. ' + FIS + ' negativo não quer dizer população saudável.';
    } },
    P11: { certa: 'b', rot: '(b)', exp: function () {
      var c = R['Corredor Verde'], p = R['Porto Primavera'];
      return Ho + ': ' + num(p.Ho, 3) + ' no Porto Primavera contra ' + num(c.Ho, 3) + ' no Corredor Verde. Pelas frequências dos alelos, a ordem é a outra (' + He + ': ' + num(c.He, 3) + ' contra ' + num(p.He, 3) + '). No Corredor Verde faltam heterozigotos (' + FIS + ' ' + sinal(c.FIS, 2) + ') e no Porto Primavera sobram (' + sinal(p.FIS, 2) + '): a ' + Ho + ' mistura a diversidade com o modo como as onças se cruzaram ou foram amostradas.';
    } },
    P12: { certa: 'b', rot: '(b)', exp: function () {
      return 'A amostra do Porto Primavera é de 1993 a 2004, e boa parte das onças nasceu antes do lago. A ' + He + ' cai devagar, perto de 1/(2' + Ne + ') por geração (com ' + Ne + ' de 13,5, cerca de 3,7% por geração), mas a população pode sumir muito antes, quando perde o habitat. Diversidade alta numa amostra não garante a população de hoje.';
    } }
  };
  Object.keys(PERGUNTAS).forEach(function (q) {
    $('q-' + q).querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { estado.resp[q] = b.getAttribute('data-valor'); salvar(); renderTudo(); });
    });
  });
  function renderPerguntas() {
    Object.keys(PERGUNTAS).forEach(function (q) {
      var caixa = $('q-' + q), def = PERGUNTAS[q], resp = estado.resp[q];
      marcar(caixa, resp);
      var ret = caixa.querySelector('.retorno');
      if (!resp) { ret.hidden = true; return; }
      ret.hidden = false;
      ret.innerHTML = (resp === def.certa ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + def.rot + '.</strong> ') + def.exp();
    });
  }

  // ---------- Campos numéricos ----------
  var CAMPOS = {
    P1: { certo: function () { return M.porLoco('Morro do Diabo', liDe('F42')).A; }, texto: function (ok) {
      var x = M.porLoco('Morro do Diabo', liDe('F42'));
      return (ok ? '<strong>Isso:</strong> ' : '<strong>Confira:</strong> são ') + x.A + ' alelos (' + lista(x.freqs.map(function (f) { return String(f.alelo); })) + ') nas ' + x.N + ' cópias das 8 onças. Conte as cores, não as cartas.';
    } },
    P2: { certo: function () { return M.porLoco('Corredor Verde', liDe('F42')).A; }, texto: function (ok) {
      var x = M.porLoco('Corredor Verde', liDe('F42'));
      return (ok ? '<strong>Isso:</strong> ' : '<strong>Confira:</strong> são ') + x.A + ' alelos nas ' + x.n + ' onças com resultado (' + x.N + ' cópias). Mais onças, mais alelos: o Corredor Verde é mais diverso ou só foi mais amostrado? O sorteio, mais abaixo, ajuda a responder.';
    } },
    P7: { certo: function () { return M.porLoco('Morro do Diabo', liDe('F53')).het; }, texto: function (ok) {
      var x = M.porLoco('Morro do Diabo', liDe('F53'));
      return (ok ? '<strong>Isso:</strong> ' : '<strong>Confira:</strong> ') + 'as ' + x.het + ' são heterozigotas, ' + Ho + ' = ' + x.het + '/' + x.n + ' = ' + num(x.Ho, 2) + '. Pelas frequências dos alelos, ' + He + ' = ' + num(x.He, 3) + ': nesse loco sobram heterozigotos.';
    } },
    D: { certo: function () { return 9; }, texto: function (ok) {
      return (ok ? '<strong>Isso:</strong> ' : '<strong>Tente de novo:</strong> ') + 'com 9 onças (18 cópias), Ivinhema dá ' + num(M.AR('Ivinhema', 9), 2) + '; com 8, ' + num(R['Ivinhema'].AR, 2) + '. O artigo parece ter usado outro tamanho só para Ivinhema. O Morro do Diabo não pode ser rarefeito a 9, porque tem 8 onças.';
    } }
  };
  document.querySelectorAll('input[data-campo]').forEach(function (inp) {
    var k = inp.getAttribute('data-campo');
    inp.addEventListener('input', function () { estado.campos[k] = inp.value; salvar(); renderBarra(); });
    inp.addEventListener('change', function () { renderCampos(); renderRegistro(); });
  });
  function renderCampos() {
    Object.keys(CAMPOS).forEach(function (k) {
      var inp = document.querySelector('input[data-campo="' + k + '"]'), ret = $('ret-' + k);
      var v = estado.campos[k] || '';
      if (document.activeElement !== inp) inp.value = v;
      var x = lerNumero(v);
      if (x === null) { ret.hidden = true; return; }
      ret.hidden = false;
      ret.innerHTML = CAMPOS[k].texto(x === CAMPOS[k].certo());
    });
  }

  // ---------- Passo 2 ----------
  botoesFragmentos('botoes-cartas-frag', 'cFrag');
  preencherLocos('sel-cartas-loco', 'cLoco');
  $('botao-contagem').addEventListener('click', function () { estado.sel.contagem = !estado.sel.contagem; salvar(); renderTudo(); });
  botoesFragmentos('botoes-sorteio-frag', 'sFrag');

  function controleK() {
    var s = $('s-k');
    function aplicar(v) {
      estado.sel.sK = limitar(Math.round(v), 2, nOncas(estado.sel.sFrag));
      estado.sel.sUlt = null; estado.sel.sMil = null;
      salvar(); renderPasso2();
    }
    s.addEventListener('input', function () { aplicar(Number(s.value)); });
    $('s-k-menos').addEventListener('click', function () { aplicar(estado.sel.sK - 1); });
    $('s-k-mais').addEventListener('click', function () { aplicar(estado.sel.sK + 1); });
  }
  controleK();
  $('botao-sortear').addEventListener('click', function () {
    var r = M.sortearOncas(estado.sel.sFrag, estado.sel.sK, M.gerador(estado.sel.sSem));
    estado.sel.sUlt = { A: r.A, ids: r.ids, sem: estado.sel.sSem, frag: estado.sel.sFrag, k: estado.sel.sK };
    estado.sel.sSem += 1;
    salvar(); renderPasso2();
  });
  $('botao-mil').addEventListener('click', function () {
    var m = M.mediaDeSorteios(estado.sel.sFrag, estado.sel.sK, 1000, SEMENTE);
    estado.sel.sMil = { media: m.media, min: m.min, max: m.max, frag: estado.sel.sFrag, k: estado.sel.sK };
    salvar(); renderPasso2();
  });
  function controleRar() {
    var s = $('s-rar');
    function aplicar(v) { estado.sel.rar = limitar(Math.round(v), 2, 9); salvar(); renderPasso2(); }
    s.addEventListener('input', function () { aplicar(Number(s.value)); });
    $('s-rar-menos').addEventListener('click', function () { aplicar(estado.sel.rar - 1); });
    $('s-rar-mais').addEventListener('click', function () { aplicar(estado.sel.rar + 1); });
  }
  controleRar();

  function tabelaContagem(frag, li) {
    var x = M.porLoco(frag, li);
    var linhas = x.freqs.map(function (f) {
      var marcas = [];
      if (f.raro) marcas.push('raro');
      if (f.privado) marcas.push('privado');
      return '<tr><td>' + chip(li, f.alelo) + '</td><td class="num">' + f.copias + '</td><td class="num">' + num(100 * f.f, 1) + '%</td><td>' + (marcas.join(', ') || '') + '</td></tr>';
    }).join('');
    return '<div class="tabela-rolagem"><table class="momentos"><thead><tr><th>Alelo</th><th class="num">Cópias</th><th class="num">Frequência</th><th>Marca</th></tr></thead><tbody>' + linhas +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + x.N + '</td><td class="num">100%</td><td>' + x.A + ' alelos em ' + x.n + ' onças</td></tr></tfoot></table></div>' +
      '<p class="pequeno suave">Raro: abaixo de 5% nesta área. Privado: não aparece nas outras três áreas neste loco.</p>';
  }

  function renderPasso2() {
    var s = estado.sel, li = liDe(s.cLoco);
    marcar($('botoes-cartas-frag'), s.cFrag);
    $('sel-cartas-loco').value = s.cLoco;
    $('cartas-alelos').innerHTML = cartas(s.cFrag, li, false);
    $('botao-contagem').setAttribute('aria-expanded', String(s.contagem));
    $('botao-contagem').textContent = s.contagem ? 'Esconder a contagem' : 'Mostrar a contagem dos alelos';
    $('caixa-contagem').hidden = !s.contagem;
    if (s.contagem) $('caixa-contagem').innerHTML = tabelaContagem(s.cFrag, li);

    // Tabela A
    var cab = '<thead><tr><th>Loco</th>' + FR.map(function (f) { return '<th class="num">' + esc(f) + '</th>'; }).join('') + '</tr></thead>';
    var corpo = D.locos.map(function (L, i) {
      return '<tr><th scope="row">' + L + '</th>' + FR.map(function (f) {
        var x = M.porLoco(f, i), r = x.freqs.filter(function (q) { return q.raro; }).length, p = x.freqs.filter(function (q) { return q.privado; }).length;
        var extra = (r ? ' <span class="marca r" title="alelos raros">' + r + 'r</span>' : '') + (p ? ' <span class="marca p" title="alelos privados">' + p + 'p</span>' : '');
        return '<td class="num">' + x.A + extra + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var rodape = '<tfoot>' +
      '<tr><td><strong>Média (' + Ai + ')</strong></td>' + FR.map(function (f) { return '<td class="num"><strong>' + num(R[f].A, 2) + '</strong></td>'; }).join('') + '</tr>' +
      '<tr><td>Alelos raros (abaixo de 5%)</td>' + FR.map(function (f) { return '<td class="num">' + R[f].raros + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Alelos privados</td>' + FR.map(function (f) { return '<td class="num">' + R[f].privados + '</td>'; }).join('') + '</tr>' +
      '<tr><td>Onças</td>' + FR.map(function (f) { return '<td class="num">' + nOncas(f) + '</td>'; }).join('') + '</tr></tfoot>';
    $('tabela-A').innerHTML = cab + '<tbody>' + corpo + '</tbody>' + rodape;

    // Sorteio
    marcar($('botoes-sorteio-frag'), s.sFrag);
    var maxK = nOncas(s.sFrag);
    $('s-k').max = String(maxK);
    $('s-k').value = String(s.sK);
    $('s-k-valor').textContent = s.sK + ' de ' + maxK;
    var t = [];
    t.push('<p>Com as ' + maxK + ' onças do ' + esc(s.sFrag) + ': ' + Ai + ' = <strong>' + num(R[s.sFrag].A, 2) + '</strong>.</p>');
    if (s.sUlt && s.sUlt.frag === s.sFrag && s.sUlt.k === s.sK) {
      t.push('<p>Sorteio ' + (s.sUlt.sem - SEMENTE + 1) + ', ' + s.sK + ' onças: ' + Ai + ' = <strong>' + num(s.sUlt.A, 2) + '</strong> <span class="pequeno suave">(' + esc(s.sUlt.ids.join(', ')) + ')</span></p>');
    }
    if (s.sMil && s.sMil.frag === s.sFrag && s.sMil.k === s.sK) {
      var ar = M.AR(s.sFrag, s.sK);
      t.push('<p>1.000 sorteios de ' + s.sK + ' onças: ' + Ai + ' médio = <strong>' + num(s.sMil.media, 2) + '</strong> (de ' + num(s.sMil.min, 2) + ' a ' + num(s.sMil.max, 2) + '). Riqueza alélica com ' + s.sK + ' onças, a conta do artigo, sem sortear: <strong>' + (ar === null ? 'não dá' : num(ar, 2)) + '</strong>.</p>');
    }
    $('resultado-sorteio').innerHTML = t.join('');

    // Tabela AR
    $('tabela-AR').innerHTML = '<thead><tr><th>Área</th><th class="num">Onças</th><th class="num">' + Ai + ' (todas)</th><th class="num">' + AR + ' (8 onças)</th></tr></thead><tbody>' +
      FR.map(function (f) { return '<tr><th scope="row">' + esc(f) + '</th><td class="num">' + nOncas(f) + '</td><td class="num">' + num(R[f].A, 2) + '</td><td class="num"><strong>' + num(R[f].AR, 2) + '</strong></td></tr>'; }).join('') + '</tbody>';

    // Desafio
    $('s-rar').value = String(s.rar);
    $('s-rar-valor').textContent = s.rar + ' onças (' + 2 * s.rar + ' cópias)';
    $('tabela-rar').innerHTML = '<thead><tr><th>Área</th><th class="num">' + AR + ' com ' + s.rar + ' onças</th><th class="num">Artigo</th></tr></thead><tbody>' +
      FR.map(function (f) {
        var v = M.AR(f, s.rar);
        return '<tr><th scope="row">' + esc(f) + '</th><td class="num">' + (v === null ? 'só tem ' + nOncas(f) : num(v, 2)) + '</td><td class="num">' + num(D.tabela1[f].AR, f === 'Corredor Verde' || f === 'Porto Primavera' ? 2 : 1) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  // ---------- Passo 3 ----------
  $('botoes-criterio').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { estado.sel.crit = b.getAttribute('data-valor'); salvar(); renderTudo(); });
  });
  $('tabela-araucaria').innerHTML = '<thead><tr><th>Araucária</th><th class="num">' + Pi + '</th><th class="num">' + Ai + '</th><th class="num">' + He + '</th><th class="num">' + Ho + '</th></tr></thead><tbody>' +
    D.araucaria.map(function (x) { return '<tr><th scope="row">' + esc(x.grupo) + '</th><td class="num">' + x.P + '</td><td class="num">' + x.A + '</td><td class="num">' + x.He + '</td><td class="num">' + (x.Ho || '') + '</td></tr>'; }).join('') +
    '<tr><th scope="row">Onças (4 áreas, microssatélites)</th><td class="num">92,3 a 100%</td><td class="num">' + num(R['Morro do Diabo'].A, 1) + ' a ' + num(R['Corredor Verde'].A, 1) + '</td><td class="num">' + num(R['Morro do Diabo'].He, 2) + ' a ' + num(R['Corredor Verde'].He, 2) + '</td><td class="num">' + num(R['Morro do Diabo'].Ho, 2) + ' a ' + num(R['Porto Primavera'].Ho, 2) + '</td></tr></tbody>';
  $('cartas-741').innerHTML = cartas('Morro do Diabo', liDe('FCA741'), false);
  function renderPasso3() {
    var c = estado.sel.crit;
    marcar($('botoes-criterio'), c);
    $('tabela-P').innerHTML = '<thead><tr><th>Área</th><th class="num">Locos polimórficos (de 13)</th><th class="num">' + Pi + '</th><th class="num">Maior frequência de um alelo</th></tr></thead><tbody>' +
      FR.map(function (f) {
        var r = R[f], n = c === '95' ? r.poli95 : r.poli99, p = c === '95' ? r.P95 : r.P99;
        return '<tr><th scope="row">' + esc(f) + '</th><td class="num">' + n + '</td><td class="num"><strong>' + num(p, 1) + '%</strong></td><td class="num">' + num(100 * r.maxfMaior, 1) + '%</td></tr>';
      }).join('') + '</tbody>';
  }

  // ---------- Passo 4 ----------
  botoesFragmentos('botoes-het-frag', 'hFrag');
  preencherLocos('sel-het-loco', 'hLoco');
  $('botao-destacar').addEventListener('click', function () { estado.sel.destacar = !estado.sel.destacar; salvar(); renderTudo(); });
  function renderPasso4() {
    var s = estado.sel, li = liDe(s.hLoco), x = M.porLoco(s.hFrag, li);
    marcar($('botoes-het-frag'), s.hFrag);
    $('sel-het-loco').value = s.hLoco;
    $('botao-destacar').setAttribute('aria-pressed', String(s.destacar));
    $('botao-destacar').textContent = s.destacar ? 'Tirar o destaque' : 'Destacar os heterozigotos';
    $('cartas-het').innerHTML = cartas(s.hFrag, li, s.destacar);
    var sp2 = x.freqs.map(function (f) { return num(f.f, 3) + '²'; }).join(' + ');
    $('contas-het').innerHTML = s.destacar ?
      '<p>' + esc(s.hFrag) + ', ' + s.hLoco + ': ' + x.het + ' heterozigotas em ' + x.n + ' onças, ' + Ho + ' = ' + num(x.Ho, 3) + '.</p>' +
      '<p>' + He + ' sem correção = 1 − (' + sp2 + ') = ' + num(x.HeSem, 3) + '. Com a correção, × ' + x.N + '/' + (x.N - 1) + ' = <strong>' + num(x.He, 3) + '</strong>. ' + FIS + ' deste loco = ' + sinal(1 - x.Ho / x.He, 2) + '.</p>' :
      '<p class="suave">Conte os heterozigotos (dois alelos diferentes) e depois toque em "Destacar os heterozigotos" para conferir e ver as contas.</p>';
    $('tabela-H').innerHTML = '<thead><tr><th>Área</th><th class="num">Onças</th><th class="num">' + Ho + '</th><th class="num">' + He + '</th><th class="num">' + He + ' sem correção</th><th class="num">' + FIS + '</th><th class="num">' + Ne + ' (artigo)</th></tr></thead><tbody>' +
      FR.map(function (f) {
        var r = R[f], i = D.info[f];
        return '<tr><th scope="row">' + esc(f) + '</th><td class="num">' + r.n + '</td><td class="num">' + num(r.Ho, 3) + '</td><td class="num">' + num(r.He, 3) + '</td><td class="num">' + num(r.HeSem, 3) + '</td><td class="num"><strong>' + sinal(r.FIS, 2) + '</strong></td><td class="num">' + i.Ne + '<br><span class="pequeno suave">' + i.NeIC + '</span></td></tr>';
      }).join('') + '</tbody>';
  }

  // ---------- Passo 5 ----------
  $('botoes-medida').innerHTML = MEDIDAS.map(function (m) {
    return '<button type="button" class="escolha" data-valor="' + m.k + '" aria-pressed="false">' + m.rot + '</button>';
  }).join('');
  $('botoes-medida').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { estado.sel.medida = b.getAttribute('data-valor'); salvar(); renderTudo(); });
  });
  function valorMedida(m, f) { return R[f][m.k]; }
  function fmtMedida(m, v) { return num(v, m.casas) + (m.suf || ''); }
  $('tabela-artigo').innerHTML = (function () {
    var col = [['n', 'Onças', 0, 0], ['A', Ai, 1, 2], ['AR', AR, 2, 2], ['Ho', Ho, 3, 3], ['He', He, 3, 3]];
    var cab = '<thead><tr><th>Área</th>' + col.map(function (c) { return '<th class="num">' + c[1] + '</th>'; }).join('') + '</tr><tr class="sub"><th></th>' + col.map(function () { return '<th class="num">artigo / aqui</th>'; }).join('') + '</tr></thead>';
    var corpo = FR.map(function (f) {
      var t = D.tabela1[f], r = R[f];
      return '<tr><th scope="row">' + esc(f) + '</th>' + col.map(function (c) {
        var art = c[0] === 'A' && (f === 'Morro do Diabo' || f === 'Ivinhema' || f === 'Porto Primavera') ? num(t.A, 1) :
          (c[0] === 'AR' && (f === 'Morro do Diabo' || f === 'Ivinhema') ? num(t.AR, 1) : num(t[c[0]], c[2]));
        if (c[0] === 'A' && f === 'Corredor Verde') art = '6';
        var aqui = c[0] === 'n' ? r.n : num(r[c[0]], c[3]);
        return '<td class="num">' + art + ' / ' + aqui + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return cab + '<tbody>' + corpo + '</tbody>';
  })();
  $('privados-artigo').innerHTML = FR.map(function (f) {
    return esc(f) + ' ' + num(D.privadosArtigo[f], 2) + ' (aqui, ' + num(M.privadosRarefeitos(f, 8), 2) + ')';
  }).join('; ');
  $('lista-historia').innerHTML = [
    '<li><strong>Corredor Verde:</strong> a maior área contínua (1,1 milhão de ha, 200 km de ponta a ponta); amostras de 1992 a 2007, 7 de fezes; ' + Ne + ' estimado de ' + D.info['Corredor Verde'].Ne + ', o maior das quatro áreas.</li>',
    '<li><strong>Morro do Diabo:</strong> parque de 37 mil ha; 8 onças amostradas de 1998 a 2004; ' + Ne + ' de ' + D.info['Morro do Diabo'].Ne + '.</li>',
    '<li><strong>Ivinhema:</strong> parque de 73,3 mil ha, nas várzeas do rio Ivinhema; amostras de 2002 a 2007; ' + Ne + ' de ' + D.info['Ivinhema'].Ne + '.</li>',
    '<li><strong>Porto Primavera:</strong> o reservatório da hidrelétrica, cheio em 1998, alagou 220 mil ha; amostras de 1993 a 2004; a última onça com colar foi achada morta em 2003, e o artigo considera a população extinta; ' + Ne + ' de ' + D.info['Porto Primavera'].Ne + '.</li>'
  ].join('');
  function renderPasso5() {
    var m = MEDIDAS.filter(function (x) { return x.k === estado.sel.medida; })[0];
    marcar($('botoes-medida'), m.k);
    var ordem = FR.slice().sort(function (a, b) { return valorMedida(m, b) - valorMedida(m, a); });
    var max = Math.max.apply(null, ordem.map(function (f) { return valorMedida(m, f); })) || 1;
    $('barras-ranking').innerHTML = ordem.map(function (f, i) {
      var v = valorMedida(m, f);
      var pos = ordem.filter(function (g) { return valorMedida(m, g) > v + 1e-12; }).length + 1;
      return '<span class="rotulo">' + pos + 'º ' + esc(f) + '</span><span class="linha-barra"><span class="barra-h ranking"><span style="width:' + (100 * v / max).toFixed(1) + '%"></span></span><span class="valor">' + fmtMedida(m, v) + '</span></span>';
    }).join('');
    var empate = ordem.filter(function (g) { return Math.abs(valorMedida(m, g) - valorMedida(m, ordem[0])) < 1e-12; });
    $('texto-ranking').innerHTML = m.rot + ': ' + m.desc + '. ' + (empate.length > 1 ? 'Empate em primeiro: ' + esc(lista(empate)) + '.' : 'Primeiro lugar: ' + esc(ordem[0]) + '.');
  }

  // ---------- Passo 6 ----------
  $('campo-P13').addEventListener('input', function () { estado.texto.P13 = this.value; salvar(); renderBarra(); renderRegistro(); });
  var NOME_MEDIDA = { A: 'número médio de alelos', P: 'porcentagem de locos polimórficos', Ho: 'heterozigosidade observada', He: 'heterozigosidade esperada' };
  function primeiroEm(k) {
    var ordem = FR.slice().sort(function (a, b) { return R[b][k] - R[a][k]; });
    var top = ordem.filter(function (g) { return Math.abs(R[g][k] - R[ordem[0]][k]) < 1e-12; });
    return top;
  }
  function renderPasso6() {
    if (document.activeElement !== $('campo-P13')) $('campo-P13').value = estado.texto.P13 || '';
    var a = estado.previsao.a, b = estado.previsao.b, h = [];
    if (a || b) {
      h.push('<h3>Suas previsões</h3>');
      if (a) h.push('<p>Você previu <strong>' + esc(a) + '</strong>. Pela ' + Ho + ', o primeiro é o Porto Primavera; por ' + Ai + ', ' + AR + ', ' + He + ', alelos raros e privados, o Corredor Verde.</p>');
      if (b) {
        var k = b === 'P' ? 'P95' : b, top = primeiroEm(k);
        h.push('<p>Você escolheu o <strong>' + NOME_MEDIDA[b] + '</strong>: com essa medida, ' + (top.length > 1 ? 'empatam em primeiro ' + esc(lista(top)) : 'o primeiro é ' + esc(top[0])) + '.</p>');
      }
    }
    $('previsoes-volta').innerHTML = h.join('');
    var url = D.MOODLE_URL;
    $('botao-ficha').hidden = !url;
    if (url) $('botao-ficha').href = url;
    renderRegistro();
  }

  function textoPergunta(q) {
    var r = estado.resp[q];
    if (!r) return 'sem resposta';
    return r + (r === PERGUNTAS[q].certa ? ' (a esperada)' : ' (esperada: ' + PERGUNTAS[q].certa + ')');
  }
  function textoCampo(k) {
    var v = lerNumero(estado.campos[k]);
    if (v === null) return 'sem resposta';
    return String(estado.campos[k]).trim() + (v === CAMPOS[k].certo() ? ' (certo)' : ' (esperado: ' + CAMPOS[k].certo() + ')');
  }
  function textoRegistro() {
    var l = [];
    l.push('BIOC10 Genética II · Inventário genético da onça · prática de 26/11/2026');
    if (estado.nome) l.push('Nome: ' + estado.nome);
    l.push('');
    l.push('Previsão: área ' + (estado.previsao.a || 'sem resposta') + '; medida ' + (estado.previsao.b ? NOME_MEDIDA[estado.previsao.b] : 'sem resposta'));
    l.push('P1: ' + textoCampo('P1') + ' · P2: ' + textoCampo('P2') + ' · P3: ' + textoPergunta('P3') + ' · P4: ' + textoPergunta('P4'));
    l.push('Desafio (onças para AR 4,2 em Ivinhema): ' + textoCampo('D'));
    l.push('P5: ' + textoPergunta('P5') + ' · P6: ' + textoPergunta('P6'));
    l.push('P7: ' + textoCampo('P7') + ' · P8: ' + textoPergunta('P8') + ' · P9: ' + textoPergunta('P9') + ' · P10: ' + textoPergunta('P10'));
    l.push('P11: ' + textoPergunta('P11') + ' · P12: ' + textoPergunta('P12'));
    l.push('P13: ' + ((estado.texto.P13 || '').trim() || 'sem resposta'));
    l.push('');
    l.push('Números (Corredor Verde; Morro do Diabo; Ivinhema; Porto Primavera):');
    l.push('A: ' + FR.map(function (f) { return num(R[f].A, 2); }).join('; ') + ' · AR (8 onças): ' + FR.map(function (f) { return num(R[f].AR, 2); }).join('; '));
    l.push('P (95%): ' + FR.map(function (f) { return num(R[f].P95, 1) + '%'; }).join('; ') + ' · alelos raros: ' + FR.map(function (f) { return R[f].raros; }).join('; ') + ' · privados: ' + FR.map(function (f) { return R[f].privados; }).join('; '));
    l.push('Ho: ' + FR.map(function (f) { return num(R[f].Ho, 3); }).join('; ') + ' · He: ' + FR.map(function (f) { return num(R[f].He, 3); }).join('; ') + ' · FIS: ' + FR.map(function (f) { return sinal(R[f].FIS, 2); }).join('; '));
    l.push('Fonte: Haag et al. (2010) Molecular Ecology 19(22):4906-4921; araucária: Auler et al. (2002) Genetics and Molecular Biology 25(3):329-338.');
    return l.join('\n');
  }
  function renderRegistro() { $('registro-texto').textContent = textoRegistro(); }
  $('botao-copiar').addEventListener('click', function () {
    var t = textoRegistro();
    function ok() { $('msg-copiar').textContent = 'Registro copiado.'; }
    function falha() {
      var r = document.createRange(); r.selectNodeContents($('registro-texto'));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      $('msg-copiar').textContent = 'Não deu para copiar sozinho: o texto ficou selecionado, copie com o menu do aparelho.';
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, falha);
      else falha();
    } catch (err) { falha(); }
  });
  $('botao-baixar').addEventListener('click', function () {
    try {
      var blob = new Blob([textoRegistro()], { type: 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'registro_diversidade_26nov' + (estado.nome ? '_' + estado.nome.replace(/[^A-Za-z0-9À-ú]+/g, '_').slice(0, 30) : '') + '.txt';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (err) { $('msg-copiar').textContent = 'Não deu para baixar neste aparelho; use "Copiar o registro".'; }
  });

  // ---------- Recomeçar e projeção ----------
  function botaoRecomecar(id) {
    $(id).innerHTML = '<button type="button" class="pequeno">Recomeçar do zero</button>';
    $(id).querySelector('button').addEventListener('click', function () {
      if ($(id).getAttribute('data-confirmar') !== '1') {
        $(id).setAttribute('data-confirmar', '1');
        $(id).querySelector('button').textContent = 'Toque de novo para apagar tudo';
        return;
      }
      var proj = estado.projecao;
      estado = estadoInicial(); estado.projecao = proj; salvar();
      $(id).removeAttribute('data-confirmar');
      $(id).querySelector('button').textContent = 'Recomeçar do zero';
      ir('#passo-1'); renderTudo();
    });
  }
  botaoRecomecar('recomecar-tudo');
  botaoRecomecar('recomecar-fim');
  $('botao-projecao').addEventListener('click', function () {
    estado.projecao = !estado.projecao; salvar(); aplicarProjecao();
  });
  function aplicarProjecao() {
    document.documentElement.classList.toggle('projecao', estado.projecao);
    $('botao-projecao').setAttribute('aria-pressed', String(estado.projecao));
  }

  $('fonte-haag').textContent = D.fontes.haag;
  $('fonte-auler').textContent = D.fontes.auler;

  function renderTudo() {
    renderPasso1(); renderPasso2(); renderPasso3(); renderPasso4(); renderPasso5(); renderPasso6();
    renderPerguntas(); renderCampos(); renderBarra();
  }

  aplicarProjecao();
  mostrarTela(location.hash || estado.ultimoPasso, false);
})();
