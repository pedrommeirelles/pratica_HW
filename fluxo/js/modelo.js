// Modelo de fragmentos com fluxo gênico da prática de 19/11 (corredor ou translocação).
// K fragmentos de mata, cada um com N micos que se reproduzem, e um gene com seis alelos
// (microssatélite com frequências ilustrativas, as mesmas da prática de 12/11).
// A cada geração: (1) migração, se houver: uma fração m das cópias de cada fragmento passa
// a vir dos outros fragmentos, p' = (1 − m) p + m × (média dos outros fragmentos);
// (2) deriva: a geração seguinte recebe 2N cópias sorteadas com reposição (Wright-Fisher).
// Corredor: m = Nm / N em todas as gerações (Nm = migrantes que chegam e se reproduzem).
// Translocação: m = micos levados / N só nas gerações da translocação.
// Medidas, em média entre as réplicas: Hs = média de Hₑ = 1 − Σ pᵢ² dentro dos fragmentos;
// Ht = Hₑ das frequências médias; F = 1 − Hs / H₀ (endogamia dentro dos fragmentos, em
// relação ao início); FST = (Ht − Hs) / Ht (diferença entre os fragmentos).

var MODELO = (function () {
  'use strict';

  var FREQS0 = [0.40, 0.25, 0.15, 0.10, 0.06, 0.04];

  // Gerador pseudoaleatório com semente (mulberry32), o mesmo da prática de 12/11.
  function gerador(semente) {
    var a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function misturar(semente, i) {
    var h = ((semente >>> 0) ^ Math.imul((i + 1) >>> 0, 0x9E3779B1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Binomial(n, p) por inversão, com um só número aleatório.
  function binomial(n, p, rnd) {
    if (p <= 0 || n === 0) return 0;
    if (p >= 1) return n;
    if (p > 0.5) return n - binomial(n, 1 - p, rnd);
    var q = 1 - p, razao = p / q, f = Math.pow(q, n), acum = f, u = rnd(), x = 0;
    while (u > acum && x < n) {
      f *= razao * (n - x) / (x + 1);
      x++;
      acum += f;
    }
    return x;
  }

  // Multinomial: 'copias' cópias sorteadas com reposição a partir de 'freqs'.
  function sortearCopias(freqs, copias, rnd) {
    var k = freqs.length, cont = [], i;
    for (i = 0; i < k; i++) cont.push(0);
    var ultimo = -1;
    for (i = 0; i < k; i++) if (freqs[i] > 0) ultimo = i;
    if (ultimo < 0 || copias === 0) return cont;
    var depois = [], s = 0;
    for (i = k - 1; i >= 0; i--) { s += freqs[i] > 0 ? freqs[i] : 0; depois[i] = s; }
    var resto = copias;
    for (i = 0; i < ultimo && resto > 0; i++) {
      if (freqs[i] <= 0) continue;
      var c = binomial(resto, Math.min(1, freqs[i] / depois[i]), rnd);
      cont[i] = c;
      resto -= c;
    }
    cont[ultimo] += resto;
    return cont;
  }

  function heterozigosidade(freqs) {
    var s = 0;
    for (var i = 0; i < freqs.length; i++) s += freqs[i] * freqs[i];
    return 1 - s;
  }

  var H0 = heterozigosidade(FREQS0);

  // Fração de migrantes na geração g (g = 1, 2, ...).
  function fracaoMigrantes(op, g) {
    if (op.cenario === 'corredor') return Math.min(1, op.Nm / op.N);
    if (op.cenario === 'translocacao') {
      var t = op.tT, rep = op.repetir || 0;
      var acontece = g === t || (rep > 0 && g > t && (g - t) % rep === 0);
      return acontece ? Math.min(1, op.nT / op.N) : 0;
    }
    return 0;
  }

  // Simula o cenário 'op' e devolve as médias por geração (índice 0 a G).
  // op = { K, N, G, cenario: 'isolados' | 'corredor' | 'translocacao', Nm, tT, nT, repetir, R, semente }
  function simular(op) {
    var K = op.K, N = op.N, G = op.G, R = op.R || 200, n2 = 2 * N;
    var nA = FREQS0.length, g, k, i, r;
    var hs = [], ht = [], alelos = [];
    for (g = 0; g <= G; g++) { hs.push(0); ht.push(0); alelos.push(0); }
    for (r = 0; r < R; r++) {
      var rnd = gerador(misturar(op.semente || 1, r));
      var fr = [];
      for (k = 0; k < K; k++) fr.push(FREQS0.slice());
      for (g = 0; g <= G; g++) {
        if (g > 0) {
          var m = fracaoMigrantes(op, g);
          if (m > 0 && K > 1) {
            var soma = [];
            for (i = 0; i < nA; i++) { soma.push(0); for (k = 0; k < K; k++) soma[i] += fr[k][i]; }
            fr = fr.map(function (p) {
              return p.map(function (pi, j) { return (1 - m) * pi + m * (soma[j] - pi) / (K - 1); });
            });
          }
          fr = fr.map(function (p) { return sortearCopias(p, n2, rnd).map(function (c) { return c / n2; }); });
        }
        var hsg = 0, med = [], na = 0;
        for (i = 0; i < nA; i++) med.push(0);
        for (k = 0; k < K; k++) {
          hsg += heterozigosidade(fr[k]);
          for (i = 0; i < nA; i++) { med[i] += fr[k][i] / K; if (fr[k][i] > 0) na++; }
        }
        hs[g] += hsg / K;
        ht[g] += heterozigosidade(med);
        alelos[g] += na / K;
      }
    }
    var F = [], FST = [], A = [], HS = [], HT = [];
    // Arredondamento de máquina: na geração 0, F e FST dão −0,0000000000001 em vez de 0.
    function limpo(x) { return Math.abs(x) < 1e-12 ? 0 : x; }
    for (g = 0; g <= G; g++) {
      var a = hs[g] / R, b = ht[g] / R;
      HS.push(a); HT.push(b);
      F.push(limpo(1 - a / H0));
      FST.push(b > 0 ? limpo((b - a) / b) : 0);
      A.push(alelos[g] / R);
    }
    return { F: F, FST: FST, A: A, Hs: HS, Ht: HT, H0: H0, op: op };
  }

  // Gerações em que há translocação, de 1 a G.
  function geracoesTranslocacao(tT, repetir, G) {
    var lista = [];
    for (var g = tT; g <= G; g += (repetir > 0 ? repetir : G + 1)) lista.push(g);
    return lista;
  }

  // Teoria, para conferir: F sem migração, 1 − (1 − 1/2N)^t; FST de equilíbrio no modelo de
  // ilhas com K fragmentos (migrantes vindos dos outros K − 1): 1 / (1 + 4Nm (K/(K − 1))²).
  function Fteorico(N, t) { return 1 - Math.pow(1 - 1 / (2 * N), t); }
  function FSTilhas(Nm, K) { return K > 1 ? 1 / (1 + 4 * Nm * Math.pow(K / (K - 1), 2)) : 0; }

  return {
    FREQS0: FREQS0, H0: H0, gerador: gerador, misturar: misturar, binomial: binomial,
    sortearCopias: sortearCopias, heterozigosidade: heterozigosidade, fracaoMigrantes: fracaoMigrantes,
    simular: simular, geracoesTranslocacao: geracoesTranslocacao, Fteorico: Fteorico, FSTilhas: FSTilhas
  };
})();

if (typeof module !== 'undefined') module.exports = MODELO; else window.MODELO = MODELO;
