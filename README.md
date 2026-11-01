# Quiz Party – Star Academy edition

A host-run quiz app for parties and team events, styled like a TV talent-show stage. One person runs the game on a laptop or big screen; players answer out loud or on paper, and the host records each player's answer.

It's a static site with no build step, server or database: plain HTML, CSS and JavaScript, with React loaded from the `vendor/` folder. Players and questions are saved in the browser (localStorage) on the device that runs the game.

## Features

- **Navigation:** Quiz · N'oubliez pas les paroles · Blind test · Karaoké, with **Réglages** (questions: write, import, back up) on the right.
- **Three game modes**, each with its own setup screen and questions:
  - **Quiz:** multiple-choice questions.
  - **N'oubliez pas les paroles:** the start of a lyric line; players complete it. Four levels, chosen on the setup screen:
    *Facile* (4 endings to choose from), *Moyen* (the last word is missing), *Difficile* (the last 3–4 words are missing), *Très difficile* (only the start of the line is shown).
    The reveal shows the whole line, and the song can be added to the karaoké favorites.
  - **Blind test:** a YouTube or Spotify clip plays with the title and video hidden. The clock starts at 0 when the host clicks **Play**.
    Tapping a player's name when they buzz gives them the points of that moment: 4 (0–15 s), 3 (15–30 s), 2 (30–45 s), 1 (45–60 s).
    **Stop · vérifier** pauses the clip; the host marks each player ✓ or ✗ (or resumes listening), then **Lumière !** reveals the song and counts the points.
    A right answer shows a 4 / 3 / 2 / 1 choice to correct its points (for a buzz tapped too late, or not tapped at all); marks and points can still be corrected after the reveal, and the scores follow.
    Spotify plays full tracks only when the browser is logged in to Spotify; otherwise the embed plays a 30-second preview.
- **Contestants:** add players or teams once. They're remembered, and you tap to include or skip them each game.
- **Question bank:** write questions with 2–6 answers, an optional **category** and an optional **link**. Search, edit or delete them.
- **Game setup:** choose a category (or All), how many questions (5 / 10 / 15 / 20 / All) and an optional timer (15s / 30s / 60s).
- **Least-played first:** questions that have been played less often come up first, so repeat games stay fresh.
- **Live game:** record each player's answer, then press **Lights up** (or Space) to reveal it. Correct answers glow green and wrong ones shake in red, and the leaderboard updates.
- **Media on reveal:**
  - YouTube link: the video plays on the result.
  - Spotify link (track, album, playlist, episode): the Spotify player appears.
  - Any other link: a **Discover** button opens it.
- **Karaoké:** a gallery of karaoke videos with a search by artist or song title. Click a thumbnail to play it full-size in the app. The star adds a song to **Favoris**, alongside the songs starred during N'oubliez pas les paroles (a favorite without a YouTube link opens a YouTube karaoké search).
- **Final screen:** a podium for the top 3, the full ranking, and a recap of every question showing how many players got it right.

## Adding questions

### Published with the site (every device gets them)
Put them in `data/questions.js` (the format for each mode is documented at the top of the file), then run `./update.sh`. The easiest way: **Réglages → Sauvegarder → Copier**, paste the text to Claude, and ask it to publish them.
Questions written on a device stay on that device until published this way. Editing a published question on a device keeps that device's version; deleting it hides it on that device only.

### In the app
Open **Question bank**, then **Write a question**:
1. Type the question.
2. Optionally set a category, such as `Music` or `Cinema`. Categories you've used before are suggested.
3. Fill in at least two answers and tap the letter of the right one.
4. Optionally paste a YouTube, Spotify or web link.
5. Click **Add to bank**.

### Import from a spreadsheet (CSV / Google Sheets)
Open **Question bank**, then **Import**, and paste cells straight from Google Sheets or upload a `.csv` file.

