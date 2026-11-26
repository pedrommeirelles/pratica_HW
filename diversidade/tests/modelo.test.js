// Testes das contas: o aplicativo (cálculo 2) contra o cálculo independente em Python (cálculo 1,
// gerador/gerar_dados.py, salvo em tests/referencia.json) e contra a Tabela 1 de Haag et al. (2010).
// Rodar: node --test diversidade/tests/modelo.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {} };
vm.createContext(ctx);
for (const arq of ['genotipos.js', 'dados.js', 'modelo.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', arq), 'utf8'), ctx, { filename: arq });
}
const D = ctx.window.DADOS, M = ctx.window.MODELO;
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, 'referencia.json'), 'utf8'));
const FR = D.fragmentos;
// Arrays criados no contexto do vm têm outro protótipo: comparar pelo JSON.
const igual = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);
const perto = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} contra ${b}`);

test('dados: 59 onças, 13 locos, 18, 8, 10 e 23 por fragmento', () => {
  assert.strictEqual(D.oncas.length, 59);
  assert.strictEqual(D.locos.length, 13);
  igual(FR.map(f => D.oncas.filter(o => o.pop === f).length), [18, 8, 10, 23]);
  D.oncas.forEach(o => assert.strictEqual(o.g.length, 13));
  const incompletos = D.oncas.reduce((s, o) => s + o.g.filter(g => g && g[0] === '?').length, 0);
  const vazios = D.oncas.reduce((s, o) => s + o.g.filter(g => g === null).length, 0);
  assert.strictEqual(incompletos, 13);
  assert.strictEqual(vazios, 15);
});

test('por loco: n, A, Ho, He (três estimadores), alelos raros e privados iguais ao cálculo 1', () => {
  FR.forEach(f => {
    REF.pops[f].por_loco.forEach((r, li) => {
      const x = M.porLoco(f, li);
      assert.strictEqual(x.n, r.n, `${f} ${r.locus} n`);
      assert.strictEqual(x.A, r.A, `${f} ${r.locus} A`);
      perto(x.Ho, r.Ho, 1e-12, `${f} ${r.locus} Ho`);
      perto(x.HeSem, r.He_sem, 1e-12, `${f} ${r.locus} 1 - soma p2`);
      perto(x.He, r.He, 1e-12, `${f} ${r.locus} He`);
      perto(x.He87, r.He87, 1e-12, `${f} ${r.locus} He87`);
      perto(x.maxf, r.maxf, 1e-12, `${f} ${r.locus} maxf`);
      igual(x.freqs.filter(q => q.raro).map(q => q.alelo), r.raros.map(Number), `${f} ${r.locus} raros`);
      igual(x.freqs.filter(q => q.privado).map(q => q.alelo), r.privados.map(Number), `${f} ${r.locus} privados`);
      perto(M.rarefacao(x.contagens, x.N, 16), r.AR16, 1e-9, `${f} ${r.locus} AR`);
    });
  });
});

test('por fragmento: A, AR, P, Ho, He, FIS, raros, privados iguais ao cálculo 1', () => {
  FR.forEach(f => {
    const x = M.resumo(f), r = REF.pops[f];
    ['A', 'AR', 'P95', 'P99', 'Ho', 'He', 'He87', 'FIS'].forEach(k => perto(x[k], r[k], 1e-9, `${f} ${k}`));
    assert.strictEqual(x.raros, r.raros, `${f} raros`);
    assert.strictEqual(x.privados, r.privados, `${f} privados`);
    perto(M.privadosRarefeitos(f, 8), r.privados_rar, 1e-9, `${f} privados rarefeitos`);
  });
});

test('Tabela 1 de Haag et al. (2010): Ho, He do FSTAT, A e AR reproduzidos', () => {
  FR.forEach(f => {
    const x = M.resumo(f), t = D.tabela1[f];
    assert.strictEqual(x.n, t.n);
    perto(x.Ho, t.Ho, 0.0006, `${f} Ho`);
    perto(x.He87, t.He, 0.0006, `${f} He do FSTAT`);
    perto(x.He, t.He, 0.005, `${f} He com a correção 2n/(2n - 1)`);
    perto(x.A, t.A, 0.05, `${f} A`);
    if (f === 'Ivinhema') {
      // A tabela dá 4,2: coincide com a rarefação a 9 onças (4,22); com 8, como nos outros, dá 4,10.
      perto(x.AR, 4.103, 0.001, 'Ivinhema AR com 8 onças');
      perto(M.AR(f, 9), 4.219, 0.001, 'Ivinhema AR com 9 onças');
    } else {
      perto(x.AR, t.AR, 0.06, `${f} AR`);
    }
    perto(M.privadosRarefeitos(f, 8), D.privadosArtigo[f], 0.006, `${f} privados rarefeitos`);
  });
});

test('rarefação: com g igual ao total de cópias, dá o número de alelos; chance de aparecer em casos simples', () => {
  FR.forEach(f => D.locos.forEach((L, li) => {
    const x = M.porLoco(f, li);
    perto(M.rarefacao(x.contagens, x.N, x.N), x.A, 1e-12, `${f} ${L}`);
  }));
  perto(M.chanceDeAparecer(4, 1, 2), 0.5, 1e-12, '1 cópia em 4, amostra de 2');
  perto(M.chanceDeAparecer(4, 2, 2), 5 / 6, 1e-12, '2 cópias em 4, amostra de 2');
  assert.strictEqual(M.AR('Morro do Diabo', 9), null);
});

test('sorteio de onças: reprodutível, todas as onças dão o A do fragmento, média perto da rarefação', () => {
  const a1 = M.sortearOncas('Porto Primavera', 8, M.gerador(2611));
  const a2 = M.sortearOncas('Porto Primavera', 8, M.gerador(2611));
  igual(a1, a2);
  assert.strictEqual(new Set(a1.ids).size, 8);
  FR.forEach(f => {
    const n = D.oncas.filter(o => o.pop === f).length;
    perto(M.sortearOncas(f, n, M.gerador(1)).A, M.resumo(f).A, 1e-12, `${f} todas`);
  });
  const m = M.mediaDeSorteios('Porto Primavera', 8, 4000, 2611);
  perto(m.media, M.resumo('Porto Primavera').AR, 0.12, 'média de sorteios de 8 onças contra AR');
  assert.ok(m.min < m.media && m.media < m.max);
});

test('valores que a turma vê (roteiro e guia)', () => {
  const r = Object.fromEntries(FR.map(f => [f, M.resumo(f)]));
  const li = D.locos.indexOf('F42'), l53 = D.locos.indexOf('F53'), l741 = D.locos.indexOf('FCA741');
  assert.strictEqual(M.porLoco('Morro do Diabo', li).A, 5);           // P1
  assert.strictEqual(M.porLoco('Corredor Verde', li).A, 8);           // P2
  assert.strictEqual(M.porLoco('Corredor Verde', li).n, 17);
  assert.strictEqual(M.porLoco('Morro do Diabo', l53).het, 8);        // P7
  perto(M.porLoco('Morro do Diabo', l53).He, 0.75, 1e-12, 'He do F53 no Morro do Diabo');
  assert.strictEqual(M.porLoco('Morro do Diabo', l741).A, 1);         // P5
  igual(FR.map(f => r[f].raros), [16, 0, 0, 15]);
  igual(FR.map(f => r[f].privados), [18, 0, 2, 3]);
  igual(FR.map(f => Math.round(r[f].P95 * 10) / 10), [100, 92.3, 100, 100]);
  igual(M.ranking('Ho').map(x => x.frag), ['Porto Primavera', 'Ivinhema', 'Corredor Verde', 'Morro do Diabo']);
  ['A', 'AR', 'He', 'raros', 'privados'].forEach(k => assert.strictEqual(M.ranking(k)[0].frag, 'Corredor Verde', k));
  assert.ok(r['Corredor Verde'].FIS > 0.15 && FR.slice(1).every(f => r[f].FIS < 0));
  assert.ok(r['Morro do Diabo'].maxfMaior === 1);
  assert.ok(FR.every(f => f === 'Morro do Diabo' || r[f].maxfMaior <= 0.95));
});
