/*
 * Question modes, and merging the questions published in data/questions.js
 * with the ones saved on this device.
 */
var MODES = {
  quiz:    { key: 'quiz',    tag: 'Quiz',       tab: 'Quiz',                      start: 'Lancer le quiz',        items: 'questions',  empty: 'questions de quiz',       sizeLabel: 'Nombre de questions' },
  paroles: { key: 'paroles', tag: 'Paroles',    tab: "N'oubliez pas les paroles", start: 'Lancer les paroles', items: 'chansons',   empty: 'paroles',                 sizeLabel: 'Nombre de chansons' },
  blind:   { key: 'blind',   tag: 'Blind test', tab: 'Blind test',                start: 'Lancer le blind test',  items: 'extraits',   empty: 'questions de blind test', sizeLabel: "Nombre d'extraits" }
};
var MODE_KEYS = ['quiz', 'paroles', 'blind'];

// "Blind test" / "blind" / "Paroles" / "" → mode key (missing or unknown means quiz)
function parseMode(s) {
  s = String(s || '').toLowerCase();
  if (/blind/.test(s)) return 'blind';
  if (/parole/.test(s)) return 'paroles';
  return 'quiz';
}

function hashString(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// One entry of data/questions.js → the app's question shape.
function fromShipped(e) {
  var mode = parseMode(e.mode);
  var answers = (e.answers || []).map(function (a) { return String(a).trim(); }).filter(Boolean).slice(0, 6);
  var c = String(e.correct == null ? 'A' : e.correct).trim();
  var correct = /^[A-Fa-f]$/.test(c) ? c.toUpperCase().charCodeAt(0) - 65 : /^\d$/.test(c) ? parseInt(c, 10) - 1 : answers.indexOf(c);
  var q = {
    mode: mode,
    q: mode === 'blind' ? '' : String(e.question || '').trim(),
    options: mode === 'blind' ? [] : answers,
    correct: mode === 'blind' ? -1 : correct,
    answer: mode === 'blind' ? String(e.answer || '').trim() : '',
    category: String(e.category || '').trim(),
    link: String(e.link || '').trim()
  };
  q.id = 's-' + hashString([q.mode, q.q, q.answer, q.link].join('|'));
  q.shipped = true;
  return q;
}

function shippedQuestions() {
  var list = typeof QUESTIONS !== 'undefined' && Array.isArray(QUESTIONS) ? QUESTIONS : [];
  var seen = {};
  return list.map(fromShipped).filter(function (q) {
    var ok = q.mode === 'blind' ? !!(q.link && q.answer) : !!(q.q && q.options.length >= 2 && q.correct >= 0 && q.correct < q.options.length);
    if (!ok || seen[q.id]) return false;
    seen[q.id] = true;
    return true;
  });
}

/*
 * bank: questions saved on this device. hidden: ids of published questions deleted on this device.
 * - published questions not on the device yet are added;
 * - a published question the device never edited is refreshed from the file (its play count is kept);
 * - one edited on the device keeps the device's version.
 */
function mergeShipped(bank, hidden) {
  var shipped = shippedQuestions();
  var byId = {};
  shipped.forEach(function (q) { byId[q.id] = q; });
  var hide = {};
  (hidden || []).forEach(function (id) { hide[id] = true; });
  var out = [], have = {};
  (bank || []).forEach(function (q) {
    q = Object.assign({ mode: 'quiz', options: [], correct: -1, answer: '', category: '', link: '' }, q);
    if (q.shipped && !byId[q.id] && !q.edited) return;           // removed from the file
    if (byId[q.id] && !q.edited) q = Object.assign({}, byId[q.id], { played: q.played || 0 });
    have[q.id] = true;
    out.push(q);
  });
  shipped.forEach(function (q) { if (!have[q.id] && !hide[q.id]) out.push(Object.assign({ played: 0 }, q)); });
  return out;
}
