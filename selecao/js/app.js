// Interface da prática de seleção: passos, estado, gráficos e registro.

(function () {
  'use strict';

  var M = window.MODELO, D = window.DADOS, G = window.GRAFICO;
  var CHAVE = 'bioc10_selecao_05nov_v1';

  // ---------- Utilidades ----------
  function num(x, casas) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  function sinal(x, casas) {
    var lim = 0.5 * Math.pow(10, -casas);
    if (Math.abs(x) < lim) return num(0, casas);
    return (x > 0 ? '+' : '−') + num(Math.abs(x), casas);
  }
  // Tamanho do gráfico conforme a largura da caixa: no celular, o texto do SVG fica legível.
  function tamanho(idCaixa, proporcao) {
    var caixa = $(idCaixa);
    var w = caixa && caixa.clientWidth ? caixa.clientWidth - 12 : 640;
    var largura = Math.max(340, Math.min(640, Math.round(w)));
    var altura = Math.max(250, Math.round(largura * (proporcao || 0.53)));
    return { largura: largura, altura: altura };
  }
  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function limitar(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function arred(x, passo) { return Math.round(x / passo) * passo; }

  var NOME_H = { '1': 'R dominante', '0.5': 'R intermediário', '0': 'R recessivo' };
  var NOME_HC = { '0': 'só o RR paga', '0.5': 'o heterozigoto paga metade', '1': 'o heterozigoto paga tudo' };

  // ---------- Estado ----------
  function estadoInicial() {
    return {
      versao: 1,
      nome: '',
      projecao: false,
      ultimoPasso: '#passo-1',
      previsao: { a: null, b: null },
      r1: { p0: 0.05, s: 0.30, h: 0.5, comparar: false, g: 0, resp: {} },
      r2: { serie: 'AJU', inicio: 2006, G: 10, h: 0.5, s: 0.050, achados: {}, resp: {} },
      r3: { hc: 0.5, c: 0.050, achado: null, palpite: null, comparar: false, resp: {} },
      het: { s: 0.20, t: 0.40, resp: {} },
      ed: {},
      criterios: [false, false, false]
    };
  }

  var estado = carregar();

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        var e = JSON.parse(bruto);
        if (e && e.versao === 1) return mesclar(estadoInicial(), e);
      }
    } catch (err) { /* sem armazenamento: segue só na memória */ }
    return estadoInicial();
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

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (err) { /* ignora */ }
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
    renderTudo();
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

  function passoFeito(n) {
    var r = estado;
    switch (n) {
      case 1: return !!(r.previsao.a && r.previsao.b);
      case 2: return !!(r.r1.resp.q1 && r.r1.resp.q2 && r.r1.resp.q3);
      case 3: return !!(r.r2.resp.q1 && r.r2.resp.q2 && r.r2.resp.q3);
      case 4: return !!(r.r3.palpite && r.r3.resp.q1);
      case 5: return !!r.het.resp.q1;
      case 6: return r.criterios.every(Boolean);
      default: return false;
    }
  }

  function renderBarra() {
    document.querySelectorAll('#lista-passos a').forEach(function (a) {
      var n = parseInt(a.getAttribute('data-passo'), 10);
      a.classList.toggle('feito', passoFeito(n));
    });
  }

  // ---------- Botões de escolha (um toque) ----------
  function marcar(grupo, atributo, valor) {
    grupo.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute(atributo) === String(valor)));
    });
  }

  function ligarEscolha(idGrupo, atributo, aoEscolher) {
    var grupo = $(idGrupo);
    grupo.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { aoEscolher(b.getAttribute(atributo)); salvar(); renderTudo(); });
    });
  }

  // Perguntas com retorno: { id, alvo (objeto de respostas), chave, certa, rotuloCerta, explicacao }
  var PERGUNTAS = [];

  function pergunta(def) {
    PERGUNTAS.push(def);
    var caixa = $(def.id);
    caixa.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        def.alvo()[def.chave] = b.getAttribute('data-valor');
        salvar();
        renderTudo();
      });
    });
  }

  function renderPerguntas() {
    PERGUNTAS.forEach(function (def) {
      var caixa = $(def.id);
      var resp = def.alvo()[def.chave];
      marcar(caixa, 'data-valor', resp);
      var ret = caixa.querySelector('.retorno');
      if (!resp) { ret.hidden = true; return; }
      ret.hidden = false;
      var abre = resp === def.certa ? '<strong>Isso.</strong> ' : '<strong>Resposta esperada: ' + def.rotuloCerta + '.</strong> ';
      ret.innerHTML = abre + def.explicacao;
    });
  }

  function textoDaEscolha(idCaixa, valor) {
    if (!valor) return 'sem resposta';
    var b = $(idCaixa).querySelector('button[data-valor="' + valor + '"]');
    return b ? b.textContent.trim() : valor;
  }

  // ---------- Passo 1 ----------
  ligarEscolha('botoes-prev-a', 'data-valor', function (v) { estado.previsao.a = v; });
  ligarEscolha('botoes-prev-b', 'data-valor', function (v) { estado.previsao.b = v; });
  $('campo-nome').addEventListener('input', function () { estado.nome = this.value; salvar(); renderRegistro(); });

  function renderPasso1() {
    marcar($('botoes-prev-a'), 'data-valor', estado.previsao.a);
    marcar($('botoes-prev-b'), 'data-valor', estado.previsao.b);
    if ($('campo-nome').value !== estado.nome) $('campo-nome').value = estado.nome || '';
    $('eco-previsao').textContent = (estado.previsao.a && estado.previsao.b) ?
      'Previsões guardadas. Você confere as duas nas Rodadas 1 e 3.' : '';
  }

  // ---------- Passo 2: Rodada 1 ----------
  var r1 = estado.r1;
  $('r1-p0').addEventListener('input', function () { estado.r1.p0 = parseFloat(this.value); estado.r1.g = 0; salvar(); renderPasso2(); });
  $('r1-s').addEventListener('input', function () { estado.r1.s = parseFloat(this.value); estado.r1.g = 0; salvar(); renderPasso2(); });
  ligarEscolha('r1-h', 'data-h', function (v) { estado.r1.h = parseFloat(v); estado.r1.g = 0; });
  $('r1-comparar').addEventListener('click', function () { estado.r1.comparar = !estado.r1.comparar; salvar(); renderPasso2(); });
  $('r1-proxima').addEventListener('click', function () { estado.r1.g = Math.min(estado.r1.g + 1, 400); salvar(); renderPasso2(); });
  $('r1-mais10').addEventListener('click', function () { estado.r1.g = Math.min(estado.r1.g + 10, 400); salvar(); renderPasso2(); });
  $('r1-zerar').addEventListener('click', function () { estado.r1.g = 0; salvar(); renderPasso2(); });

  function linhaTabela(rotulo, antes, w, contrib, depois) {
    return '<tr><th scope="row">' + rotulo + '</th><td class="num">' + num(antes, 4) + '</td><td class="num">' + num(w, 3) +
      '</td><td class="num">' + num(contrib, 4) + '</td><td class="num">' + num(depois, 4) + '</td></tr>';
  }

  function renderPasso2() {
    r1 = estado.r1;
    $('r1-p0').value = r1.p0; $('r1-p0-valor').textContent = num(r1.p0, 2);
    $('r1-s').value = r1.s; $('r1-s-valor').textContent = num(r1.s, 2);
    marcar($('r1-h'), 'data-h', r1.h);
    $('r1-comparar').setAttribute('aria-pressed', String(r1.comparar));

    var w = M.aptidoesInseticida(r1.s, r1.h);
    var nMax = Math.max(60, r1.g);
    var traj = M.trajetoria(r1.p0, w, nMax);
    var series = [];
    var tipos = [{ h: 1, traco: 'cheio', rot: 'dominante' }, { h: 0.5, traco: 'tracejado', rot: 'intermediário' }, { h: 0, traco: 'pontilhado', rot: 'recessivo' }];
    if (r1.comparar) {
      tipos.forEach(function (t, i) {
        var tr = M.trajetoria(r1.p0, M.aptidoesInseticida(r1.s, t.h), nMax);
        series.push({ pontos: tr.map(function (p, g) { return [g, p]; }), classe: 'r' + (t.h === r1.h ? '' : ' fina'), traco: t.traco, rotulo: t.rot, dy: (i - 1) * 16 });
      });
    } else {
      series.push({ pontos: traj.map(function (p, g) { return [g, p]; }), classe: 'r', traco: 'cheio', rotulo: NOME_H[String(r1.h)] });
    }
    var ticksX = [];
    var passoX = nMax > 100 ? 50 : 10;
    for (var x = 0; x <= nMax; x += passoX) ticksX.push(x);
    var t1 = tamanho('r1-grafico');
    $('r1-grafico').innerHTML = G.linhas({
      largura: t1.largura, altura: t1.altura,
      x: { min: 0, max: nMax, ticks: ticksX, rotulo: 'Geração' },
      y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], rotulo: 'Frequência de R (p)' },
      series: series,
      marcas: [{ x: r1.g, y: traj[r1.g], classe: 'atual', rotulo: 'geração ' + r1.g + ': ' + num(traj[r1.g], 3) }],
      descricao: 'Frequência de R ao longo de ' + nMax + ' gerações com p0 ' + num(r1.p0, 2) + ', s ' + num(r1.s, 2) + ' e ' + NOME_H[String(r1.h)]
    }) + (r1.comparar ? '<p class="legenda pequeno">Linha cheia: R dominante. Tracejada: intermediário. Pontilhada: recessivo. A linha mais grossa é a da dominância escolhida.</p>' : '');

    var r = M.geracao(traj[r1.g], w);
    $('r1-tabela').innerHTML = '<table class="geracao"><thead><tr><th>Genótipo</th><th class="num">Frequência antes</th><th class="num">Aptidão (<i>w</i>)</th>' +
      '<th class="num">Contribuição</th><th class="num">Frequência depois</th></tr></thead><tbody>' +
      linhaTabela('RR', r.antes.RR, w.RR, r.contrib.RR, r.depois.RR) +
      linhaTabela('RS', r.antes.RS, w.RS, r.contrib.RS, r.depois.RS) +
      linhaTabela('SS', r.antes.SS, w.SS, r.contrib.SS, r.depois.SS) +
      '</tbody><tfoot><tr><td>Soma</td><td class="num">1,0000</td><td></td><td class="num"><span class="media">w</span> = ' + num(r.wMedia, 4) +
      '</td><td class="num">1,0000</td></tr></tfoot></table>';
    $('r1-resumo').innerHTML = 'Geração ' + r1.g + ': <i>p</i>(R) = ' + num(r.p, 4) + '. Depois da seleção: <i>p</i>\' = ' +
      num(r.pNovo, 4) + ' (RR depois + metade do RS depois). Mudança: ' + sinal(r.pNovo - r.p, 4) + '.';
  }

  pergunta({ id: 'r1-q1', alvo: function () { return estado.r1.resp; }, chave: 'q1', certa: 'R dominante', rotuloCerta: 'R dominante',
    explicacao: 'Quando R é raro, quase todo R está em heterozigotos. Se R é dominante, esses heterozigotos já resistem, e a seleção enxerga o R desde o começo.' });
  pergunta({ id: 'r1-q2', alvo: function () { return estado.r1.resp; }, chave: 'q2', certa: 'R dominante', rotuloCerta: 'R dominante',
    explicacao: 'No fim, quem sobra é o S, quase todo escondido em heterozigotos RS. Com R dominante, o RS sobrevive como o RR e a seleção quase não enxerga o S que resta: a curva se arrasta. Com p<sub>0</sub> = 0,05 e s = 0,30, o R dominante leva 349 gerações para chegar a 99%; o intermediário, 44; o recessivo, 67.' });
  pergunta({ id: 'r1-q3', alvo: function () { return estado.r1.resp; }, chave: 'q3', certa: 'a', rotuloCerta: 'quase todo R está em heterozigotos',
    explicacao: 'Com p = 0,01, 99% das cópias de R estão em heterozigotos. Se R é recessivo, o RS morre como o SS, e só os raros RR são favorecidos. O inseticida age sobre todos, e a seleção não depende de mutações novas: ela escolhe entre as variantes que já existem.' });

  // ---------- Passo 3: Rodada 2 ----------
  var EIXO_ANOS = { AJU: [2002, 2013], VIT: [2005, 2011], MSR: [2008, 2012] };

  ligarEscolha('r2-serie', 'data-serie', function (v) {
    estado.r2.serie = v;
    if (v !== 'AJU') estado.r2.inicio = D.SERIES[v].pontos[0].ano;
    else if (estado.r2.inicio !== 2006 && estado.r2.inicio !== 2010) estado.r2.inicio = 2006;
  });
  ligarEscolha('r2-inicio', 'data-inicio', function (v) { estado.r2.inicio = parseInt(v, 10); });
  ligarEscolha('r2-h', 'data-h', function (v) { estado.r2.h = parseFloat(v); });
  $('r2-G').addEventListener('input', function () { estado.r2.G = parseInt(this.value, 10); salvar(); renderPasso3(); });
  $('r2-s').addEventListener('input', function () { estado.r2.s = parseFloat(this.value); salvar(); renderPasso3(); });
  $('r2-menos').addEventListener('click', function () { estado.r2.s = limitar(arred(estado.r2.s - 0.001, 0.001), 0, 0.6); salvar(); renderPasso3(); });
  $('r2-mais').addEventListener('click', function () { estado.r2.s = limitar(arred(estado.r2.s + 0.001, 0.001), 0, 0.6); salvar(); renderPasso3(); });

  function chaveAchado(r2) { return r2.serie + (r2.serie === 'AJU' ? String(r2.inicio) : ''); }

  function rotuloAchado(chave) {
    return { AJU2006: 'Aracaju, 2006 a 2012', AJU2010: 'Aracaju, 2010 a 2012', VIT: 'Vitória, 2006 a 2010', MSR: 'Mossoró, 2009 a 2011' }[chave];
  }

  function curvaR2(r2) {
    var pts = D.SERIES[r2.serie].pontos;
    var inicio = pts.filter(function (p) { return p.ano === r2.inicio; })[0];
    var fim = pts[pts.length - 1];
    var eixo = EIXO_ANOS[r2.serie];
    var nGer = Math.round((eixo[1] - r2.inicio) * r2.G);
    var traj = M.trajetoria(inicio.p, M.aptidoesInseticida(r2.s, r2.h), nGer);
    var gFim = Math.round((fim.ano - r2.inicio) * r2.G);
    var noMeio = null;
    if (r2.serie === 'AJU' && r2.inicio === 2006) noMeio = traj[Math.round(4 * r2.G)];
    return { inicio: inicio, fim: fim, traj: traj, pFim: traj[gFim], noMeio: noMeio, eixo: eixo };
  }

  function renderPasso3() {
    var r2 = estado.r2;
    marcar($('r2-serie'), 'data-serie', r2.serie);
    $('r2-inicio-caixa').hidden = r2.serie !== 'AJU';
    marcar($('r2-inicio'), 'data-inicio', r2.inicio);
    marcar($('r2-h'), 'data-h', r2.h);
    $('r2-G').value = r2.G; $('r2-G-valor').textContent = r2.G;
    $('r2-s').value = r2.s; $('r2-s-valor').textContent = num(r2.s, 3);

    var c = curvaR2(r2);
    var serie = D.SERIES[r2.serie];
    var ticks = [];
    for (var a = c.eixo[0]; a <= c.eixo[1]; a++) if (r2.serie !== 'AJU' || a % 2 === 0) ticks.push(a);
    var t2 = tamanho('r2-grafico');
    if (t2.largura < 480 && r2.serie === 'AJU') ticks = ticks.filter(function (v) { return v % 4 === 2; });
    $('r2-grafico').innerHTML = G.linhas({
      largura: t2.largura, altura: t2.altura,
      x: { min: c.eixo[0], max: c.eixo[1], ticks: ticks, rotulo: 'Ano', fmt: function (v) { return String(v); } },
      y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], rotulo: 'Frequência do kdr (p)' },
      series: [{ pontos: c.traj.map(function (p, g) { return [r2.inicio + g / r2.G, p]; }), classe: 'r', traco: 'cheio' }],
      marcas: serie.pontos.map(function (pt) {
        return { x: pt.ano, y: pt.p, rotulo: pt.ano + ': ' + num(pt.p, 3), abaixo: pt.p > 0.8 };
      }),
      descricao: serie.rotulo + ': pontos observados e curva com s ' + num(r2.s, 3)
    });

    var dif = c.pFim - c.fim.p;
    var acertou = Math.abs(dif) <= 0.015;
    var txt = 'Em ' + c.fim.ano + ', sua curva dá ' + num(c.pFim, 3) + '; o observado é ' + num(c.fim.p, 3) +
      ' (' + c.fim.n + ' mosquitos; diferença ' + sinal(dif, 3) + ').';
    if (c.noMeio !== null) txt += ' Em 2010, sua curva dá ' + num(c.noMeio, 3) + '; o observado é 0,558 (26 mosquitos).';
    if (acertou) {
      var k = chaveAchado(r2);
      estado.r2.achados[k] = { s: r2.s, G: r2.G, h: r2.h };
      salvar();
      txt = '<span class="acerto">Sua curva passa por ' + c.fim.ano + '.</span> ' + txt;
    } else {
      txt += dif < 0 ? ' Aumente o s.' : ' Diminua o s.';
    }
    $('r2-retorno').innerHTML = txt;

    var ks = Object.keys(estado.r2.achados);
    $('r2-quadro-s').innerHTML = ks.length ? '<p><strong>Seus s (guardados quando a curva acerta o ponto final)</strong></p>' +
      ['AJU2006', 'AJU2010', 'VIT', 'MSR'].filter(function (k) { return estado.r2.achados[k]; }).map(function (k) {
        var a = estado.r2.achados[k];
        return '<p>' + rotuloAchado(k) + ': <i>s</i> = ' + num(a.s, 3) + ' (' + NOME_H[String(a.h)] + ', ' + a.G + ' gerações por ano)</p>';
      }).join('') : '<p class="suave">Quando a curva acertar o ponto final, o seu <i>s</i> aparece aqui.</p>';

    $('r2-artigo').hidden = !estado.r2.resp.q2;
  }

  pergunta({ id: 'r2-q1', alvo: function () { return estado.r2.resp; }, chave: 'q1', certa: 'Fica abaixo', rotuloCerta: 'fica abaixo',
    explicacao: 'Com um s constante que acerta 2012, a curva passa em 2010 por cerca de 0,43 (R intermediário), abaixo de 0,558. Nenhum s constante passa pelos três pontos: a subida foi rápida até 2010 e lenta depois.' });
  pergunta({ id: 'r2-q2', alvo: function () { return estado.r2.resp; }, chave: 'q2', certa: 'c', rotuloCerta: 'as duas coisas podem ter contribuído',
    explicacao: 'Com R intermediário e 10 gerações por ano, o s de 2006 a 2010 fica perto de 0,10 e o de 2010 a 2012, perto de 0,02. A pressão pode ter caído (veja o que diz o artigo, abaixo). E cada ponto, com 26 a 30 mosquitos, tem uma margem de erro de uns 0,13 para mais ou para menos: o acaso da amostragem é assunto da deriva, na prática de 12/11.' });
  pergunta({ id: 'r2-q3', alvo: function () { return estado.r2.resp; }, chave: 'q3', certa: 'Cai mais ou menos pela metade', rotuloCerta: 'cai mais ou menos pela metade',
    explicacao: 'O dado fixa a mudança total em seis anos. Com o dobro de gerações, basta cerca de metade da seleção por geração. O s estimado depende da premissa, e por isso a premissa tem de ser declarada.' });

  // ---------- Passo 4: Rodada 3 ----------
  ligarEscolha('r3-hc', 'data-hc', function (v) { estado.r3.hc = parseFloat(v); });
  $('r3-c').addEventListener('input', function () { estado.r3.c = parseFloat(this.value); salvar(); renderPasso4(); });
  $('r3-menos').addEventListener('click', function () { estado.r3.c = limitar(arred(estado.r3.c - 0.001, 0.001), 0, 0.4); salvar(); renderPasso4(); });
  $('r3-mais').addEventListener('click', function () { estado.r3.c = limitar(arred(estado.r3.c + 0.001, 0.001), 0, 0.4); salvar(); renderPasso4(); });
  ligarEscolha('r3-palpite', 'data-valor', function (v) { estado.r3.palpite = v; });
  $('r3-comparar').addEventListener('click', function () { estado.r3.comparar = !estado.r3.comparar; salvar(); renderPasso4(); });

  function gerAnos() { return estado.r2.G || 10; }

  function renderPasso4() {
    var r3 = estado.r3;
    marcar($('r3-hc'), 'data-hc', r3.hc);
    $('r3-c').value = r3.c; $('r3-c-valor').textContent = num(r3.c, 3);
    marcar($('r3-palpite'), 'data-valor', r3.palpite);
    $('r3-comparar').setAttribute('aria-pressed', String(r3.comparar));

    var gg = D.GAIOLAS;
    var w = M.aptidoesCusto(r3.c, r3.hc);
    var traj = M.trajetoria(gg.pInicial, w, gg.geracoes);
    var t3 = tamanho('r3-grafico-gaiola', 0.47);
    $('r3-grafico-gaiola').innerHTML = G.linhas({
      largura: t3.largura, altura: t3.altura,
      x: { min: 0, max: 8, ticks: [0, 2, 4, 6, 8], rotulo: 'Geração nas gaiolas', fmt: function (v) { return 'F' + (v + 1); } },
      y: { min: 0, max: 0.6, ticks: [0, 0.2, 0.4, 0.6], rotulo: 'Frequência do kdr', fmt: function (v) { return num(v, 1); } },
      series: [{ pontos: traj.map(function (p, g) { return [g, p]; }), classe: 'r', traco: 'cheio' }],
      marcas: [{ x: 0, y: gg.pInicial, rotulo: 'F1: 0,46' }, { x: 8, y: gg.pFinal, rotulo: 'F9: 0,32', abaixo: true }],
      descricao: 'Gaiolas sem inseticida: frequência do kdr de F1 a F9 e curva com custo ' + num(r3.c, 3)
    });
    var dif = traj[8] - gg.pFinal;
    var acertou = Math.abs(dif) <= 0.005;
    if (acertou) { estado.r3.achado = { c: r3.c, hc: r3.hc }; salvar(); }
    $('r3-retorno').innerHTML = (acertou ? '<span class="acerto">Sua curva passa pela F9.</span> ' : '') +
      'Na F9, sua curva dá ' + num(traj[8], 3) + '; o observado é 0,32 (diferença ' + sinal(dif, 3) + ').' +
      (acertou ? '' : dif > 0 ? ' Aumente o custo.' : ' Diminua o custo.');

    // Volta de Aracaju
    var caixa = $('r3-volta');
    caixa.hidden = !r3.palpite;
    if (!r3.palpite) return;
    var p2012 = D.SERIES.AJU.pontos[3].p;
    var usar = r3.achado || { c: r3.c, hc: r3.hc };
    var wv = M.aptidoesCusto(usar.c, usar.hc);
    var g01 = M.geracoesAte(p2012, 0.10, wv, 5000);
    var series = [], tipos = [{ hc: 0, traco: 'pontilhado', rot: 'só RR paga' }, { hc: 0.5, traco: 'tracejado', rot: 'metade' }, { hc: 1, traco: 'cheio', rot: 'tudo' }];
    var nMax = Math.max(80, Math.min(400, Math.ceil(((g01 || 200) * 1.6) / 10) * 10));
    var resumoComparar = [];
    if (r3.comparar) {
      nMax = 120;
      tipos.forEach(function (t, i) {
        var cAj = M.ajustarCusto(gg.pInicial, gg.pFinal, gg.geracoes, t.hc);
        var wt = M.aptidoesCusto(cAj, t.hc);
        series.push({ pontos: M.trajetoria(p2012, wt, nMax).map(function (p, g) { return [g, p]; }), classe: 'r' + (t.hc === usar.hc ? '' : ' fina'), traco: t.traco, rotulo: t.rot, dy: (i - 1) * 16 });
        resumoComparar.push({ rot: NOME_HC[String(t.hc)], c: cAj, g01: M.geracoesAte(p2012, 0.10, wt, 5000), g001: M.geracoesAte(p2012, 0.01, wt, 5000) });
      });
    } else {
      series.push({ pontos: M.trajetoria(p2012, wv, nMax).map(function (p, g) { return [g, p]; }), classe: 'r', traco: 'cheio', rotulo: 'c = ' + num(usar.c, 3) });
    }
    var ticks = [];
    for (var x = 0; x <= nMax; x += (nMax > 200 ? 50 : 20)) ticks.push(x);
    var t4 = tamanho('r3-grafico-volta');
    $('r3-grafico-volta').innerHTML = G.linhas({
      largura: t4.largura, altura: t4.altura,
      x: { min: 0, max: nMax, ticks: ticks, rotulo: 'Gerações sem piretroide, a partir de 2012' },
      y: { min: 0, max: 0.7, ticks: [0, 0.1, 0.3, 0.5, 0.7], rotulo: 'Frequência do kdr', fmt: function (v) { return num(v, 1); } },
      series: series,
      refs: [{ y: 0.10, rotulo: '0,10', lado: 'esquerda' }],
      verticais: (g01 && !r3.comparar) ? [{ x: g01, rotulo: g01 + ' gerações' }] : [],
      marcas: [{ x: 0, y: p2012, rotulo: 'Aracaju 2012: 0,617' }],
      descricao: 'Queda do kdr de Aracaju sem inseticida'
    });
    var anos = g01 ? g01 / gerAnos() : null;
    $('r3-volta-texto').innerHTML = (r3.achado ? 'Com o custo que acertou as gaiolas' : 'Com o custo atual (a curva das gaiolas ainda não acertou a F9)') +
      ', c = ' + num(usar.c, 3) + ' e ' + NOME_HC[String(usar.hc)] + ', o <i>kdr</i> de Aracaju cai de 0,617 para 0,10 em ' +
      (g01 ? '<strong>' + g01 + ' gerações</strong>: cerca de ' + num(anos, 1) + ' anos com ' + gerAnos() + ' gerações por ano (premissa da Rodada 2)' : 'mais de 5.000 gerações') +
      '. A subida, de 0,133 para 0,617, levou 6 anos (2006 a 2012). Seu palpite: ' + esc(r3.palpite.toLowerCase()) + '.';
    var cmp = $('r3-comparar-texto');
    cmp.hidden = !r3.comparar;
    if (r3.comparar) {
      cmp.innerHTML = resumoComparar.map(function (r) {
        return 'Se ' + r.rot + ' (c = ' + num(r.c, 3) + '): até 0,10 em ' + r.g01 + ' gerações; até 0,01 em ' + r.g001 + '.';
      }).join('<br>') + '<br>Quando só o RR paga, o R raro fica escondido nos heterozigotos, que não pagam nada: a descida trava no fim.';
    }
  }

  pergunta({ id: 'r3-q1', alvo: function () { return estado.r3.resp; }, chave: 'q1', certa: 'a', rotuloCerta: 'o custo',
    explicacao: 'Sem inseticida, a vantagem some e o custo aparece: quem tem <i>kdr</i> deixa menos descendentes. O inseticida não causa a mutação, e o mosquito não perde a resistência ao longo da vida: o que muda é a frequência do alelo na população, geração após geração.' });

  // ---------- Passo 5: heterozigoto ----------
  $('het-s').addEventListener('input', function () { estado.het.s = parseFloat(this.value); salvar(); renderPasso5(); });
  $('het-t').addEventListener('input', function () { estado.het.t = parseFloat(this.value); salvar(); renderPasso5(); });

  function renderPasso5() {
    var h = estado.het;
    $('het-s').value = h.s; $('het-s-valor').textContent = num(h.s, 2);
    $('het-t').value = h.t; $('het-t-valor').textContent = num(h.t, 2);
    var w = M.aptidoesHeterozigoto(h.s, h.t);
    var pe = M.equilibrioHeterozigoto(h.s, h.t);
    var t1 = M.trajetoria(0.05, w, 60), t2 = M.trajetoria(0.95, w, 60);
    var t5 = tamanho('het-grafico');
    $('het-grafico').innerHTML = G.linhas({
      largura: t5.largura, altura: t5.altura,
      x: { min: 0, max: 60, ticks: [0, 10, 20, 30, 40, 50, 60], rotulo: 'Geração' },
      y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], rotulo: 'Frequência de A1 (p)' },
      series: [
        { pontos: t1.map(function (p, g) { return [g, p]; }), classe: 'r', traco: 'cheio', rotulo: 'começa em 0,05', dy: 26 },
        { pontos: t2.map(function (p, g) { return [g, p]; }), classe: 's', traco: 'tracejado', rotulo: 'começa em 0,95' }
      ],
      refs: [{ y: pe, rotulo: 'p* = ' + num(pe, 3), lado: 'esquerda' }],
      descricao: 'Duas populações, começando em 0,05 e 0,95, chegam ao equilíbrio ' + num(pe, 3)
    });
    $('het-texto').innerHTML = 'Equilíbrio: <i>p</i>* = <i>t</i> / (<i>s</i> + <i>t</i>) = ' + num(h.t, 2) + ' / (' + num(h.s, 2) + ' + ' + num(h.t, 2) + ') = <strong>' +
      num(pe, 3) + '</strong>. Na geração 60, as duas populações estão em ' + num(t1[60], 3) + ' e ' + num(t2[60], 3) + '.';
  }

  pergunta({ id: 'het-q1', alvo: function () { return estado.het.resp; }, chave: 'q1', certa: 'a', rotuloCerta: 'vai para um valor intermediário e fica lá',
    explicacao: 'O A<sub>1</sub> sobe quando é raro (está quase todo nos heterozigotos, os mais aptos) e cai quando é comum (sobram muitos A<sub>1</sub>A<sub>1</sub>, menos aptos). As curvas se encontram em <i>p</i>* = <i>t</i> / (<i>s</i> + <i>t</i>): um equilíbrio estável, que mantém os dois alelos.' });

  // ---------- Cartões do estudo dirigido ----------
  document.querySelectorAll('.feito-ed').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-ed');
      estado.ed[k] = !estado.ed[k];
      salvar();
      renderTudo();
    });
  });

  function renderED() {
    document.querySelectorAll('.feito-ed').forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!estado.ed[b.getAttribute('data-ed')]));
    });
  }

  // ---------- Passo 6: blog ----------
  document.querySelectorAll('#blog-criterios button').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = parseInt(b.getAttribute('data-crit'), 10);
      estado.criterios[i] = !estado.criterios[i];
      salvar();
      renderTudo();
    });
  });

  function numerosDoDia() {
    var a = estado.r2.achados, linhas = [];
    if (a.AJU2006) linhas.push('Aracaju, 2006 a 2012: s ≈ ' + num(a.AJU2006.s, 3) + ' (' + NOME_H[String(a.AJU2006.h)] + ', ' + a.AJU2006.G + ' gerações por ano)');
    if (a.AJU2010) linhas.push('Aracaju, 2010 a 2012: s ≈ ' + num(a.AJU2010.s, 3) + ' (' + NOME_H[String(a.AJU2010.h)] + ', ' + a.AJU2010.G + ' gerações por ano)');
    if (a.VIT) linhas.push('Vitória, 2006 a 2010: s ≈ ' + num(a.VIT.s, 3));
    if (a.MSR) linhas.push('Mossoró, 2009 a 2011: s ≈ ' + num(a.MSR.s, 3));
    var r3 = estado.r3;
    if (r3.achado) {
      linhas.push('Custo nas gaiolas: c ≈ ' + num(r3.achado.c, 3) + ' (' + NOME_HC[String(r3.achado.hc)] + ')');
      var g = M.geracoesAte(D.SERIES.AJU.pontos[3].p, 0.10, M.aptidoesCusto(r3.achado.c, r3.achado.hc), 5000);
      if (g) linhas.push('Aracaju sem piretroide, de 0,617 a 0,10: ' + g + ' gerações, cerca de ' + num(g / gerAnos(), 1) + ' anos (' + gerAnos() + ' gerações por ano)');
    }
    if (estado.previsao.b) linhas.push('Sua previsão no início para a volta a 10%: ' + estado.previsao.b.toLowerCase());
    return linhas;
  }

  function renderPasso6() {
    var linhas = numerosDoDia();
    $('blog-numeros').innerHTML = linhas.length ? '<ul>' + linhas.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' :
      '<p class="suave">Seus números aparecem aqui depois das Rodadas 2 e 3.</p>';
    document.querySelectorAll('#blog-criterios button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(!!estado.criterios[parseInt(b.getAttribute('data-crit'), 10)]));
    });
  }

  // ---------- Passo 7: registro ----------
  function textoRegistro() {
    var e = estado, L = [];
    var agora = new Date();
    L.push('BIOC10 Genética II · Prática de 05/11/2026 · Fumacê e seleção');
    L.push('Nome: ' + (e.nome ? e.nome : '(não informado)'));
    L.push('Registro gerado em: ' + agora.toLocaleString('pt-BR'));
    L.push('');
    L.push('1. Previsões');
    L.push('a) Tipo de R que se espalha mais depressa quando raro: ' + (e.previsao.a || 'sem resposta'));
    L.push('b) Tempo para o kdr de Aracaju voltar a 10%: ' + (e.previsao.b || 'sem resposta'));
    L.push('');
    L.push('2. Rodada 1: com inseticida');
    L.push('Últimos valores: p0 = ' + num(e.r1.p0, 2) + '; s = ' + num(e.r1.s, 2) + '; ' + NOME_H[String(e.r1.h)]);
    L.push('2.1: ' + textoDaEscolha('r1-q1', e.r1.resp.q1));
    L.push('2.2: ' + textoDaEscolha('r1-q2', e.r1.resp.q2));
    L.push('2.3: ' + textoDaEscolha('r1-q3', e.r1.resp.q3));
    L.push('');
    L.push('3. Rodada 2: acerte a curva');
    var a = e.r2.achados;
    ['AJU2006', 'AJU2010', 'VIT', 'MSR'].forEach(function (k) {
      if (a[k]) L.push(rotuloAchado(k) + ': s = ' + num(a[k].s, 3) + ' (' + NOME_H[String(a[k].h)] + ', ' + a[k].G + ' gerações por ano)');
    });
    if (!Object.keys(a).length) L.push('Nenhuma curva acertou o ponto final.');
    L.push('3.1: ' + textoDaEscolha('r2-q1', e.r2.resp.q1));
    L.push('3.2: ' + textoDaEscolha('r2-q2', e.r2.resp.q2));
    L.push('3.3: ' + textoDaEscolha('r2-q3', e.r2.resp.q3));
    L.push('');
    L.push('4. Rodada 3: o fumacê para');
    if (e.r3.achado) {
      L.push('Custo nas gaiolas: c = ' + num(e.r3.achado.c, 3) + ' (' + NOME_HC[String(e.r3.achado.hc)] + ')');
      var g = M.geracoesAte(D.SERIES.AJU.pontos[3].p, 0.10, M.aptidoesCusto(e.r3.achado.c, e.r3.achado.hc), 5000);
      L.push('Aracaju de 0,617 a 0,10 sem piretroide: ' + (g ? g + ' gerações (cerca de ' + num(g / gerAnos(), 1) + ' anos)' : 'mais de 5.000 gerações'));
    } else {
      L.push('A curva das gaiolas não acertou a F9.');
    }
    L.push('Palpite de gerações: ' + (e.r3.palpite || 'sem resposta'));
    L.push('4.1: ' + textoDaEscolha('r3-q1', e.r3.resp.q1));
    L.push('');
    L.push('5. Heterozigoto mais apto');
    L.push('s = ' + num(e.het.s, 2) + '; t = ' + num(e.het.t, 2) + '; p* = ' + num(M.equilibrioHeterozigoto(e.het.s, e.het.t), 3));
    L.push('5.1: ' + textoDaEscolha('het-q1', e.het.resp.q1));
    L.push('');
    L.push('6. Estudo dirigido de 03/11');
    var feitas = ['q1', 'q2', 'q3', 'q4a'].filter(function (k) { return e.ed[k]; }).map(function (k) { return k.slice(1); });
    L.push('Questões marcadas como terminadas: ' + (feitas.length ? feitas.join(', ') : 'nenhuma'));
    L.push('Conferência do parágrafo da 4a: (1) ' + (e.criterios[0] ? 'sim' : 'não') + '; (2) ' + (e.criterios[1] ? 'sim' : 'não') + '; (3) ' + (e.criterios[2] ? 'sim' : 'não'));
    L.push('');
    L.push('Fontes: ' + D.FONTES.linss + '. ' + D.FONTES.smith + '.');
    return L.join('\n');
  }

  function renderRegistro() {
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
    a.download = 'registro_selecao_05nov' + (estado.nome ? '_' + estado.nome.trim().replace(/\s+/g, '_') : '') + '.txt';
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
          estado = estadoInicial(); estado.projecao = proj; salvar(); inicial(); ir('#passo-1'); renderTudo();
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
    estado.projecao = !estado.projecao; salvar(); aplicarProjecao();
  });
  function aplicarProjecao() {
    document.documentElement.classList.toggle('projecao', !!estado.projecao);
    $('botao-projecao').setAttribute('aria-pressed', String(!!estado.projecao));
  }

  // ---------- Tudo ----------
  function renderTudo() {
    renderPasso1();
    renderPasso2();
    renderPasso3();
    renderPasso4();
    renderPasso5();
    renderPasso6();
    renderPerguntas();
    renderED();
    renderRegistro();
    renderBarra();
  }

  var espera = null;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(renderTudo, 150);
  });

  aplicarProjecao();
  var inicio = TELAS.indexOf(location.hash) >= 0 ? location.hash : (estado.ultimoPasso || '#passo-1');
  if (location.hash !== inicio) history.replaceState(null, '', inicio);
  mostrarTela(inicio, false);
})();
