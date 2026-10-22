// Interface: passos, estado, sorteios e registro.

(function () {
  'use strict';

  var CHAVE = 'bioc10-hw-22out-v1';
  var META_R1 = 10;
  var META_POTE = 10;
  var SOMA_ENTREGA = 24;

  // ---------- Formatação ----------

  function num(x, casas) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(x);
  }
  function f1(x) { return num(x, 1); }
  function f2(x) { return num(x, 2); }
  function f3(x) { return num(x, 3); }
  function fValorP(p) { return p < 0.001 ? '< 0,001' : num(p, 3); }
  function fraseValorP(p) { return p < 0.001 ? 'valor-p < 0,001' : 'valor-p = ' + num(p, 3); }
  function inteiro(x) { return new Intl.NumberFormat('pt-BR').format(x); }

  function escapar(texto) {
    return String(texto).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function $(id) { return document.getElementById(id); }

  // ---------- Estado ----------

  function estadoInicial(semente) {
    return {
      versao: 1,
      semente: semente,
      geradorEstado: semente,
      nome: '',
      previsao: null,
      r1: { palpite: null, posicoes: null, pendentes: [], ultimoIndice: null, mosquitos: [], primeiros: [] },
      r2: {
        posA: null, posB: null,
        mosquitosA: [], mosquitosB: [], primeirosA: [], primeirosB: [],
        ultimoA: null, ultimoB: null, palpite: null, juntou: false
      },
      p4: { populacao: '', s1016: ['', '', ''], s1534: ['', '', ''] },
      p5: { seis: ['', '', '', '', '', ''] },
      registroSalvo: false,
      projecao: false,
      ultimoPasso: '#passo-1'
    };
  }

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      if (!bruto) return null;
      var obj = JSON.parse(bruto);
      if (!obj || obj.versao !== 1) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  function salvar() {
    try {
      estado.geradorEstado = gerador.estado();
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) {
      // Sem armazenamento disponível: a sessão segue só na memória.
    }
  }

  function sementeDaUrl() {
    try {
      var m = /[?&]semente=(\d+)/.exec(window.location.search);
      if (m) return (parseInt(m[1], 10) >>> 0);
    } catch (e) { /* ignora */ }
    return null;
  }

  var estado = carregar();
  var sementeUrl = sementeDaUrl();
  if (!estado) {
    estado = estadoInicial(sementeUrl === null ? SORTEIO.sementeAleatoria() : sementeUrl);
  } else if (sementeUrl !== null && estado.semente !== sementeUrl) {
    estado.semente = sementeUrl;
    estado.geradorEstado = sementeUrl;
  }
  var gerador = SORTEIO.criarGerador(estado.semente);
  gerador.restaurar(estado.geradorEstado);

  var FEIJOES_SACO = SORTEIO.feijoes(DADOS.SACO);
  var FEIJOES_A = SORTEIO.feijoes(DADOS.POTE_A);
  var FEIJOES_B = SORTEIO.feijoes(DADOS.POTE_B);

  if (!estado.r1.posicoes) estado.r1.posicoes = SORTEIO.embaralhar(FEIJOES_SACO, gerador);
  if (!estado.r2.posA) estado.r2.posA = SORTEIO.embaralhar(FEIJOES_A, gerador);
  if (!estado.r2.posB) estado.r2.posB = SORTEIO.embaralhar(FEIJOES_B, gerador);

  function pS(recipiente) { return recipiente.s / (recipiente.s + recipiente.r); }

  // ---------- Componentes de HTML ----------

  function svgMosquito() {
    return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
      '<ellipse cx="20" cy="23" rx="4" ry="11"/>' +
      '<circle cx="20" cy="9" r="3.2"/>' +
      '<ellipse cx="12.5" cy="19" rx="8" ry="3" transform="rotate(-35 12.5 19)" opacity="0.55"/>' +
      '<ellipse cx="27.5" cy="19" rx="8" ry="3" transform="rotate(35 27.5 19)" opacity="0.55"/>' +
      '<path d="M17 16 L7 10 M17 20 L5 22 M17 25 L8 34 M23 16 L33 10 M23 20 L35 22 M23 25 L32 34" ' +
      'fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>';
  }

  function feijao(letra, extra) {
    return '<span class="feijao ' + letra + (extra ? ' ' + extra : '') + '">' + letra + '</span>';
  }

  function cartaoMosquito(a, b) {
    var g = SORTEIO.genotipo(a, b);
    return '<span class="mosquito ' + g + '" aria-label="Mosquito ' + g + ', gametas ' + a + ' e ' + b + '">' +
      feijao(a, 'solto') + feijao(b, 'solto') + svgMosquito() + '<span class="gen">' + g + '</span></span>';
  }

  function renderGrade(id, posicoes, destaque) {
    var el = $(id);
    if (!el) return;
    if (el.childElementCount !== posicoes.length) {
      el.innerHTML = posicoes.map(function (l) { return feijao(l); }).join('');
    }
    var filhos = el.children;
    for (var i = 0; i < filhos.length; i++) {
      filhos[i].classList.toggle('sorteado', i === destaque);
    }
  }

  function tabelaDoisAlelos(r, rotulos) {
    var linhas = '';
    for (var i = 0; i < 3; i++) {
      linhas += '<tr><th scope="row">' + rotulos[i] + '</th>' +
        '<td class="num">' + inteiro(r.observados[i]) + '</td>' +
        '<td class="num">' + f2(r.esperados[i]) + '</td>' +
        '<td class="num">' + f3(r.parcelas[i]) + '</td></tr>';
    }
    return '<div class="tabela-rolagem"><table>' +
      '<thead><tr><th scope="col">Genótipo</th><th scope="col" class="num">Observado</th>' +
      '<th scope="col" class="num">Esperado</th><th scope="col" class="num">(O − E)² ÷ E</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody>' +
      '<tfoot><tr><td>Total</td><td class="num">' + inteiro(r.n) + '</td><td class="num">' + f2(r.n) + '</td>' +
      '<td class="num">χ² = ' + f2(r.qui2) + '</td></tr></tfoot></table></div>';
  }

  function barras(r, rotulos) {
    var html = '<div class="legenda-barras"><span class="obs"><i></i>Observado</span><span class="esp"><i></i>Esperado</span></div>' +
      '<div class="barras" role="img" aria-label="Barras de observado e esperado para cada genótipo">';
    for (var i = 0; i < 3; i++) {
      var po = r.observados[i] / r.n * 100;
      var pe = r.esperados[i] / r.n * 100;
      html += '<div class="rotulo">' + rotulos[i] + '</div><div>' +
        '<div class="barra-h obs"><span style="width:' + po.toFixed(1) + '%"></span></div>' +
        '<div class="valor">Observado ' + inteiro(r.observados[i]) + ' (' + f1(po) + '%)</div>' +
        '<div class="barra-h esp"><span style="width:' + pe.toFixed(1) + '%"></span></div>' +
        '<div class="valor">Esperado ' + f2(r.esperados[i]) + ' (' + f1(pe) + '%)</div></div>';
    }
    return html + '</div>';
  }

  function linhaQui(r, comGl) {
    return 'χ² = ' + f2(r.qui2) + '; ' + (comGl ? r.gl + (r.gl === 1 ? ' grau' : ' graus') + ' de liberdade; ' : '') +
      fraseValorP(r.valorP) + ': ' + r.conclusao + '.';
  }

  function linhaF(r) {
    return 'Ho = ' + f3(r.ho) + '; He = ' + f3(r.he) + '; F = ' + f2(r.f) + (r.direcao ? ': ' + r.direcao : '') + '.';
  }

  function alerta(r) {
    return r.alerta ? '<p class="aviso">' + r.alerta + '</p>' : '';
  }

  function contagens(mosquitos) {
    var c = SORTEIO.contar(mosquitos);
    return [c.SS, c.SR, c.RR];
  }

  // ---------- Navegação ----------

  var TELAS = ['#passo-1', '#passo-2', '#passo-3', '#passo-4', '#passo-5', '#passo-6', '#calculadora'];

  function idDaTela(hash) {
    return 'tela-' + hash.replace('#', '');
  }

  function mostrarTela(hash, focar) {
    if (TELAS.indexOf(hash) < 0) hash = '#passo-1';
    document.querySelectorAll('.tela').forEach(function (t) {
      t.classList.toggle('ativa', t.id === idDaTela(hash));
    });
    document.querySelectorAll('.barra a').forEach(function (a) {
      if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (hash !== '#calculadora') {
      estado.ultimoPasso = hash;
      salvar();
    }
    renderTudo();
    if (focar) {
      var h = document.querySelector('#' + idDaTela(hash) + ' h2');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: false });
      }
      window.scrollTo(0, 0);
    }
  }

  function ir(hash) {
    if (window.location.hash === hash) mostrarTela(hash, true);
    else window.location.hash = hash;
  }

  window.addEventListener('hashchange', function () {
    mostrarTela(window.location.hash, true);
  });

  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () { ir(b.getAttribute('data-ir')); });
  });

  // ---------- Barra de passos ----------

  function passoFeito(n) {
    switch (n) {
      case 1: return !!estado.previsao;
      case 2: return estado.r1.mosquitos.length >= META_R1;
      case 3: return estado.r2.juntou;
      case 4: return completo(estado.p4.s1016) && completo(estado.p4.s1534);
      case 5: return completo(estado.p5.seis);
      case 6: return estado.registroSalvo;
      default: return false;
    }
  }

  function renderBarra() {
    document.querySelectorAll('#lista-passos a').forEach(function (a) {
      var n = parseInt(a.getAttribute('data-passo'), 10);
      var feito = passoFeito(n);
      a.classList.toggle('feito', feito);
      var base = a.textContent.replace(/ \(concluído\)$/, '');
      a.setAttribute('aria-label', base + (feito ? ' (concluído)' : ''));
    });
  }

  // ---------- Recomeçar ----------

  function montarRecomecar(idContainer, acao) {
    var el = $(idContainer);
    if (!el) return;
    el.innerHTML = '<button type="button" class="pequeno recomecar">Recomeçar este passo</button>';
    el.querySelector('.recomecar').addEventListener('click', function () {
      el.innerHTML = '<div class="confirmacao"><span>Apagar o que você fez neste passo?</span>' +
        '<button type="button" class="pequeno sim">Sim, recomeçar</button>' +
        '<button type="button" class="pequeno nao">Cancelar</button></div>';
      el.querySelector('.sim').addEventListener('click', function () {
        acao();
        salvar();
        montarRecomecar(idContainer, acao);
        renderTudo();
        el.querySelector('.recomecar').focus();
      });
      el.querySelector('.nao').addEventListener('click', function () {
        montarRecomecar(idContainer, acao);
        el.querySelector('.recomecar').focus();
      });
      el.querySelector('.nao').focus();
    });
  }

  // ---------- Passo 1 ----------

  function renderPasso1() {
    document.querySelectorAll('#botoes-previsao button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-previsao') === estado.previsao));
    });
    $('eco-previsao').textContent = estado.previsao ? 'Sua previsão: ' + estado.previsao + '. Você vai conferir no Passo 4.' : '';
    if ($('campo-nome').value !== estado.nome) $('campo-nome').value = estado.nome;
  }

  document.querySelectorAll('#botoes-previsao button').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.previsao = b.getAttribute('data-previsao');
      salvar();
      renderTudo();
    });
  });

  $('campo-nome').addEventListener('input', function () {
    estado.nome = $('campo-nome').value;
    salvar();
    renderBarra();
  });

  montarRecomecar('recomecar-1', function () {
    estado.previsao = null;
    estado.nome = '';
  });

  // ---------- Passo 2: Rodada 1 ----------

  var ROTULOS_SR = ['SS', 'SR', 'RR'];
  var ultimoMarcoAnunciado = 0;

  function renderPasso2() {
    var r1 = estado.r1;
    var n = r1.mosquitos.length;

    document.querySelectorAll('#botoes-palpite-1 button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-palpite') === r1.palpite));
    });
    var msgPalpite = $('msg-palpite-1');
    if (r1.palpite) {
      msgPalpite.textContent = 'Você escolheu ' + r1.palpite + '. Com p perto de 0,5, o heterozigoto é o mais comum: 2pq = 0,50, contra 0,23 de SS e 0,27 de RR.';
      msgPalpite.hidden = false;
    } else {
      msgPalpite.hidden = true;
    }

    renderGrade('grade-saco', r1.posicoes, r1.ultimoIndice);

    var pend = $('pendentes-1');
    var a = r1.pendentes[0], b = r1.pendentes[1];
    pend.innerHTML = '<span class="suave pequeno">Gametas do mosquito atual:</span>' +
      (a ? feijao(a, 'solto') : '<span class="espaco-vazio"></span>') +
      (b ? feijao(b, 'solto') : '<span class="espaco-vazio"></span>') +
      (a ? '<span class="pequeno">Gameta 1: ' + a + (b ? ', gameta 2: ' + b : '') + '</span>' : '');

    if (n < META_R1) {
      $('contador-1').textContent = 'Mosquito ' + (n + 1) + ' de ' + META_R1;
    } else {
      $('contador-1').textContent = inteiro(n) + ' mosquitos sorteados';
    }

    $('botao-mais-90').hidden = !(n >= META_R1 && n < 100);
    $('botao-mais-900').hidden = !(n >= 100 && n < 1000);

    var lista = $('mosquitos-1');
    lista.innerHTML = r1.primeiros.map(function (par) { return cartaoMosquito(par[0], par[1]); }).join('');
    $('total-1').textContent = n > r1.primeiros.length
      ? 'Mostrando os ' + r1.primeiros.length + ' primeiros de ' + inteiro(n) + ' mosquitos.'
      : (n === 0 ? 'Nenhum mosquito ainda.' : '');

    var res = $('resultado-1');
    if (n < META_R1) {
      res.innerHTML = '';
      return;
    }
    var r = HW.testeDoisAlelos(contagens(r1.mosquitos));
    var html = '<h3>Resultado da Rodada 1 (' + inteiro(n) + ' mosquitos)</h3>';
    if (r.monomorfico) {
      html += '<p class="aviso">Todos os mosquitos têm o mesmo genótipo: não há o que testar. Sorteie mais.</p>';
      res.innerHTML = html;
      return;
    }
    html += tabelaDoisAlelos(r, ROTULOS_SR);
    html += '<p>p(S) do saco = ' + f3(pS(DADOS.SACO)) + '. p(S) da sua amostra = ' + f3(r.p) +
      '. O esperado usa o p da sua amostra, como num teste com dados reais.</p>';
    html += '<p><strong>' + linhaQui(r, false) + '</strong></p>';
    html += alerta(r);
    html += barras(r, ROTULOS_SR);
    if (r.rejeita) {
      html += '<p class="nota">Passou do limite por acaso: isso acontece em 5% das amostras em equilíbrio. Sorteie mais 90 e veja o que acontece.</p>';
    } else {
      html += '<p class="nota">O sorteio ao acaso produziu p², 2pq e q². Uma geração de união ao acaso de gametas basta.</p>';
    }
    res.innerHTML = html;
  }

  function sortearGametaR1() {
    var r1 = estado.r1;
    var g = SORTEIO.sortearGameta(r1.posicoes, gerador);
    r1.pendentes.push(g.letra);
    r1.ultimoIndice = g.indice;
    if (r1.pendentes.length === 2) {
      var par = r1.pendentes.slice();
      r1.mosquitos.push(SORTEIO.genotipo(par[0], par[1]));
      if (r1.primeiros.length < META_R1) r1.primeiros.push(par);
      r1.pendentes = [];
    }
    salvar();
    renderTudo();
    anunciarMarco(r1.mosquitos.length);
  }

  function sortearLoteR1(quantos) {
    var r1 = estado.r1;
    r1.pendentes = [];
    for (var i = 0; i < quantos; i++) {
      var m = SORTEIO.sortearMosquito(r1.posicoes, gerador);
      r1.mosquitos.push(m.genotipo);
      if (r1.primeiros.length < META_R1) r1.primeiros.push(m.gametas);
      r1.ultimoIndice = m.indices[1];
    }
    salvar();
    renderTudo();
    anunciarMarco(r1.mosquitos.length);
  }

  // Anúncio para leitores de tela só nos marcos (10, 100, 1000), nunca a cada sorteio.
  function anunciarMarco(n) {
    if (n !== 10 && n !== 100 && n !== 1000) return;
    if (ultimoMarcoAnunciado === n) return;
    ultimoMarcoAnunciado = n;
    var r = HW.testeDoisAlelos(contagens(estado.r1.mosquitos));
    var el = $('anuncio-1');
    if (!el) {
      el = document.createElement('p');
      el.id = 'anuncio-1';
      el.className = 'visualmente-oculto';
      el.setAttribute('aria-live', 'polite');
      $('resultado-1').parentNode.insertBefore(el, $('resultado-1'));
    }
    el.textContent = r && !r.monomorfico
      ? 'Resultado com ' + inteiro(n) + ' mosquitos: ' + linhaQui(r, false)
      : 'Resultado com ' + inteiro(n) + ' mosquitos.';
  }

  $('botao-sortear-1').addEventListener('click', sortearGametaR1);
  $('botao-mais-90').addEventListener('click', function () { sortearLoteR1(90); });
  $('botao-mais-900').addEventListener('click', function () { sortearLoteR1(900); });

  document.querySelectorAll('#botoes-palpite-1 button').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.r1.palpite = b.getAttribute('data-palpite');
      salvar();
      renderTudo();
    });
  });

  montarRecomecar('recomecar-2', function () {
    estado.r1 = { palpite: null, posicoes: estado.r1.posicoes, pendentes: [], ultimoIndice: null, mosquitos: [], primeiros: [] };
    ultimoMarcoAnunciado = 0;
    var el = $('anuncio-1');
    if (el) el.textContent = '';
  });

  // ---------- Passo 3: Rodada 2 ----------

  function renderPote(sufixo, mosquitos, primeiros, posicoes, ultimo) {
    renderGrade('grade-pote-' + sufixo, posicoes, ultimo);
    var n = mosquitos.length;
    $('contador-' + sufixo).textContent = n < META_POTE
      ? n + ' de ' + META_POTE + ' mosquitos'
      : inteiro(n) + ' mosquitos';
    $('mosquitos-' + sufixo).innerHTML = primeiros.map(function (par) { return cartaoMosquito(par[0], par[1]); }).join('');
    $('total-' + sufixo).textContent = n > primeiros.length
      ? 'Mostrando os ' + primeiros.length + ' primeiros de ' + inteiro(n) + '.'
      : '';
  }

  function renderPasso3() {
    var r2 = estado.r2;
    renderPote('a', r2.mosquitosA, r2.primeirosA, r2.posA, r2.ultimoA);
    renderPote('b', r2.mosquitosB, r2.primeirosB, r2.posB, r2.ultimoB);
    var nA = r2.mosquitosA.length, nB = r2.mosquitosB.length;
    var prontos = nA >= META_POTE && nB >= META_POTE;
    $('botao-mais-90-potes').hidden = !(prontos && nA < 100 && nB < 100);
    $('bloco-palpite-2').hidden = !prontos;
    document.querySelectorAll('#botoes-palpite-2 button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-palpite') === r2.palpite));
    });
    $('botao-juntar').disabled = !r2.palpite;
    $('botao-juntar').title = r2.palpite ? '' : 'Escolha uma das três opções para liberar o botão';

    var res = $('resultado-2');
    if (!r2.juntou || !prontos) {
      res.innerHTML = '';
      return;
    }
    var cA = contagens(r2.mosquitosA), cB = contagens(r2.mosquitosB);
    var junta = [cA[0] + cB[0], cA[1] + cB[1], cA[2] + cB[2]];
    var r = HW.testeDoisAlelos(junta);
    var rA = HW.testeDoisAlelos(cA), rB = HW.testeDoisAlelos(cB);
    var html = '<h3>Amostra junta (' + inteiro(r.n) + ' mosquitos)</h3>';
    if (r.monomorfico) {
      html += '<p class="aviso">Todos os mosquitos têm o mesmo genótipo: não há o que testar.</p>';
      res.innerHTML = html;
      return;
    }
    html += tabelaDoisAlelos(r, ROTULOS_SR);
    html += '<p>Heterozigotos observados: Ho = ' + f3(r.ho) + '. Esperados: He = 2pq = ' + f3(r.he) +
      '. F = 1 − Ho/He = ' + f2(r.f) + '.</p>';
    html += '<p><strong>' + linhaQui(r, false) + '</strong></p>';
    html += alerta(r);
    html += '<h3>Dentro de cada pote</h3><div class="tabela-rolagem"><table>' +
      '<thead><tr><th scope="col">Pote</th><th scope="col" class="num">n</th><th scope="col" class="num">p(S)</th>' +
      '<th scope="col" class="num">Ho</th><th scope="col" class="num">He</th></tr></thead><tbody>' +
      linhaPote('Pote A', rA) + linhaPote('Pote B', rB) + '</tbody></table></div>';
    html += '<p class="nota">Nenhum mosquito foi eliminado e ninguém cruzou com parente. Dentro de cada pote, Ho fica perto de He. ' +
      'Na amostra junta falta heterozigoto porque ela mistura duas populações com p diferente. É o efeito Wahlund, assunto da aula de 27/10.</p>';
    if (r2.palpite) {
      html += '<p>Antes de juntar, você previu que os heterozigotos iam <strong>' + r2.palpite + '</strong>.</p>';
    }
    res.innerHTML = html;
  }

  function linhaPote(nome, r) {
    if (!r) return '<tr><th scope="row">' + nome + '</th><td class="num">0</td><td></td><td></td><td></td></tr>';
    var ho = r.observados[1] / r.n;
    var he = 2 * r.p * r.q;
    return '<tr><th scope="row">' + nome + '</th><td class="num">' + inteiro(r.n) + '</td>' +
      '<td class="num">' + f3(r.p) + '</td><td class="num">' + f3(ho) + '</td><td class="num">' + f3(he) + '</td></tr>';
  }

  function sortearPote(qual, quantos) {
    var r2 = estado.r2;
    var pos = qual === 'A' ? r2.posA : r2.posB;
    var lista = qual === 'A' ? r2.mosquitosA : r2.mosquitosB;
    var primeiros = qual === 'A' ? r2.primeirosA : r2.primeirosB;
    var ultimo = null;
    for (var i = 0; i < quantos; i++) {
      var m = SORTEIO.sortearMosquito(pos, gerador);
      lista.push(m.genotipo);
      if (primeiros.length < META_POTE) primeiros.push(m.gametas);
      ultimo = m.indices[1];
    }
    if (qual === 'A') r2.ultimoA = ultimo; else r2.ultimoB = ultimo;
    r2.juntou = false;
    salvar();
    renderTudo();
  }

  $('botao-sortear-a').addEventListener('click', function () { sortearPote('A', 1); });
  $('botao-sortear-b').addEventListener('click', function () { sortearPote('B', 1); });
  $('botao-mais-90-potes').addEventListener('click', function () {
    sortearPote('A', 90);
    sortearPote('B', 90);
  });
  document.querySelectorAll('#botoes-palpite-2 button').forEach(function (b) {
    b.addEventListener('click', function () {
      estado.r2.palpite = b.getAttribute('data-palpite');
      salvar();
      renderTudo();
    });
  });
  $('botao-juntar').addEventListener('click', function () {
    estado.r2.juntou = true;
    salvar();
    renderTudo();
    var h = document.querySelector('#resultado-2 h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  });

  montarRecomecar('recomecar-3', function () {
    estado.r2 = {
      posA: estado.r2.posA, posB: estado.r2.posB,
      mosquitosA: [], mosquitosB: [], primeirosA: [], primeirosB: [],
      ultimoA: null, ultimoB: null, palpite: null, juntou: false
    };
  });

  // ---------- Passo 4: seu Aedes ----------

  function completo(valores) {
    return valores.every(function (v) { return v !== '' && v !== null && v !== undefined && !isNaN(Number(v)); });
  }

  function lerCampo(el) {
    var v = el.value.trim();
    if (v === '') return '';
    var n = Math.floor(Number(v));
    if (isNaN(n) || n < 0) return '';
    return n;
  }

  function somaDe(valores) {
    return valores.reduce(function (a, v) { return a + (Number(v) || 0); }, 0);
  }

  function populacaoEscolhida() {
    var cod = estado.p4.populacao;
    for (var i = 0; i < DADOS.POPULACOES.length; i++) {
      if (DADOS.POPULACOES[i].codigo === cod) return DADOS.POPULACOES[i];
    }
    return null;
  }

  function conclusaoArtigo(pop) {
    return pop.valorP < HW.ALFA ? 'rejeita o equilíbrio' : 'não rejeita o equilíbrio';
  }

  function textoArtigo(pop) {
    return 'n = ' + pop.n + '; χ² = ' + f1(pop.qui2) + '; ' + fraseValorP(pop.valorP) + ': ' + conclusaoArtigo(pop) + '.';
  }

  function resultadoSitio(valores, alelo, rotulos) {
    if (!completo(valores)) return { html: '<p class="suave pequeno">Preencha os três campos para ver o resultado.</p>', r: null };
    var r = HW.testeDoisAlelos(valores.map(Number));
    if (!r) return { html: '<p class="aviso">Todas as contagens são zero: não há o que testar.</p>', r: null };
    var html = '<p>p(' + alelo + ') = (2 × ' + inteiro(r.observados[0]) + ' + ' + inteiro(r.observados[1]) + ') ÷ ' +
      inteiro(2 * r.n) + ' = ' + f3(r.p) + '</p>';
    if (r.monomorfico) {
      html += '<p class="aviso">Todos os mosquitos têm o mesmo genótipo neste sítio: não há o que testar.</p>';
      return { html: html, r: r };
    }
    html += tabelaDoisAlelos(r, rotulos);
    html += '<p><strong>' + linhaQui(r, false) + '</strong></p>';
    html += '<p>' + linhaF(r) + '</p>';
    html += alerta(r);
    return { html: html, r: r };
  }

  var ROTULOS_1016 = ['Val/Val', 'Val/Ile', 'Ile/Ile'];
  var ROTULOS_1534 = ['Phe/Phe', 'Phe/Cys', 'Cys/Cys'];

  function renderPasso4() {
    var p4 = estado.p4;
    var sel = $('seletor-populacao');
    if (sel.value !== p4.populacao) sel.value = p4.populacao;
    document.querySelectorAll('#tela-passo-4 input[type="number"]').forEach(function (el) {
      var lista = el.getAttribute('data-sitio') === '1016' ? p4.s1016 : p4.s1534;
      var v = lista[Number(el.getAttribute('data-i'))];
      if (String(el.value) !== String(v)) el.value = v;
    });

    var r1016 = resultadoSitio(p4.s1016, 'Val', ROTULOS_1016);
    var r1534 = resultadoSitio(p4.s1534, 'Phe', ROTULOS_1534);
    $('resultado-1016').innerHTML = r1016.html;
    $('resultado-1534').innerHTML = r1534.html;

    var avisos = [];
    var c1016 = completo(p4.s1016), c1534 = completo(p4.s1534);
    var soma1016 = somaDe(p4.s1016), soma1534 = somaDe(p4.s1534);
    if ((c1016 && soma1016 !== SOMA_ENTREGA) || (c1534 && soma1534 !== SOMA_ENTREGA)) {
      var quais = [];
      if (c1016 && soma1016 !== SOMA_ENTREGA) quais.push('sítio 1016 soma ' + inteiro(soma1016));
      if (c1534 && soma1534 !== SOMA_ENTREGA) quais.push('sítio 1534 soma ' + inteiro(soma1534));
      avisos.push('Na Entrega 1, cada sítio soma 24. Confira a digitação (' + quais.join('; ') + ').');
    }
    if (c1016 && c1534 && soma1016 !== soma1534) {
      avisos.push('Os dois sítios têm somas diferentes (' + inteiro(soma1016) + ' e ' + inteiro(soma1534) +
        '). Cada mosquito tem os dois sítios: as somas deveriam ser iguais.');
    }
    $('avisos-4').innerHTML = avisos.map(function (a) { return '<p class="aviso">' + a + '</p>'; }).join('');

    var pop = populacaoEscolhida();
    $('quadro-artigo').hidden = !pop;
    if (pop) {
      $('texto-artigo').textContent = 'Linss et al. (2014), Tabela 3: ' + textoArtigo(pop) +
        ' O artigo testou o gene inteiro, com os alelos S, R1 e R2 (3 graus de liberdade), em 26 a 30 mosquitos. Compare conclusões, não números.';
    }

    var linha = $('linha-previsao-4');
    if (c1016 || c1534) {
      var partes = [];
      partes.push(estado.previsao ? 'Você previu: ' + estado.previsao + '.' : 'Você ainda não fez a previsão do Passo 1.');
      if (r1016.r) partes.push('Sítio 1016: ' + conclusaoCurta(r1016.r) + '.');
      if (r1534.r) partes.push('Sítio 1534: ' + conclusaoCurta(r1534.r) + '.');
      linha.textContent = partes.join(' ');
      linha.hidden = false;
    } else {
      linha.hidden = true;
    }
  }

  function conclusaoCurta(r) {
    if (!r) return 'não feito';
    if (r.monomorfico) return 'monomórfico, sem teste';
    return r.conclusao;
  }

  (function montarSeletor() {
    var sel = $('seletor-populacao');
    DADOS.POPULACOES.forEach(function (p) {
      var op = document.createElement('option');
      op.value = p.codigo;
      op.textContent = p.rotulo;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () {
      estado.p4.populacao = sel.value;
      salvar();
      renderTudo();
    });
  })();

  document.querySelectorAll('#tela-passo-4 input[type="number"]').forEach(function (el) {
    el.addEventListener('input', function () {
      var lista = el.getAttribute('data-sitio') === '1016' ? estado.p4.s1016 : estado.p4.s1534;
      lista[Number(el.getAttribute('data-i'))] = lerCampo(el);
      salvar();
      renderSemCampos4();
    });
  });

  // Enquanto o estudante digita, não reescrever o campo que está em foco.
  function renderSemCampos4() {
    renderBarra();
    renderPasso4();
    renderPasso5();
    renderPasso6();
  }

  montarRecomecar('recomecar-4', function () {
    estado.p4 = { populacao: '', s1016: ['', '', ''], s1534: ['', '', ''] };
  });

  // ---------- Passo 5: gene ----------

  function renderPasso5() {
    var seis = estado.p5.seis;
    document.querySelectorAll('#tela-passo-5 input[type="number"]').forEach(function (el) {
      var v = seis[Number(el.getAttribute('data-gene'))];
      if (String(el.value) !== String(v)) el.value = v;
    });

    var conf = $('conferencia-5');
    var p4 = estado.p4;
    if (completo(seis) && completo(p4.s1016) && completo(p4.s1534)) {
      var s = HW.sitiosDoGene(seis.map(Number));
      var bate = s.s1016.join(',') === p4.s1016.map(Number).join(',') &&
        s.s1534.join(',') === p4.s1534.map(Number).join(',');
      conf.textContent = 'As seis contagens batem com as do gel? ' + (bate ? 'sim' : 'não: confira a leitura ou a digitação');
      conf.className = bate ? 'nota' : 'aviso';
    } else {
      conf.textContent = '';
      conf.className = '';
    }

    var res = $('resultado-5');
    if (!completo(seis)) {
      res.innerHTML = '<p class="suave pequeno">Preencha os seis campos para ver o resultado.</p>';
      return;
    }
    var r = HW.testeTresAlelos(seis.map(Number));
    if (!r) {
      res.innerHTML = '<p class="aviso">Todas as contagens são zero: não há o que testar.</p>';
      return;
    }
    var html = '<p>Frequências: f(S) = ' + f3(r.frequencias[0]) + '; f(R1) = ' + f3(r.frequencias[1]) +
      '; f(R2) = ' + f3(r.frequencias[2]) + '. n = ' + inteiro(r.n) + '.</p>';
    if (r.monomorfico) {
      html += '<p class="aviso">Só um alelo aparece na amostra: não há o que testar.</p>';
      res.innerHTML = html;
      return;
    }
    var linhas = '';
    for (var i = 0; i < 6; i++) {
      linhas += '<tr><th scope="row">' + r.classes[i] + '</th><td class="num">' + inteiro(r.observados[i]) + '</td>' +
        '<td class="num">' + f2(r.esperados[i]) + '</td>' +
        '<td class="num">' + (r.parcelas[i] === null ? 'fora da soma' : f3(r.parcelas[i])) + '</td></tr>';
    }
    html += '<div class="tabela-rolagem"><table><thead><tr><th scope="col">Genótipo</th><th scope="col" class="num">Observado</th>' +
      '<th scope="col" class="num">Esperado</th><th scope="col" class="num">(O − E)² ÷ E</th></tr></thead><tbody>' + linhas +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + inteiro(r.n) + '</td><td class="num">' + f2(r.n) + '</td>' +
      '<td class="num">χ² = ' + f2(r.qui2) + '</td></tr></tfoot></table></div>';
    html += '<p><strong>' + linhaQui(r, true) + '</strong></p>';
    html += '<p>' + linhaF(r) + '</p>';
    html += alerta(r);
    var pop = populacaoEscolhida();
    if (pop) {
      var concorda = r.rejeita === (pop.valorP < HW.ALFA);
      html += '<p>O artigo: ' + textoArtigo(pop) + ' Você e o artigo concordam? <strong>' + (concorda ? 'sim' : 'não') + '</strong>.</p>';
    } else {
      html += '<p class="suave">Escolha a sua população no Passo 4 para comparar com o artigo.</p>';
    }
    res.innerHTML = html;
  }

  document.querySelectorAll('#tela-passo-5 input[type="number"]').forEach(function (el) {
    el.addEventListener('input', function () {
      estado.p5.seis[Number(el.getAttribute('data-gene'))] = lerCampo(el);
      salvar();
      renderBarra();
      renderPasso5();
      renderPasso6();
    });
  });

  montarRecomecar('recomecar-5', function () {
    estado.p5 = { seis: ['', '', '', '', '', ''] };
  });

  // ---------- Passo 6: registro ----------

  function dataHoraAgora() {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date()).replace(',', '');
    } catch (e) {
      return new Date().toLocaleString();
    }
  }

  function textoRegistro() {
    var L = [];
    L.push('BIOC10 Genética II · Prática de 22/10/2026 · Meu registro');
    L.push('Nome: ' + (estado.nome.trim() || '(em branco se não informado)'));
    L.push('Gerado em: ' + dataHoraAgora());
    L.push('');
    L.push('1. Previsão: ' + (estado.previsao || 'não feito'));

    var r1 = estado.r1;
    if (r1.mosquitos.length >= META_R1) {
      var c = contagens(r1.mosquitos);
      var r = HW.testeDoisAlelos(c);
      var t = '2. Rodada 1 (saco de Vitória 2006, p(S) = ' + f3(pS(DADOS.SACO)) + '): ' + inteiro(r.n) + ' mosquitos; SS ' +
        inteiro(c[0]) + ', SR ' + inteiro(c[1]) + ', RR ' + inteiro(c[2]) + '; p(S) da amostra = ' + f3(r.p);
      if (r.monomorfico) t += '; sem teste (amostra monomórfica).';
      else t += '; ' + linhaQui(r, false);
      t += ' Esperava ver mais: ' + (r1.palpite || 'não respondi') + '.';
      L.push(t);
    } else {
      L.push('2. Rodada 1: não feito');
    }

    var r2 = estado.r2;
    if (r2.juntou && r2.mosquitosA.length >= META_POTE && r2.mosquitosB.length >= META_POTE) {
      var cA = contagens(r2.mosquitosA), cB = contagens(r2.mosquitosB);
      var rj = HW.testeDoisAlelos([cA[0] + cB[0], cA[1] + cB[1], cA[2] + cB[2]]);
      var t2 = '3. Rodada 2: pote A ' + inteiro(r2.mosquitosA.length) + ' mosquitos (SS ' + inteiro(cA[0]) + ', SR ' + inteiro(cA[1]) + ', RR ' + inteiro(cA[2]) +
        '); pote B ' + inteiro(r2.mosquitosB.length) + ' (SS ' + inteiro(cB[0]) + ', SR ' + inteiro(cB[1]) + ', RR ' + inteiro(cB[2]) + '). Amostra junta: ';
      if (rj.monomorfico) t2 += 'sem teste (amostra monomórfica).';
      else t2 += 'Ho = ' + f3(rj.ho) + '; He = ' + f3(rj.he) + '; F = ' + f2(rj.f) + '; ' + linhaQui(rj, false);
      t2 += ' Antes de juntar, previ: ' + (r2.palpite || 'não respondi') + '.';
      L.push(t2);
    } else {
      L.push('3. Rodada 2: não feito');
    }

    var p4 = estado.p4;
    var pop = populacaoEscolhida();
    var c1016 = completo(p4.s1016), c1534 = completo(p4.s1534);
    if (pop || c1016 || c1534) {
      L.push('4. População: ' + (pop ? pop.rotulo : 'não escolhida') + '.');
      L.push('   Sítio 1016: ' + linhaSitio(p4.s1016, ROTULOS_1016, 'Val'));
      L.push('   Sítio 1534: ' + linhaSitio(p4.s1534, ROTULOS_1534, 'Phe'));
      if (pop) L.push('   Artigo (gene, 3 gl): ' + textoArtigo(pop));
    } else {
      L.push('4. Seu Aedes: não feito');
    }

    var seis = estado.p5.seis;
    if (completo(seis)) {
      var rg = HW.testeTresAlelos(seis.map(Number));
      var t5 = '5. Gene (extra): ' + HW.CLASSES_GENE.map(function (cl, i) { return cl + ' ' + inteiro(seis[i]); }).join(', ') + '; ';
      if (!rg) t5 += 'sem teste (contagens zero).';
      else if (rg.monomorfico) t5 += 'sem teste (um alelo só).';
      else {
        t5 += 'χ² = ' + f2(rg.qui2) + '; gl = ' + rg.gl + '; ' + fraseValorP(rg.valorP) + ': ' + rg.conclusao + '.';
        if (pop) t5 += ' Concorda com o artigo: ' + (rg.rejeita === (pop.valorP < HW.ALFA) ? 'sim' : 'não') + '.';
      }
      L.push(t5);
    } else {
      L.push('5. Gene (extra): não feito');
    }
    return L.join('\n');
  }

  function linhaSitio(valores, rotulos, alelo) {
    if (!completo(valores)) return 'não feito';
    var r = HW.testeDoisAlelos(valores.map(Number));
    var t = rotulos.map(function (ro, i) { return ro + ' ' + inteiro(valores[i]); }).join(', ') + ';';
    if (!r) return t + ' contagens zero.';
    t += ' p(' + alelo + ') = ' + f3(r.p) + ';';
    if (r.monomorfico) return t + ' monomórfico, sem teste.';
    return t + ' ' + linhaQui(r, false).replace(/\.$/, '') + '; F = ' + f2(r.f) + '.';
  }

  function renderPasso6() {
    $('texto-registro').textContent = textoRegistro();
    var link = $('link-moodle');
    if (DADOS.MOODLE_URL) {
      link.href = DADOS.MOODLE_URL;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  }

  function avisarRegistro(msg) {
    $('msg-registro').textContent = msg;
  }

  function marcarRegistro() {
    estado.registroSalvo = true;
    salvar();
    renderBarra();
  }

  $('botao-copiar').addEventListener('click', function () {
    var texto = textoRegistro();
    $('texto-registro').textContent = texto;
    function alternativa() {
      try {
        var pre = $('texto-registro');
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
        var ok = document.execCommand && document.execCommand('copy');
        avisarRegistro(ok ? 'Registro copiado.' : 'O texto está selecionado: copie com Ctrl+C ou Cmd+C.');
        if (ok) marcarRegistro();
      } catch (e) {
        avisarRegistro('Não foi possível copiar. Selecione o texto e copie com Ctrl+C ou Cmd+C.');
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        avisarRegistro('Registro copiado.');
        marcarRegistro();
      }, alternativa);
    } else {
      alternativa();
    }
  });

  $('botao-baixar').addEventListener('click', function () {
    try {
      var texto = textoRegistro();
      var blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'registro-hw-22out.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      avisarRegistro('Arquivo registro-hw-22out.txt gerado.');
      marcarRegistro();
    } catch (e) {
      avisarRegistro('Não foi possível baixar. Use o botão Copiar.');
    }
  });

  $('botao-imprimir').addEventListener('click', function () {
    renderPasso6();
    try { window.print(); } catch (e) { avisarRegistro('Não foi possível abrir a impressão.'); }
  });

  // ---------- Calculadora ----------

  var calc = ['', '', ''];

  function renderCalc() {
    var res = $('resultado-calc');
    if (!completo(calc)) {
      res.innerHTML = '<p class="suave pequeno">Preencha os três campos para ver o resultado.</p>';
      return;
    }
    var r = HW.testeDoisAlelos(calc.map(Number));
    if (!r) {
      res.innerHTML = '<p class="aviso">Todas as contagens são zero: não há o que testar.</p>';
      return;
    }
    var html = '<p>N = ' + inteiro(r.n) + '. p(A1) = (2 × ' + inteiro(r.observados[0]) + ' + ' + inteiro(r.observados[1]) + ') ÷ ' +
      inteiro(2 * r.n) + ' = ' + f3(r.p) + '; q(A2) = 1 − p = ' + f3(r.q) + '.</p>';
    if (r.monomorfico) {
      html += '<p class="aviso">Só um alelo aparece na amostra: não há o que testar.</p>';
      res.innerHTML = html;
      return;
    }
    html += tabelaDoisAlelos(r, ['A1A1', 'A1A2', 'A2A2']);
    html += '<p><strong>' + linhaQui(r, true) + '</strong></p>';
    html += '<p>' + linhaF(r) + '</p>';
    html += alerta(r);
    res.innerHTML = html;
  }

  document.querySelectorAll('#tela-calculadora input[type="number"]').forEach(function (el) {
    el.addEventListener('input', function () {
      calc[Number(el.getAttribute('data-calc'))] = lerCampo(el);
      renderCalc();
    });
  });

  $('botao-limpar-calc').addEventListener('click', function () {
    calc = ['', '', ''];
    document.querySelectorAll('#tela-calculadora input[type="number"]').forEach(function (el) { el.value = ''; });
    renderCalc();
    $('calc-0').focus();
  });

  $('botao-voltar-calc').addEventListener('click', function () {
    ir(estado.ultimoPasso || '#passo-1');
  });

  // ---------- Modo projeção ----------

  function renderProjecao() {
    document.documentElement.classList.toggle('projecao', !!estado.projecao);
    $('botao-projecao').setAttribute('aria-pressed', String(!!estado.projecao));
  }

  $('botao-projecao').addEventListener('click', function () {
    estado.projecao = !estado.projecao;
    salvar();
    renderProjecao();
  });

  // ---------- Render geral ----------

  function renderTudo() {
    renderBarra();
    renderPasso1();
    renderPasso2();
    renderPasso3();
    renderPasso4();
    renderPasso5();
    renderPasso6();
    renderCalc();
    renderProjecao();
  }

  // ---------- Início ----------

  salvar();
  var hashInicial = window.location.hash;
  if (TELAS.indexOf(hashInicial) < 0) {
    hashInicial = estado.ultimoPasso || '#passo-1';
    try {
      window.history.replaceState(null, '', hashInicial);
    } catch (e) { /* ignora */ }
  }
  mostrarTela(hashInicial, false);
})();
