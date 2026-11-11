// Gera uma cópia do aplicativo em um único arquivo HTML (CSS e JavaScript embutidos),
// para anexar ao Moodle e abrir sem internet.
// Uso: node deriva/ferramentas/arquivo_unico.js caminho/de/saida.html
const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');
const saida = process.argv[2] || path.join(base, 'deriva_e_febre_amarela.html');
let html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, arq) =>
  '<style>\n' + fs.readFileSync(path.join(base, arq), 'utf8') + '\n</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, arq) =>
  '<script>\n' + fs.readFileSync(path.join(base, arq), 'utf8').replace(/<\/script>/g, '<\\/script>') + '\n</script>');
fs.writeFileSync(saida, html);
console.log('Gerado: ' + saida + ' (' + Math.round(html.length / 1024) + ' kB)');
