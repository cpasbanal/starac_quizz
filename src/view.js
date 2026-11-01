/*
 * Quiz Party – the screens. Plain HTML in an html`` template (see src/lib/html.js):
 * ${v.something} values come from renderVals() in src/app.js.
 */
function view(v) {
  return html`
<div style="height: 100vh; min-height: 640px; min-width: 1024px; display: flex; flex-direction: column; position: relative; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); overflow: hidden">
${v.stage}

<header class="nav" style="height: 64px; flex-shrink: 0; padding: 0 32px; gap: 28px; position: relative; z-index: 1">
<div class="nav-brand" style="margin-right: 0; font-size: 20px; display: flex; align-items: center; gap: 10px">
<svg width="22" height="22" viewBox="0 0 256 256" style="color: var(--color-accent-300); filter: drop-shadow(0 0 8px var(--color-accent))"><path fill="currentColor" d="M234.5 114.38l-45.1 39.36 13.51 58.6a16 16 0 0 1-23.84 17.34l-51.11-31-51 31a16 16 0 0 1-23.84-17.34l13.49-58.54-45.11-39.42a16 16 0 0 1 9.11-28.06l59.46-5.15 23.21-55.36a15.95 15.95 0 0 1 29.44 0L166 81.17l59.44 5.15a16 16 0 0 1 9.11 28.06z"></path></svg><span style="letter-spacing: .02em">Quiz Party</span><span class="tag tag-outline" style="padding: 1px 8px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase">En direct</span></div>
${v.showTabs ? html`
<nav style="display: flex; gap: 6px">
${v.navTabs.map((t, tI) => html`
<button key=${tI} class="btn btn-secondary" onClick=${t.go} aria-pressed=${t.active} style="height: 36px; padding: 0 14px; border-color: transparent; ${t.style}">${t.label}</button>
`)}
</nav>
` : null}
<div style="flex-grow: 1"></div>
${v.showTabs ? html`
<div style="display: flex; align-items: center; gap: 14px">
<span aria-hidden="true" style="width: 1px; height: 28px; background: var(--color-divider)"></span>
<button class="btn btn-secondary" onClick=${v.goSettings} aria-pressed=${v.isSettingsTab} style="height: 36px; padding: 0 14px; gap: 8px; border-color: transparent; ${v.settingsTabStyle}">
<svg width="18" height="18" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="128" cy="128" r="40"></circle><path d="M130.05 206.11h-4L94 224.4a103.33 103.33 0 0 1-22.23-12.86l-.12-36.07c-.71-1.12-1.38-2.25-2-3.41L37.62 154a99.17 99.17 0 0 1 0-25.74l31.95-18.12c.66-1.15 1.33-2.29 2-3.41l.15-36.07A103.66 103.66 0 0 1 94 31.86L126 50.11h4l32-18.25a103.33 103.33 0 0 1 22.23 12.86l.12 36.07c.71 1.12 1.38 2.25 2 3.41L218.38 102a99.17 99.17 0 0 1 0 25.74l-31.95 18.12c-.66 1.15-1.33 2.29-2 3.41l-.15 36.07A103.66 103.66 0 0 1 162 224.14z"></path></svg>Réglages <span class="tag tag-neutral" style="padding: 1px 7px">${v.bankCount}</span></button>
</div>
` : null}
${v.isPlay ? html`
<div style="display: flex; align-items: center; gap: 20px">
${v.hasTimer ? html`
<div aria-live="polite" style="display: flex; align-items: center; gap: 8px; font-size: 20px; font-variant-numeric: tabular-nums; ${v.timerStyle}">
<svg width="20" height="20" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round"><circle cx="128" cy="136" r="88"></circle><path d="M128 136l40-40M104 24h48"></path></svg>${v.timerLabel}</div>
` : null}
<div style="font-size: 16px; color: var(--color-neutral-400)">${v.unitLabel} <span style="color: var(--color-text)">${v.qNumber}</span> / ${v.qTotal}</div>
<button class="btn btn-secondary" onClick=${v.quitGame} style="height: 36px; padding: 0 14px">${v.quitLabel}</button>
</div>
` : null}
${v.hasTimer ? html`
<div style="position: absolute; left: 0; bottom: 0; height: 2px; background: var(--color-accent); box-shadow: 0 0 8px var(--color-accent); width: ${v.timerPct}%"></div>
` : null}
</header>

${v.isHome ? html`
<div style="flex-grow: 1; min-height: 0; padding: 12px 32px 32px; display: flex; gap: 24px; position: relative; z-index: 1">
<section class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); flex-grow: 1; min-width: 0; padding: 22px; gap: 14px">
<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px">
<h2 style="margin: 0; font-size: 25px">Les candidats du soir <span style="color: var(--color-neutral-500)">${v.activeCount} / ${v.rosterCount}</span></h2>
<div style="display: flex; gap: 4px">
<button class="btn btn-ghost" onClick=${v.selectAll} style="height: 32px; padding: 0 10px">Tous</button>
<button class="btn btn-ghost" onClick=${v.selectNone} style="height: 32px; padding: 0 10px">Aucun</button>
</div>
</div>
<div style="display: flex; gap: 8px">
<label for="qp-name" class="qp-sr">Nom du nouveau candidat</label>
<input id="qp-name" class="input" type="text" placeholder="Nouveau candidat ou équipe, puis Entrée" value=${v.nameValue} onChange=${v.onName} onKeyDown=${v.onNameKey} style="flex-grow: 1; height: 44px; font-size: 16px; background: var(--color-bg)" />
<button class="btn btn-primary" onClick=${v.addPlayer} style="height: 44px; padding: 0 20px; font-size: 15px">Ajouter</button>
</div>
<p class="text-muted" style="margin: 0; font-size: 13px">Les candidats sont mémorisés. Touchez un nom pour le faire monter sur scène ou le laisser en coulisses.</p>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; align-content: start; padding: 2px">
${v.rosterView.map((p, pI) => html`
<div key=${pI} style="display: flex; align-items: center; border-radius: var(--radius-md); overflow: hidden; ${p.style}">
<button class="btn" onClick=${p.toggle} aria-pressed=${p.active} style="flex-grow: 1; min-width: 0; height: 48px; padding: 0 14px; justify-content: flex-start; gap: 10px; color: inherit; font-size: 16px; border-radius: 0">
<span style="width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; ${p.dotStyle}"></span>
<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${p.name}</span></button>
<button class="btn btn-icon" onClick=${p.remove} aria-label="Retirer ${p.name} des candidats" style="width: 40px; height: 48px; flex-shrink: 0; color: var(--color-neutral-500); border-radius: 0">
<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round"><path d="M200 56L56 200M200 200L56 56"></path></svg>
</button>
</div>
`)}
</div>
</section>

