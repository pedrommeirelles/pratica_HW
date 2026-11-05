// Testes das contas do aplicativo de seleção: node --test selecao/tests/
// Cada conta é conferida por um segundo cálculo independente (Δp, frações exatas
// ou valores de referência calculados fora do aplicativo, em Python).

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/modelo.js');
const D = require('../js/dados.js');

const perto = (a, b, tol) => Math.abs(a - b) <= tol;

test('p\' pela fórmula do aplicativo é igual a p + Δp (segundo cálculo), 2.000 casos', () => {
  let x = 12345;
  const aleatorio = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let i = 0; i < 2000; i++) {
    const p = 0.001 + 0.998 * aleatorio();
    const w = { RR: 0.05 + aleatorio(), RS: 0.05 + aleatorio(), SS: 0.05 + aleatorio() };
    const a = M.proximo(p, w);
    const b = p + M.deltaP(p, w);
    assert.ok(perto(a, b, 1e-12), `p=${p} w=${JSON.stringify(w)}: ${a} contra ${b}`);
  }
});

test('frequências depois da seleção somam 1 e p\' = RR + RS/2 depois', () => {
  const r = M.geracao(0.3, { RR: 1, RS: 0.85, SS: 0.7 });
  const soma = r.depois.RR + r.depois.RS + r.depois.SS;
  assert.ok(perto(soma, 1, 1e-12));
  assert.ok(perto(r.pNovo, r.depois.RR + r.depois.RS / 2, 1e-12));
});

test('slide 7 da aula de 03/11: p(R) de 0,10 para 1/4 com sobrevivências de 90%, 30% e 10%', () => {
  // Em frações exatas: (0,01 × 0,9 + 0,09 × 0,3) / (0,01 × 0,9 + 0,18 × 0,3 + 0,81 × 0,1) = 0,036 / 0,144
  const num = 1 * 9 + 9 * 3;           // em unidades de 1/1000
  const den = 1 * 9 + 18 * 3 + 81 * 1;
  assert.equal(num * 4, den);          // 36/144 = 1/4
  assert.ok(perto(M.proximo(0.1, { RR: 0.9, RS: 0.3, SS: 0.1 }), 0.25, 1e-12));
  assert.ok(perto(M.proximo(0.1, { RR: 1, RS: 1 / 3, SS: 1 / 9 }), 0.25, 1e-12));
});

test('slide 8 da aula de 03/11 (p0 0,01; w_SS 0,8): valores registrados na aula', () => {
  const ref = { 1: [0.4949, 0.8241, 0.9325, 0.9590], 0.5: [0.1586, 0.7565, 0.9984, 1.0000], 0: [0.0107, 0.0114, 0.0133, 0.0159] };
  for (const h of [1, 0.5, 0]) {
    const t = M.trajetoria(0.01, M.aptidoesInseticida(0.2, h), 150);
    [25, 50, 100, 150].forEach((g, i) => assert.ok(perto(t[g], ref[h][i], 0.00006), `h=${h} g=${g}: ${t[g]}`));
  }
});

test('Rodada 1 (p0 0,05; s 0,30): referência do cálculo 1', () => {
  const ref = {
    1: { g10: 0.4521, g60: 0.9323, ate05: 12, ate099: 349 },
    0.5: { g10: 0.2597, g60: 0.9993, ate05: 16, ate099: 44 },
    0: { g10: 0.0623, g60: 0.9022, ate05: 52, ate099: 67 }
  };
  for (const h of [1, 0.5, 0]) {
    const w = M.aptidoesInseticida(0.30, h);
    const t = M.trajetoria(0.05, w, 60);
    assert.ok(perto(t[10], ref[h].g10, 0.00006));
    assert.ok(perto(t[60], ref[h].g60, 0.00006));
    assert.equal(M.geracoesAte(0.05, 0.5, w), ref[h].ate05);
    assert.equal(M.geracoesAte(0.05, 0.99, w), ref[h].ate099);
  }
});

