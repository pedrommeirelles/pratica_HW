// Modelo de seleção em um loco com dois alelos (R e S), gerações discretas,
// população grande (sem deriva), acasalamento ao acaso.
// Notação das aulas: p = frequência de R, q = 1 - p,
// w = aptidão relativa, w̄ = aptidão média, s = coeficiente de seleção.

var MODELO = (function () {
  'use strict';

  // Uma geração de seleção. w = { RR, RS, SS }.
  // p' = (p² w_RR + p q w_RS) / w̄, com w̄ = p² w_RR + 2pq w_RS + q² w_SS.
  function geracao(p, w) {
    var q = 1 - p;
    var antes = { RR: p * p, RS: 2 * p * q, SS: q * q };
    var contrib = {
      RR: antes.RR * w.RR,
      RS: antes.RS * w.RS,
      SS: antes.SS * w.SS
    };
    var wMedia = contrib.RR + contrib.RS + contrib.SS;
    var depois = {
      RR: contrib.RR / wMedia,
      RS: contrib.RS / wMedia,
      SS: contrib.SS / wMedia
    };
    var pNovo = (p * p * w.RR + p * q * w.RS) / wMedia;
    return { p: p, antes: antes, contrib: contrib, wMedia: wMedia, depois: depois, pNovo: pNovo };
  }

  function proximo(p, w) { return geracao(p, w).pNovo; }

  // Trajetória: vetor com p0 e as n gerações seguintes (n + 1 valores).
  function trajetoria(p0, w, n) {
    var lista = [p0];
    var p = p0;
    for (var i = 0; i < n; i++) {
      p = proximo(p, w);
      lista.push(p);
    }
    return lista;
  }

  // Com inseticida: R é o mais apto. h = dominância de R
  // (1: RS resiste como RR; 0,5: no meio; 0: RS sofre como SS).
  function aptidoesInseticida(s, h) {
    return { RR: 1, RS: 1 - (1 - h) * s, SS: 1 - s };
  }

  // Sem inseticida: R paga um custo c. hc = fração do custo que o heterozigoto paga
  // (0: só RR paga; 0,5: metade; 1: RS paga tanto quanto RR).
  function aptidoesCusto(c, hc) {
    return { RR: 1 - c, RS: 1 - hc * c, SS: 1 };
  }

  // Heterozigoto mais apto: w_RR = 1 - s, w_RS = 1, w_SS = 1 - t.
  function aptidoesHeterozigoto(s, t) {
    return { RR: 1 - s, RS: 1, SS: 1 - t };
  }

  // Equilíbrio estável com o heterozigoto mais apto: p* = t / (s + t).
  function equilibrioHeterozigoto(s, t) {
    if (s + t <= 0) return null;
    return t / (s + t);
  }

  // Primeira geração em que p cruza o alvo (subindo ou descendo). null se não cruzar.
  function geracoesAte(p0, alvo, w, max) {
    var limite = max || 5000;
    var p = p0;
    var sobe = alvo > p0;
    for (var g = 1; g <= limite; g++) {
      p = proximo(p, w);
      if (sobe ? p >= alvo : p <= alvo) return g;
    }
    return null;
  }

  // Segundo cálculo, independente da fórmula de p':
  // Δp = p q [p (w_RR - w_RS) + q (w_RS - w_SS)] / w̄ (fórmula geral para dois alelos).
  function deltaP(p, w) {
    var q = 1 - p;
    var wMedia = p * p * w.RR + 2 * p * q * w.RS + q * q * w.SS;
    return p * q * (p * (w.RR - w.RS) + q * (w.RS - w.SS)) / wMedia;
  }

  // Busca por bisseção do s que leva p0 a p1 em n gerações, com inseticida.
  // Usada só nos testes e no guia do docente (no aplicativo o estudante ajusta à mão).
  function ajustarS(p0, p1, n, h) {
    var lo = 0, hi = 0.999;
    for (var i = 0; i < 200; i++) {
      var m = (lo + hi) / 2;
      var t = trajetoria(p0, aptidoesInseticida(m, h), n);
      if (t[n] < p1) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  // Busca por bisseção do custo c que leva p0 a p1 (p1 < p0) em n gerações.
  function ajustarCusto(p0, p1, n, hc) {
    var lo = 0, hi = 0.999;
    for (var i = 0; i < 200; i++) {
      var m = (lo + hi) / 2;
      var t = trajetoria(p0, aptidoesCusto(m, hc), n);
      if (t[n] > p1) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }

  // Frequência de R a partir das frequências genotípicas da Tabela 3 de Linss et al. (2014).
  // R = R1 + R2; p(S) = SS + (SR1 + SR2) / 2.
  function pRdaTabela(linha) {
    var pS = linha.SS + (linha.SR1 + linha.SR2) / 2;
    return 1 - pS;
  }

  return {
    geracao: geracao,
    proximo: proximo,
    trajetoria: trajetoria,
    aptidoesInseticida: aptidoesInseticida,
    aptidoesCusto: aptidoesCusto,
    aptidoesHeterozigoto: aptidoesHeterozigoto,
    equilibrioHeterozigoto: equilibrioHeterozigoto,
    geracoesAte: geracoesAte,
    deltaP: deltaP,
    ajustarS: ajustarS,
    ajustarCusto: ajustarCusto,
    pRdaTabela: pRdaTabela
  };
})();

if (typeof module !== 'undefined') module.exports = MODELO; else window.MODELO = MODELO;