<section class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); width: 380px; flex-shrink: 0; min-height: 0; overflow-y: auto; padding: 22px; gap: 20px">
<div style="display: flex; flex-direction: column; gap: 2px">
<div class="card-kicker">${v.modeTitle}</div>
<h2 style="margin: 0; font-size: 25px">Le prime du soir</h2>
</div>
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="card-kicker">Catégorie</div>
<div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 208px; overflow-y: auto; padding: 2px">
${v.catOptions.map((c, cI) => html`
<button key=${cI} class="btn btn-secondary" onClick=${c.pick} aria-pressed=${c.active} style="height: 34px; padding: 0 12px; gap: 6px; ${c.style}">${c.label}<span style="font-size: 12px; color: var(--color-neutral-400)">${c.count}</span></button>
`)}
</div>
</div>
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="card-kicker">${v.sizeLabel}</div>
<div class="seg" role="radiogroup" aria-label=${v.sizeLabel} style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))">
${v.sizeOptions.map((s, sI) => html`
<label key=${sI} class="seg-opt" style="justify-content: center; height: 42px; font-size: 15px; ${s.labelStyle}"><input type="radio" name="qp-size" checked=${s.active} disabled=${s.disabled} onChange=${s.pick} />${s.label}</label>
`)}
</div>
<p class="text-muted" style="margin: 0; font-size: 13px; line-height: 1.45">Tirées au hasard, les moins jouées d'abord, pour que chaque partie reste inédite.</p>
</div>
${v.showLevels ? html`
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="card-kicker">Difficulté</div>
<div class="seg" role="radiogroup" aria-label="Difficulté" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr))">
${v.levelOptions.map((l, lI) => html`
<label key=${lI} class="seg-opt" style="justify-content: center; text-align: center; height: 42px; font-size: 13px; line-height: 1.1; padding: 0 4px"><input type="radio" name="qp-level" checked=${l.active} onChange=${l.pick} />${l.label}</label>
`)}
</div>
<p class="text-muted" style="margin: 0; font-size: 13px; line-height: 1.45">${v.levelHint}</p>
</div>
` : null}
${v.showBlindRules ? html`
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="card-kicker">Points</div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px">
${[['4 pts', '0–15 s'], ['3 pts', '15–30 s'], ['2 pts', '30–45 s'], ['1 pt', '45–60 s']].map((t, tI) => html`
<div key=${tI} style="display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px var(--color-divider)"><span style="font-size: 16px; font-weight: 500">${t[0]}</span><span style="font-size: 12px; color: var(--color-neutral-400)">${t[1]}</span></div>
`)}
</div>
<p class="text-muted" style="margin: 0; font-size: 13px; line-height: 1.45">Le chrono part de 0 quand vous cliquez sur Play. Touchez le nom d'un candidat quand il buzze : il garde les points du moment. Arrêtez pour vérifier, marquez ✓ ou ✗, et les points sont comptés.</p>
</div>
` : null}
${v.showTimer ? html`
<div style="display: flex; flex-direction: column; gap: 8px">
<div class="card-kicker">Temps par question</div>
<div class="seg" role="radiogroup" aria-label="Temps par question" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr))">
${v.timerOptions.map((t, tI) => html`
<label key=${tI} class="seg-opt" style="justify-content: center; height: 42px; font-size: 15px"><input type="radio" name="qp-timer" checked=${t.active} onChange=${t.pick} />${t.label}</label>
`)}
</div>
<p class="text-muted" style="margin: 0; font-size: 13px; line-height: 1.45">${v.timerHint}</p>
</div>
` : null}
<div style="flex-grow: 1"></div>
<div style="display: flex; flex-direction: column; gap: 10px">
<p style="margin: 0; font-size: 15px; color: var(--color-neutral-300)">${v.startHint}</p>
${v.modeEmpty ? html`
<button class="btn btn-secondary" onClick=${v.goAddFirst} style="height: 44px; font-size: 15px">${v.addFirstLabel}</button>
` : null}
<button class="btn btn-primary" onClick=${v.start} disabled=${v.startDisabled} style="height: 60px; font-size: 22px; gap: 12px; box-shadow: 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent)">
<svg width="22" height="22" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"><path d="M72 39.9v176.2a8 8 0 0 0 12.2 6.8l144-88.1a8 8 0 0 0 0-13.6l-144-88.1A8 8 0 0 0 72 39.9z"></path></svg>${v.startLabel}</button>
</div>
</section>
</div>
` : null}

${v.isSettings ? html`
<div style="flex-grow: 1; min-height: 0; padding: 12px 32px 32px; display: flex; gap: 24px; position: relative; z-index: 1">
<section class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); width: 460px; flex-shrink: 0; min-height: 0; padding: 22px; gap: 14px">
<div class="seg" role="radiogroup" aria-label="Panneau" style="align-self: flex-start">
${v.panelTabs.map((t, tI) => html`
<label key=${tI} class="seg-opt"><input type="radio" name="qp-panel" checked=${t.active} onChange=${t.pick} />${t.label}</label>
`)}
</div>