test('dados: frequência do kdr pelas cópias de R confere com a Tabela 3', () => {
  for (const k of Object.keys(D.SERIES)) {
    for (const pt of D.SERIES[k].pontos) {
      const daTabela = M.pRdaTabela(D.TABELA3[pt.codigo]);
      assert.ok(perto(pt.p, daTabela, 0.002), `${pt.codigo}: ${pt.p} contra ${daTabela}`);
    }
  }
  assert.ok(perto(D.SERIES.AJU.pontos[1].p, 0.133, 0.0005));
  assert.ok(perto(D.SERIES.AJU.pontos[2].p, 0.558, 0.0005));
  assert.ok(perto(D.SERIES.AJU.pontos[3].p, 0.617, 0.0005));
});

test('linhas da Tabela 3 somam 1 (arredondamento de 0,002)', () => {
  for (const [codigo, l] of Object.entries(D.TABELA3)) {
    const soma = l.SS + l.SR1 + l.SR2 + l.R1R1 + l.R1R2 + l.R2R2;
    assert.ok(perto(soma, 1, 0.002), `${codigo}: ${soma}`);
  }
});

test('Rodada 2: s ajustado para Aracaju, Vitória e Mossoró (10 gerações por ano), referência do cálculo 1', () => {
  const S = D.SERIES;
  const aju = S.AJU.pontos, vit = S.VIT.pontos, msr = S.MSR.pontos;
  const ref = {
    1: { a0612: 0.0617, a0610: 0.0775, a1012: 0.0293, vit: 0.2912, msr: 0.1454, p2010: 0.4773 },
    0.5: { a0612: 0.0748, a0610: 0.0990, a1012: 0.0241, vit: 0.1116, msr: 0.1604, p2010: 0.4251 },
    0: { a0612: 0.1240, a0610: 0.1695, a1012: 0.0205, vit: 0.0761, msr: 0.2032, p2010: 0.3221 }
  };
  for (const h of [1, 0.5, 0]) {
    const s0612 = M.ajustarS(aju[1].p, aju[3].p, 60, h);
    assert.ok(perto(s0612, ref[h].a0612, 0.00006), `h=${h}: ${s0612}`);
    assert.ok(perto(M.ajustarS(aju[1].p, aju[2].p, 40, h), ref[h].a0610, 0.00006));
    assert.ok(perto(M.ajustarS(aju[2].p, aju[3].p, 20, h), ref[h].a1012, 0.00006));
    assert.ok(perto(M.ajustarS(vit[0].p, vit[1].p, 40, h), ref[h].vit, 0.00006));
    assert.ok(perto(M.ajustarS(msr[0].p, msr[1].p, 20, h), ref[h].msr, 0.00006));
    const p2010 = M.trajetoria(aju[1].p, M.aptidoesInseticida(s0612, h), 40)[40];
    assert.ok(perto(p2010, ref[h].p2010, 0.00006));
    assert.ok(p2010 < aju[2].p, 'nenhum s constante passa por 2010');
  }
});

test('Rodada 3: custo nas gaiolas e volta de Aracaju a 0,10, referência do cálculo 1', () => {
  const ref = { 0: { c: 0.1819, g: 59 }, 0.5: { c: 0.1390, g: 37 }, 1: { c: 0.1137, g: 35 } };
  const p2012 = D.SERIES.AJU.pontos[3].p;
  for (const hc of [0, 0.5, 1]) {
    const c = M.ajustarCusto(D.GAIOLAS.pInicial, D.GAIOLAS.pFinal, D.GAIOLAS.geracoes, hc);
    assert.ok(perto(c, ref[hc].c, 0.00006), `hc=${hc}: ${c}`);
    assert.equal(M.geracoesAte(p2012, 0.10, M.aptidoesCusto(c, hc)), ref[hc].g);
  }
});

test('heterozigoto mais apto: equilíbrio p* = t/(s + t) é estável', () => {
  const w = M.aptidoesHeterozigoto(0.2, 0.4);
  const pe = M.equilibrioHeterozigoto(0.2, 0.4);
  assert.ok(perto(pe, 2 / 3, 1e-12));
  assert.ok(perto(M.trajetoria(0.05, w, 60)[60], pe, 0.0002));
  assert.ok(perto(M.trajetoria(0.95, w, 60)[60], pe, 0.0002));
  assert.ok(Math.abs(M.deltaP(pe, w)) < 1e-12);
});

test('sem seleção (aptidões iguais), p não muda', () => {
  const w = { RR: 0.9, RS: 0.9, SS: 0.9 };
  assert.ok(perto(M.proximo(0.37, w), 0.37, 1e-15));
});
