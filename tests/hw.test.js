'use strict';

const test = require('node:test');
const assert = require('node:assert');
const HW = require('../js/hw.js');
const SORTEIO = require('../js/sorteio.js');
const DADOS = require('../js/dados.js');

function perto(real, esperado, tol, msg) {
  assert.ok(Math.abs(real - esperado) <= (tol === undefined ? 0.001 : tol),
    (msg || '') + ' obtido ' + real + ', esperado ' + esperado);
}

test('valor-p, 1 gl', () => {
  perto(HW.valorP(3.841459, 1), 0.05, 0.0001);
});

test('valor-p, 3 gl', () => {
  perto(HW.valorP(7.814728, 3), 0.05, 0.0001);
});

test('valor-p, qui-quadrado zero', () => {
  perto(HW.valorP(0, 1), 1);
});

test('valor-p com outros graus de liberdade lança erro', () => {
  assert.throws(() => HW.valorP(1, 2));
});

test('Mossoró 2009', () => {
  const r = HW.testeDoisAlelos([18, 11, 1]);
  perto(r.p, 0.7833);
  perto(r.esperados[0], 18.408);
  perto(r.esperados[1], 10.183);
  perto(r.esperados[2], 1.408);
  perto(r.qui2, 0.1929);
  perto(r.valorP, 0.6605);
  perto(r.f, -0.080);
  assert.strictEqual(r.gl, 1);
  assert.strictEqual(r.conclusao, 'não rejeita o equilíbrio');
  assert.strictEqual(r.direcao, 'excesso de heterozigotos (só tendência)');
});

test('Santarém 2010', () => {
  const r = HW.testeDoisAlelos([6, 3, 21]);
  perto(r.p, 0.25);
  perto(r.esperados[0], 1.875);
  perto(r.esperados[1], 11.25);
  perto(r.esperados[2], 16.875);
  perto(r.qui2, 16.1333);
  perto(r.valorP, 0.000059, 0.000002);
  perto(r.f, 0.7333);
  assert.strictEqual(r.conclusao, 'rejeita o equilíbrio');
  assert.strictEqual(r.direcao, 'falta de heterozigotos');
  assert.ok(r.alerta.length > 0);
});

test('Pacaraima 2011', () => {
  const r = HW.testeDoisAlelos([11, 14, 5]);
  perto(r.p, 0.6);
  perto(r.qui2, 0.0231);
  perto(r.valorP, 0.8791);
  perto(r.ho, 0.4667);
  perto(r.he, 0.48);
  perto(r.f, 0.0278);
});

test('monomórfico', () => {
  const r = HW.testeDoisAlelos([24, 0, 0]);
  assert.strictEqual(r.monomorfico, true);
  assert.strictEqual(r.qui2, undefined);
  assert.strictEqual(r.valorP, undefined);
});

test('vazio', () => {
  assert.strictEqual(HW.testeDoisAlelos([0, 0, 0]), null);
  assert.strictEqual(HW.testeTresAlelos([0, 0, 0, 0, 0, 0]), null);
});

test('gene, três alelos', () => {
  const r = HW.testeTresAlelos([4, 3, 5, 3, 5, 4]);
  perto(r.frequencias[0], 0.3333);
  perto(r.frequencias[1], 0.2917);
  perto(r.frequencias[2], 0.3750);
  perto(r.qui2, 2.0060);
  assert.strictEqual(r.gl, 3);
  perto(r.valorP, 0.5712);
  perto(r.menorEsperado, 2.042);
});

test('gene sem o alelo S', () => {
  const r = HW.testeTresAlelos([0, 0, 0, 11, 14, 5]);
  assert.strictEqual(r.gl, 1);
  perto(r.qui2, 0.0231);
  perto(r.valorP, 0.8791);
});

test('gene com um alelo só', () => {
  const r = HW.testeTresAlelos([24, 0, 0, 0, 0, 0]);
  assert.strictEqual(r.monomorfico, true);
});

test('sítios do gene', () => {
  const s = HW.sitiosDoGene([4, 3, 5, 3, 5, 4]);
  assert.deepStrictEqual(s.s1016, [10, 10, 4]);
  assert.deepStrictEqual(s.s1534, [4, 8, 12]);
});

test('gerador é reprodutível', () => {
  const a = SORTEIO.criarGerador(123);
  const b = SORTEIO.criarGerador(123);
  for (let i = 0; i < 20; i++) assert.strictEqual(a.proximo(), b.proximo());
  const estado = a.estado();
  const x = a.proximo();
  b.restaurar(estado);
  assert.strictEqual(b.proximo(), x);
});

test('feijões do saco', () => {
  const lista = SORTEIO.feijoes(DADOS.SACO);
  assert.strictEqual(lista.length, 60);
  assert.strictEqual(lista.filter((l) => l === 'S').length, 29);
  const g = SORTEIO.criarGerador(7);
  const emb = SORTEIO.embaralhar(lista, g);
  assert.strictEqual(emb.length, 60);
  assert.strictEqual(emb.filter((l) => l === 'S').length, 29);
  const gm = SORTEIO.sortearGameta(emb, g);
  assert.ok(gm.indice >= 0 && gm.indice < 60);
  assert.strictEqual(gm.letra, emb[gm.indice]);
  assert.strictEqual(SORTEIO.genotipo('R', 'S'), 'SR');
  assert.strictEqual(SORTEIO.genotipo('S', 'R'), 'SR');
  assert.strictEqual(SORTEIO.genotipo('R', 'R'), 'RR');
});

test('simulação, saco', () => {
  const g = SORTEIO.criarGerador(2026);
  const c = SORTEIO.simular(SORTEIO.feijoes(DADOS.SACO), 10000, g);
  const r = HW.testeDoisAlelos([c.SS, c.SR, c.RR]);
  assert.ok(Math.abs(r.f) < 0.04, 'F = ' + r.f);
});

test('simulação, dois potes juntos', () => {
  const g = SORTEIO.criarGerador(2026);
  const a = SORTEIO.simular(SORTEIO.feijoes(DADOS.POTE_A), 10000, g);
  const b = SORTEIO.simular(SORTEIO.feijoes(DADOS.POTE_B), 10000, g);
  const r = HW.testeDoisAlelos([a.SS + b.SS, a.SR + b.SR, a.RR + b.RR]);
  assert.ok(r.f > 0.66 && r.f < 0.72, 'F = ' + r.f);
});

test('populações do artigo', () => {
  assert.strictEqual(DADOS.POPULACOES.length, 22);
  const rotulos = DADOS.POPULACOES.map((p) => p.rotulo);
  const ordenados = rotulos.slice().sort((x, y) => x.localeCompare(y, 'pt-BR'));
  assert.deepStrictEqual(rotulos, ordenados);
});