${v.panelForm ? html`
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 2px">
<h3 style="margin: 0 0 4px; font-size: 22px">${v.formTitle}</h3>
<div class="seg" role="radiogroup" aria-label="Jeu" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))">
${v.formModes.map((m, mI) => html`
<label key=${mI} class="seg-opt" style="justify-content: center; height: 40px"><input type="radio" name="qp-mode" checked=${m.active} onChange=${m.pick} />${m.label}</label>
`)}
</div>
${v.formBlind ? html`
<div class="field">
<label for="qp-link">${v.formLinkLabel} <span style="color: var(--color-neutral-500)">${v.formLinkHelp}</span></label>
<input id="qp-link" class="input" type="url" value=${v.formLink} onChange=${v.onFormLink} placeholder="https://www.youtube.com/watch?v=… ou open.spotify.com/track/…" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
${v.hasFormLinkHint ? html`
<span style="font-size: 12px; color: var(--color-accent-300)">${v.formLinkHint}</span>
` : null}
</div>
<div class="field">
<label for="qp-ans">Réponse <span style="color: var(--color-neutral-500)">(titre, artiste)</span></label>
<input id="qp-ans" class="input" type="text" value=${v.formAnswer} onChange=${v.onFormAnswer} placeholder="ex. Tourner dans le vide, Indila" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
</div>
` : v.formParoles ? html`
<div class="field">
<label for="qp-q">Début des paroles <span style="color: var(--color-neutral-500)">(affiché aux candidats)</span></label>
<textarea id="qp-q" class="input" value=${v.formQ} onChange=${v.onFormQ} placeholder="ex. Et je m'en vais" style="min-height: 64px; height: 64px; resize: none; font-size: 16px; background: var(--color-bg)"></textarea>
</div>
<div class="field">
<label for="qp-end">Suite à trouver <span style="color: var(--color-neutral-500)">(la fin de la phrase)</span></label>
<input id="qp-end" class="input" type="text" value=${v.formEnd} onChange=${v.onFormEnd} placeholder="ex. au bout de mes rêves" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
<span style="font-size: 12px; color: var(--color-neutral-500)">Moyen : le dernier mot est caché. Difficile : les 3 ou 4 derniers. Très difficile : toute la suite.</span>
</div>
<div style="display: flex; flex-direction: column; gap: 8px">
<div style="font-size: 12px; color: var(--color-neutral-400)">Fausses suites · proposées en mode facile (facultatif). Écrivez un seul mot chacune pour ne faire deviner que le dernier mot</div>
${v.formWrong.map((w) => html`
<div key=${w.n}>
<label for="qp-wrong-${w.n}" class="qp-sr">Fausse suite ${w.n}</label>
<input id="qp-wrong-${w.n}" class="input" type="text" value=${w.value} onChange=${w.onChange} placeholder="Fausse suite ${w.n}" style="width: 100%; box-sizing: border-box; height: 40px; font-size: 15px; background: var(--color-bg)" />
</div>
`)}
</div>
<div class="field">
<label for="qp-song">Chanson <span style="color: var(--color-neutral-500)">(titre, artiste — pour les favoris karaoké)</span></label>
<input id="qp-song" class="input" type="text" value=${v.formAnswer} onChange=${v.onFormAnswer} placeholder="ex. Tourner dans le vide, Indila" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
</div>
<div class="field">
<label for="qp-link">${v.formLinkLabel} <span style="color: var(--color-neutral-500)">${v.formLinkHelp}</span></label>
<input id="qp-link" class="input" type="url" value=${v.formLink} onChange=${v.onFormLink} placeholder="YouTube, Spotify ou tout autre lien" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
${v.hasFormLinkHint ? html`
<span style="font-size: 12px; color: var(--color-accent-300)">${v.formLinkHint}</span>
` : null}
</div>
` : html`
<div class="field">
<label for="qp-q">${v.formQLabel}</label>
<textarea id="qp-q" class="input" value=${v.formQ} onChange=${v.onFormQ} placeholder=${v.formQPlaceholder} style="min-height: 76px; height: 76px; resize: none; font-size: 16px; background: var(--color-bg)"></textarea>
</div>
`}
<div class="field">
<label for="qp-cat">Catégorie</label>
<input id="qp-cat" class="input" type="text" list="qp-cats" value=${v.formCat} onChange=${v.onFormCat} placeholder="ex. Musique, Cinéma (facultatif)" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
<datalist id="qp-cats">${v.catNames.map((c, cI) => html`<option key=${cI} value=${c.name}></option>`)}</datalist>
</div>
${v.formQuiz ? html`
<div style="display: flex; flex-direction: column; gap: 10px">
<div style="font-size: 12px; color: var(--color-neutral-400)">${v.formOptsLabel}</div>
${v.formOpts.map((o, oI) => html`
<div key=${oI} style="display: flex; gap: 8px; align-items: center">
<button class="btn" onClick=${o.markCorrect} aria-pressed=${o.correct} aria-label="Marquer ${o.letter} comme bonne réponse" style="width: 44px; height: 44px; flex-shrink: 0; padding: 0; font-size: 16px; ${o.style}">${o.letter}</button>
<label for="qp-opt-${o.letter}" class="qp-sr">Réponse ${o.letter}</label>
<input id="qp-opt-${o.letter}" class="input" type="text" value=${o.value} onChange=${o.onChange} placeholder=${o.placeholder} style="flex-grow: 1; min-width: 0; height: 44px; font-size: 15px; background: var(--color-bg)" />
</div>
`)}
${v.canAddOpt ? html`
<button class="btn btn-ghost" onClick=${v.addOpt} style="align-self: flex-start; height: 32px; padding: 0 8px">+ Ajouter une réponse</button>
` : null}
<div class="field">
<label for="qp-link">${v.formLinkLabel} <span style="color: var(--color-neutral-500)">${v.formLinkHelp}</span></label>
<input id="qp-link" class="input" type="url" value=${v.formLink} onChange=${v.onFormLink} placeholder="YouTube, Spotify ou tout autre lien" style="height: 44px; font-size: 15px; background: var(--color-bg)" />
${v.hasFormLinkHint ? html`
<span style="font-size: 12px; color: var(--color-accent-300)">${v.formLinkHint}</span>
` : null}
</div>
</div>
` : null}
${v.hasFormMsg ? html`
<div style="font-size: 14px; ${v.formMsgStyle}">${v.formMsg}</div>
` : null}
<div style="display: flex; gap: 8px; margin-top: 4px">
<button class="btn btn-primary" onClick=${v.saveForm} style="height: 44px; padding: 0 22px; font-size: 15px">${v.saveLabel}</button>
<button class="btn btn-secondary" onClick=${v.resetForm} style="height: 44px; padding: 0 18px; font-size: 15px">${v.resetLabel}</button>
</div>
</div>
` : null}

