// Dados reais usados na prática de seleção.
// Linss JGB et al. (2014) Parasites & Vectors 7:25, Tabela 3: frequências genotípicas
// (S, R1 e R2; R1 = Cys1534; R2 = Ile1016 + Cys1534). Frequência do kdr = R1 + R2.
// Smith LB et al. (2021) PLoS Negl Trop Dis 15(3):e0009271: gaiolas sem inseticida.

var DADOS = (function () {
  'use strict';

  // Linhas da Tabela 3 (frequências como publicadas) e número de mosquitos.
  var TABELA3 = {
    AJU02: { n: 30, SS: 1.000, SR1: 0.000, SR2: 0.000, R1R1: 0.000, R1R2: 0.000, R2R2: 0.000 },
    AJU06: { n: 30, SS: 0.767, SR1: 0.033, SR2: 0.167, R1R1: 0.000, R1R2: 0.033, R2R2: 0.000 },
    AJU10: { n: 26, SS: 0.269, SR1: 0.038, SR2: 0.308, R1R1: 0.000, R1R2: 0.000, R2R2: 0.385 },
    AJU12: { n: 30, SS: 0.200, SR1: 0.033, SR2: 0.333, R1R1: 0.033, R1R2: 0.100, R2R2: 0.300 },
    VIT06: { n: 30, SS: 0.267, SR1: 0.100, SR2: 0.333, R1R1: 0.000, R1R2: 0.033, R2R2: 0.267 },
    VIT10: { n: 30, SS: 0.000, SR1: 0.067, SR2: 0.100, R1R1: 0.000, R1R2: 0.000, R2R2: 0.833 },
    MSR09: { n: 30, SS: 0.600, SR1: 0.367, SR2: 0.000, R1R1: 0.033, R1R2: 0.000, R2R2: 0.000 },
    MSR11: { n: 30, SS: 0.000, SR1: 0.767, SR2: 0.000, R1R1: 0.200, R1R2: 0.000, R2R2: 0.033 }
  };

  // Frequência do kdr pelas contagens de alelos (cópias de R em 2n).
  // Conferida contra as frequências da Tabela 3 nos testes.
  var SERIES = {
    AJU: {
      rotulo: 'Aracaju (SE)',
      pontos: [
        { ano: 2002, codigo: 'AJU02', n: 30, copiasR: 0 },
        { ano: 2006, codigo: 'AJU06', n: 30, copiasR: 8 },
        { ano: 2010, codigo: 'AJU10', n: 26, copiasR: 29 },
        { ano: 2012, codigo: 'AJU12', n: 30, copiasR: 37 }
      ]
    },
    VIT: {
      rotulo: 'Vitória (ES)',
      pontos: [
        { ano: 2006, codigo: 'VIT06', n: 30, copiasR: 31 },
        { ano: 2010, codigo: 'VIT10', n: 30, copiasR: 55 }
      ]
    },
    MSR: {
      rotulo: 'Mossoró (RN)',
      pontos: [
        { ano: 2009, codigo: 'MSR09', n: 30, copiasR: 13 },
        { ano: 2011, codigo: 'MSR11', n: 30, copiasR: 37 }
      ]
    }
  };

  Object.keys(SERIES).forEach(function (k) {
    SERIES[k].pontos.forEach(function (pt) { pt.p = pt.copiasR / (2 * pt.n); });
  });

  // Gaiolas sem inseticida, linhagem KR (mutações S989P e V1016G):
  // média de quatro gaiolas, F1 0,46 e F9 0,32 (oito gerações).
  var GAIOLAS = { pInicial: 0.46, pFinal: 0.32, geracoes: 8, rotulo: 'Gaiolas sem inseticida (Smith et al. 2021)' };

  var FONTES = {
    linss: 'Linss JGB et al. (2014) Parasites & Vectors 7:25, Tabela 3. doi:10.1186/1756-3305-7-25',
    smith: 'Smith LB et al. (2021) PLoS Negl Trop Dis 15(3):e0009271. doi:10.1371/journal.pntd.0009271'
  };

  // Endereço da ficha de saída no Moodle. Vazio esconde o botão.
  var MOODLE_URL = '';

  return { TABELA3: TABELA3, SERIES: SERIES, GAIOLAS: GAIOLAS, FONTES: FONTES, MOODLE_URL: MOODLE_URL };
})();

if (typeof module !== 'undefined') module.exports = DADOS; else window.DADOS = DADOS;
