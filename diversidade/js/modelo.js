// Contas da prática de diversidade genética: alelos por loco, alelos raros e privados, rarefação,
// locos polimórficos, heterozigosidade observada e esperada e F_IS, a partir dos genótipos das onças.
// Funciona no navegador (window.MODELO) e no Node (testes).

(function (raiz) {
  'use strict';

  var D = raiz.DADOS;

  // Genótipos completos de um fragmento num loco (sem resultado e incompletos ficam de fora, como no artigo).
  function tipados(frag, li) {
    var lista = [];
    D.oncas.forEach(function (o) {
      if (o.pop !== frag) return;
      var g = o.g[li];
      if (g && g[0] !== '?' && g[1] !== '?') lista.push(g);
    });
    return lista;
  }

  function contagem(gs) {
    var c = {};
    gs.forEach(function (g) { c[g[0]] = (c[g[0]] || 0) + 1; c[g[1]] = (c[g[1]] || 0) + 1; });
    return c;
  }

  // Chance de um alelo com k cópias aparecer numa subamostra de g cópias, de N (sem reposição).
  function chanceDeAparecer(N, k, g) {
    if (k <= 0) return 0;
    if (N - k < g) return 1;
    var falta = 1;
    for (var i = 0; i < g; i++) falta *= (N - k - i) / (N - i);
    return 1 - falta;
  }

  // Rarefação (El Mousadik e Petit 1996): número esperado de alelos numa amostra de g cópias.
  function rarefacao(c, N, g) {
    var s = 0;
    Object.keys(c).forEach(function (a) { s += chanceDeAparecer(N, c[a], g); });
    return s;
  }

  var cacheLoco = {};
  function porLoco(frag, li) {
    var chave = frag + '|' + li;
    if (cacheLoco[chave]) return cacheLoco[chave];
    var gs = tipados(frag, li), n = gs.length, N = 2 * n, c = contagem(gs);
    var alelos = Object.keys(c).map(Number).sort(function (a, b) { return a - b; });
    var outros = {};
    D.fragmentos.forEach(function (q) {
      if (q === frag) return;
      tipados(q, li).forEach(function (g) { outros[g[0]] = true; outros[g[1]] = true; });
    });
    var sp2 = 0, maxf = 0, freqs = [];
    alelos.forEach(function (a) {
      var f = c[a] / N;
      sp2 += f * f;
      if (f > maxf) maxf = f;
      freqs.push({ alelo: a, copias: c[a], f: f, raro: f < 0.05, privado: !outros[a] });
    });
    var het = 0;
    gs.forEach(function (g) { if (g[0] !== g[1]) het++; });
    var Ho = het / n;
    var r = {
      n: n, N: N, A: alelos.length, freqs: freqs, het: het, Ho: Ho,
      HeSem: 1 - sp2,                                  // 1 − Σp², sem correção
      He: (N / (N - 1)) * (1 - sp2),                    // não enviesada, Nei (1978): 2n/(2n − 1)
      He87: (n / (n - 1)) * (1 - sp2 - Ho / (2 * n)),   // FSTAT, Nei (1987), a do artigo
      maxf: maxf, contagens: c
    };
    cacheLoco[chave] = r;
    return r;
  }

  function media(lista) { return lista.reduce(function (s, x) { return s + x; }, 0) / lista.length; }

  // Tamanho da rarefação em onças (o artigo usa 8, o menor fragmento).
  function AR(frag, oncas) {
    var g = 2 * (oncas || 8);
    var v = D.locos.map(function (L, li) {
      var x = porLoco(frag, li);
      return x.N >= g ? rarefacao(x.contagens, x.N, g) : null;
    });
    if (v.some(function (x) { return x === null; })) return null;
    return media(v);
  }

  // Alelos privados rarefeitos (Kalinowski 2004), como no HP-Rare usado pelo artigo.
  function privadosRarefeitos(frag, oncas) {
    var g = 2 * (oncas || 8), s = 0;
    D.locos.forEach(function (L, li) {
      var todos = {};
      D.fragmentos.forEach(function (q) { Object.keys(porLoco(q, li).contagens).forEach(function (a) { todos[a] = true; }); });
      Object.keys(todos).forEach(function (a) {
        var v = 1;
        D.fragmentos.forEach(function (q) {
          var x = porLoco(q, li), p = chanceDeAparecer(x.N, x.contagens[a] || 0, g);
          v *= (q === frag) ? p : (1 - p);
        });
        s += v;
      });
    });
    return s / D.locos.length;
  }

  function resumo(frag) {
    var L = D.locos.map(function (x, li) { return porLoco(frag, li); });
    var Ho = media(L.map(function (x) { return x.Ho; }));
    var He = media(L.map(function (x) { return x.He; }));
    var He87 = media(L.map(function (x) { return x.He87; }));
    var n = D.oncas.filter(function (o) { return o.pop === frag; }).length;
    return {
      n: n,
      A: media(L.map(function (x) { return x.A; })),
      AR: AR(frag, 8),
      P95: 100 * L.filter(function (x) { return x.maxf <= 0.95; }).length / L.length,
      P99: 100 * L.filter(function (x) { return x.maxf <= 0.99; }).length / L.length,
      poli95: L.filter(function (x) { return x.maxf <= 0.95; }).length,
      poli99: L.filter(function (x) { return x.maxf <= 0.99; }).length,
      Ho: Ho, He: He, HeSem: media(L.map(function (x) { return x.HeSem; })), He87: He87,
      FIS: 1 - Ho / He, FIS87: 1 - Ho / He87,
      raros: L.reduce(function (s, x) { return s + x.freqs.filter(function (f) { return f.raro; }).length; }, 0),
      privados: L.reduce(function (s, x) { return s + x.freqs.filter(function (f) { return f.privado; }).length; }, 0),
      totalAlelos: L.reduce(function (s, x) { return s + x.A; }, 0),
      maxfMaior: Math.max.apply(null, L.map(function (x) { return x.maxf; }))
    };
  }

  // Gerador pseudoaleatório com semente (mulberry32): todos os aparelhos veem o mesmo sorteio.
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

  // Sorteia k onças de um fragmento (sem reposição) e conta os alelos de cada loco nelas.
  function sortearOncas(frag, k, aleatorio) {
    var idx = [];
    D.oncas.forEach(function (o, i) { if (o.pop === frag) idx.push(i); });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(aleatorio() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    var escolhidas = idx.slice(0, k);
    var porL = D.locos.map(function (L, li) {
      var vistos = {};
      escolhidas.forEach(function (i) {
        var g = D.oncas[i].g[li];
        if (g && g[0] !== '?' && g[1] !== '?') { vistos[g[0]] = true; vistos[g[1]] = true; }
      });
      return Object.keys(vistos).length;
    });
    return { ids: escolhidas.map(function (i) { return D.oncas[i].id; }), A: media(porL) };
  }

  function mediaDeSorteios(frag, k, vezes, semente) {
    var r = gerador(semente), s = 0, min = Infinity, max = -Infinity;
    for (var v = 0; v < vezes; v++) {
      var a = sortearOncas(frag, k, r).A;
      s += a; if (a < min) min = a; if (a > max) max = a;
    }
    return { media: s / vezes, min: min, max: max };
  }

  // Ordem dos fragmentos numa medida (maior primeiro); empates ficam juntos.
  function ranking(medida) {
    var lista = D.fragmentos.map(function (f) { return { frag: f, v: resumo(f)[medida] }; });
    lista.sort(function (a, b) { return b.v - a.v; });
    return lista;
  }

  raiz.MODELO = {
    tipados: tipados, contagem: contagem, chanceDeAparecer: chanceDeAparecer, rarefacao: rarefacao,
    porLoco: porLoco, AR: AR, privadosRarefeitos: privadosRarefeitos, resumo: resumo,
    gerador: gerador, sortearOncas: sortearOncas, mediaDeSorteios: mediaDeSorteios, ranking: ranking
  };
})(typeof window !== 'undefined' ? window : this);