${v.panelImport ? html`
<div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px">
<h3 style="margin: 0; font-size: 22px">Importer depuis un CSV / Sheets</h3>
<p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--color-neutral-300)">Colonnes : Question, A, B, (C, D…), Réponse. Réponse = une lettre (B), un chiffre (2) ou le texte exact. Avec une ligne d'en-tête, ajoutez des colonnes Catégorie, Lien et Mode (Quiz, Paroles ou Blind test ; vide = Quiz). Pour les paroles : Question = le début suivi de ___, A = la suite à trouver, B à D = fausses suites (facultatives), Chanson = titre, artiste. Pour le blind test : Lien + Réponse (titre, artiste). Collez directement des cellules Google Sheets ou importez un fichier .csv.</p>
<label class="btn btn-secondary" style="align-self: flex-start; height: 38px; padding: 0 14px">
<svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"><path d="M128 152V40M88 80l40-40 40 40M216 152v56a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-56"></path></svg>Choisir un fichier CSV<input class="qp-sr" type="file" accept=".csv,.tsv,.txt,text/csv" onChange=${v.onFile} /></label>
<label for="qp-csv" class="qp-sr">Coller des questions</label>
<textarea id="qp-csv" class="input" placeholder="…ou collez ici" value=${v.csvValue} onChange=${v.onCsv} style="flex-grow: 1; min-height: 100px; resize: none; font-family: ui-monospace, Menlo, monospace; font-size: 13px; background: var(--color-bg)"></textarea>
${v.hasImportMsg ? html`
<div style="font-size: 14px; ${v.importMsgStyle}">${v.importMsg}</div>
` : null}
<div style="display: flex; gap: 8px">
<button class="btn btn-primary" onClick=${v.importAppend} style="height: 44px; padding: 0 18px; font-size: 15px">Ajouter à la banque</button>
<button class="btn btn-secondary" onClick=${v.importReplace} style="height: 44px; padding: 0 18px; font-size: 15px; ${v.replaceStyle}">${v.replaceLabel}</button>
</div>
</div>
` : null}

${v.panelExport ? html`
<div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px">
<h3 style="margin: 0; font-size: 22px">Sauvegarder vos questions</h3>
<p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--color-neutral-300)">Copiez-collez dans un Google Sheet ou un fichier texte. Recollez-le dans Importer quand vous voulez.</p>
<p style="margin: 0; font-size: 13px; line-height: 1.5; color: var(--color-neutral-400)">Ces questions ne vivent que sur cet appareil. Pour les publier avec le site, envoyez ce texte à Claude : elles iront dans data/questions.js.</p>
<button class="btn btn-primary" onClick=${v.copyExport} style="align-self: flex-start; height: 38px; padding: 0 14px">${v.copyLabel}</button>
<label for="qp-exp" class="qp-sr">Questions exportées</label>
<textarea id="qp-exp" class="input" readOnly=${true} value=${v.exportText} style="flex-grow: 1; min-height: 100px; resize: none; font-family: ui-monospace, Menlo, monospace; font-size: 12px; background: var(--color-bg)"></textarea>
</div>
` : null}
</section>

