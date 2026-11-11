// Dados e parâmetros da prática de deriva (12/11).
// Dietz et al. (2019) Sci Rep 9:12926: censo de 2014 e 2018 e Poço das Antas.
// As frequências do microssatélite do Passo 3 são ilustrativas: não são dados do mico.

var DADOS = (function () {
  'use strict';

  // Microssatélite ilustrativo do Passo 3: seis alelos, do mais comum ao mais raro.
  var MICROSSATELITE = {
    freqs: [0.40, 0.25, 0.15, 0.10, 0.06, 0.04],
    nomes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
    cores: ['#2A78D6', '#EB6834', '#7A7974', '#1BAF7A', '#7A6FB0', '#C9A227']
  };

  // Fragmentos por rodada no Passo 3.
  var FRAGMENTOS_GARGALO = 500;

  // Sementes padrão: todos os aparelhos veem o mesmo resultado no primeiro sorteio.
  // "Sortear de novo" soma 1 à semente.
  // Escolhidas por darem, no primeiro sorteio, resultados perto do esperado pela teoria.
  var SEMENTES = { um: 1211, varios: 1262, gargalo: 1235 };

  // Dietz et al. (2019): estimativa da população (método 2) e Poço das Antas.
  var CENSO = { ano1: 2014, n1: 3706, ano2: 2018, n2: 2516, n2metodo1: 2578 };
  var POCO_DAS_ANTAS = { gruposSumiram: 8, gruposRestantes: 5, micosVistos: 16 };

  var FONTES = {
    dietz2019: 'Dietz JM, Hankerson SJ, Alexandre BR, Henry MD, Martins AF, Ferraz LP, Ruiz-Miranda CR (2019) Yellow fever in Brazil threatens successful recovery of endangered golden lion tamarins. Scientific Reports 9:12926. doi:10.1038/s41598-019-49199-6',
    grativol2001: 'Grativol AD, Ballou JD, Fleischer RC (2001) Microsatellite variation within and among recently fragmented populations of the golden lion tamarin (Leontopithecus rosalia). Conservation Genetics 2:1-9',
    dietzBaker1993: 'Dietz JM, Baker AJ (1993) Polygyny and female reproductive success in golden lion tamarins, Leontopithecus rosalia. Animal Behaviour 46:1067-1078',
    henry2013: 'Henry MD, Hankerson SJ, Siani JM, French JA, Dietz JM (2013) High rates of pregnancy loss by subordinates leads to high reproductive skew in wild golden lion tamarins (Leontopithecus rosalia). Hormones and Behavior 63(5):675-683. doi:10.1016/j.yhbeh.2013.02.009'
  };

  // Endereço da ficha de saída no Moodle. Vazio esconde o botão.
  var MOODLE_URL = '';

  return {
    MICROSSATELITE: MICROSSATELITE,
    FRAGMENTOS_GARGALO: FRAGMENTOS_GARGALO,
    SEMENTES: SEMENTES,
    CENSO: CENSO,
    POCO_DAS_ANTAS: POCO_DAS_ANTAS,
    FONTES: FONTES,
    MOODLE_URL: MOODLE_URL
  };
})();

if (typeof module !== 'undefined') module.exports = DADOS; else window.DADOS = DADOS;
