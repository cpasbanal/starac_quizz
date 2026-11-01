#!/usr/bin/env python3
"""Récupère sur paroles.net les paroles de chaque chanson de data/bibliotheque.csv.

Les paroles sont écrites dans data/paroles/<artiste>_<titre>.txt et la colonne
« Paroles » de bibliotheque.csv indique le fichier, ou « Non trouvées ».

Le CSV est mis à jour après chaque chanson : on peut interrompre et relancer,
les chansons déjà traitées sont sautées (--reessayer relance les « Non trouvées »).

    python3 scripts/paroles_bibliotheque.py
    python3 scripts/paroles_bibliotheque.py --reessayer
"""

import argparse
import csv
import re
import sys
import urllib.error
from pathlib import Path

import paroles_net

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / "data" / "bibliotheque.csv"
LYRICS_DIR = ROOT / "data" / "paroles"
COLUMN = "Paroles"
NOT_FOUND = "Non trouvées"


def key(text):
    """Forme comparable : sans accents, casse, mentions entre parenthèses ni ponctuation."""
    text = re.sub(r"\(.*?\)", "", text).replace("œ", "oe").replace("Œ", "oe").replace("+", " plus ")
    return re.sub(r"[^a-z0-9]", "", paroles_net.normalize(text))


def is_same_song(title, artist, url, found_title, found_artist):
    """Le résultat est-il bien la chanson cherchée ? Il faut le bon artiste et un titre proche.

    L'artiste peut aussi être une mention entre parenthèses du titre
    (« Libérée, délivrée (La Reine des neiges) » est rangée sous « La Reine Des Neiges »).
    """
    names = re.split(r",|&", artist.replace("\xa0", " ")) + re.findall(r"\((.*?)\)", title)
    wanted = [k for k in map(key, names) if k]
    found_artist_key = key(found_artist) + key(url.split("/")[3])
    artist_ok = any(w in found_artist_key or key(found_artist) in w for w in wanted)
    t, ft = key(title), key(found_title)
    return artist_ok and (t in ft or ft in t)


def find_lyrics(title, artist):
    """(url, titre trouvé, artiste trouvé, paroles) ou None.

    Prend le premier résultat de la section « Chansons ». La recherche inclut
    l'artiste pour que ce premier résultat soit la bonne version ; s'il n'y a
    aucun résultat ou que ce n'est pas la bonne chanson, on recherche le titre seul.
    """
    first_artist = re.split(r",|&", artist.replace("\xa0", " "))[0].strip()
    for query in (f"{title} {first_artist}", title):
        try:
            _, results = paroles_net.search(query)
            if results and is_same_song(title, artist, *results[0]):
                url, found_title, found_artist = results[0]
                lyrics = paroles_net.extract_lyrics(paroles_net.fetch(url))
                if lyrics:
                    return url, found_title, found_artist, lyrics
        except urllib.error.HTTPError as err:
            # Page absente (404…) : on tente la recherche suivante. Une 503 qui
            # persiste après les nouveaux essais de fetch, elle, arrête tout.
            if err.code in paroles_net.RETRY_STATUSES:
                raise
    return None


def save(header, rows):
    with LIBRARY.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\n").writerows([header, *rows])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reessayer", action="store_true", help="relancer aussi les chansons « Non trouvées »")
    args = parser.parse_args()

    with LIBRARY.open(encoding="utf-8", newline="") as f:
        header, *rows = list(csv.reader(f))
    if COLUMN not in header:
        header.append(COLUMN)
    col = header.index(COLUMN)
    for row in rows:
        row.extend([""] * (len(header) - len(row)))
    title_col, artist_col = header.index("Titre"), header.index("Artiste")

    LYRICS_DIR.mkdir(parents=True, exist_ok=True)
    found = missing = 0
    for i, row in enumerate(rows, 1):
        title, artist, done = row[title_col], row[artist_col], row[col]
        if done and done != NOT_FOUND and (LYRICS_DIR.parent / done).exists():
            found += 1
            continue
        if done == NOT_FOUND and not args.reessayer:
            missing += 1
            continue
        try:
            result = find_lyrics(title, artist)
        except urllib.error.URLError as err:
            print(f"[{i}/{len(rows)}] {title} — {artist} : erreur réseau ({err}), on s'arrête là.", file=sys.stderr)
            save(header, rows)
            return 1
        if result:
            url, found_title, found_artist, lyrics = result
            path = LYRICS_DIR / f"{paroles_net.slugify(artist)}_{paroles_net.slugify(title)}.txt"
            path.write_text(lyrics + "\n", encoding="utf-8")
            row[col] = path.relative_to(LYRICS_DIR.parent).as_posix()
            found += 1
            print(f"[{i}/{len(rows)}] ✓ {title} — {artist}  →  {found_title} — {found_artist}  ({url})", flush=True)
        else:
            row[col] = NOT_FOUND
            missing += 1
            print(f"[{i}/{len(rows)}] ✗ {title} — {artist}", flush=True)
        save(header, rows)

    save(header, rows)
    print(f"\n{found} paroles trouvées, {missing} non trouvées sur {len(rows)} chansons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
