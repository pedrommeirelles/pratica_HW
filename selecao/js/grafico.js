// Gráfico de linhas em SVG, sem bibliotecas externas.
// Cores pelas classes CSS (laranja = R, azul = S, cinza = referência).

var GRAFICO = (function () {
  'use strict';

  function num(x, casas) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // op = { largura, altura, x: {min, max, ticks, rotulo, fmt}, y: {min, max, ticks, rotulo, fmt},
  //        series: [{ pontos: [[x, y]], classe, traco, rotulo }],
  //        marcas: [{ x, y, rotulo, classe }], refs: [{ y, rotulo }], verticais: [{ x, rotulo }],
  //        descricao }
  function linhas(op) {
    var L = op.largura || 640, A = op.altura || 340;
    var m = { e: 58, d: 18, t: 16, b: 52 };
    var lx = L - m.e - m.d, ly = A - m.t - m.b;
    var x0 = op.x.min, x1 = op.x.max, y0 = op.y.min, y1 = op.y.max;
    var fx = op.x.fmt || function (v) { return num(v, 0); };
    var fy = op.y.fmt || function (v) { return num(v, 2); };

    function X(v) { return m.e + (v - x0) / (x1 - x0) * lx; }
    function Y(v) { return m.t + (1 - (v - y0) / (y1 - y0)) * ly; }

    var s = [];
    s.push('<svg class="grafico" viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' + esc(op.descricao || 'Gráfico') + '">');

    // grade e eixos
    (op.y.ticks || []).forEach(function (v) {
      s.push('<line class="grade-linha" x1="' + m.e + '" x2="' + (m.e + lx) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>');
      s.push('<text class="eixo-texto" x="' + (m.e - 8) + '" y="' + (Y(v) + 5) + '" text-anchor="end">' + esc(fy(v)) + '</text>');
    });
    (op.x.ticks || []).forEach(function (v) {
      s.push('<line class="grade-linha fraca" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (m.t + ly) + '"/>');
      s.push('<text class="eixo-texto" x="' + X(v) + '" y="' + (m.t + ly + 20) + '" text-anchor="middle">' + esc(fx(v)) + '</text>');
    });
    s.push('<line class="eixo" x1="' + m.e + '" x2="' + (m.e + lx) + '" y1="' + (m.t + ly) + '" y2="' + (m.t + ly) + '"/>');
    s.push('<line class="eixo" x1="' + m.e + '" x2="' + m.e + '" y1="' + m.t + '" y2="' + (m.t + ly) + '"/>');
    if (op.x.rotulo) s.push('<text class="eixo-rotulo" x="' + (m.e + lx / 2) + '" y="' + (A - 8) + '" text-anchor="middle">' + esc(op.x.rotulo) + '</text>');
    if (op.y.rotulo) s.push('<text class="eixo-rotulo" transform="translate(14 ' + (m.t + ly / 2) + ') rotate(-90)" text-anchor="middle">' + esc(op.y.rotulo) + '</text>');

    // linhas de referência
    (op.refs || []).forEach(function (r) {
      s.push('<line class="referencia" x1="' + m.e + '" x2="' + (m.e + lx) + '" y1="' + Y(r.y) + '" y2="' + Y(r.y) + '"/>');
      if (r.rotulo) {
        var esq = r.lado === 'esquerda';
        s.push('<text class="ref-texto" x="' + (esq ? m.e + 6 : m.e + lx - 4) + '" y="' + (Y(r.y) - 6) + '" text-anchor="' + (esq ? 'start' : 'end') + '">' + esc(r.rotulo) + '</text>');
      }
    });
    (op.verticais || []).forEach(function (r) {
      s.push('<line class="referencia" x1="' + X(r.x) + '" x2="' + X(r.x) + '" y1="' + m.t + '" y2="' + (m.t + ly) + '"/>');
      if (r.rotulo) s.push('<text class="ref-texto" x="' + (X(r.x) + 4) + '" y="' + (m.t + 14) + '">' + esc(r.rotulo) + '</text>');
    });

    // séries
    var rotulos = [];
    (op.series || []).forEach(function (se) {
      if (!se.pontos || se.pontos.length < 2) return;
      var d = se.pontos.map(function (pt, i) {
        var xv = Math.max(x0, Math.min(x1, pt[0]));
        return (i ? 'L' : 'M') + X(xv).toFixed(1) + ' ' + Y(Math.max(y0, Math.min(y1, pt[1]))).toFixed(1);
      }).join(' ');
      s.push('<path class="serie ' + (se.classe || 'r') + ' ' + (se.traco || 'cheio') + '" d="' + d + '"/>');
      if (se.rotulo) {
        var ult = se.pontos[se.pontos.length - 1];
        var ry = Y(Math.max(y0, Math.min(y1, ult[1])));
        rotulos.push({ x: X(Math.min(x1, ult[0])) - 4, y: ry - 8 + (se.dy || 0), texto: se.rotulo });
      }
    });
    // rótulos das séries sem sobreposição: espaçamento mínimo de 17 px, dentro da área do gráfico
    rotulos.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < rotulos.length; i++) {
      rotulos[i].y = Math.max(rotulos[i].y, m.t + 12);
      if (i > 0 && rotulos[i].y - rotulos[i - 1].y < 17) rotulos[i].y = rotulos[i - 1].y + 17;
    }
    for (var j = rotulos.length - 1; j >= 0; j--) {
      var teto = m.t + ly - 4 - (rotulos.length - 1 - j) * 17;
      if (rotulos[j].y > teto) rotulos[j].y = teto;
      if (j < rotulos.length - 1 && rotulos[j + 1].y - rotulos[j].y < 17) rotulos[j].y = rotulos[j + 1].y - 17;
    }
    rotulos.forEach(function (r) {
      s.push('<text class="serie-rotulo" x="' + r.x.toFixed(1) + '" y="' + r.y.toFixed(1) + '" text-anchor="end">' + esc(r.texto) + '</text>');
    });

    // pontos observados e marcadores
    (op.marcas || []).forEach(function (mk) {
      var cx = X(mk.x), cy = Y(mk.y);
      s.push('<circle class="marca ' + (mk.classe || '') + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (mk.raio || 6) + '"/>');
      if (mk.rotulo) {
        var ancora = cx > m.e + lx * 0.8 ? 'end' : 'start';
        var dx = ancora === 'end' ? -10 : 10;
        var yy = cy + (mk.abaixo ? 20 : -10);
        s.push('<text class="marca-texto" x="' + (cx + dx).toFixed(1) + '" y="' + yy.toFixed(1) + '" text-anchor="' + ancora + '">' + esc(mk.rotulo) + '</text>');
      }
    });

    s.push('</svg>');
    return s.join('');
  }

  return { linhas: linhas, num: num };
})();

if (typeof module !== 'undefined') module.exports = GRAFICO; else window.GRAFICO = GRAFICO;
