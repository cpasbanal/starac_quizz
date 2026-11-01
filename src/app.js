/*
 * Quiz Party – Star Academy edition: the app's logic.
 *
 *   state      everything the app knows (players, questions, the game in progress…)
 *   renderVals turns the state into ready-to-show values and click handlers ("v")
 *   view(v)    src/view.js draws the screens from those values
 *
 * Three game modes share one engine: quiz and paroles (multiple choice), blind test (host marks ✓ / ✗).
 * Modes, and the questions published with the app, live in src/bank.js and data/questions.js.
 */

// Game options.
var CONFIG = {
  autoReveal: true,   // reveal the answer when the timer reaches zero
  hideScores: false   // hide the leaderboard until the final screen
};

var STORAGE_KEY = 'quizparty:v2';
// What survives a reload: data, settings and the game in progress — not open dialogs, messages or search boxes.
var SAVED_KEYS = ['roster', 'nextId', 'bank', 'nextQ', 'hiddenShipped', 'gameSize', 'timerSec', 'gameCats', 'tab', 'panel', 'setMode',
  'parolesLevel', 'favorites',
  'screen', 'gameMode', 'gameQs', 'gamePlayers', 'qIndex', 'picks', 'revealed', 'scores', 'results', 'lastGain', 'qDeadline',
  'buzz', 'blindPhase', 'blindMs'];
var GAME_TABS = { quiz: 1, paroles: 1, blind: 1 };
var lastSaved = null;

function pickSaved(st) {
  var out = {};
  SAVED_KEYS.forEach(function (k) { if (st[k] !== undefined) out[k] = st[k]; });
  return out;
}

function saveState(st) {
  var json = JSON.stringify(pickSaved(st));
  if (json === lastSaved) return;
  lastSaved = json;
  try { window.localStorage.setItem(STORAGE_KEY, json); } catch (e) {}
}

function loadSaved() {
  var s = null;
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      s = pickSaved(JSON.parse(raw));
      if (!Array.isArray(s.bank) || !Array.isArray(s.roster)) s = null;
    } else {
      var old = window.localStorage.getItem('quizparty:v1');   // very first version of the app
      if (old) {
        var o = JSON.parse(old);
        var bank = (o.questions || []).map(function (q, i) { return { id: 'q' + (i + 1), q: q.q, options: q.options, correct: q.correct, played: 0 }; });
        var roster = (o.players || []).map(function (p, i) { return { id: 'p' + (i + 1), name: p.name, active: true }; });
        s = { bank: bank, nextQ: bank.length + 1, roster: roster, nextId: roster.length + 1 };
      }
    }
  } catch (e) { s = null; }
  s = s || {};
  // Older saves: tabs were play / bank / kara, and every question was a quiz question.
  if (s.tab === 'play' || !s.tab) s.tab = 'quiz';
  if (s.tab === 'bank') s.tab = 'settings';
  if (s.screen === 'play' && !s.gameMode) s.gameMode = 'quiz';
  s.bank = mergeShipped(s.bank, s.hiddenShipped);
  // A reload in the middle of a timed question restarts that question's countdown instead of revealing at once.
  if (s.screen === 'play' && s.qDeadline && !s.revealed && s.timerSec) s.qDeadline = Date.now() + s.timerSec * 1000;
  // A blind-test clip playing at reload is stopped: the music doesn't survive a reload either.
  if (s.blindPhase === 'playing') s.blindPhase = 'stopped';
  return s;
}

// Link → what to play. YouTube keeps its start time (&t=90, &t=1m30s); Spotify gives an embed uri.
function parseMedia(raw) {
  var u = (raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  var m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) {
    var start = 0, tm = u.match(/[?&#](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(\d+)?s?/);
    if (tm) start = (+tm[1] || 0) * 3600 + (+tm[2] || 0) * 60 + (+tm[3] || 0);
    return { kind: 'youtube', label: 'YouTube', id: m[1], start: start, href: u,
      src: 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0' + (start ? '&start=' + start : '') };
  }
  var s = u.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/i);
  if (s) return { kind: 'spotify', label: 'Spotify', uri: 'spotify:' + s[1] + ':' + s[2], start: 0, href: u,
    src: 'https://open.spotify.com/embed/' + s[1] + '/' + s[2] + '?utm_source=generator' };
  var host = '';
  try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) {}
  return { kind: 'link', label: 'Lien', href: u, host: host };
}

// "Et je m'en vais ___ demain" → [{ text: "Et je m'en vais " }, { blank: true }, { text: ' demain' }]
function lyricParts(line) {
  var parts = [];
  String(line || '').split(/(_{3,})/).forEach(function (p) {
    if (!p) return;
    parts.push(/^_{3,}$/.test(p) ? { blank: true } : { text: p });
  });
  if (!parts.some(function (p) { return p.blank; })) parts.push({ text: ' ' }, { blank: true });
  return parts;
}

// The whole line of a paroles question, the missing words filled in.
function fullLyric(q) {
  var end = q.options[q.correct] || '';
  return lyricParts(q.q).map(function (p) { return p.blank ? end : p.text; }).join('').replace(/\s+/g, ' ').trim();
}

// What the players see of the line at a level: text parts, and hidden parts (the words to find).
//   facile  the ending is hidden (the 4 endings are shown as choices)
//   moyen   the last word is hidden; difficile: the last 3 or 4 words
//   expert  only the start of the line is shown
function parolesParts(q, level) {
  var parts = lyricParts(q.q), end = q.options[q.correct] || '';
  if (level === 'facile') return parts.map(function (p) { return p.blank ? { hidden: true, text: end } : { text: p.text }; });
  if (level === 'expert') {
    var cut = parts.findIndex(function (p) { return p.blank; });
    var start = parts.slice(0, cut).map(function (p) { return p.text; }).join('');
    var rest = parts.slice(cut).map(function (p) { return p.blank ? end : p.text; }).join('');
    return (start.trim() ? [{ text: start }] : []).concat([{ hidden: true, text: rest.trim(), long: true }]);
  }
  var tokens = fullLyric(q).split(/(\s+)/);
  var words = [];
  tokens.forEach(function (t, i) { if (t && !/^\s+$/.test(t)) words.push(i); });
  var n = level === 'moyen' ? 1 : words.length >= 7 ? 4 : 3;
  n = Math.max(1, Math.min(n, words.length - 1));
  var hide = {};
  words.slice(-n).forEach(function (i) { hide[i] = true; });
  var out = [];
  tokens.forEach(function (t, i) {
    if (!t) return;
    if (!hide[i]) { out.push({ text: t }); return; }
    var m = t.match(/^([«"'(]*)(.*?)([.,!?;:…»")]*)$/);   // punctuation stays visible
    if (m[1]) out.push({ text: m[1] });
    out.push({ hidden: true, text: m[2] || t });
    if (m[3]) out.push({ text: m[3] });
  });
  return out;
}

