// Testes das contas do aplicativo de deriva: node --test deriva/tests/modelo.test.js
// As simulações do aplicativo são conferidas contra as fórmulas da teoria
// (segundo cálculo) e contra os valores de referência calculados à parte, em Python.

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/modelo.js');
const D = require('../js/dados.js');

const perto = (a, b, tol) => Math.abs(a - b) <= tol;
const FREQS = D.MICROSSATELITE.freqs;

test('1. sorteio com semente é reproduzível e as frequências somam 1 em todas as gerações', () => {
  const a = M.gargalo(FREQS, 100, 10, 10, 20, 77);
  const b = M.gargalo(FREQS, 100, 10, 10, 20, 77);
  assert.deepEqual(a, b);
  const c = M.gargalo(FREQS, 100, 10, 10, 20, 78);
  assert.notDeepEqual(a.exemplos, c.exemplos);
  assert.deepEqual(M.variosFragmentos(10, 0.5, 20, 30, 5), M.variosFragmentos(10, 0.5, 20, 30, 5));
  // o mesmo fragmento tem a mesma história nas primeiras 30 gerações, rodando 30 ou 200
  const curta = M.variosFragmentos(10, 0.5, 5, 30, 9).trajetorias;
  const longa = M.variosFragmentos(10, 0.5, 5, 200, 9).trajetorias;
  curta.forEach((t, i) => assert.deepEqual(t, longa[i].slice(0, 31)));
  // soma 1 em todas as gerações; um alelo perdido não volta (nos dois métodos de sorteio)
  for (const [Nbase, sem] of [[7, 123], [520, 124]]) {
    const rnd = M.gerador(sem);
    let fr = FREQS.slice();
    for (let g = 0; g < 200; g++) {
      const antes = fr;
      fr = M.geracao(fr, Nbase + (g % 40), rnd);
      const soma = fr.reduce((s, x) => s + x, 0);
      assert.ok(perto(soma, 1, 1e-12), `geração ${g}: soma ${soma}`);
      fr.forEach((x, i) => {
        assert.ok(x >= 0 && x <= 1);
        if (antes[i] === 0) assert.equal(x, 0, `alelo ${i + 1} voltou na geração ${g}`);
      });
    }
  }
  const z = M.sortearCopias([0.5, 0, 0.5, 0, 0, 0], 800, M.gerador(3));
  assert.equal(z[1] + z[3] + z[4] + z[5], 0);
  assert.equal(z[0] + z[2], 800);
  const um = M.trajetoria(10, 0.5, 50, 1211);
  um.p.forEach((p, g) => assert.equal(p, um.copiasA[g] / 20));
});

test('2. dois alelos, 20.000 sorteios: média de p\' igual a p e variância igual a pq/2N', () => {
  for (const [N, p] of [[10, 0.5], [10, 0.2], [50, 0.3], [4, 0.75], [600, 0.3]]) {
    const rnd = M.gerador(2024 + N);
    const reps = 20000;
    let s = 0, s2 = 0;
    for (let r = 0; r < reps; r++) {
      const x = M.geracao([p, 1 - p], N, rnd)[0];
      s += x; s2 += x * x;
    }
    const media = s / reps;
    const variancia = s2 / reps - media * media;
    const esperada = p * (1 - p) / (2 * N);
    assert.ok(perto(media, p, 0.005), `N ${N}, p ${p}: média ${media}`);
    assert.ok(Math.abs(variancia / esperada - 1) <= 0.05, `N ${N}, p ${p}: variância ${variancia} contra ${esperada}`);
  }
});

test('3. Hₑ médio depois de um sorteio igual a Hₑ(1 − 1/2N), N 4, 10 e 67', () => {
  const H0 = M.heterozigosidade(FREQS);
  assert.ok(perto(H0, 0.7398, 1e-12));
  const ref = { 4: 0.6473, 10: 0.7028, 67: 0.7343 };
  for (const N of [4, 10, 67]) {
    const rnd = M.gerador(300 + N);
    const reps = 20000;
    let s = 0;
    for (let r = 0; r < reps; r++) s += M.heterozigosidade(M.geracao(FREQS, N, rnd));
    const teoria = H0 * (1 - 1 / (2 * N));
    assert.ok(perto(teoria, ref[N], 0.00005), `teoria N ${N}: ${teoria}`);
    assert.ok(perto(M.esperadoUmSorteio(FREQS, N).H, teoria, 1e-12));
    assert.ok(perto(s / reps, teoria, 0.005), `N ${N}: simulado ${s / reps} contra ${teoria}`);
  }
});

