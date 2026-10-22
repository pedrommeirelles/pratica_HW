# Gametas ao acaso

Site estático da prática de equilíbrio de Hardy-Weinberg da disciplina BIOC10 Genética II (Instituto de Biologia, UFBA), com *Aedes aegypti* e o gene do canal de sódio (NaV). Em seis telas curtas, cada estudante sorteia gametas de um saco e de dois potes, testa o equilíbrio nas contagens do próprio gel (Entrega 1) e gera um registro em texto. Há também uma calculadora de Hardy-Weinberg para dois alelos.

Para abrir localmente, basta clonar o repositório e abrir o arquivo `index.html` no navegador (duplo clique funciona, sem servidor). Se preferir um servidor local, rode `python3 -m http.server 8000` na pasta e acesse `http://localhost:8000`. Os testes da parte estatística rodam com `node --test tests/hw.test.js`. O parâmetro de URL `?semente=123` fixa a semente dos sorteios, para demonstração.

Fonte dos dados: Linss JGB et al. (2014). Distribution and dissemination of the Val1016Ile and Phe1534Cys Kdr mutations in *Aedes aegypti* Brazilian natural populations. Parasites & Vectors 7:25, Tabela 3. doi:10.1186/1756-3305-7-25.
