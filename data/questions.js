/*
 * Questions published with the app.
 *
 * Every device that opens the site gets these, on top of the questions written on that device.
 * To publish new questions: add them here (or send the "Sauvegarder" CSV to Claude), then run ./update.sh.
 *
 * Three kinds of entries:
 *
 *   Quiz       { mode: 'quiz', question: 'Qui a remporté la saison 1 ?', answers: ['Jenifer', 'Nolwenn', 'Grégory'], correct: 'A',
 *                category: 'Star Academy', link: '' }
 *   Paroles    { mode: 'paroles', start: 'Et je m\'en vais', end: 'au bout de mes rêves', wrong: ['…', '…', '…'],
 *                song: 'Titre, Artiste', link: 'https://youtu.be/…' }
 *              start: shown to the players; end: what they must find (the rest of the line);
 *              wrong: 3 false endings, offered in easy mode (optional: without them the song is played at medium level);
 *              song: title and artist, used when the song is added to the karaoké favorites.
 *              Medium hides the last word of the line, hard the last 3–4 words, very hard the whole end.
 *              (The older form { question: 'Et je m\'en vais ___', answers: [...], correct: 'B' } still works.)
 *   Blind test { mode: 'blind', link: 'https://www.youtube.com/watch?v=…&t=42', answer: 'Titre, Artiste', category: 'Années 2010' }
 *              (link is required: YouTube or Spotify; &t=42 starts the clip at 0:42)
 *
 * correct: the letter of the right quiz answer (A = first). category and link are optional.
 */
var QUESTIONS = [
];
