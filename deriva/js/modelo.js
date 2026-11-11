// Modelo de deriva genética (Wright-Fisher) da prática de 12/11.
// N = número de micos que se reproduzem. A cada geração, a geração seguinte recebe
// 2N cópias do gene, sorteadas com reposição a partir das frequências da anterior.
// Hₑ = 1 − Σ pᵢ²; A = número de alelos com frequência maior que zero.
// Nₑ = 4 Nm Nf / (Nm + Nf); perda esperada por geração = 1 / (2 Nₑ).

var MODELO = (function () {
  'use strict';

  // Gerador pseudoaleatório com semente (mulberry32): a mesma semente dá a mesma
  // sequência em qualquer aparelho.
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

  // Semente própria de cada fragmento: o fragmento i tem a mesma história nas primeiras
  // gerações, rode a simulação por 30 ou por 200 gerações.
  function misturar(semente, i) {
    var h = ((semente >>> 0) ^ Math.imul((i + 1) >>> 0, 0x9E3779B1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Binomial(n, p) por inversão: soma as probabilidades P(X = 0), P(X = 1)... até passar
  // de um número sorteado. Usa um só número aleatório. Exata para n até 1000.
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

  // Um sorteio: 'copias' cópias, com reposição, a partir de 'freqs'.
  // Devolve quantas cópias de cada alelo saíram (multinomial; com dois alelos, binomial).
  // Até 1000 cópias: um binomial por alelo, condicionado ao que sobrou (rápido no celular).
  // Acima disso: uma cópia de cada vez. Um alelo com frequência zero nunca é sorteado.
  function sortearCopias(freqs, copias, rnd) {
    var k = freqs.length, cont = [], i;
    for (i = 0; i < k; i++) cont.push(0);
    var ultimo = -1;
    for (i = 0; i < k; i++) if (freqs[i] > 0) ultimo = i;
    if (ultimo < 0 || copias === 0) return cont;
    if (copias <= 1000) {
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
    var acum = [], soma = 0;
    for (i = 0; i < k; i++) { soma += freqs[i] > 0 ? freqs[i] : 0; acum.push(soma); }
    for (var n = 0; n < copias; n++) {
      var u = rnd() * soma, j = 0;
      while (j < ultimo && u >= acum[j]) j++;
      cont[j]++;
    }
    return cont;
  }

  // Uma geração de deriva com N micos que se reproduzem: novas frequências.
  function geracao(freqs, N, rnd) {
    var n2 = 2 * N;
    return sortearCopias(freqs, n2, rnd).map(function (c) { return c / n2; });
  }

  function heterozigosidade(freqs) {
    var s = 0;
    for (var i = 0; i < freqs.length; i++) s += freqs[i] * freqs[i];
    return 1 - s;
  }

  function numeroAlelos(freqs) {
    var n = 0;
    for (var i = 0; i < freqs.length; i++) if (freqs[i] > 0) n++;
    return n;
  }

  // ---------- Dois alelos (Passo 2) ----------

  // Cópias de A na geração 0: p0 × 2N arredondado, sem começar fixado nem perdido.
  function copiasIniciais(p0, N) {
    return Math.max(1, Math.min(2 * N - 1, Math.round(p0 * 2 * N)));
  }

  // Um fragmento: p e cópias de A da geração 0 até a geração 'geracoes'.
  function trajetoria(N, p0, geracoes, semente) {
    var rnd = gerador(semente), n2 = 2 * N;
    var k = copiasIniciais(p0, N), p = k / n2;
    var ps = [p], copias = [k];
    for (var g = 0; g < geracoes; g++) {
      k = sortearCopias([p, 1 - p], n2, rnd)[0];
      p = k / n2;
      ps.push(p);
      copias.push(k);
    }
    return { p: ps, copiasA: copias };
  }

  // Vários fragmentos independentes com os mesmos N e p0.
  function variosFragmentos(N, p0, fragmentos, geracoes, semente) {
    var trajs = [], f, g;
    for (f = 0; f < fragmentos; f++) trajs.push(trajetoria(N, p0, geracoes, misturar(semente, f)).p);
    var fixou = 0, perdeu = 0;
    for (f = 0; f < fragmentos; f++) {
      var fim = trajs[f][geracoes];
      if (fim === 1) fixou++; else if (fim === 0) perdeu++;
    }
    var media = [];
    for (g = 0; g <= geracoes; g++) {
      var s = 0;
      for (f = 0; f < fragmentos; f++) s += trajs[f][g];
      media.push(s / fragmentos);
    }
    return { trajetorias: trajs, fixou: fixou, perdeu: perdeu, ambos: fragmentos - fixou - perdeu, media: media, p0: trajs[0][0] };
  }

  // Sorteia gerações até A fixar ou sumir. Usada nos testes.
  function ateAbsorver(N, p0, rnd, maximo) {
    var n2 = 2 * N, p = copiasIniciais(p0, N) / n2, g = 0, lim = maximo || 100000;
    while (p > 0 && p < 1 && g < lim) {
      p = sortearCopias([p, 1 - p], n2, rnd)[0] / n2;
      g++;
    }
    return { fixou: p === 1, perdeu: p === 0, geracoes: g };
  }

  // ---------- Gargalo com recuperação (Passo 3) ----------

  // Micos que se reproduzem em cada geração: N0 antes (geração 0), Nb no surto
  // (geração 1) e, depois, o dobro a cada geração até voltar a N0, sem passar dele.
  function tamanhos(N0, Nb, t) {
    var lista = [N0, Nb];
    for (var i = 0; i < t; i++) lista.push(Math.min(N0, lista[lista.length - 1] * 2));
    return lista;
  }

  // Muitos fragmentos iguais passam pelo mesmo surto. Devolve as médias por geração
  // (alelos e Hₑ), a fração de fragmentos em que cada alelo sumiu e alguns exemplos.
  function gargalo(freqs0, N0, Nb, t, fragmentos, semente) {
    var Ns = tamanhos(N0, Nb, t), nG = Ns.length, k = freqs0.length;
    var somaA = [], somaH = [], sumiuLogo = [], sumiuFim = [], exemplos = [], i, g;
    for (g = 0; g < nG; g++) { somaA.push(0); somaH.push(0); }
    for (i = 0; i < k; i++) { sumiuLogo.push(0); sumiuFim.push(0); }
    var A0 = numeroAlelos(freqs0), H0 = heterozigosidade(freqs0);
    for (var f = 0; f < fragmentos; f++) {
      var rnd = gerador(misturar(semente, f));
      var fr = freqs0.slice(), logo = null;
      somaA[0] += A0; somaH[0] += H0;
      for (g = 1; g < nG; g++) {
        fr = geracao(fr, Ns[g], rnd);
        somaA[g] += numeroAlelos(fr);
        somaH[g] += heterozigosidade(fr);
        if (g === 1) logo = fr.slice();
      }
      for (i = 0; i < k; i++) {
        if (logo[i] === 0) sumiuLogo[i]++;
        if (fr[i] === 0) sumiuFim[i]++;
      }
      if (exemplos.length < 50) exemplos.push({ logo: logo, fim: fr.slice() });
    }
    function media(v) { return v.map(function (x) { return x / fragmentos; }); }
    return {
      tamanhos: Ns, A: media(somaA), H: media(somaH), A0: A0, H0: H0,
      sumiuLogo: media(sumiuLogo), sumiuFim: media(sumiuFim), exemplos: exemplos
    };
  }

  // Valores esperados logo depois de um sorteio de 2N cópias (segundo cálculo, sem simulação):
  // chance de cada alelo sumir = (1 − p)^2N; alelos esperados = Σ [1 − (1 − p)^2N];
  // Hₑ esperado = Hₑ (1 − 1/2N).
  function esperadoUmSorteio(freqs, N) {
    var perda = freqs.map(function (p) { return Math.pow(1 - p, 2 * N); });
    var A = 0;
    perda.forEach(function (x, i) { if (freqs[i] > 0) A += 1 - x; });
    return { perda: perda, A: A, H: heterozigosidade(freqs) * (1 - 1 / (2 * N)) };
  }

  // ---------- Tamanho efetivo (Passo 4) ----------

  function tamanhoEfetivo(Nm, Nf) { return 4 * Nm * Nf / (Nm + Nf); }
  function perdaPorGeracao(Ne) { return 1 / (2 * Ne); }
  function resta(Ne, t) { return Math.pow(1 - 1 / (2 * Ne), t); }

  // Queda relativa entre duas contagens (Passo 5).
  function queda(antes, depois) { return (antes - depois) / antes; }

  return {
    gerador: gerador,
    misturar: misturar,
    binomial: binomial,
    sortearCopias: sortearCopias,
    geracao: geracao,
    heterozigosidade: heterozigosidade,
    numeroAlelos: numeroAlelos,
    copiasIniciais: copiasIniciais,
    trajetoria: trajetoria,
    variosFragmentos: variosFragmentos,
    ateAbsorver: ateAbsorver,
    tamanhos: tamanhos,
    gargalo: gargalo,
    esperadoUmSorteio: esperadoUmSorteio,
    tamanhoEfetivo: tamanhoEfetivo,
    perdaPorGeracao: perdaPorGeracao,
    resta: resta,
    queda: queda
  };
})();

if (typeof module !== 'undefined') module.exports = MODELO; else window.MODELO = MODELO;
