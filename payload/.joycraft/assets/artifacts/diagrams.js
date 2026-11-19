(function artifactDiagrams(global) {
  'use strict';

  // The page does not carry Mermaid. It loads this exact file, and only when the page has a
  // diagram. The integrity value pins the bytes: another file under this URL does not run.
  var SOURCE = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.17.2/mermaid.min.js';
  var INTEGRITY = 'sha512-vVGqEG+fvZZAmwA11LG1aLNuXQnraqZPVkL17zv1/0qDtAmoPl70hXI6oZZI4IL57LgjerTteCCpTs1pKIWLmw==';
  var NOT_LOADED = 'This diagram could not be drawn: the diagram script did not load. This is its source.';
  var NOT_VALID = 'This diagram could not be drawn: its Mermaid text has an error. This is its source.';

  var document = global.document;
  // A served page allows a script only with the page's nonce.
  var nonce = document.currentScript ? document.currentScript.nonce : '';
  var state = 'idle';
  var drawings = Object.create(null);
  var errors = Object.create(null);
  var count = 0;

  function figures() { return Array.prototype.slice.call(document.querySelectorAll('.jca-diagram')); }
  function sourceOf(figure) { var code = figure.querySelector('code'); return code ? code.textContent : ''; }

  function note(figure, text) {
    var line = document.createElement('p');
    line.className = 'jca-diagram-note';
    line.textContent = text;
    figure.prepend(line);
    figure.setAttribute('data-jca-diagram', 'source');
  }

  function show(figure, svg) {
    var drawing = document.createElement('div');
    drawing.className = 'jca-diagram-drawing';
    drawing.innerHTML = svg;
    figure.querySelector('pre').hidden = true;
    figure.append(drawing);
    figure.setAttribute('data-jca-diagram', 'drawn');
  }

  // The kit builds its part of the page again after each change, so a figure can be new
  // more than once. A drawing is kept by its source and is not drawn twice.
  function draw() {
    figures().forEach(function (figure) {
      if (figure.hasAttribute('data-jca-diagram')) return;
      var source = sourceOf(figure);
      if (state === 'failed') return note(figure, NOT_LOADED);
      if (drawings[source]) return show(figure, drawings[source]);
      if (errors[source]) return note(figure, NOT_VALID);
      if (state !== 'ready') return load();
      figure.setAttribute('data-jca-diagram', 'drawing');
      global.mermaid.render('jca-mermaid-' + (count += 1), source).then(function (result) {
        drawings[source] = result.svg;
      }, function () {
        errors[source] = true;
      }).then(function () {
        if (figure.getAttribute('data-jca-diagram') === 'drawing') figure.removeAttribute('data-jca-diagram');
        draw();
      });
    });
  }

  function color(style, token) { return style.getPropertyValue('--' + token).trim(); }

  function start() {
    // The page's article has the theme, its colors and the text font.
    var themed = document.querySelector('.joycraft-artifact') || document.documentElement;
    var style = global.getComputedStyle(themed);
    global.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: {
        darkMode: themed.getAttribute('data-jca-theme') === 'dark',
        background: color(style, 'paper'),
        primaryColor: color(style, 'accent-soft'),
        primaryTextColor: color(style, 'ink'),
        primaryBorderColor: color(style, 'control-line'),
        secondaryColor: color(style, 'surface'),
        tertiaryColor: color(style, 'canvas'),
        lineColor: color(style, 'muted'),
        edgeLabelBackground: color(style, 'paper'),
        clusterBkg: color(style, 'surface'),
        clusterBorder: color(style, 'line'),
        textColor: color(style, 'ink'),
        fontFamily: style.fontFamily
      }
    });
    state = 'ready';
    draw();
  }

  function load() {
    if (state !== 'idle') return;
    state = 'loading';
    var script = document.createElement('script');
    script.src = SOURCE;
    script.integrity = INTEGRITY;
    script.crossOrigin = 'anonymous';
    if (nonce) script.nonce = nonce;
    script.onload = function () {
      try { start(); }
      catch (error) { state = 'failed'; draw(); }
    };
    script.onerror = function () { state = 'failed'; draw(); };
    document.head.append(script);
  }

  global.JoycraftDiagrams = { draw: draw, source: SOURCE };
  draw();
})(window);