<section class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); flex-grow: 1; min-width: 0; min-height: 0; padding: 22px; gap: 14px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px">
<h2 style="margin: 0; font-size: 25px">Banque de questions <span style="color: var(--color-neutral-500)">${v.listCount}</span></h2>
<label for="qp-search" class="qp-sr">Rechercher des questions</label>
<input id="qp-search" class="input" type="search" placeholder="Rechercher" value=${v.searchValue} onChange=${v.onSearch} style="width: 240px; height: 38px; background: var(--color-bg)" />
</div>
<div class="seg" role="radiogroup" aria-label="Filtrer par jeu" style="align-self: flex-start">
${v.setFilters.map((s, sI) => html`
<label key=${sI} class="seg-opt" style="gap: 6px"><input type="radio" name="qp-filter" checked=${s.active} onChange=${s.pick} />${s.label}<span style="font-size: 12px; color: var(--color-neutral-400)">${s.count}</span></label>
`)}
</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px">
${v.bankEmpty ? html`
<p class="text-muted" style="margin: 0; font-size: 15px">Aucune question pour l'instant. Écrivez-en une à gauche ou importez une liste.</p>
` : null}
${v.bankView.map((q, qI) => html`
<div key=${qI} style="display: flex; align-items: center; gap: 12px; padding: 10px 8px 10px 12px; border-radius: var(--radius-md); background: linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px; ${q.style}">
<span style="width: 28px; flex-shrink: 0; font-size: 13px; color: var(--color-neutral-500); font-variant-numeric: tabular-nums">${q.n}</span>
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
<div style="font-size: 15px; font-weight: 500; line-height: 1.3">${q.text}</div>
<div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-neutral-400); flex-wrap: wrap"><span class="tag tag-accent" style="padding: 1px 7px">${q.modeTag}</span>${q.shipped ? html`<span class="tag tag-outline" style="padding: 1px 7px">Publiée</span>` : null}${q.hasCategory ? html`<span class="tag tag-neutral" style="padding: 1px 7px">${q.category}</span>` : null}${q.hasLink ? html`<span class="tag tag-outline" style="padding: 1px 7px">${q.linkLabel}</span>` : null}${q.hasAnswer ? html`<span style="color: var(--color-accent-300)">${q.answer}</span>` : null}<span>${q.details}</span><span>·</span><span>${q.played}</span></div>
</div>
<button class="btn btn-secondary" onClick=${q.edit} aria-label="Modifier la question ${q.n}" style="height: 34px; padding: 0 12px; flex-shrink: 0">Modifier</button>
<button class="btn btn-secondary" onClick=${q.del} aria-label="Supprimer la question ${q.n}" style="height: 34px; padding: 0 12px; flex-shrink: 0; ${q.delStyle}">${q.delLabel}</button>
</div>
`)}
</div>
</section>
</div>
` : null}

${v.isKara ? html`
<div style="flex-grow: 1; min-height: 0; padding: 12px 32px 32px; display: flex; position: relative; z-index: 1">
<section class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); flex-grow: 1; min-width: 0; min-height: 0; padding: 22px; gap: 16px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
<div style="display: flex; align-items: center; gap: 16px">
<h2 style="margin: 0; font-size: 25px">Karaoké <span style="color: var(--color-neutral-500)">${v.karaCount}</span></h2>
<div class="seg" role="radiogroup" aria-label="Catalogue ou favoris">
${v.karaFilters.map((f, fI) => html`
<label key=${fI} class="seg-opt" style="gap: 6px"><input type="radio" name="qp-kara-filter" checked=${f.active} onChange=${f.pick} />${f.label}<span style="font-size: 12px; color: var(--color-neutral-400)">${f.count}</span></label>
`)}
</div>
</div>
<label for="qp-kara-search" class="qp-sr">Rechercher un artiste ou une chanson</label>
<input id="qp-kara-search" class="input" type="search" placeholder="Artiste ou chanson" value=${v.karaSearch} onChange=${v.onKaraSearch} style="width: 280px; max-width: 100%; height: 38px; background: var(--color-bg)" />
</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; margin: 0 -6px; padding: 0 6px">
${v.karaEmpty ? html`
<p class="text-muted" style="margin: 0; font-size: 15px">Aucun titre ne correspond à « ${v.karaSearch} ».</p>
` : null}
${v.karaNoFavs ? html`
<p class="text-muted" style="margin: 0; font-size: 15px">Pas encore de favoris. Touchez l'étoile d'un titre du catalogue, ou ajoutez une chanson après sa révélation dans N'oubliez pas les paroles.</p>
` : null}
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px 16px; padding-bottom: 8px">
${v.karaView.map((k, kI) => html`
<div key=${kI} style="position: relative; display: flex; flex-direction: column; gap: 10px">
<button type="button" onClick=${k.open} aria-label="Lancer ${k.title} de ${k.artist}" style="all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 8px; border-radius: var(--radius-md); padding: 6px; margin: -6px; flex-grow: 1; min-width: 0" data-hover>
<div style="position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius-md); overflow: hidden; background: linear-gradient(135deg, var(--color-accent-900), var(--color-neutral-900)); border: 1px solid var(--color-divider)">
${k.thumb ? html`<img onError=${hideBrokenImage} src=${k.thumb} alt="" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover" />` : html`<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 0 12px; text-align: center; font-size: 12px; color: var(--color-neutral-400)">Recherche karaoké sur YouTube</span>`}
<span style="position: absolute; left: 8px; bottom: 8px; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--color-bg) 70%, transparent); border: 1px solid var(--color-accent); color: var(--color-accent-200)"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.5v9l7.5-4.5z"></path></svg></span>
</div>
<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 0 2px">
<div style="font-size: 15px; font-weight: 500; line-height: 1.3; text-wrap: pretty">${k.title}</div>
<div style="font-size: 13px; color: var(--color-neutral-400)">${k.artist}</div>
</div>
</button>
<div role="group" aria-label="Version de ${k.title}" style="display: flex; gap: 6px">
<button type="button" class="btn btn-secondary" onClick=${k.open} title="Version karaoké" style="flex: 1; height: 30px; padding: 0 8px; font-size: 12px">Karaoké</button>
<a class="btn btn-ghost" href=${k.lyricsHref} target="_blank" rel="noopener" title="Vidéo YouTube avec les paroles (nouvel onglet)" style="flex: 1; height: 30px; padding: 0 8px; font-size: 12px; border: 1px solid var(--color-divider)">Paroles</a>
<a class="btn btn-ghost" href=${k.spotifyHref} target="_blank" rel="noopener" title="Ouvrir dans Spotify, qui affiche les paroles (nouvel onglet)" style="flex: 1; height: 30px; padding: 0 8px; font-size: 12px; border: 1px solid var(--color-divider)">Spotify</a>
</div>
<button type="button" class="btn" onClick=${k.toggleFav} aria-pressed=${k.fav} aria-label=${k.favLabel} title=${k.favLabel} style="position: absolute; top: 6px; right: 6px; width: 34px; height: 34px; padding: 0; font-size: 18px; border-radius: 50%; background: color-mix(in srgb, var(--color-bg) 72%, transparent); border: 1px solid; ${k.favStyle}">${k.fav ? '★' : '☆'}</button>
</div>
`)}
</div>
</div>
</section>
</div>
${v.karaOpen ? html`
<div onClick=${v.karaClose} style="position: fixed; inset: 0; z-index: 50; background: color-mix(in srgb, var(--color-bg) 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 32px">
<div onClick=${v.karaStop} style="width: min(100%, calc((100vh - 160px) * 16 / 9)); display: flex; flex-direction: column; gap: 14px">
<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
<div style="font-size: 22px; font-weight: 500">${v.karaNowTitle}</div>
<div style="font-size: 15px; color: var(--color-neutral-400)">${v.karaNowArtist}</div>
</div>
<div style="display: flex; gap: 8px; flex-shrink: 0">
<a class="btn btn-ghost" href=${v.karaNowYt} target="_blank" rel="noopener" style="height: 38px; padding: 0 14px">Ouvrir sur YouTube</a>
<button class="btn btn-secondary" onClick=${v.karaClose} style="height: 38px; padding: 0 14px">Fermer</button>
</div>
</div>
<div style="aspect-ratio: 16 / 9; width: 100%; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-accent); box-shadow: 0 0 40px color-mix(in srgb, var(--color-accent) 25%, transparent); background: var(--color-neutral-900)">
<iframe src=${v.karaNowSrc} title=${v.karaNowTitle} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen=${true} style="width: 100%; height: 100%; border: 0; display: block"></iframe>
</div>
</div>
</div>
` : null}
` : null}

${v.isPlay ? html`
<div style="flex-grow: 1; min-height: 0; padding: 20px 32px 28px; display: flex; gap: 24px; position: relative; z-index: 1">
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0 4px; text-align: center">
<h6 style="margin: 0; color: var(--color-accent-300)">${v.qKicker}</h6>
${v.isQuizQ ? html`
<h1 style="margin: 0; font-size: 42px; line-height: 1.15; text-wrap: balance; max-width: 28ch; text-shadow: 0 0 36px color-mix(in srgb, var(--color-accent) 40%, transparent)">${v.qText}</h1>
` : null}
${v.isParolesQ ? html`
${v.parolesTitle ? html`<h2 style="margin: 0; font-size: 26px; line-height: 1.2; text-wrap: balance; max-width: 32ch">${v.parolesTitle}${v.parolesArtist ? html`<span style="font-weight: 400; color: var(--color-neutral-400)"> · ${v.parolesArtist}</span>` : null}</h2>` : null}
<p style="margin: 0; font-size: 46px; line-height: 1.3; font-weight: 500; font-style: italic; text-wrap: balance; max-width: 26ch; text-shadow: 0 0 36px color-mix(in srgb, var(--color-accent) 40%, transparent)"><span aria-hidden="true" style="color: var(--color-accent-300)">« </span>${v.lyric.map((p, pI) => p.blank
  ? html`<span key=${pI} style="display: inline-block; min-width: 4ch; padding: 0 8px; margin: 0 4px; border-bottom: 3px solid var(--color-accent); color: var(--color-accent-200); font-style: normal; background: color-mix(in srgb, var(--color-accent) 14%, transparent); border-radius: 6px 6px 0 0; transition: color .4s, border-color .4s; ${p.style}">${p.text || ' '}</span>`
  : html`<span key=${pI}>${p.text}</span>`)}<span aria-hidden="true" style="color: var(--color-accent-300)"> »</span></p>
` : null}
${v.isBlindQ ? html`
<h1 style="margin: 0; font-size: 42px; line-height: 1.15; text-wrap: balance; max-width: 28ch; transition: color .4s; text-shadow: 0 0 36px color-mix(in srgb, var(--color-accent) 40%, transparent); ${v.blindTitleStyle}">${v.blindTitle}</h1>
` : null}
</div>
${v.isBlindQ ? html`
<div style="flex: 1 1 0; min-height: 200px; display: flex; flex-direction: column">
${v.blindPlayer}
${v.blindNoMedia ? html`<p class="text-muted" style="margin: auto; font-size: 15px">Lien manquant ou illisible pour cet extrait.</p>` : null}
</div>
${v.showBlindClock ? html`
<div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 20px">
<div aria-live="off" style="font-size: 44px; font-weight: 500; font-variant-numeric: tabular-nums; min-width: 4ch; text-align: right; ${v.blindClockStyle}">${v.blindClock}</div>
<div style="display: flex; gap: 6px">
${v.blindTiers.map((t, tI) => html`
<div key=${tI} style="display: flex; flex-direction: column; align-items: center; padding: 6px 12px; border-radius: var(--radius-md); transition: background .3s, color .3s; ${t.style}"><span style="font-size: 17px; font-weight: 500">${t.label}</span><span style="font-size: 11px; opacity: .8">${t.range}</span></div>
`)}
</div>
</div>
` : null}
` : null}
${v.hasOptions ? html`
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
${v.optionsView.map((o, oI) => html`
<div key=${oI} style="display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface) 80%, transparent); backdrop-filter: blur(10px); box-shadow: var(--shadow-sm); transition: opacity .4s, box-shadow .4s, background .4s; ${o.style}">
<span style="flex-shrink: 0; width: 38px; height: 38px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 500; ${o.chipStyle}">${o.letter}</span>
<span style="font-size: 21px; font-weight: 500; line-height: 1.25">${o.text}</span>
<span style="flex-grow: 1"></span>
${o.showCount ? html`
<span class="tag tag-neutral" style="flex-shrink: 0">${o.count}</span>
` : null}
</div>
`)}
</div>
` : null}
${v.mediaYoutube ? html`
<div style="flex-grow: 1; min-height: 0; display: flex; justify-content: center; animation: qpFloat .5s ease-out .5s both">
<iframe src=${v.mediaSrc} title="Vidéo de cette question" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen=${true} style="border: 0; display: block; height: 100%; max-width: 100%; aspect-ratio: 16 / 9; border-radius: var(--radius-md); box-shadow: var(--shadow-md), 0 0 0 1px var(--color-divider), 0 0 48px color-mix(in srgb, var(--color-accent) 25%, transparent)"></iframe>
</div>
` : null}
${v.showMediaBar ? html`
<div style="flex-shrink: 0; display: flex; align-items: center; gap: 16px; animation: qpFloat .5s ease-out .5s both">
${v.mediaSpotify ? html`
<iframe src=${v.mediaSrc} title="Lecteur Spotify de cette question" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="border: 0; flex-grow: 1; min-width: 0; max-width: 560px; border-radius: 12px"></iframe>
` : null}
${v.mediaLink ? html`
<a class="btn btn-primary" href=${v.mediaHref} target="_blank" rel="noopener noreferrer" style="height: 48px; padding: 0 22px; font-size: 17px; gap: 10px; text-decoration: none">Découvrir
<svg width="18" height="18" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"><path d="M64 192L192 64M88 64h104v104"></path></svg></a>
<span style="font-size: 14px; color: var(--color-neutral-400)">${v.mediaHost}</span>
` : null}
</div>
` : null}
${v.showRows ? html`
<div style="flex-grow: 1; min-height: 0; max-height: ${v.isBlindQ ? '34%' : 'none'}; overflow-y: auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-content: start; padding: 2px">
${v.rows.map((row, rowI) => html`
<div key=${rowI} style="display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface) 60%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: background .3s; ${row.style}">
${row.canBuzz ? html`
<button type="button" onClick=${row.buzz} aria-label=${row.buzzLabel} style="all: unset; cursor: pointer; flex-grow: 1; min-width: 0; min-height: 44px; display: flex; flex-direction: column; justify-content: center">
<span style="display: flex; align-items: baseline; gap: 8px; min-width: 0"><span style="font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${row.name}</span>${row.total ? html`<span style="flex-shrink: 0; font-size: 12px; color: var(--color-neutral-400); font-variant-numeric: tabular-nums">${row.total}</span>` : null}</span>
<span style="font-size: 12px; ${row.resultStyle}">${row.result}</span>
</button>
` : html`
<div style="flex-grow: 1; min-width: 0; min-height: 44px; display: flex; flex-direction: column; justify-content: center">
<span style="display: flex; align-items: baseline; gap: 8px; min-width: 0"><span style="font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${row.name}</span>${row.total ? html`<span style="flex-shrink: 0; font-size: 12px; color: var(--color-neutral-400); font-variant-numeric: tabular-nums">${row.total}</span>` : null}</span>
<span style="font-size: 12px; ${row.resultStyle}">${row.result}</span>
</div>
`}
${row.hasBadge ? html`<span class="tag tag-accent" style="flex-shrink: 0; font-size: 14px; padding: 3px 10px">${row.badge}</span>` : null}
${row.ptsChoices.length ? html`
<div role="group" aria-label="Points de ${row.name}" style="display: flex; align-items: center; gap: 3px; flex-shrink: 0">
<span style="font-size: 11px; color: var(--color-neutral-400); margin-right: 2px">pts</span>
${row.ptsChoices.map((c, cI) => html`
<button key=${cI} class="btn" onClick=${c.pick} aria-pressed=${c.pressed} aria-label=${c.aria} style="width: 30px; height: 36px; padding: 0; font-size: 15px; ${c.style}">${c.label}</button>
`)}
</div>
` : null}
<div style="display: flex; gap: 5px">
${row.buttons.map((b, bI) => html`
<button key=${bI} class="btn" onClick=${b.pick} aria-pressed=${b.pressed} aria-label=${b.label} style="width: 44px; height: 44px; padding: 0; font-size: 17px; ${b.style}">${b.letter}</button>
`)}
</div>
</div>
`)}
</div>
` : null}
<div style="flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px">
<div style="display: flex; align-items: center; gap: 14px">
<span style="font-size: 16px; color: var(--color-neutral-300)">${v.answeredLabel}</span>
<span class="text-muted" style="font-size: 12px">Espace pour ${v.spaceAction}</span>
${v.showFav ? html`
<button class="btn btn-secondary" onClick=${v.toggleQFav} aria-pressed=${v.favPressed} style="height: 40px; padding: 0 14px; ${v.favStyle}">${v.favLabel}</button>
` : null}
</div>
<div style="display: flex; gap: 10px">
${v.blindReady ? html`
<button class="btn btn-primary" onClick=${v.blindPlay} style="height: 54px; padding: 0 32px; font-size: 20px; gap: 10px; box-shadow: 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent)"><svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M72 39.9v176.2a8 8 0 0 0 12.2 6.8l144-88.1a8 8 0 0 0 0-13.6l-144-88.1A8 8 0 0 0 72 39.9z"></path></svg>Play</button>
` : null}
${v.blindPlaying ? html`
<button class="btn btn-primary" onClick=${v.blindStop} style="height: 54px; padding: 0 32px; font-size: 20px; gap: 10px"><svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><rect x="48" y="48" width="160" height="160" rx="12"></rect></svg>Stop · vérifier</button>
` : null}
${v.blindStopped && v.blindCanResume ? html`
<button class="btn btn-secondary" onClick=${v.blindPlay} style="height: 54px; padding: 0 24px; font-size: 18px">Reprendre l'écoute</button>
` : null}
${v.notRevealed ? html`
<button class="btn btn-primary" onClick=${v.reveal} style="height: 54px; padding: 0 32px; font-size: 20px">Lumière !</button>
` : null}
${v.revealed ? html`
<button class="btn btn-primary" onClick=${v.next} style="height: 54px; padding: 0 32px; font-size: 20px; box-shadow: 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent)">${v.nextLabel}</button>
` : null}
</div>
</div>
</div>

