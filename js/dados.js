// Dados da prática: recipientes de feijões e populações do artigo.
// Fonte: Linss et al. (2014), Parasites & Vectors 7:25, Tabela 3.

var DADOS = (function () {
  'use strict';

  // Recipientes de 60 feijões (sorteio com reposição).
  // p(S) = SS + (SR1 + SR2)/2 da Tabela 3, arredondado para 60 feijões.
  var SACO = { id: 'saco', rotulo: 'Saco: Vitória (ES), 2006', s: 29, r: 31 };
  var POTE_A = { id: 'poteA', rotulo: 'Pote A: Caicó (RN), 2010', s: 55, r: 5 };
  var POTE_B = { id: 'poteB', rotulo: 'Pote B: Vitória (ES), 2010', s: 5, r: 55 };

  // Populações da Entrega 1, com o teste publicado na Tabela 3
  // (teste do gene, alelos S, R1 e R2, 3 graus de liberdade).
  // valorP igual a 0 representa o "0,000" publicado (mostrado como "< 0,001").
  var POPULACOES = [
    { codigo: 'AJU10', rotulo: 'AJU 2010: Aracaju, SE', n: 26, qui2: 3.6, valorP: 0.306 },
    { codigo: 'AJU12', rotulo: 'AJU 2012: Aracaju, SE', n: 30, qui2: 3.4, valorP: 0.338 },
    { codigo: 'APG12', rotulo: 'APG 2012: Aparecida de Goiânia, GO', n: 29, qui2: 2.5, valorP: 0.466 },
    { codigo: 'CAS11', rotulo: 'CAS 2011: Castanhal, PA', n: 30, qui2: 2.3, valorP: 0.512 },
    { codigo: 'CBL11', rotulo: 'CBL 2011: Campos Belos, GO', n: 29, qui2: 0.5, valorP: 0.918 },
    { codigo: 'CGR10', rotulo: 'CGR 2010: Campo Grande, MS', n: 30, qui2: 1.2, valorP: 0.749 },
    { codigo: 'CIT12', rotulo: 'CIT 2012: Cachoeiro de Itapemirim, ES', n: 29, qui2: 3.8, valorP: 0.281 },
    { codigo: 'CLT11', rotulo: 'CLT 2011: Colatina, ES', n: 30, qui2: 9.0, valorP: 0.029 },
    { codigo: 'DQC10', rotulo: 'DQC 2010: Duque de Caxias, RJ', n: 30, qui2: 13.0, valorP: 0.005 },
    { codigo: 'FOZ09', rotulo: 'FOZ 2009: Foz do Iguaçu, PR', n: 30, qui2: 3.6, valorP: 0.311 },
    { codigo: 'GVD11', rotulo: 'GVD 2011: Governador Valadares, MG', n: 30, qui2: 18.3, valorP: 0 },
    { codigo: 'ITP11', rotulo: 'ITP 2011: Itaperuna, RJ', n: 27, qui2: 5.0, valorP: 0.172 },
    { codigo: 'LZN11', rotulo: 'LZN 2011: Luziânia, GO', n: 30, qui2: 1.7, valorP: 0.639 },
    { codigo: 'PGT12', rotulo: 'PGT 2012: Porangatu, GO', n: 29, qui2: 5.9, valorP: 0.115 },
    { codigo: 'PNM10', rotulo: 'PNM 2010: Parnamirim, RN', n: 27, qui2: 9.3, valorP: 0.025 },
    { codigo: 'RVD11', rotulo: 'RVD 2011: Rio Verde, GO', n: 29, qui2: 2.8, valorP: 0.421 },
    { codigo: 'SGO08', rotulo: 'SGO 2008: São Gonçalo, RJ', n: 26, qui2: 1.6, valorP: 0.669 },
    { codigo: 'SMA12', rotulo: 'SMA 2012: São Miguel do Araguaia, GO', n: 29, qui2: 1.2, valorP: 0.750 },
    { codigo: 'SRO11', rotulo: 'SRO 2011: Santa Rosa, RS', n: 27, qui2: 7.4, valorP: 0.059 },
    { codigo: 'SSO11', rotulo: 'SSO 2011: São Simão, GO', n: 30, qui2: 7.6, valorP: 0.056 },
    { codigo: 'URU11', rotulo: 'URU 2011: Uruaçu, GO', n: 30, qui2: 1.3, valorP: 0.723 },
    { codigo: 'VIT06', rotulo: 'VIT 2006: Vitória, ES', n: 30, qui2: 2.4, valorP: 0.492 }
  ];

  // Endereço da ficha de saída no Moodle. Vazio esconde o botão.
  var MOODLE_URL = '';

  return {
    SACO: SACO,
    POTE_A: POTE_A,
    POTE_B: POTE_B,
    POPULACOES: POPULACOES,
    MOODLE_URL: MOODLE_URL
  };
})();

if (typeof module !== 'undefined') module.exports = DADOS; else window.DADOS = DADOS;
