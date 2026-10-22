// Estatística do equilíbrio de Hardy-Weinberg. Sem DOM.

var HW = (function () {
  'use strict';

  var ALFA = 0.05;

  // Função erro complementar (Numerical Recipes, erfcc).
  // Erro relativo menor que 1,2 x 10^-7.
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }

  // Valor-p da distribuição qui-quadrado com 1 ou 3 graus de liberdade.
  function valorP(x, gl) {
    if (x < 0) x = 0;
    if (gl === 1) return erfc(Math.sqrt(x / 2));
    if (gl === 3) return erfc(Math.sqrt(x / 2)) + Math.sqrt(2 * x / Math.PI) * Math.exp(-x / 2);
    throw new Error('Graus de liberdade sem suporte: ' + gl);
  }

  function conclusaoDe(p) {
    return p < ALFA ? 'rejeita o equilíbrio' : 'não rejeita o equilíbrio';
  }

  function direcaoDe(f, rejeita) {
    if (!(f > 0) && !(f < 0)) return '';
    var texto = f > 0 ? 'falta de heterozigotos' : 'excesso de heterozigotos';
    if (!rejeita) texto += ' (só tendência)';
    return texto;
  }

  function alertaDe(menorEsperado) {
    if (menorEsperado < 1) return 'Esperado abaixo de 1: o χ² fica inflado.';
    if (menorEsperado < 5) return 'Esperado abaixo de 5: o χ² fica aproximado; trate valor-p perto de 0,05 com cautela.';
    return '';
  }

  // Teste de dois alelos: contagens [AA, Aa, aa].
  function testeDoisAlelos(contagens) {
    var AA = Number(contagens[0]) || 0;
    var Aa = Number(contagens[1]) || 0;
    var aa = Number(contagens[2]) || 0;
    var n = AA + Aa + aa;
    if (n === 0) return null;
    var p = (2 * AA + Aa) / (2 * n);
    var q = 1 - p;
    var base = { n: n, p: p, q: q, observados: [AA, Aa, aa], gl: 1 };
    if (p === 0 || p === 1) {
      base.monomorfico = true;
      return base;
    }
    var esperados = [n * p * p, 2 * n * p * q, n * q * q];
    var parcelas = esperados.map(function (e, i) {
      return (base.observados[i] - e) * (base.observados[i] - e) / e;
    });
    var qui2 = parcelas.reduce(function (a, b) { return a + b; }, 0);
    var pv = valorP(qui2, 1);
    var ho = Aa / n;
    var he = 2 * p * q;
    var f = 1 - ho / he;
    var menor = Math.min.apply(null, esperados);
    base.monomorfico = false;
    base.esperados = esperados;
    base.parcelas = parcelas;
    base.qui2 = qui2;
    base.valorP = pv;
    base.ho = ho;
    base.he = he;
    base.f = f;
    base.rejeita = pv < ALFA;
    base.conclusao = conclusaoDe(pv);
    base.direcao = direcaoDe(f, base.rejeita);
    base.menorEsperado = menor;
    base.alerta = alertaDe(menor);
    return base;
  }

  // Teste do gene com três alelos: contagens [SS, SR1, SR2, R1R1, R1R2, R2R2].
  var CLASSES_GENE = ['SS', 'SR1', 'SR2', 'R1R1', 'R1R2', 'R2R2'];
  var ALELOS_GENE = ['S', 'R1', 'R2'];
  // Pares de alelos de cada classe (índices em ALELOS_GENE).
  var PARES_GENE = [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2], [2, 2]];

  function testeTresAlelos(contagens) {
    var obs = [];
    var n = 0;
    for (var i = 0; i < 6; i++) {
      obs[i] = Number(contagens[i]) || 0;
      n += obs[i];
    }
    if (n === 0) return null;
    var freq = [0, 0, 0];
    PARES_GENE.forEach(function (par, i) {
      freq[par[0]] += obs[i];
      freq[par[1]] += obs[i];
    });
    freq = freq.map(function (c) { return c / (2 * n); });
    var presentes = freq.filter(function (fr) { return fr > 0; }).length;
    var base = {
      n: n,
      classes: CLASSES_GENE,
      alelos: ALELOS_GENE,
      frequencias: freq,
      observados: obs,
      alelosPresentes: presentes
    };
    if (presentes < 2) {
      base.monomorfico = true;
      return base;
    }
    var esperados = PARES_GENE.map(function (par) {
      if (par[0] === par[1]) return n * freq[par[0]] * freq[par[0]];
      return 2 * n * freq[par[0]] * freq[par[1]];
    });
    var parcelas = esperados.map(function (e, i) {
      if (e === 0) return null;
      return (obs[i] - e) * (obs[i] - e) / e;
    });
    var qui2 = 0;
    var menor = Infinity;
    parcelas.forEach(function (pc, i) {
      if (pc === null) return;
      qui2 += pc;
      if (esperados[i] < menor) menor = esperados[i];
    });
    var gl = presentes * (presentes - 1) / 2;
    var pv = valorP(qui2, gl);
    var ho = (obs[1] + obs[2] + obs[4]) / n;
    var he = 1 - freq.reduce(function (a, fr) { return a + fr * fr; }, 0);
    var f = 1 - ho / he;
    base.monomorfico = false;
    base.esperados = esperados;
    base.parcelas = parcelas;
    base.qui2 = qui2;
    base.gl = gl;
    base.valorP = pv;
    base.ho = ho;
    base.he = he;
    base.f = f;
    base.rejeita = pv < ALFA;
    base.conclusao = conclusaoDe(pv);
    base.direcao = direcaoDe(f, base.rejeita);
    base.menorEsperado = menor;
    base.alerta = alertaDe(menor);
    return base;
  }

  // Genótipos de cada sítio a partir das seis classes do gene.
  function sitiosDoGene(seis) {
    var c = [];
    for (var i = 0; i < 6; i++) c[i] = Number(seis[i]) || 0;
    var SS = c[0], SR1 = c[1], SR2 = c[2], R1R1 = c[3], R1R2 = c[4], R2R2 = c[5];
    return {
      s1016: [SS + SR1 + R1R1, SR2 + R1R2, R2R2],
      s1534: [SS, SR1 + SR2, R1R1 + R1R2 + R2R2]
    };
  }

  return {
    ALFA: ALFA,
    erfc: erfc,
    valorP: valorP,
    testeDoisAlelos: testeDoisAlelos,
    testeTresAlelos: testeTresAlelos,
    sitiosDoGene: sitiosDoGene,
    CLASSES_GENE: CLASSES_GENE,
    ALELOS_GENE: ALELOS_GENE
  };
})();

if (typeof module !== 'undefined') module.exports = HW; else window.HW = HW;
