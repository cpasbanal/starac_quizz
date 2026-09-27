# Quiz Party – Star Academy edition

A host-run quiz app for parties and team events, styled like a TV talent-show stage. One person runs the game on a laptop or big screen; players answer out loud or on paper, and the host records each player's answer.

It's one self-contained file (`index.html`), with no build step, server or database. Players and questions are saved in the browser (localStorage) on the device that runs the game.

## Features

- **Contestants:** add players or teams once. They're remembered, and you tap to include or skip them each game.
- **Question bank:** write questions with 2–6 answers, an optional **category** and an optional **link**. Search, edit or delete them.
- **Game setup:** choose a category (or All), how many questions (5 / 10 / 15 / 20 / All) and an optional timer (15s / 30s / 60s).
- **Least-played first:** questions that have been played less often come up first, so repeat games stay fresh.
- **Live game:** record each player's answer, then press **Lights up** (or Space) to reveal it. Correct answers glow green and wrong ones shake in red, and the leaderboard updates.
- **Media on reveal:**
  - YouTube link: the video plays on the result.
  - Spotify link (track, album, playlist, episode): the Spotify player appears.
  - Any other link: a **Discover** button opens it.
- **Karaoké:** a gallery of 81 karaoke videos with a search by artist or song title. Click a thumbnail to play it full-size in the app.
- **Final screen:** a podium for the top 3, the full ranking, and a recap of every question showing how many players got it right.

## Adding questions

### In the app
Open **Question bank**, then **Write a question**:
1. Type the question.
2. Optionally set a category, such as `Music` or `Cinema`. Categories you've used before are suggested.
3. Fill in at least two answers and tap the letter of the right one.
4. Optionally paste a YouTube, Spotify or web link.
5. Click **Add to bank**.

### Import from a spreadsheet (CSV / Google Sheets)
Open **Question bank**, then **Import**, and paste cells straight from Google Sheets or upload a `.csv` file.

Columns: `Question, A, B, C, D, Answer`, plus optional `Category` and `Link` columns.

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

The site is a single static file, so no build settings are needed.

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

| File | Purpose |
| --- | --- |
| `index.html` | The whole app (bundled, self-contained) |
| `README.md` | This file |
| `.gitignore` | Ignores the local `.vercel` link folder |

`index.html` is a compiled bundle, so don't edit it by hand. Make changes in the design source, then export a new `index.html` to replace this one.

## Host tips

- Plug in the big screen and use full-screen browser mode (F11 / ⌃⌘F).
- **Space** or **Enter** reveals the answer, then moves to the next question.
- Data stays in the browser where you run the game. Clearing site data erases players and questions, so keep a **Back up** CSV somewhere safe.
