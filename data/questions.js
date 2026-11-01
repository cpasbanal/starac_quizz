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
 *   Paroles    { mode: 'paroles', question: 'Et je m\'en vais ___', answers: ['…', '…', '…'], correct: 'B', link: 'https://youtu.be/…' }
 *              (___ marks the missing words)
 *   Blind test { mode: 'blind', link: 'https://www.youtube.com/watch?v=…&t=42', answer: 'Titre, Artiste', category: 'Années 2010' }
 *              (link is required: YouTube or Spotify; &t=42 starts the clip at 0:42)
 *
 * correct: the letter of the right answer (A = first). category and link are optional.
 */
var QUESTIONS = [
];