test('4. chance de cada alelo sumir num sorteio igual a (1 − p)^2N', () => {
  const ref = {
    10: { perda: [0.0000, 0.0032, 0.0388, 0.1216, 0.2901, 0.4420], A: 5.104 },
    4: { A: 3.849 },
    67: { A: 5.996 }
  };
  const e10 = M.esperadoUmSorteio(FREQS, 10);
  e10.perda.forEach((x, i) => assert.ok(perto(x, ref[10].perda[i], 0.00005), `alelo ${i + 1}: ${x}`));
  for (const N of [4, 10, 67]) assert.ok(perto(M.esperadoUmSorteio(FREQS, N).A, ref[N].A, 0.0005));
  for (const N of [4, 10]) {
    const r = M.gargalo(FREQS, 100, N, 0, 50000, 4000 + N);
    const teoria = M.esperadoUmSorteio(FREQS, N);
    r.sumiuLogo.forEach((x, i) => assert.ok(perto(x, teoria.perda[i], 0.01), `N ${N}, alelo ${i + 1}: ${x} contra ${teoria.perda[i]}`));
    assert.ok(perto(r.A[1], teoria.A, 0.02), `N ${N}: alelos ${r.A[1]} contra ${teoria.A}`);
  }
});

test('5. chance de fixação de um alelo neutro igual à frequência inicial (p0 0,20, N 10)', () => {
  const rnd = M.gerador(555);
  const reps = 5000;
  let fixou = 0, perdeu = 0;
  for (let r = 0; r < reps; r++) {
    const x = M.ateAbsorver(10, 0.20, rnd);
    if (x.fixou) fixou++; else if (x.perdeu) perdeu++;
  }
  assert.equal(fixou + perdeu, reps);
  assert.ok(perto(fixou / reps, 0.20, 0.02), `fixou em ${fixou / reps}`);
});

test('6. Nₑ, perda por geração, heterozigosidade que resta e queda do censo', () => {
  const ne5 = M.tamanhoEfetivo(5, 5), ne13 = M.tamanhoEfetivo(13, 13);
  assert.equal(ne5, 10);
  assert.equal(ne13, 26);
  assert.ok(perto(M.perdaPorGeracao(ne5) * 100, 5.000, 0.0005));
  assert.ok(perto(M.perdaPorGeracao(ne13) * 100, 1.923, 0.0005));
  assert.ok(perto(M.resta(ne5, 10) * 100, 59.87, 0.005));
  assert.ok(perto(M.resta(ne13, 10) * 100, 82.35, 0.005));
  // razão sexual desigual: 1 macho e 4 fêmeas dão Nₑ 3,2
  assert.ok(perto(M.tamanhoEfetivo(1, 4), 3.2, 1e-12));
  assert.ok(perto(M.queda(D.CENSO.n1, D.CENSO.n2) * 100, 32.11, 0.005));
  assert.ok(perto(M.queda(D.CENSO.n1, D.CENSO.n2metodo1) * 100, 30.44, 0.005));
});

test('7. recuperação: N dobra a cada geração até voltar a N0 e não passa dele', () => {
  assert.deepEqual(M.tamanhos(100, 10, 10), [100, 10, 20, 40, 80, 100, 100, 100, 100, 100, 100, 100]);
  assert.deepEqual(M.tamanhos(100, 67, 3), [100, 67, 100, 100, 100]);
  assert.deepEqual(M.tamanhos(20, 2, 0), [20, 2]);
  for (const [N0, Nb, t] of [[400, 2, 30], [37, 5, 12], [100, 100, 5]]) {
    const L = M.tamanhos(N0, Nb, t);
    assert.equal(L.length, t + 2);
    for (let i = 2; i < L.length; i++) {
      assert.ok(L[i] <= N0);
      assert.equal(L[i], Math.min(N0, 2 * L[i - 1]));
    }
  }
  const r = M.gargalo(FREQS, 100, 10, 10, 10, 1);
  assert.deepEqual(r.tamanhos, M.tamanhos(100, 10, 10));
  assert.equal(r.A.length, 12);
});

test('8. sem deriva (N muito grande), p quase não muda em 30 gerações', () => {
  for (const s of [1, 2, 3]) {
    const t = M.trajetoria(50000, 0.5, 30, s).p;
    assert.ok(Math.abs(t[30] - 0.5) < 0.02, `semente ${s}: ${t[30]}`);
  }
  const pequeno = M.variosFragmentos(10, 0.5, 50, 30, 8);
  assert.ok(pequeno.fixou + pequeno.perdeu > 15, 'com N 10, muitos fragmentos fixam ou perdem A');
});
