// Testes das contas do aplicativo de fluxo gênico: node --test fluxo/tests/modelo.test.js
// As médias simuladas são conferidas contra um segundo cálculo, feito à parte: a recursão exata
// das médias de Σpᵢ² dentro dos fragmentos e entre fragmentos, para o mesmo ciclo de vida
// (migração e depois sorteio de 2N cópias). Também contra a teoria (1 − (1 − 1/2N)^t) e
// contra os valores de referência dos problemas P1 a P9.

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/modelo.js');

const perto = (a, b, tol) => Math.abs(a - b) <= tol;
const PRATICA = { K: 4, N: 10, G: 50, R: 400, semente: 1911 };
const op = (extra) => Object.assign({}, PRATICA, extra);

// Segundo cálculo: médias exatas. a = E[Σpᵢ²] num fragmento; b = E[Σ p_k,i p_j,i] entre fragmentos.
// Migração com fração m: a' = c a + (1 − c) b, b' = d a + (1 − d) b, com
// c = (1 − m)² + m²/(K − 1) e d = 2m(1 − m)/(K − 1) + (K − 2)m²/(K − 1)².
// Sorteio de n = 2N cópias: a'' = (1 − 1/n) a' + 1/n; b'' = b'.
// Hs = 1 − a; Ht = 1 − (a + (K − 1) b)/K.
function esperado(o) {
  const K = o.K, n = 2 * o.N;
  let a = 1 - M.H0, b = 1 - M.H0;
  const F = [0], FST = [0];
  for (let g = 1; g <= o.G; g++) {
    const m = M.fracaoMigrantes(o, g);
    if (m > 0) {
      const c = (1 - m) ** 2 + m * m / (K - 1);
      const d = 2 * m * (1 - m) / (K - 1) + (K - 2) * m * m / ((K - 1) ** 2);
      const a1 = c * a + (1 - c) * b, b1 = d * a + (1 - d) * b;
      a = a1; b = b1;
    }
    a = (1 - 1 / n) * a + 1 / n;
    const hs = 1 - a, ht = 1 - (a + (K - 1) * b) / K;
    F.push(1 - hs / M.H0);
    FST.push((ht - hs) / ht);
  }
  return { F, FST };
}

test('1. sorteio com semente é reproduzível; frequências somam 1; alelo perdido só volta com migrante', () => {
  const a = M.simular(op({ cenario: 'corredor', Nm: 1, R: 50 }));
  const b = M.simular(op({ cenario: 'corredor', Nm: 1, R: 50 }));
  assert.deepEqual(a, b);
  const c = M.simular(op({ cenario: 'corredor', Nm: 1, R: 50, semente: 1912 }));
  assert.notDeepEqual(a.F, c.F);
  // cada fragmento: soma 1 em todas as gerações; sem migração, alelo que some não volta
  const rnd = M.gerador(77);
  let fr = M.FREQS0.slice();
  for (let g = 0; g < 300; g++) {
    const antes = fr;
    fr = M.sortearCopias(fr, 2 * (5 + (g % 30)), rnd).map((x, i, arr) => x / arr.reduce((s, y) => s + y, 0));
    assert.ok(perto(fr.reduce((s, x) => s + x, 0), 1, 1e-12));
    fr.forEach((x, i) => { if (antes[i] === 0) assert.equal(x, 0, `alelo ${i + 1} voltou na geração ${g}`); });
  }
  // o número de cópias sorteadas é sempre 2N
  const z = M.sortearCopias([0.5, 0, 0.5, 0, 0, 0], 40, M.gerador(3));
  assert.equal(z.reduce((s, x) => s + x, 0), 40);
  assert.equal(z[1] + z[3] + z[4] + z[5], 0);
  // com translocação, o número médio de alelos por fragmento sobe na geração da translocação
  const t = M.simular(op({ cenario: 'translocacao', nT: 3, tT: 10, repetir: 0 }));
  assert.ok(t.A[10] > t.A[9] + 0.5, `alelos ${t.A[9]} → ${t.A[10]}`);
});

test('2. sorteio de cópias: média 2Npᵢ e variância 2Npᵢ(1 − pᵢ) em cada alelo', () => {
  const rnd = M.gerador(2024), n = 20, reps = 20000, k = M.FREQS0.length;
  const s = new Array(k).fill(0), s2 = new Array(k).fill(0);
  for (let r = 0; r < reps; r++) {
    const c = M.sortearCopias(M.FREQS0, n, rnd);
    c.forEach((x, i) => { s[i] += x; s2[i] += x * x; });
  }
  M.FREQS0.forEach((p, i) => {
    const media = s[i] / reps, vari = s2[i] / reps - media * media;
    assert.ok(perto(media, n * p, 0.05), `alelo ${i + 1}: média ${media}`);
    assert.ok(Math.abs(vari / (n * p * (1 - p)) - 1) <= 0.05, `alelo ${i + 1}: variância ${vari}`);
  });
});

test('3. isolados: F igual a 1 − (1 − 1/2N)^t, e igual à recursão exata', () => {
  for (const N of [10, 30]) {
    const o = op({ cenario: 'isolados', N });
    const r = M.simular(o), e = esperado(o);
    for (const g of [1, 5, 10, 20, 30, 50]) {
      assert.ok(perto(e.F[g], M.Fteorico(N, g), 1e-12), `N ${N}, g ${g}: recursão ${e.F[g]}`);
      assert.ok(perto(r.F[g], M.Fteorico(N, g), 0.015), `N ${N}, g ${g}: simulado ${r.F[g]} contra ${M.Fteorico(N, g)}`);
      assert.ok(perto(r.FST[g], e.FST[g], 0.02), `N ${N}, g ${g}: FST ${r.FST[g]} contra ${e.FST[g]}`);
    }
  }
});

