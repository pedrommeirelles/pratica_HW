// Gerador semeável (mulberry32) e sorteio de gametas com reposição.

var SORTEIO = (function () {
  'use strict';

  // Semente aleatória de 32 bits.
  function sementeAleatoria() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] >>> 0;
    }
    return (Math.floor(Math.random() * 4294967296)) >>> 0;
  }

  // Gerador mulberry32. O estado interno pode ser lido e restaurado.
  function criarGerador(semente) {
    var estado = (semente === undefined ? sementeAleatoria() : semente) >>> 0;
    function proximo() {
      estado = (estado + 0x6D2B79F5) >>> 0;
      var t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      proximo: proximo,
      // Inteiro de 0 a n-1.
      inteiro: function (n) { return Math.floor(proximo() * n); },
      estado: function () { return estado; },
      restaurar: function (novo) { estado = novo >>> 0; }
    };
  }

  // Lista com os feijões do recipiente: s letras S e r letras R.
  function feijoes(recipiente) {
    var lista = [];
    var i;
    for (i = 0; i < recipiente.s; i++) lista.push('S');
    for (i = 0; i < recipiente.r; i++) lista.push('R');
    return lista;
  }

  // Embaralha uma cópia da lista (Fisher-Yates).
  function embaralhar(lista, gerador) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = gerador.inteiro(i + 1);
      var tmp = copia[i];
      copia[i] = copia[j];
      copia[j] = tmp;
    }
    return copia;
  }

  // Sorteia um feijão (com reposição). Devolve a letra e o índice.
  function sortearGameta(lista, gerador) {
    var indice = gerador.inteiro(lista.length);
    return { letra: lista[indice], indice: indice };
  }

  // Genótipo a partir de duas letras. SR e RS contam como SR.
  function genotipo(a, b) {
    if (a === b) return a + a;
    return 'SR';
  }

  // Um mosquito: dois gametas do mesmo recipiente.
  function sortearMosquito(lista, gerador) {
    var g1 = sortearGameta(lista, gerador);
    var g2 = sortearGameta(lista, gerador);
    return { gametas: [g1.letra, g2.letra], indices: [g1.indice, g2.indice], genotipo: genotipo(g1.letra, g2.letra) };
  }

  // Contagem de genótipos numa lista de mosquitos.
  function contar(mosquitos) {
    var c = { SS: 0, SR: 0, RR: 0 };
    mosquitos.forEach(function (m) {
      var g = typeof m === 'string' ? m : m.genotipo;
      c[g] += 1;
    });
    return c;
  }

  // Simula n mosquitos e devolve só as contagens.
  function simular(lista, n, gerador) {
    var c = { SS: 0, SR: 0, RR: 0 };
    for (var i = 0; i < n; i++) {
      c[sortearMosquito(lista, gerador).genotipo] += 1;
    }
    return c;
  }

  return {
    sementeAleatoria: sementeAleatoria,
    criarGerador: criarGerador,
    feijoes: feijoes,
    embaralhar: embaralhar,
    sortearGameta: sortearGameta,
    sortearMosquito: sortearMosquito,
    genotipo: genotipo,
    contar: contar,
    simular: simular
  };
})();

if (typeof module !== 'undefined') module.exports = SORTEIO; else window.SORTEIO = SORTEIO;
