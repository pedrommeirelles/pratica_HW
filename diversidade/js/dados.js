// Dados publicados usados na prática de 26/11 (conferidos nos artigos em 25/11/2026).
window.DADOS = window.DADOS || {};

// Endereço da ficha de saída no Moodle (preencher para mostrar o botão no Passo 6).
window.DADOS.MOODLE_URL = '';

// Haag et al. (2010): áreas e amostras (Métodos) e tamanho efetivo pelo método LDNE, com o intervalo de 95% (Resultados).
window.DADOS.info = {
  'Corredor Verde': {
    curto: 'CV',
    area: 'Corredor Verde de Misiones (Argentina), com os parques do Iguaçu e do Turvo (Brasil): 1,1 milhão de ha, 200 km de ponta a ponta',
    amostras: '11 de sangue, tecido, soro, pele e pelo (1992 a 2007) e 7 de fezes',
    Ne: '51,4', NeIC: '23,5 a 11.004,5'
  },
  'Morro do Diabo': {
    curto: 'MD',
    area: 'Parque Estadual do Morro do Diabo (SP): 37 mil ha',
    amostras: 'sangue de 8 onças (1998 a 2004)',
    Ne: '4,6', NeIC: '2,3 a 12,8'
  },
  'Ivinhema': {
    curto: 'IV',
    area: 'Parque Estadual das Várzeas do Rio Ivinhema (MS): 73,3 mil ha',
    amostras: '8 de sangue e tecido (2002 a 2007) e 2 de fezes',
    Ne: '12,3', NeIC: '6,9 a 27,1'
  },
  'Porto Primavera': {
    curto: 'PP',
    area: 'Margens do rio Paraná na área do reservatório de Porto Primavera (MS e SP); o reservatório, cheio em 1998, alagou 220 mil ha',
    amostras: '23 de sangue, tecido e pele (1993 a 2004)',
    Ne: '13,5', NeIC: '10,4 a 18,0'
  }
};

// Haag et al. (2010), Tabela 1: n, número médio de alelos por loco (A), riqueza alélica (AR, 8 onças),
// heterozigosidade observada (Ho) e esperada (He, a "diversidade gênica não enviesada" do FSTAT).
window.DADOS.tabela1 = {
  'Corredor Verde': { n: 18, A: 6, AR: 5.05, Ho: 0.607, He: 0.737 },
  'Morro do Diabo': { n: 8, A: 3.2, AR: 3.2, Ho: 0.548, He: 0.497 },
  'Ivinhema': { n: 10, A: 4.3, AR: 4.2, Ho: 0.680, He: 0.642 },
  'Porto Primavera': { n: 23, A: 5.5, AR: 4.54, Ho: 0.782, He: 0.716 },
  'Todas': { n: 59, A: 7.2, AR: 7.19, Ho: 0.682, He: 0.732 }
};
// Alelos privados rarefeitos (HP-Rare), no texto dos Resultados.
window.DADOS.privadosArtigo = { 'Corredor Verde': 1.43, 'Morro do Diabo': 0.15, 'Ivinhema': 0.24, 'Porto Primavera': 0.29 };

// Auler et al. (2002): araucária em Santa Catarina, 15 locos de isoenzimas, 9 populações, 328 árvores.
// P pelo critério de 95%.
window.DADOS.araucaria = [
  { grupo: 'Espécie (9 populações)', P: '73,3%', A: '1,6', He: '0,084', Ho: '0,072' },
  { grupo: 'Populações mais conservadas (2)', P: '43,3%', A: '1,8', He: '0,112', Ho: '' },
  { grupo: 'Populações degradadas (4)', P: '20,0%', A: '1,4', He: '0,059', Ho: '' }
];

window.DADOS.fontes = {
  haag: 'Haag T, Santos AS, Sana DA, Morato RG, Cullen Jr L, Crawshaw Jr PG, De Angelo C, Di Bitetti MS, Salzano FM, Eizirik E (2010) The effect of habitat fragmentation on the genetic structure of a top predator: loss of diversity and high differentiation among remnant populations of Atlantic Forest jaguars (Panthera onca). Molecular Ecology 19(22):4906-4921. doi:10.1111/j.1365-294X.2010.04856.x. Genótipos: Dryad, doi:10.5061/dryad.1884, e conjunto jaguar do pacote R pegas.',
  auler: 'Auler NMF, Reis MS, Guerra MP, Nodari RO (2002) The genetics and conservation of Araucaria angustifolia: I. Genetic structure and diversity of natural populations by means of non-adaptive variation in the state of Santa Catarina, Brazil. Genetics and Molecular Biology 25(3):329-338. doi:10.1590/S1415-47572002000300014.'
};