// "Tourner dans le vide, Indila" → { title: 'Tourner dans le vide', artist: 'Indila' }
function songParts(s) {
  s = String(s || '').trim();
  var i = s.lastIndexOf(',');
  return i > 0 ? { title: s.slice(0, i).trim(), artist: s.slice(i + 1).trim() } : { title: s, artist: '' };
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      roster: [], nextId: 1, newName: '',
      bank: [], nextQ: 1, hiddenShipped: [], gameSize: 10, timerSec: 0, search: '',
      form: this.blankForm('quiz'), gameCats: { quiz: 'all', paroles: 'all', blind: 'all' },
      formMsg: '', formOk: true, panel: 'form', setMode: 'all', confirmDelete: null, confirmReplace: false,
      csvText: '', importMsg: '', importOk: true, copied: false,
      tab: 'quiz', screen: 'home', gameMode: 'quiz',
      gameQs: [], gamePlayers: [], qIndex: 0, picks: {}, revealed: false, scores: {}, confirmQuit: false,
      qDeadline: null, results: {}, lastGain: {},
      parolesLevel: 'facile', buzz: {}, blindPhase: 'ready', blindMs: 0, blindAt: null,
      favorites: [], karaSearch: '', karaFilter: 'all', karaPlaying: null
    };
  }

  componentDidMount() {
    var self = this;
    this.onEsc = function (e) { if (e.key === 'Escape' && self.state.karaPlaying != null) self.setState({ karaPlaying: null }); };
    window.addEventListener('keydown', this.onEsc);
    this.setState(loadSaved());
    this.tick = setInterval(function () {
      var st = self.state;
      if (st.screen !== 'play' || st.revealed) return;
      if (st.blindPhase === 'playing') {
        if (self.blindElapsed() >= BLIND_MAX_MS) self.blindStop();
        else self.forceUpdate();
        return;
      }
      if (!st.qDeadline) return;
      if (Date.now() >= st.qDeadline && CONFIG.autoReveal) self.doReveal();
      else self.forceUpdate();
    }, 200);
    this.onKey = function (e) {
      var st = self.state;
      if (st.screen !== 'play') return;
      var tag = (e.target && e.target.tagName) || '';
      // Typing in a field keeps its keys. Buttons don't: after tapping players' answers the focus sits on
      // an answer button, and Space used to un-tick that answer instead of revealing.
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      var q = st.gameQs[st.qIndex];
      if (st.revealed) self.doNext();
      else if (q && q.mode === 'blind' && st.blindPhase === 'ready') self.blindPlay();
      else if (q && q.mode === 'blind' && st.blindPhase === 'playing') self.blindStop();
      else self.doReveal();
    };
    window.addEventListener('keydown', this.onKey);
  }

  componentWillUnmount() {
    clearInterval(this.tick);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keydown', this.onEsc);
  }

  // Saves players, questions, settings and the game in progress — only when they change.
  componentDidUpdate() { saveState(this.state); }

  // ---------- CSV ----------

  parseRows(text) {
    var firstLine = (text.split(/\r?\n/)[0] || '');
    var counts = { '\t': firstLine.split('\t').length, ';': firstLine.split(';').length, ',': firstLine.split(',').length };
    var delim = ',';
    if (counts['\t'] >= counts[';'] && counts['\t'] >= counts[',']) delim = '\t';
    else if (counts[';'] > counts[',']) delim = ';';
    if (counts[delim] === 1) delim = ',';
    var rows = [], row = [], field = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"' && field === '') inQ = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Columns: Question, A, B, (C…F), Réponse, plus optional Catégorie, Lien and Mode (Quiz / Paroles / Blind test).
  // With a header row the columns are found by name; without one the order above is used and every row is a quiz question.
  parseQuestions(text) {
    var rows = this.parseRows(text || '');
    var out = [], skipped = 0, cols = null;
    var norm = function (s) { return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].map(function (x) { return String(x).trim(); });
      if (r === 0 && cells.some(function (c) { return /^(question|questions|q|mode|reponse|answer)$/.test(norm(c)); })) {
        cols = { opts: [] };
        cells.forEach(function (c, h) {
          var n = norm(c);
          if (/^(question|questions|q|paroles)$/.test(n)) cols.q = h;
          else if (/^([a-f]|[1-6]|reponse [a-f])$/.test(n)) cols.opts.push(h);
          else if (/^(reponse|answer|bonne reponse|solution)$/.test(n)) cols.ans = h;
          else if (/^(category|categorie|theme)$/.test(n)) cols.cat = h;
          else if (/^(link|url|lien|media)$/.test(n)) cols.link = h;
          else if (/^(mode|type|jeu)$/.test(n)) cols.mode = h;
          else if (/^(chanson|song|titre)$/.test(n)) cols.song = h;
        });
        continue;
      }
      if (!cells.some(Boolean)) continue;
      var q;
      if (cols) {
        var get = function (i) { return i == null ? '' : (cells[i] || ''); };
        q = { mode: parseMode(get(cols.mode)), q: get(cols.q), category: get(cols.cat), link: get(cols.link) };
        if (q.mode === 'blind') { q.answer = get(cols.ans); q.options = []; q.correct = -1; }
        else {
          q.options = cols.opts.map(get).filter(Boolean).slice(0, 6);
          q.correct = this.answerIndex(get(cols.ans) || (q.mode === 'paroles' ? 'A' : ''), q.options);
          if (q.mode === 'paroles') q.answer = get(cols.song);
        }
      } else {
        while (cells.length && cells[cells.length - 1] === '') cells.pop();
        var link = cells.length > 4 && /^https?:\/\//i.test(cells[cells.length - 1]) ? cells.pop() : '';
        var options = cells.slice(1, cells.length - 1).filter(Boolean).slice(0, 6);
        q = { mode: 'quiz', q: cells[0] || '', options: options, correct: this.answerIndex(cells[cells.length - 1], options), category: '', link: link };
      }
      var problem = this.checkQuestion(q);
      if (problem) { skipped++; continue; }
      out.push(q);
    }
    return { questions: out, skipped: skipped };
  }

  answerIndex(ans, options) {
    ans = String(ans || '').trim();
    if (/^[A-Fa-f]$/.test(ans)) return ans.toUpperCase().charCodeAt(0) - 65;
    if (/^[1-6]$/.test(ans)) return parseInt(ans, 10) - 1;
    var low = ans.toLowerCase();
    for (var k = 0; k < options.length; k++) if (options[k].toLowerCase() === low) return k;
    return -1;
  }

  // Returns what's wrong with a question, or '' when it can be played.
  checkQuestion(q) {
    if (q.mode === 'blind') {
      var m = parseMedia(q.link);
      if (!m || (m.kind !== 'youtube' && m.kind !== 'spotify')) return 'Collez un lien YouTube ou Spotify.';
      if (!q.answer) return 'Écrivez la réponse (titre, artiste).';
      return '';
    }
    if (q.mode === 'paroles') {
      if (!q.q.replace(/_{3,}/g, '').trim()) return 'Écrivez d\'abord le début des paroles.';
      if (!q.options[q.correct]) return 'Écrivez la suite à trouver.';
      return '';
    }
    if (!q.q) return 'Écrivez d\'abord la question.';
    if (q.options.length < 2) return 'Indiquez au moins deux réponses.';
    if (q.correct < 0 || q.correct >= q.options.length) return 'La réponse marquée comme bonne est vide.';
    return '';
  }

  doImport(text, replace) {
    var res = this.parseQuestions(text);
    if (!res.questions.length) { this.setState({ importMsg: 'Aucune question valide trouvée. Vérifiez l\'ordre des colonnes.', importOk: false, confirmReplace: false }); return; }
    var st = this.state, n = st.nextQ;
    var added = res.questions.map(function (q) { return Object.assign({ id: 'q' + (n++), answer: '', played: 0 }, q); });
    var hidden = st.hiddenShipped;
    if (replace) hidden = st.bank.filter(function (q) { return q.shipped; }).map(function (q) { return q.id; }).concat(hidden);
    var bank = replace ? added : st.bank.concat(added);
    var pl = added.length > 1 ? 's' : '';
    var msg = (replace ? 'Banque remplacée : ' : '') + added.length + ' question' + pl + (replace ? '' : ' ajoutée' + pl) + (res.skipped ? ' (' + res.skipped + ' ligne' + (res.skipped > 1 ? 's ignorées' : ' ignorée') + ' : vérifiez la colonne réponse ou le lien)' : '');
    this.setState({ bank: bank, nextQ: n, hiddenShipped: hidden, importMsg: msg, importOk: true, csvText: '', confirmReplace: false });
  }

  csvCell(v) { v = String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  exportCsv() {
    var self = this, L = 'ABCDEF';
    var max = this.state.bank.reduce(function (m, q) { return Math.max(m, q.options.length); }, 4);
    var head = ['Question'];
    for (var i = 0; i < max; i++) head.push(L[i]);
    head.push('Réponse', 'Catégorie', 'Lien', 'Mode', 'Chanson');
    var lines = [head.join(',')];
    this.state.bank.forEach(function (q) {
      var cells = [q.q];
      for (var i = 0; i < max; i++) cells.push(q.options[i] || '');
      cells.push(q.mode === 'blind' ? q.answer : L[q.correct], q.category || '', q.link || '', MODES[q.mode].tag, q.mode === 'paroles' ? q.answer || '' : '');
      lines.push(cells.map(function (c) { return self.csvCell(c); }).join(','));
    });
    return lines.join('\n');
  }

  // ---------- Questions ----------

  blankForm(mode, category) { return { editingId: null, mode: mode || 'quiz', q: '', category: category || '', link: '', answer: '', opts: ['', '', '', ''], correct: 0 }; }
  emptyForm() { var f = this.state.form || {}; return this.blankForm(f.mode, f.category); }

  modeQuestions(mode) { return this.state.bank.filter(function (q) { return (q.mode || 'quiz') === mode; }); }

  catPool(mode) {
    var all = this.modeQuestions(mode);
    var c = (this.state.gameCats || {})[mode];
    if (c === 'all' || c == null) return { list: all, cat: 'all' };
    var p = all.filter(function (q) { return (q.category || '') === c; });
    return p.length ? { list: p, cat: c } : { list: all, cat: 'all' };
  }

  ranked(players, scores) {
    var list = players.map(function (p) { return { id: p.id, name: p.name, score: scores[p.id] || 0 }; });
    list.sort(function (a, b) { return b.score - a.score; });
    var rank = 0, prev = null;
    list.forEach(function (x, i) { if (x.score !== prev) { rank = i + 1; prev = x.score; } x.rank = rank; });
    return list;
  }

  // ---------- Game ----------

  deadline() { return this.state.timerSec ? Date.now() + this.state.timerSec * 1000 : null; }

  startGame(mode) {
    var st = this.state;
    var players = st.roster.filter(function (p) { return p.active; }).map(function (p) { return { id: p.id, name: p.name }; });
    var src = this.catPool(mode).list;
    if (!players.length || !src.length) return;
    var n = st.gameSize === 'all' ? src.length : Math.min(st.gameSize, src.length);
    var pool = src.map(function (q) { return { q: q, r: Math.random() }; })
      .sort(function (a, b) { return ((a.q.played || 0) - (b.q.played || 0)) || (a.r - b.r); })
      .slice(0, n).map(function (x) { return x.q; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    var scores = {};
    players.forEach(function (p) { scores[p.id] = 0; });
    var level = st.parolesLevel || 'facile';
    this.setState({
      screen: 'play', gameMode: mode, tab: mode, gamePlayers: players,
      gameQs: pool.map(function (q) {
        var g = { id: q.id, mode: mode, q: q.q, options: q.options.slice(), correct: q.correct, answer: q.answer || '', category: q.category || '', link: q.link || '' };
        if (mode === 'paroles') {
          // Easy needs endings to choose from: a song written without them is played at the medium level.
          g.level = level === 'facile' && g.options.length < 2 ? 'moyen' : level;
          if (g.level === 'facile') {
            var right = g.options[g.correct];
            g.options = g.options.map(function (o) { return { o: o, r: Math.random() }; }).sort(function (a, b) { return a.r - b.r; }).map(function (x) { return x.o; });
            g.correct = g.options.indexOf(right);
          }
        }
        return g;
      }),
      qIndex: 0, picks: {}, revealed: false, scores: scores, confirmQuit: false,
      qDeadline: mode === 'blind' ? null : this.deadline(), results: {}, lastGain: {},
      buzz: {}, blindPhase: 'ready', blindMs: 0, blindAt: null
    });
  }

  // Blind test and the paroles levels without choices: the host marks each player ✓ or ✗.
  marksOnly(q) { return q.mode === 'blind' || (q.mode === 'paroles' && q.level && q.level !== 'facile'); }

  isRight(q, pick) { return this.marksOnly(q) ? pick === true : pick === q.correct; }

  // Points a player wins on a question: 1 for a right answer; in the blind test, 4 to 1 depending on when they buzzed.
  points(q, pid, st) {
    if (!this.isRight(q, st.picks[pid])) return 0;
    if (q.mode !== 'blind') return 1;
    return st.buzz[pid] == null ? 0 : blindPoints(st.buzz[pid]);
  }

  doReveal() {
    var st = this.state, self = this;
    if (st.revealed) return;
    var q = st.gameQs[st.qIndex];
    if (!q) return;
    var scores = Object.assign({}, st.scores), gain = {}, hits = 0;
    st.gamePlayers.forEach(function (p) {
      var pts = self.points(q, p.id, st);
      if (pts) { scores[p.id] = (scores[p.id] || 0) + pts; gain[p.id] = pts; hits++; }
    });
    var results = Object.assign({}, st.results);
    results[st.qIndex] = { hits: hits, of: st.gamePlayers.length };
    var bank = st.bank.map(function (b) { return b.id === q.id ? Object.assign({}, b, { played: (b.played || 0) + 1 }) : b; });
    this.setState({ revealed: true, scores: scores, lastGain: gain, results: results, bank: bank, blindPhase: 'stopped', blindMs: this.blindElapsed(), blindAt: null });
  }

  doNext() {
    var st = this.state;
    var reset = { picks: {}, revealed: false, lastGain: {}, buzz: {}, blindPhase: 'ready', blindMs: 0, blindAt: null };
    if (st.qIndex + 1 >= st.gameQs.length) this.setState(Object.assign(reset, { screen: 'end', qDeadline: null }));
    else this.setState(Object.assign(reset, { qIndex: st.qIndex + 1, qDeadline: st.gameMode === 'blind' ? null : this.deadline() }));
  }

  // ---------- Blind test clock ----------

  blindElapsed() {
    var st = this.state;
    return Math.min(BLIND_MAX_MS, (st.blindMs || 0) + (st.blindAt ? Date.now() - st.blindAt : 0));
  }

  blindPlay() {
    var st = this.state;
    if (st.revealed || st.blindPhase === 'playing' || this.blindElapsed() >= BLIND_MAX_MS) return;
    this.setState({ blindPhase: 'playing', blindAt: Date.now() });
  }

  blindStop() {
    if (this.state.blindPhase !== 'playing') return;
    this.setState({ blindPhase: 'stopped', blindMs: this.blindElapsed(), blindAt: null });
  }

  // While the clip plays, tapping a player records when they buzzed; tapping again cancels it.
  buzzPlayer(pid) {
    var st = this.state;
    if (st.revealed || st.blindPhase !== 'playing') return;
    var buzz = Object.assign({}, st.buzz), picks = Object.assign({}, st.picks);
    if (buzz[pid] != null) { delete buzz[pid]; delete picks[pid]; } else buzz[pid] = this.blindElapsed();
    this.setState({ buzz: buzz, picks: picks });
  }

  // ---------- Karaoké favorites ----------

  isFav(key) { return (this.state.favorites || []).some(function (f) { return f.key === key; }); }

  toggleFav(item) {
    var favs = this.state.favorites || [];
    this.setState({ favorites: this.isFav(item.key) ? favs.filter(function (f) { return f.key !== item.key; }) : favs.concat([item]) });
  }

  // A paroles question → its karaoké favorite.
  favFromQuestion(q) {
    var s = songParts(q.answer);
    return { key: 'q:' + q.id, title: s.title || fullLyric(q), artist: s.artist, link: q.link || '' };
  }

  goSettings(mode) {
    var patch = { tab: 'settings', panel: 'form', confirmDelete: null };
    if (mode) { patch.setMode = mode; if (!this.state.form.editingId) patch.form = this.blankForm(mode, ''); }
    this.setState(patch);
  }

  renderStage(mode, qi) {
    var h = React.createElement;
    var hot = mode === 'reveal' || mode === 'end';
    var beam = function (side) {
      return h('div', { key: side, style: {
        position: 'absolute', top: '-12%', left: side === 'l' ? '14%' : 'auto', right: side === 'r' ? '14%' : 'auto',
        width: 420, height: '130%', transformOrigin: '50% 0',
        background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-accent-300) ' + (hot ? 34 : 20) + '%, transparent), transparent 70%)',
        clipPath: 'polygon(46% 0, 54% 0, 100% 100%, 0 100%)', filter: 'blur(8px)', mixBlendMode: 'screen',
        animation: (side === 'l' ? 'qpSwayL' : 'qpSwayR') + ' ' + (hot ? 4 : 9) + 's ease-in-out infinite alternate',
        transition: 'background 1s'
      } });
    };
    var dots = [];
    for (var i = 0; i < 28; i++) {
      var x = (i * 37.3) % 100, y = (i * 23.7) % 60, s = 1 + (i % 3);
      dots.push(h('span', { key: 'd' + i, style: {
        position: 'absolute', left: x + '%', top: y + '%', width: s, height: s, borderRadius: '50%',
        background: 'var(--color-accent-200)', boxShadow: '0 0 6px var(--color-accent-300)',
        animation: 'qpTwinkle ' + (2.5 + (i % 5) * 0.7) + 's ease-in-out ' + (i % 7) * 0.4 + 's infinite'
      } }));
    }
    return h('div', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
      background: 'radial-gradient(ellipse 75% 60% at 50% -12%, var(--color-section-glow) 0%, var(--color-section) 38%, var(--color-bg) 82%)' } },
      dots, beam('l'), beam('r'),
      mode === 'reveal' ? h('div', { key: 'flash' + qi, style: { position: 'absolute', inset: 0, opacity: 0,
        background: 'radial-gradient(ellipse 55% 45% at 50% 22%, color-mix(in srgb, var(--color-accent-200) 45%, transparent), transparent 70%)',
        animation: 'qpFlash 1s ease-out both' } }) : null,
      h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
        background: 'radial-gradient(ellipse 55% 70% at 50% 115%, color-mix(in srgb, var(--color-accent) ' + (hot ? 26 : 14) + '%, transparent), transparent 70%)', transition: 'background 1s' } })
    );
  }

  renderVals() {
    var self = this;
    var st = this.state;
    var L = 'ABCDEF';
    var hideScores = CONFIG.hideScores;
    var ACTIVE_TAB = 'color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 12%, transparent);';
    var ERR = 'color: var(--color-neutral-200);';
    var OK = 'color: var(--color-accent-300);';
    var ON = 'border-color: var(--color-accent); color: var(--color-accent-100); background: var(--color-accent-800);';
    var OFF = 'border-color: var(--color-divider); color: var(--color-neutral-300);';
    var GOOD = 'oklch(0.74 0.15 155)', GOOD_L = 'oklch(0.86 0.1 155)', BAD = 'oklch(0.66 0.17 22)', BAD_L = 'oklch(0.83 0.09 22)';
    var bank = st.bank;
    var roster = st.roster;
    var active = roster.filter(function (p) { return p.active; });
    var inGame = st.screen === 'play' || st.screen === 'end';

    // ----- Karaoké -----
    var karaQ = karaNorm(st.karaSearch.trim());
    var favs = st.favorites || [];
    var showFavs = st.karaFilter === 'fav';
    var karaSource = showFavs ? favs : KARAOKE.map(function (k) {
      return { key: 'k:' + k.ytId, title: k.title, artist: k.artist, link: 'https://www.youtube.com/watch?v=' + k.ytId };
    });
    var karaView = karaSource.filter(function (k) {
      return !karaQ || karaNorm(k.artist).indexOf(karaQ) >= 0 || karaNorm(k.title).indexOf(karaQ) >= 0;
    }).map(function (k) {
      var m = parseMedia(k.link), yt = m && m.kind === 'youtube' ? m.id : '';
      var fav = self.isFav(k.key);
      return {
        artist: k.artist, title: k.title, thumb: yt ? 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg' : '',
        fav: fav, favLabel: (fav ? 'Retirer ' : 'Ajouter ') + k.title + (fav ? ' des favoris' : ' aux favoris'),
        favStyle: fav ? 'color: var(--color-accent-200); border-color: var(--color-accent);' : 'color: var(--color-neutral-300); border-color: var(--color-divider);',
        toggleFav: function (e) { e.stopPropagation(); self.toggleFav(k); },
        // YouTube plays here; anything else opens in a new tab, and a song without a link opens a YouTube karaoké search.
        open: function () {
          if (yt) { self.setState({ karaPlaying: { title: k.title, artist: k.artist, ytId: yt } }); return; }
          var href = m ? m.href : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(k.title + ' ' + k.artist + ' karaoké');
          window.open(href, '_blank', 'noopener');
        }
      };
    });
    var karaNow = st.karaPlaying && st.karaPlaying.ytId ? st.karaPlaying : null;
    var karaFilters = [['all', 'Catalogue', KARAOKE.length], ['fav', 'Favoris', favs.length]].map(function (x) {
      return { label: x[1], count: x[2], active: (st.karaFilter || 'all') === x[0], pick: function () { self.setState({ karaFilter: x[0] }); } };
    });

    // ----- Navigation -----
    var navTabs = MODE_KEYS.concat(['kara']).map(function (k) {
      var on = st.tab === k;
      return { label: k === 'kara' ? 'Karaoké' : MODES[k].tab, active: on, style: on ? ACTIVE_TAB : '', go: function () { self.setState({ tab: k, confirmDelete: null }); } };
    });

    // ----- Setup screen of the current game tab -----
    var setupMode = GAME_TABS[st.tab] ? st.tab : 'quiz';
    var M = MODES[setupMode];
    var modeAll = this.modeQuestions(setupMode);
    var poolInfo = this.catPool(setupMode);
    var pool = poolInfo.list, curCat = poolInfo.cat;

    var addPlayer = function () {
      var name = self.state.newName.trim();
      if (!name) return;
      self.setState({ roster: self.state.roster.concat([{ id: 'p' + self.state.nextId, name: name, active: true }]), nextId: self.state.nextId + 1, newName: '' });
    };

    var catCounts = {}, uncat = 0;
    modeAll.forEach(function (q) { var c = (q.category || '').trim(); if (c) catCounts[c] = (catCounts[c] || 0) + 1; else uncat++; });
    var catList = Object.keys(catCounts).sort(function (a, b) { return a.localeCompare(b); });
    var catDefs = [{ key: 'all', label: 'Toutes', count: modeAll.length }].concat(catList.map(function (c) { return { key: c, label: c, count: catCounts[c] }; }));
    if (uncat && catList.length) catDefs.push({ key: '', label: 'Sans catégorie', count: uncat });
    var catOptions = catDefs.map(function (c) {
      var on = curCat === c.key;
      return { label: c.label, count: c.count, active: on, style: on ? ON : OFF, pick: function () {
        var gc = Object.assign({}, self.state.gameCats); gc[setupMode] = c.key; self.setState({ gameCats: gc });
      } };
    });
    var sizeOptions = [5, 10, 15, 20, 'all'].map(function (s) {
      var isActive = st.gameSize === s;
      var disabled = s !== 'all' && pool.length > 0 && s > pool.length && !isActive;
      return { label: s === 'all' ? 'Toutes' : String(s), active: isActive, disabled: disabled, labelStyle: disabled ? 'opacity: .4; cursor: not-allowed;' : '', pick: function () { self.setState({ gameSize: s }); } };
    });
    var timerOptions = [0, 15, 30, 60].map(function (s) {
      return { label: s ? s + ' s' : 'Non', active: st.timerSec === s, pick: function () { self.setState({ timerSec: s }); } };
    });
    var timerHint = st.timerSec ? 'Un compte à rebours s\'affiche à l\'écran' + (CONFIG.autoReveal ? ' et la réponse est révélée à zéro.' : '. Vous révélez quand vous voulez.') : 'Pas de chrono. Vous révélez quand tout le monde a répondu.';
    var level = st.parolesLevel || 'facile';
    var levelOptions = PAROLES_LEVELS.map(function (l) {
      return { label: l.label, active: level === l.key, pick: function () { self.setState({ parolesLevel: l.key }); } };
    });
    var noChoices = pool.filter(function (q) { return q.options.length < 2; }).length;
    var levelHint = PAROLES_LEVELS.filter(function (l) { return l.key === level; })[0].hint +
      (level === 'facile' && noChoices ? ' ' + noChoices + (noChoices > 1 ? ' chansons sans propositions seront jouées' : ' chanson sans propositions sera jouée') + ' en Moyen.' : '');
    var timed = setupMode !== 'blind' && st.timerSec;
    var gameN = st.gameSize === 'all' ? pool.length : Math.min(st.gameSize, pool.length);
    var canStart = active.length > 0 && modeAll.length > 0;
    var startHint = !modeAll.length ? 'Aucune question de ce jeu pour l\'instant.'
      : !active.length ? 'Choisissez au moins un candidat.'
      : active.length + ' candidat' + (active.length > 1 ? 's' : '') + ' · ' + gameN + ' ' + (gameN > 1 ? M.items : M.items.replace(/s$/, '')) + (curCat !== 'all' ? ' · ' + (curCat || 'Sans catégorie') : '') + (setupMode === 'paroles' ? ' · ' + levelLabel(level) : '') + (timed ? ' · ' + st.timerSec + ' s chacun' + (M.items === 'chansons' ? 'e' : '') : '');

    // ----- Réglages: form -----
    var f = st.form;
    var setForm = function (patch) { self.setState({ form: Object.assign({}, self.state.form, patch), formMsg: '' }); };
    var fBlind = f.mode === 'blind', fParoles = f.mode === 'paroles';
    var formModes = MODE_KEYS.map(function (k) {
      return { label: MODES[k].tag, active: f.mode === k, pick: function () { setForm({ mode: k }); } };
    });
    var formOpts = f.opts.map(function (v, i) {
      var isC = f.correct === i;
      return {
        letter: L[i], value: v, correct: isC,
        placeholder: (fParoles ? 'Fin possible ' : 'Réponse ') + L[i] + (i < 2 ? '' : ' (facultative)'),
        style: isC ? 'color: var(--color-accent-100); background: var(--color-accent-800); border-color: var(--color-accent);' : 'border-color: var(--color-divider); color: var(--color-neutral-400);',
        markCorrect: function () { setForm({ correct: i }); },
        onChange: function (e) { var o = self.state.form.opts.slice(); o[i] = e.target.value; setForm({ opts: o }); }
      };
    });
    // Paroles: opts[0] is the ending to find, opts[1…3] the wrong endings offered in easy mode.
    var formWrong = [1, 2, 3].map(function (i) {
      return { n: i, value: f.opts[i] || '', onChange: function (e) { var o = self.state.form.opts.slice(); o[i] = e.target.value; setForm({ opts: o }); } };
    });
    var saveForm = function () {
      var cur = self.state.form;
      var q = { mode: cur.mode, q: cur.q.trim(), category: (cur.category || '').trim(), link: (cur.link || '').trim(), answer: '', options: [], correct: -1 };
      if (cur.mode === 'blind') { q.q = ''; q.answer = (cur.answer || '').trim(); }
      else if (cur.mode === 'paroles') {
        q.q = q.q ? q.q.replace(/\s*_{3,}\s*$/, '') + ' ___' : '';
        q.options = cur.opts.slice(0, 4).map(function (o) { return (o || '').trim(); });
        q.options = [q.options[0]].concat(q.options.slice(1).filter(Boolean));
        q.correct = 0;
        q.answer = (cur.answer || '').trim();
      }
      else cur.opts.forEach(function (o, i) { var t = o.trim(); if (t) { if (i === cur.correct) q.correct = q.options.length; q.options.push(t); } });
      var problem = self.checkQuestion(q);
      if (problem) { self.setState({ formMsg: problem, formOk: false }); return; }
      if (cur.editingId) {
        var b2 = self.state.bank.map(function (x) { return x.id === cur.editingId ? Object.assign({}, x, q, { edited: x.shipped ? true : x.edited }) : x; });
        self.setState({ bank: b2, form: self.emptyForm(), formMsg: 'Question mise à jour.', formOk: true });
      } else {
        var nq = Object.assign({ id: 'q' + self.state.nextQ, played: 0 }, q);
        self.setState({ bank: self.state.bank.concat([nq]), nextQ: self.state.nextQ + 1, form: self.emptyForm(), formMsg: 'Ajoutée. Question suivante ?', formOk: true });
      }
    };
    var formMedia = parseMedia(f.link);

    // ----- Réglages: list -----
    var modeCounts = { all: bank.length };
    MODE_KEYS.forEach(function (k) { modeCounts[k] = bank.filter(function (q) { return q.mode === k; }).length; });
    var setFilters = ['all'].concat(MODE_KEYS).map(function (k) {
      return { label: k === 'all' ? 'Tout' : MODES[k].tag, count: modeCounts[k], active: st.setMode === k, pick: function () { self.setState({ setMode: k }); } };
    });
    var term = st.search.trim().toLowerCase();
    var bankView = [];
    bank.forEach(function (q, i) {
      if (st.setMode !== 'all' && q.mode !== st.setMode) return;
      if (term && (q.q + ' ' + q.options.join(' ') + ' ' + q.answer + ' ' + (q.category || '')).toLowerCase().indexOf(term) < 0) return;
      var confirming = st.confirmDelete === q.id;
      var blind = q.mode === 'blind', paroles = q.mode === 'paroles';
      bankView.push({
        n: i + 1, text: blind ? q.answer : paroles ? fullLyric(q) : q.q, modeTag: MODES[q.mode].tag,
        category: q.category || '', hasCategory: !!q.category, shipped: !!q.shipped,
        hasLink: !!(q.link || '').trim(), linkLabel: (parseMedia(q.link) || {}).label || '',
        hasAnswer: paroles ? !!q.answer : !blind, answer: blind ? '' : paroles ? q.answer : L[q.correct] + ': ' + q.options[q.correct],
        details: blind ? 'extrait' : paroles ? (q.options.length > 1 ? q.options.length + ' fins (facile)' : 'sans propositions') : q.options.length + ' réponses',
        played: q.played ? 'jouée ' + q.played + '×' : 'jamais jouée',
        style: f.editingId === q.id ? 'background: var(--color-accent-900); box-shadow: inset 0 0 0 1px var(--color-accent-700);' : '',
        delLabel: confirming ? 'Confirmer' : 'Supprimer',
        delStyle: confirming ? 'color: var(--color-neutral-100); background: var(--color-neutral-700); border-color: var(--color-neutral-500);' : 'color: var(--color-neutral-400);',
        edit: function () {
          var opts = q.options.slice(), text = q.q, correct = Math.max(0, q.correct);
          if (paroles) {
            // Form shape: the start of the line, then the endings with the right one first.
            var parts = lyricParts(q.q), cut = parts.findIndex(function (p) { return p.blank; });
            var after = parts.slice(cut + 1).map(function (p) { return p.text; }).join('');
            text = parts.slice(0, cut).map(function (p) { return p.text; }).join('').trim();
            opts = [opts[q.correct] || ''].concat(opts.filter(function (_, k) { return k !== q.correct; })).map(function (o) { return o ? (o + after).trim() : ''; });
            correct = 0;
          }
          while (opts.length < 4) opts.push('');
          self.setState({ panel: 'form', form: { editingId: q.id, mode: q.mode, q: text, category: q.category || '', link: q.link || '', answer: q.answer || '', opts: opts, correct: correct }, formMsg: '', confirmDelete: null });
        },
        del: function () {
          if (self.state.confirmDelete !== q.id) { self.setState({ confirmDelete: q.id }); return; }
          var patch = { bank: self.state.bank.filter(function (x) { return x.id !== q.id; }), confirmDelete: null };
          if (q.shipped) patch.hiddenShipped = (self.state.hiddenShipped || []).concat([q.id]);
          if (self.state.form.editingId === q.id) patch.form = self.emptyForm();
          self.setState(patch);
        }
      });
    });
    var panelTabs = [['form', 'Écrire une question'], ['import', 'Importer'], ['export', 'Sauvegarder']].map(function (p) {
      return { label: p[1], active: st.panel === p[0], pick: function () { self.setState({ panel: p[0], confirmReplace: false, copied: false }); } };
    });
    var exportText = st.tab === 'settings' && st.panel === 'export' ? this.exportCsv() : '';

    // ----- Game -----
    var gm = st.gameMode || 'quiz';
    var players = st.gamePlayers;
    var gq = st.gameQs;
    var q = gq[st.qIndex] || { mode: gm, q: '', options: [], correct: 0, answer: '' };
    var isBlind = q.mode === 'blind', isParoles = q.mode === 'paroles';
    var marks = this.marksOnly(q);
    var phase = st.blindPhase || 'ready';
    var elapsed = isBlind ? this.blindElapsed() : 0;
    var buzz = st.buzz || {};
    var buzzed = players.filter(function (p) { return buzz[p.id] != null; }).length;
    var clock = function (ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    var ptsLabel = function (n) { return n + (n > 1 ? ' pts' : ' pt'); };
    var pickCounts = q.options.map(function () { return 0; });
    var answered = 0;
    players.forEach(function (p) { var k = st.picks[p.id]; if (k !== undefined && k !== null) { answered++; if (pickCounts[k] !== undefined) pickCounts[k]++; } });
    var optionsView = q.options.map(function (text, i) {
      var style = '', chip = 'background: var(--color-neutral-800); color: var(--color-neutral-100);';
      if (st.revealed) {
        if (i === q.correct) {
          style = 'background: color-mix(in oklch, ' + GOOD + ' 20%, var(--color-surface)); box-shadow: 0 0 0 1.5px ' + GOOD + ', 0 0 36px color-mix(in oklch, ' + GOOD + ' 40%, transparent); animation: qpPop .6s ease-out .1s both;';
          chip = 'background: ' + GOOD + '; color: var(--color-bg);';
        } else if (pickCounts[i] > 0) {
          style = 'background: color-mix(in oklch, ' + BAD + ' 14%, var(--color-surface)); box-shadow: 0 0 0 1px color-mix(in oklch, ' + BAD + ' 70%, transparent); opacity: 0.8; animation: qpShake .5s ease-out .2s both;';
          chip = 'background: color-mix(in oklch, ' + BAD + ' 35%, var(--color-surface)); color: ' + BAD_L + ';';
        } else style = 'opacity: 0.3;';
      }
      return { letter: L[i], text: text, style: style, chipStyle: chip, showCount: st.revealed, count: pickCounts[i] + (pickCounts[i] > 1 ? ' votes' : ' vote') };
    });
    var rows = players.map(function (p, pi) {
      var pick = st.picks[p.id];
      var has = pick !== undefined && pick !== null;
      var ok = has && self.isRight(q, pick);
      var result, resultStyle = 'color: var(--color-neutral-500);', rowStyle = '';
      var hasBuzz = isBlind && buzz[p.id] != null;
      var worth = hasBuzz ? blindPoints(buzz[p.id]) : 1;
      if (st.revealed) {
        var delay = (0.3 + pi * 0.05).toFixed(2) + 's';
        if (ok && (!isBlind || hasBuzz)) { result = (marks ? 'Trouvé' : 'Bonne réponse') + '  +' + worth; resultStyle = 'color: ' + GOOD_L + ';'; rowStyle = 'background: color-mix(in oklch, ' + GOOD + ' 16%, var(--color-surface)); box-shadow: inset 0 0 0 1px ' + GOOD + '; animation: qpPop .5s ease-out ' + delay + ' both;'; }
        else if (has) { result = marks ? 'Raté' : 'Mauvaise réponse'; resultStyle = 'color: ' + BAD_L + ';'; rowStyle = 'background: color-mix(in oklch, ' + BAD + ' 12%, var(--color-surface)); box-shadow: inset 0 0 0 1px color-mix(in oklch, ' + BAD + ' 65%, transparent); animation: qpShake .45s ease-out ' + delay + ' both;'; }
        else result = isBlind ? (hasBuzz ? 'Pas noté' : 'N\'a pas buzzé') : marks ? 'Pas noté' : 'Pas de réponse';
      } else if (isBlind) {
        result = hasBuzz ? 'Buzz à ' + clock(buzz[p.id]) + (pick === true ? ' · Trouvé' : pick === false ? ' · Raté' : phase === 'stopped' ? ' · à vérifier' : '')
          : phase === 'playing' ? 'Touchez pour buzzer' : phase === 'ready' ? 'Attend le Play' : 'N\'a pas buzzé';
        if (hasBuzz) { resultStyle = 'color: var(--color-accent-200);'; rowStyle = 'box-shadow: inset 0 0 0 1px var(--color-accent-700); background: var(--color-accent-900);'; }
      } else result = marks ? (pick === true ? 'Trouvé' : pick === false ? 'Raté' : 'À noter…') : (has ? 'A répondu' : 'En attente…');
      var setPick = function (val) {
        if (self.state.revealed) return;
        var np = Object.assign({}, self.state.picks);
        if (np[p.id] === val) delete np[p.id]; else np[p.id] = val;
        self.setState({ picks: np });
      };
      var buttons;
      if (isBlind && (!hasBuzz || phase === 'playing')) buttons = [];
      else if (marks) {
        buttons = [[true, '✓', 'a trouvé'], [false, '✗', 'n\'a pas trouvé']].map(function (b) {
          var picked = pick === b[0], style;
          if (!st.revealed) style = picked ? (b[0] ? 'border-color: ' + GOOD + '; color: var(--color-bg); background: ' + GOOD + ';' : 'border-color: ' + BAD + '; color: ' + BAD_L + '; background: color-mix(in oklch, ' + BAD + ' 30%, var(--color-surface));') : OFF;
          else style = picked ? (b[0] ? 'border-color: ' + GOOD + '; color: var(--color-bg); background: ' + GOOD + ';' : 'border-color: ' + BAD + '; color: ' + BAD_L + '; background: color-mix(in oklch, ' + BAD + ' 30%, var(--color-surface));') : OFF + ' opacity: 0.3;';
          return { letter: b[1], label: p.name + ' ' + b[2], pressed: picked, style: style + ' font-size: 20px;', pick: function () { setPick(b[0]); } };
        });
      } else {
        buttons = q.options.map(function (_, i) {
          var picked = has && pick === i;
          var style = OFF;
          if (!st.revealed) { if (picked) style = ON; }
          else if (i === q.correct) style = picked ? 'border-color: ' + GOOD + '; color: var(--color-bg); background: ' + GOOD + ';' : 'border-color: ' + GOOD + '; color: ' + GOOD_L + ';';
          else if (picked) style = 'border-color: ' + BAD + '; color: ' + BAD_L + '; background: color-mix(in oklch, ' + BAD + ' 30%, var(--color-surface)); text-decoration: line-through;';
          else style += ' opacity: 0.3;';
          return { letter: L[i], label: p.name + ' répond ' + L[i], pressed: picked, style: style, pick: function () { setPick(i); } };
        });
      }
      var canBuzz = isBlind && !st.revealed && phase === 'playing';
      return {
        name: p.name, result: result, resultStyle: resultStyle, style: rowStyle + (canBuzz ? ' cursor: pointer;' : ''), buttons: buttons,
        canBuzz: canBuzz, buzzLabel: hasBuzz ? 'Annuler le buzz de ' + p.name : p.name + ' buzze',
        buzz: function () { self.buzzPlayer(p.id); },
        hasBadge: hasBuzz && !st.revealed, badge: ptsLabel(worth)
      };
    });
    var isLast = st.qIndex + 1 >= gq.length;
    var media = st.screen === 'play' && st.revealed && !isBlind ? parseMedia(q.link) : null;
    var ranking = this.ranked(players, st.scores);
    var blindMedia = st.screen === 'play' && isBlind ? parseMedia(q.link) : null;
    var lyric = isParoles ? parolesParts(q, q.level || 'facile').map(function (p) {
      return p.hidden
        ? { blank: true, text: st.revealed ? p.text : p.long ? '…' : '', style: st.revealed ? 'color: ' + GOOD_L + '; border-bottom-color: ' + GOOD + '; text-shadow: 0 0 24px color-mix(in oklch, ' + GOOD + ' 60%, transparent); animation: qpPop .6s ease-out .1s both;' : p.long ? 'min-width: 6ch;' : '' }
        : { blank: false, text: p.text };
    }) : [];
    var favItem = isParoles ? this.favFromQuestion(q) : null;
    var qFav = favItem ? this.isFav(favItem.key) : false;
    var tier = blindPoints(elapsed);
    var blindTiers = [4, 3, 2, 1].map(function (n, i) {
      var on = tier === n, past = elapsed >= (i + 1) * 15000;
      return { label: ptsLabel(n), range: (i * 15) + '–' + ((i + 1) * 15) + ' s',
        style: on ? 'background: var(--color-accent-800); color: var(--color-accent-100); box-shadow: inset 0 0 0 1px var(--color-accent), 0 0 18px color-mix(in srgb, var(--color-accent) 35%, transparent);'
          : past ? 'color: var(--color-neutral-600); box-shadow: inset 0 0 0 1px var(--color-neutral-800);' : 'color: var(--color-neutral-300); box-shadow: inset 0 0 0 1px var(--color-divider);' };
    });

    var hasTimer = st.screen === 'play' && !!st.qDeadline && st.timerSec > 0;
    var remainMs = hasTimer ? Math.max(0, st.qDeadline - Date.now()) : 0;
    if (hasTimer && st.revealed) remainMs = 0;
    var remain = Math.ceil(remainMs / 1000);
    var timerLabel = st.revealed ? 'Révélée' : remain === 0 ? 'Temps écoulé' : Math.floor(remain / 60) + ':' + String(remain % 60).padStart(2, '0');
    var timerStyle = (!st.revealed && remain <= 5) ? 'color: var(--color-accent);' : 'color: var(--color-neutral-200);';

    var boardList = hideScores ? players.map(function (p) { return { id: p.id, name: p.name, score: '–', rank: '' }; }) : ranking;
    var scoreboard = boardList.map(function (s) {
      var lead = !hideScores && s.rank === 1 && s.score > 0;
      return {
        rank: s.rank, name: s.name, score: s.score, gain: !hideScores && st.revealed && !!st.lastGain[s.id],
        gainLabel: '+' + (typeof st.lastGain[s.id] === 'number' ? st.lastGain[s.id] : 1),
        style: lead ? 'background: var(--color-accent-900); box-shadow: inset 0 0 0 1px var(--color-accent-700);' : 'background: color-mix(in srgb, var(--color-bg) 60%, transparent);'
      };
    });

    var recap = gq.map(function (x, i) {
      var r = st.results[i];
      var blind = x.mode === 'blind', paroles = x.mode === 'paroles';
      return { n: i + 1, q: blind ? x.answer : paroles ? fullLyric(x) : x.q,
        answer: blind ? (x.category || 'Blind test') : paroles ? (x.answer || levelLabel(x.level)) : L[x.correct] + ': ' + x.options[x.correct],
        hits: r ? r.hits + '/' + r.of : '–', rate: r && r.of ? r.hits / r.of : 1 };
    });
    var maxPts = gq.length * (gm === 'blind' ? 4 : 1);
    var rankAll = ranking.map(function (r) { return { rank: r.rank, name: r.name, score: r.score, pct: maxPts ? Math.round(r.score / maxPts * 100) : 0 }; });
    var podH = [150, 110, 80];
    var podium = [1, 0, 2].filter(function (i) { return rankAll[i]; }).map(function (i) {
      var r = rankAll[i];
      return Object.assign({}, r, {
        pts: r.score + (r.score > 1 ? ' pts' : ' pt'),
        delay: (i === 0 ? 0.6 : i === 1 ? 0.3 : 0) + 's',
        // Height follows the rank, so two people tied for 1st stand equally high.
        style: 'height: ' + podH[Math.min(r.rank, 3) - 1] + 'px; ' + (r.rank === 1
          ? 'background: linear-gradient(to bottom, var(--color-accent-700), color-mix(in srgb, var(--color-accent-900) 40%, transparent)); box-shadow: 0 0 0 1px var(--color-accent), 0 -8px 40px color-mix(in srgb, var(--color-accent) 35%, transparent); color: var(--color-accent-100);'
          : 'background: linear-gradient(to bottom, var(--color-neutral-800), color-mix(in srgb, var(--color-neutral-900) 30%, transparent)); box-shadow: inset 0 0 0 1px var(--color-neutral-700); color: var(--color-neutral-200);')
      });
    });
    var played = recap.filter(function (c) { return st.results[c.n - 1]; });
    var hardestItem = played.slice().sort(function (a, b) { return a.rate - b.rate; })[0];
    var plural = function (s) { return !(/^1\//.test(s) || /^0\//.test(s)); };
    var unit = isBlind ? 'Extrait' : isParoles ? 'Chanson' : 'Question';

    return {
      // navigation
      showTabs: !inGame, navTabs: navTabs,
      isSettingsTab: st.tab === 'settings', settingsTabStyle: st.tab === 'settings' ? ACTIVE_TAB : '',
      goSettings: function () { self.goSettings(); },
      isHome: !inGame && !!GAME_TABS[st.tab],
      isSettings: !inGame && st.tab === 'settings',
      isKara: !inGame && st.tab === 'kara',
      isPlay: st.screen === 'play',
      isEnd: st.screen === 'end',
      bankCount: bank.length,

      // karaoké
      karaOpen: !!karaNow,
      karaNowTitle: karaNow ? karaNow.title : '',
      karaNowArtist: karaNow ? karaNow.artist : '',
      karaNowSrc: karaNow ? 'https://www.youtube.com/embed/' + karaNow.ytId + '?autoplay=1&rel=0' : '',
      karaNowYt: karaNow ? 'https://www.youtube.com/watch?v=' + karaNow.ytId : '',
      karaClose: function () { self.setState({ karaPlaying: null }); },
      karaStop: function (e) { e.stopPropagation(); },
      karaSearch: st.karaSearch,
      onKaraSearch: function (e) { self.setState({ karaSearch: e.target.value }); },
      karaFilters: karaFilters,
      karaCount: karaView.length === karaSource.length ? karaSource.length : karaView.length + ' / ' + karaSource.length,
      karaEmpty: karaView.length === 0 && (!showFavs || favs.length > 0),
      karaNoFavs: showFavs && favs.length === 0,
      karaView: karaView,

      // setup
      modeTitle: M.tab,
      activeCount: active.length,
      rosterCount: roster.length,
      rosterView: roster.map(function (p) {
        return {
          name: p.name, active: !!p.active,
          style: p.active ? 'background: var(--color-accent-900); box-shadow: inset 0 0 0 1px var(--color-accent-700); color: var(--color-text);' : 'box-shadow: inset 0 0 0 1px var(--color-divider); color: var(--color-neutral-500);',
          dotStyle: p.active ? 'background: var(--color-accent); box-shadow: 0 0 8px var(--color-accent);' : 'box-shadow: inset 0 0 0 1.5px var(--color-neutral-600);',
          toggle: function () { self.setState({ roster: self.state.roster.map(function (x) { return x.id === p.id ? Object.assign({}, x, { active: !x.active }) : x; }) }); },
          remove: function () { self.setState({ roster: self.state.roster.filter(function (x) { return x.id !== p.id; }) }); }
        };
      }),
      selectAll: function () { self.setState({ roster: self.state.roster.map(function (x) { return Object.assign({}, x, { active: true }); }) }); },
      selectNone: function () { self.setState({ roster: self.state.roster.map(function (x) { return Object.assign({}, x, { active: false }); }) }); },
      nameValue: st.newName,
      onName: function (e) { self.setState({ newName: e.target.value }); },
      onNameKey: function (e) { if (e.key === 'Enter') { e.preventDefault(); addPlayer(); } },
      addPlayer: addPlayer,
      catOptions: catOptions,
      sizeLabel: M.sizeLabel,
      sizeOptions: sizeOptions,
      timerOptions: timerOptions,
      timerHint: timerHint,
      showTimer: setupMode !== 'blind',
      showLevels: setupMode === 'paroles',
      levelOptions: levelOptions,
      levelHint: levelHint,
      showBlindRules: setupMode === 'blind',
      startHint: startHint,
      modeEmpty: modeAll.length === 0,
      addFirstLabel: 'Ajoutez d\'abord des ' + M.empty,
      goAddFirst: function () { self.goSettings(setupMode); },
      startLabel: M.start,
      startDisabled: !canStart,
      start: function () { self.startGame(setupMode); },

      // réglages
      panelTabs: panelTabs,
      panelForm: st.panel === 'form',
      panelImport: st.panel === 'import',
      panelExport: st.panel === 'export',
      formTitle: f.editingId ? 'Modifier la question' : 'Nouvelle question',
      formModes: formModes,
      formBlind: fBlind,
      formParoles: fParoles,
      formQuiz: !fBlind && !fParoles,
      formQLabel: 'Question',
      formQPlaceholder: 'Saisissez la question',
      formOptsLabel: 'Réponses · touchez la lettre de la bonne réponse',
      formEnd: f.opts[0] || '',
      onFormEnd: function (e) { var o = self.state.form.opts.slice(); o[0] = e.target.value; setForm({ opts: o }); },
      formWrong: formWrong,
      formLinkLabel: fBlind ? 'Lien YouTube ou Spotify' : 'Lien',
      formLinkHelp: fBlind ? '(obligatoire ; ajoutez &t=42 pour démarrer à 0:42)' : fParoles ? '(facultatif : joué à la révélation et repris dans les favoris karaoké)' : '(facultatif, affiché après la révélation)',
      formQ: f.q,
      onFormQ: function (e) { setForm({ q: e.target.value }); },
      formAnswer: f.answer || '',
      onFormAnswer: function (e) { setForm({ answer: e.target.value }); },
      formOpts: formOpts,
      canAddOpt: f.opts.length < 6,
      addOpt: function () { setForm({ opts: self.state.form.opts.concat(['']) }); },
      formLink: f.link || '',
      onFormLink: function (e) { setForm({ link: e.target.value }); },
      hasFormLinkHint: !!formMedia,
      formLinkHint: !formMedia ? '' : fBlind
        ? (formMedia.kind === 'link' ? 'Ce lien ne peut pas être lu : il faut YouTube ou Spotify' : formMedia.label + ' : l\'extrait est joué vidéo masquée' + (formMedia.start ? ', à partir de ' + Math.floor(formMedia.start / 60) + ':' + String(formMedia.start % 60).padStart(2, '0') : ''))
        : formMedia.kind === 'youtube' ? 'Vidéo YouTube : lue au moment du résultat' : formMedia.kind === 'spotify' ? 'Spotify : le lecteur apparaît au moment du résultat' : 'Lien web : affiché avec un bouton Découvrir',
      catNames: Object.keys(bank.reduce(function (o, q) { if (q.category) o[q.category] = 1; return o; }, {})).sort().map(function (c) { return { name: c }; }),
      formCat: f.category || '',
      onFormCat: function (e) { setForm({ category: e.target.value }); },
      hasFormMsg: !!st.formMsg,
      formMsg: st.formMsg,
      formMsgStyle: st.formOk ? OK : ERR,
      saveForm: saveForm,
      saveLabel: f.editingId ? 'Enregistrer' : 'Ajouter à la banque',
      resetForm: function () { self.setState({ form: self.emptyForm(), formMsg: '' }); },
      resetLabel: f.editingId ? 'Annuler' : 'Effacer',
      setFilters: setFilters,
      listCount: bankView.length,
      searchValue: st.search,
      onSearch: function (e) { self.setState({ search: e.target.value }); },
      bankView: bankView,
      bankEmpty: bankView.length === 0,
      csvValue: st.csvText,
      onCsv: function (e) { self.setState({ csvText: e.target.value }); },
      onFile: function (e) {
        var input = e.target;
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () { self.setState({ csvText: String(reader.result || '') }); input.value = ''; };
        reader.readAsText(file);
      },
      importAppend: function () { self.doImport(self.state.csvText, false); },
      importReplace: function () {
        if (!self.state.confirmReplace) { self.setState({ confirmReplace: true }); return; }
        self.doImport(self.state.csvText, true);
      },
      replaceLabel: st.confirmReplace ? 'Sûr ? Tout remplacer' : 'Remplacer toute la banque',
      replaceStyle: st.confirmReplace ? 'color: var(--color-neutral-100); background: var(--color-neutral-700); border-color: var(--color-neutral-500);' : '',
      hasImportMsg: !!st.importMsg,
      importMsg: st.importMsg,
      importMsgStyle: st.importOk ? OK : ERR,
      exportText: exportText,
      copyLabel: st.copied ? 'Copié' : 'Copier dans le presse-papiers',
      copyExport: function () {
        try { navigator.clipboard.writeText(self.exportCsv()).then(function () { self.setState({ copied: true }); }); } catch (e) {}
      },

      // game
      unitLabel: unit,
      qNumber: st.qIndex + 1,
      qTotal: gq.length,
      qKicker: unit + ' ' + (st.qIndex + 1) + (isParoles ? ' · ' + levelLabel(q.level) : '') + (q.category ? ' · ' + q.category : ''),
      isQuizQ: !isBlind && !isParoles,
      isParolesQ: isParoles,
      isBlindQ: isBlind,
      hasOptions: !marks,
      qText: q.q,
      lyric: lyric,
      parolesSong: isParoles && st.revealed && q.answer ? q.answer : '',
      showFav: isParoles && st.revealed,
      favLabel: qFav ? '★ Dans les favoris karaoké' : '☆ Favori karaoké',
      favPressed: qFav,
      favStyle: qFav ? 'color: var(--color-accent-100); border-color: var(--color-accent); background: var(--color-accent-800);' : '',
      toggleQFav: function () { if (favItem) self.toggleFav(favItem); },
      blindTitle: st.revealed ? q.answer : 'Quel est ce titre ?',
      blindTitleStyle: st.revealed ? 'color: ' + GOOD_L + '; text-shadow: 0 0 36px color-mix(in oklch, ' + GOOD + ' 55%, transparent); animation: qpPop .6s ease-out .1s both;' : '',
      blindPlayer: blindMedia ? React.createElement(MediaPlayer, { key: 'clip' + st.qIndex + '-' + q.id, media: blindMedia, hidden: !st.revealed, play: phase === 'playing' || st.revealed, controls: st.revealed }) : null,
      blindNoMedia: isBlind && !blindMedia,
      blindClock: clock(elapsed),
      blindClockStyle: phase === 'playing' ? 'color: var(--color-text);' : 'color: var(--color-neutral-400);',
      blindTiers: blindTiers,
      showBlindClock: isBlind && !st.revealed,
      blindReady: isBlind && !st.revealed && phase === 'ready',
      blindPlaying: isBlind && !st.revealed && phase === 'playing',
      blindStopped: isBlind && !st.revealed && phase === 'stopped',
      blindCanResume: elapsed < BLIND_MAX_MS,
      blindPlay: function () { self.blindPlay(); },
      blindStop: function () { self.blindStop(); },
      optionsView: optionsView,
      rows: rows,
      answeredLabel: isBlind ? buzzed + ' / ' + players.length + ' ont buzzé' : answered + ' / ' + players.length + (marks ? ' notés' : ' ont répondu'),
      spaceAction: st.revealed ? 'continuer' : isBlind && phase === 'ready' ? 'lancer l\'extrait' : isBlind && phase === 'playing' ? 'arrêter et vérifier' : 'révéler',
      revealed: st.revealed,
      notRevealed: !st.revealed && (!isBlind || phase === 'stopped'),
      reveal: function () { self.doReveal(); },
      nextLabel: isLast ? 'Classement final' : (isBlind ? 'Extrait suivant' : isParoles ? 'Chanson suivante' : 'Question suivante'),
      next: function () { self.doNext(); },
      quitLabel: st.confirmQuit ? 'Sûr ? Terminer' : 'Quitter la partie',
      quitGame: function () {
        if (!self.state.confirmQuit) { self.setState({ confirmQuit: true }); return; }
        self.setState({ screen: 'home', tab: self.state.gameMode || 'quiz', confirmQuit: false, picks: {}, revealed: false, qDeadline: null });
      },
      showMediaBar: !!media && media.kind !== 'youtube',
      showRows: !(media && media.kind === 'youtube'),
      mediaYoutube: !!media && media.kind === 'youtube',
      mediaSpotify: !!media && media.kind === 'spotify',
      mediaLink: !!media && media.kind === 'link',
      mediaSrc: media && media.src ? media.src : '',
      mediaHref: media ? media.href : '',
      mediaHost: media && media.host ? media.host : '',
      hasTimer: hasTimer,
      timerLabel: timerLabel,
      timerStyle: timerStyle,
      timerPct: hasTimer ? (remainMs / (st.timerSec * 1000)) * 100 : 0,
      scoreboard: scoreboard,
      scoresHidden: hideScores,

      // final
      endKicker: MODES[gm].tab,
      winnerName: ranking.filter(function (r) { return r.rank === 1; }).map(function (r) { return r.name; }).join(' et '),
      podium: podium,
      restRanking: rankAll.slice(3),
      ptsTotal: maxPts,
      stage: this.renderStage(st.screen === 'end' ? 'end' : st.screen === 'play' ? (st.revealed ? 'reveal' : 'play') : 'idle', st.qIndex),
      recap: recap,
      recapTitle: gm === 'blind' ? 'Récap des extraits' : gm === 'paroles' ? 'Récap des chansons' : 'Récap des questions',
      hasHardest: !!hardestItem && hardestItem.rate < 1,
      hardest: hardestItem ? (gm === 'blind' ? 'E' : gm === 'paroles' ? 'C' : 'Q') + hardestItem.n + ', ' + hardestItem.hits + ' bonne' + (plural(hardestItem.hits) ? 's' : '') + ' réponse' + (plural(hardestItem.hits) ? 's' : '') : '',
      playAgain: function () { self.startGame(self.state.gameMode || 'quiz'); },
      goHome: function () { self.setState({ screen: 'home', tab: self.state.gameMode || 'quiz', picks: {}, revealed: false }); }
    };
  }

  render() { return view(this.renderVals()); }
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