test('4. corredor: F e FST simulados batem com a recursão exata; FST para de subir e cai com mais migrantes', () => {
  let anterior = 1;
  for (const Nm of [0.1, 0.5, 1, 2, 5]) {
    const o = op({ cenario: 'corredor', Nm });
    const r = M.simular(o), e = esperado(o);
    for (const g of [5, 10, 20, 30, 50]) {
      assert.ok(perto(r.F[g], e.F[g], 0.02), `Nm ${Nm}, g ${g}: F ${r.F[g]} contra ${e.F[g]}`);
      assert.ok(perto(r.FST[g], e.FST[g], 0.02), `Nm ${Nm}, g ${g}: FST ${r.FST[g]} contra ${e.FST[g]}`);
    }
    assert.ok(r.FST[30] < anterior, `Nm ${Nm}: FST ${r.FST[30]} não caiu`);
    anterior = r.FST[30];
    if (Nm >= 0.5) {
      // perto do equilíbrio do modelo de ilhas com K fragmentos, um pouco acima por causa de N pequeno
      assert.ok(Math.abs(r.FST[50] - M.FSTilhas(Nm, 4)) <= 0.035, `Nm ${Nm}: FST ${r.FST[50]} contra ${M.FSTilhas(Nm, 4)}`);
      assert.ok(perto(r.FST[30], r.FST[50], 0.02), `Nm ${Nm}: FST ainda subindo`);
    }
  }
});

test('5. translocação: igual aos isolados antes, F cai na geração da translocação e volta a subir', () => {
  const iso = M.simular(op({ cenario: 'isolados' }));
  for (const [tT, rep] of [[10, 0], [10, 5], [5, 10], [20, 0]]) {
    const o = op({ cenario: 'translocacao', nT: 3, tT, repetir: rep });
    const r = M.simular(o), e = esperado(o);
    assert.deepEqual(r.F.slice(0, tT), iso.F.slice(0, tT));
    assert.ok(r.F[tT] < 0.85 * r.F[tT - 1], `tT ${tT}: F ${r.F[tT - 1]} → ${r.F[tT]}`);
    assert.ok(r.FST[tT] < r.FST[tT - 1], `tT ${tT}: FST não caiu`);
    for (const g of [tT - 1, tT, tT + 1, 30, 50]) {
      assert.ok(perto(r.F[g], e.F[g], 0.02), `tT ${tT}, rep ${rep}, g ${g}: F ${r.F[g]} contra ${e.F[g]}`);
      assert.ok(perto(r.FST[g], e.FST[g], 0.02), `tT ${tT}, rep ${rep}, g ${g}: FST ${r.FST[g]} contra ${e.FST[g]}`);
    }
    if (rep === 0) assert.ok(r.F[30] > r.F[tT] + 0.2, 'uma translocação só não segura o F');
  }
  assert.deepEqual(M.geracoesTranslocacao(10, 5, 50), [10, 15, 20, 25, 30, 35, 40, 45, 50]);
  assert.deepEqual(M.geracoesTranslocacao(10, 0, 50), [10]);
  const t = { cenario: 'translocacao', N: 10, nT: 3, tT: 10, repetir: 5 };
  for (let g = 1; g <= 50; g++) {
    assert.equal(M.fracaoMigrantes(t, g) > 0, M.geracoesTranslocacao(10, 5, 50).includes(g), `geração ${g}`);
  }
});

test('6. valores de referência dos problemas P1 a P9 (valores da prática, semente 1911)', () => {
  const iso = M.simular(op({ cenario: 'isolados' }));
  const cor = M.simular(op({ cenario: 'corredor', Nm: 1 }));
  const tra = M.simular(op({ cenario: 'translocacao', nT: 3, tT: 10, repetir: 0 }));
  const ref = (x, v) => assert.ok(perto(x, v, 0.0015), `${x} contra ${v}`);
  ref(iso.F[30], 0.786); // P1
  ref(iso.FST[30], 0.738); // P2
  ref(cor.F[30], 0.391); ref(cor.FST[30], 0.140); // P3
  ref(tra.F[9], 0.369); ref(tra.F[10], 0.235); ref(tra.F[30], 0.732); // P6
  // P5: 0,5 migrante não basta para FST < 0,2 na geração 30; 1 migrante basta
  assert.ok(M.simular(op({ cenario: 'corredor', Nm: 0.5 })).FST[30] > 0.2);
  assert.ok(cor.FST[30] < 0.2);
  // P8: com 3 micos a cada 5 gerações, o FST fica abaixo de 0,3 depois da segunda translocação
  const rep = M.simular(op({ cenario: 'translocacao', nT: 3, tT: 10, repetir: 5 }));
  for (let g = 15; g <= 50; g++) assert.ok(rep.FST[g] < 0.3, `g ${g}: ${rep.FST[g]}`);
  // P9: com N = 30, o F dos isolados na geração 30 fica perto da metade do valor com N = 10
  const iso30 = M.simular(op({ cenario: 'isolados', N: 30 }));
  ref(iso30.F[30], 0.404);
  assert.ok(iso30.F[30] < 0.6 * iso.F[30]);
  assert.ok(perto(M.H0, 0.7398, 1e-12));
});