<aside class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); width: 270px; flex-shrink: 0; padding: 18px; gap: 10px; min-height: 0">
<div style="display: flex; align-items: baseline; justify-content: space-between">
<h3 style="margin: 0; font-size: 20px">Classement</h3>
${v.scoresHidden ? html`
<span class="tag tag-outline">Masqué jusqu'à la fin</span>
` : null}
</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px">
${v.scoreboard.map((s, sI) => html`
<div key=${sI} style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--radius-md); ${s.style}">
<span style="width: 20px; font-size: 13px; color: var(--color-neutral-500); font-variant-numeric: tabular-nums">${s.rank}</span>
<span style="flex-grow: 1; min-width: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${s.name}</span>
${s.gain ? html`
<span style="font-size: 12px; font-weight: 500; color: oklch(0.86 0.1 155); animation: qpFloat .5s ease-out .6s both">${s.gainLabel}</span>
` : null}
<span style="font-size: 20px; font-weight: 500; font-variant-numeric: tabular-nums; min-width: 24px; text-align: right">${s.score}</span>
</div>
`)}
</div>
</aside>
</div>
` : null}

${v.isEnd ? html`
<div style="flex-grow: 1; min-height: 0; padding: 20px 32px 28px; display: flex; gap: 32px; position: relative; z-index: 1">
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 16px">
<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center">
<h6 style="margin: 0; color: var(--color-accent-300)">${v.endKicker} · La star du soir est</h6>
<h1 style="margin: 0; font-size: 60px; line-height: 1.05; text-shadow: 0 0 40px color-mix(in srgb, var(--color-accent) 55%, transparent)">${v.winnerName}</h1>
</div>
<div style="display: flex; align-items: flex-end; justify-content: center; gap: 12px; width: 100%; max-width: 620px">
${v.podium.map((p, pI) => html`
<div key=${pI} style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; animation: qpRise .7s ease-out both; animation-delay: ${p.delay}">
<span style="font-size: 17px; font-weight: 500; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${p.name}</span>
<span style="font-size: 13px; color: var(--color-neutral-300)">${p.pts} · ${p.pct} %</span>
<div style="width: 100%; border-radius: var(--radius-md) var(--radius-md) 0 0; display: flex; justify-content: center; padding-top: 12px; font-size: 30px; font-weight: 500; ${p.style}">${p.rank}</div>
</div>
`)}
</div>
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 620px; padding: 2px">
${v.restRanking.map((r, rI) => html`
<div key=${rI} style="display: flex; align-items: center; gap: 14px; padding: 8px 16px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface) 60%, transparent)">
<span style="width: 24px; font-size: 15px; color: var(--color-neutral-400)">${r.rank}</span>
<span style="flex-grow: 1; font-size: 16px">${r.name}</span>
<span style="font-size: 13px; color: var(--color-neutral-400)">${r.pct} %</span>
<span style="font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums">${r.score} <span style="color: var(--color-neutral-500); font-size: 13px">/ ${v.ptsTotal}</span></span>
</div>
`)}
</div>
<div style="display: flex; gap: 10px">
<button class="btn btn-primary" onClick=${v.playAgain} style="height: 50px; padding: 0 24px; font-size: 17px; box-shadow: 0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent)">Rejouer</button>
<button class="btn btn-secondary" onClick=${v.goHome} style="height: 50px; padding: 0 24px; font-size: 17px">Accueil</button>
</div>
</div>
<aside class="card elev-sm" style="background: color-mix(in srgb, var(--color-surface) 72%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); width: 400px; flex-shrink: 0; padding: 20px; gap: 12px; min-height: 0">
<div class="card-kicker">${v.recapTitle}</div>
${v.hasHardest ? html`
<p style="margin: 0; font-size: 13px; color: var(--color-neutral-300)">La plus dure : <span style="color: var(--color-text)">${v.hardest}</span></p>
` : null}
<div style="flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column">
${v.recap.map((c, cI) => html`
<div key=${cI} style="display: flex; gap: 12px; padding: 10px 0; background: linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px">
<span style="width: 22px; flex-shrink: 0; font-size: 12px; color: var(--color-neutral-500)">${c.n}</span>
<div style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
<span style="font-size: 14px; line-height: 1.35">${c.q}</span>
<span style="font-size: 12px; color: var(--color-accent-300)">${c.answer}</span>
</div>
<span style="flex-shrink: 0; font-size: 13px; font-variant-numeric: tabular-nums; color: var(--color-neutral-300)">${c.hits}</span>
</div>
`)}
</div>
</aside>
</div>
` : null}

</div>
`;
}