Columns: `Question, A, B, C, D, Answer`, plus optional `Category`, `Link`, `Mode` and `Chanson` columns. `Mode` is `Quiz`, `Paroles` or `Blind test` (empty means Quiz). A blind-test row needs only `Link` and `Answer` (title, artist). A paroles row: `Question` is the start of the line followed by `___`, `A` the ending to find, `B`–`D` optional wrong endings (for easy mode), `Chanson` the title and artist.

- `Answer` can be a letter (`B`), a number (`2`) or the exact answer text.
- 2 to 6 answer columns are allowed.
- The header row is optional. You need one if you use `Category` or `Link`, because the app finds those columns by name.
- Comma, semicolon and tab separators are all detected automatically.

Example:

```csv
Question,A,B,C,D,Answer,Category,Link
Who won the first season?,Jenifer,Nolwenn,Grégory,Élodie,A,Star Academy,
Which artist sings "Tourner dans le vide"?,Indila,Zaz,Louane,Vitaa,A,Music,https://www.youtube.com/watch?v=vtNJMAyeP0s
Which city hosts the château?,Paris,Dammarie-lès-Lys,Lyon,Nice,B,Star Academy,https://en.wikipedia.org/wiki/Star_Academy_(France)
```

- **Add to bank** keeps your existing questions and adds the new ones.
- **Replace whole bank** clears the bank first and asks you to confirm.

### Back up / move questions to another device
**Question bank**, then **Back up**, then **Copy to clipboard**. This exports the whole bank as CSV, including categories and links. Paste it into a Google Sheet to keep it, and import it on any other device.

## Deploying to Vercel

The app is live at https://staracquizz.vercel.app

The site is plain static files, so no build settings are needed. Every push to `main` on GitHub redeploys it.

### Option A: Vercel CLI
```bash
npm i -g vercel      # or use npx
cd <this-folder>
vercel --prod
```
The first run asks you to log in and link a project.

### Option B: Git + Vercel dashboard (auto-deploy on every push)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Quiz Party"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Go to vercel.com/new and import the repository.
3. Framework preset: **Other**. Leave the build command empty. Output directory: `.` (the root).
4. Click **Deploy**. Every push to `main` then redeploys the site automatically.

### Option C: drag and drop
Go to vercel.com/new and upload the folder that contains `index.html`.

## Project files

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell: loads the styles, React and the app scripts |
| `src/app.js` | The logic: state, game flow, scoring, saving, CSV import/export (`renderVals()` prepares what the screens show) |
| `src/view.js` | The screens, written as HTML inside `` html`…` `` templates |
| `src/karaoke.js` | The karaoké catalogue (one line per song: artist, title and YouTube ID, separated by `\|`) |
| `src/lib/html.js` | Small helper that turns the `` html`…` `` templates into React elements (like JSX, without a build step) |
| `styles/nocturne.css` | The Nocturne design system: color, type and spacing tokens, buttons, cards, forms |
| `styles/app.css` | Stage animations (spotlights, twinkle, pop, shake) and helpers |
| `styles/fonts.css`, `fonts/` | Inter, self-hosted |
| `vendor/` | React 18.3.1 and ReactDOM (production builds) |
| `design/` | The original Claude Design source the app was converted from (reference only) |

### Working on it locally

Any static server works, for example:

```bash
cd <this-folder>
python3 -m http.server 8000
```

Then open http://localhost:8000. Edit a file and reload the page; there's nothing to compile.

### Game options

At the top of `src/app.js`, `CONFIG` holds two switches: `autoReveal` (reveal when the timer reaches zero) and `hideScores` (hide the leaderboard until the final screen).

## Host tips

- Plug in the big screen and use full-screen browser mode (F11 / ⌃⌘F).
- **Space** or **Enter** reveals the answer, then moves to the next question.
- If the page is reloaded during a game, the game resumes where it was (a timed question restarts its countdown).
- Data stays in the browser where you run the game. Clearing site data erases players and questions, so keep a **Back up** CSV somewhere safe.
