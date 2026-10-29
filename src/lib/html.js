/*
 * html`` — a tiny JSX-like tagged template for React, so the app needs no build step.
 *
 *   html`<button class="btn" onClick=${save} style="height: 44px; ${extra}">Ajouter</button>`
 *
 * Rules (same as htm):
 *  - Every tag must be closed: <div></div>, <input />, <img />.
 *  - An attribute that is exactly one ${…} gets the raw value (function, boolean, number…);
 *    an attribute mixing text and ${…} becomes a string.
 *  - `class` → className, `for` → htmlFor, and a `style` string is turned into a style object.
 *  - Whitespace that contains a line break, at the start or end of a text run, is dropped.
 */
(function () {
  var MARK = '\u0001';
  var cache = new WeakMap();
  var styleCache = new Map();
  var VOID = { input: 1, img: 1, br: 1, hr: 1, meta: 1, link: 1, area: 1, source: 1, col: 1, wbr: 1 };

  function camel(prop) {
    if (prop.indexOf('--') === 0) return prop;
    if (prop.indexOf('-webkit-') === 0) prop = 'Webkit' + prop.slice(7);
    return prop.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }

  // "a: b; c: d" → { a: 'b', c: 'd' } (semicolons inside parentheses or quotes are kept)
  function parseStyle(str) {
    var hit = styleCache.get(str);
    if (hit) return hit;
    var out = {}, depth = 0, quote = null, start = 0;
    var decls = [];
    for (var i = 0; i <= str.length; i++) {
      var ch = str[i];
      if (i === str.length || (ch === ';' && depth === 0 && !quote)) { decls.push(str.slice(start, i)); start = i + 1; continue; }
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    decls.forEach(function (d) {
      var c = d.indexOf(':');
      if (c < 0) return;
      var k = d.slice(0, c).trim(), val = d.slice(c + 1).trim();
      if (k && val) out[camel(k)] = val;
    });
    if (styleCache.size > 5000) styleCache.clear();
    styleCache.set(str, out);
    return out;
  }

  function trimText(t) { return t.replace(/^\s*\n\s*|\s*\n\s*$/g, ''); }

  // A text or attribute piece: list of literal strings and value indexes.
  function split(raw) {
    var parts = raw.split(MARK), out = [];
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { if (parts[i]) out.push(parts[i]); }
      else out.push(+parts[i]);
    }
    return out;
  }

  function compile(strings) {
    var src = strings[0];
    for (var i = 1; i < strings.length; i++) src += MARK + (i - 1) + MARK + strings[i];
    var pos = 0, root = { children: [] }, stack = [root];

    function top() { return stack[stack.length - 1]; }
    function addText(t) {
      t = trimText(t);
      if (!t) return;
      split(t).forEach(function (p) { top().children.push(typeof p === 'number' ? { v: p } : { t: p }); });
    }

    while (pos < src.length) {
      var lt = src.indexOf('<', pos);
      if (lt < 0) { addText(src.slice(pos)); break; }
      addText(src.slice(pos, lt));
      if (src[lt + 1] === '/') {                       // closing tag
        var gt = src.indexOf('>', lt);
        var closing = src.slice(lt + 2, gt).trim();
        var open = stack.pop();
        if (!open || (closing && closing !== '/' && open.tag !== closing)) {
          throw new Error('html``: </' + closing + '> does not match <' + (open && open.tag) + '>');
        }
        pos = gt + 1;
        continue;
      }
      var m = /^<([A-Za-z][\w.-]*)/.exec(src.slice(lt));
      if (!m) { addText('<'); pos = lt + 1; continue; }
      var node = { tag: m[1], attrs: [], children: [] };
      pos = lt + m[0].length;
      var selfClose = false;
      while (pos < src.length) {
        while (/\s/.test(src[pos])) pos++;
        if (src[pos] === '>') { pos++; break; }
        if (src[pos] === '/' && src[pos + 1] === '>') { pos += 2; selfClose = true; break; }
        var nm = /^[^\s=/>]+/.exec(src.slice(pos));
        if (!nm) throw new Error('html``: bad attribute near ' + src.slice(pos, pos + 30));
        var name = nm[0], value = [true];
        pos += name.length;
        if (src[pos] === '=') {
          pos++;
          if (src[pos] === '"' || src[pos] === "'") {
            var q = src[pos], end = src.indexOf(q, pos + 1);
            value = split(src.slice(pos + 1, end));
            if (!value.length) value = [''];
            pos = end + 1;
          } else {
            var bare = /^[^\s>]+/.exec(src.slice(pos))[0];
            if (bare[bare.length - 1] === '/' && src[pos + bare.length] === '>') bare = bare.slice(0, -1);
            value = split(bare);
            pos += bare.length;
          }
        }
        node.attrs.push({ name: name, value: value });
      }
      top().children.push(node);
      if (!selfClose && !VOID[node.tag.toLowerCase()]) stack.push(node);
    }
    if (stack.length !== 1) throw new Error('html``: <' + top().tag + '> is never closed');
    return root.children;
  }

  function build(nodes, vals) {
    var out = [];
    nodes.forEach(function (n) {
      if (n.t !== undefined) { out.push(n.t); return; }
      if (n.v !== undefined) { out.push(vals[n.v]); return; }
      var props = {};
      n.attrs.forEach(function (a) {
        var v;
        if (a.value.length === 1 && typeof a.value[0] === 'number') v = vals[a.value[0]];
        else if (a.value.length === 1 && a.value[0] === true) v = true;
        else v = a.value.map(function (p) { return typeof p === 'number' ? (vals[p] == null ? '' : vals[p]) : p; }).join('');
        var k = a.name === 'class' ? 'className' : a.name === 'for' ? 'htmlFor' : a.name;
        if (k === 'style' && typeof v === 'string') v = parseStyle(v);
        props[k] = v;
      });
      var args = [n.tag, props];
      var kids = build(n.children, vals);
      for (var i = 0; i < kids.length; i++) args.push(kids[i]);
      out.push(React.createElement.apply(null, args));
    });
    return out;
  }

  window.html = function (strings) {
    var tree = cache.get(strings);
    if (!tree) { tree = compile(strings); cache.set(strings, tree); }
    var vals = Array.prototype.slice.call(arguments, 1);
    var out = build(tree, vals);
    return out.length === 1 ? out[0] : out;
  };
  window.html.parseStyle = parseStyle;
})();

// Karaoké thumbnails come from YouTube: if one can't load (offline, removed video), show the plain card.
window.hideBrokenImage = function (e) { e.currentTarget.style.display = 'none'; };
