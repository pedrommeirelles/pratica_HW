# Gametas ao acaso

Site estático da prática de equilíbrio de Hardy-Weinberg da disciplina BIOC10 Genética II (Instituto de Biologia, UFBA), com *Aedes aegypti* e o gene do canal de sódio (NaV). Em seis telas curtas, cada estudante sorteia gametas de um saco e de dois potes, testa o equilíbrio nas contagens do próprio gel (Entrega 1) e gera um registro em texto. Há também uma calculadora de Hardy-Weinberg para dois alelos.

Para abrir localmente, basta clonar o repositório e abrir o arquivo `index.html` no navegador (duplo clique funciona, sem servidor). Se preferir um servidor local, rode `python3 -m http.server 8000` na pasta e acesse `http://localhost:8000`. Os testes da parte estatística rodam com `node --test tests/hw.test.js`. O parâmetro de URL `?semente=123` fixa a semente dos sorteios, para demonstração.

Fonte dos dados: Linss JGB et al. (2014). Distribution and dissemination of the Val1016Ile and Phe1534Cys Kdr mutations in *Aedes aegypti* Brazilian natural populations. Parasites & Vectors 7:25, Tabela 3. doi:10.1186/1756-3305-7-25.

## Fumacê e seleção (pasta `selecao/`)

Prática de seleção natural de 05/11/2026, no ar em https://pedrommeirelles.github.io/pratica_HW/selecao/. Sete telas: previsão; Rodada 1, seleção com inseticida (*p*~0~, *s* e dominância de R, uma geração de cada vez); Rodada 2, "acerte a curva" com as séries de Aracaju, Vitória e Mossoró da Tabela 3 de Linss et al. (2014); Rodada 3, o custo da resistência nas gaiolas sem inseticida de Smith et al. (2021) e a volta do *kdr* de Aracaju; heterozigoto mais apto; parágrafo para o blog; registro em texto. Os cartões "Pare aqui" indicam o momento de cada questão do estudo dirigido de 03/11.

Modelo: um loco, dois alelos, população grande, acasalamento ao acaso, gerações separadas; *p*' = (*p*²*w*~RR~ + *pq w*~RS~) / *w̄*. Os testes rodam com `node --test selecao/tests/modelo.test.js` e conferem cada conta por um segundo cálculo (Δ*p*, frações exatas e valores de referência calculados à parte). Para gerar a cópia em arquivo único, sem internet: `node selecao/ferramentas/arquivo_unico.js saida.html`.

Fontes: Linss JGB et al. (2014) Parasites & Vectors 7:25, Tabela 3, doi:10.1186/1756-3305-7-25. Smith LB et al. (2021) PLoS Neglected Tropical Diseases 15(3):e0009271, doi:10.1371/journal.pntd.0009271.
