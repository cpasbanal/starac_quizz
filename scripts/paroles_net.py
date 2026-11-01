#!/usr/bin/env python3
"""Cherche une chanson sur paroles.net et enregistre ses paroles dans un fichier texte.

Exemples :
    python3 scripts/paroles_net.py "La bohème"
    python3 scripts/paroles_net.py "La bohème" --artiste aznavour
    python3 scripts/paroles_net.py "La bohème" --liste
    python3 scripts/paroles_net.py "La bohème" --choix 3 -o data/paroles

Sans dépendance externe : uniquement la bibliothèque standard.
"""

import argparse
import html
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "https://www.paroles.net"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# Lien d'une chanson dans les résultats : https://www.paroles.net/<artiste>/paroles-<titre>
SONG_LINK = re.compile(
    r'<a[^>]*href="(https://www\.paroles\.net/[^/"]+/paroles-[^"]+)"[^>]*>(.*?)</a>', re.S
)


# Limiteur de débit : délai minimal entre deux requêtes vers le site, et
# nouvelles tentatives avec une attente de plus en plus longue après une 503.
MIN_INTERVAL = 2.0     # secondes entre deux requêtes
MAX_ATTEMPTS = 5       # essais par requête, le premier compris
RETRY_DELAY = 10.0     # attente après la première 503, doublée à chaque essai
RETRY_STATUSES = {429, 503}

_last_request = 0.0


def _throttle():
    global _last_request
    wait = _last_request + MIN_INTERVAL - time.monotonic()
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()


def _retry_after(err, default):
    """Délai demandé par le serveur (en-tête Retry-After en secondes), sinon le délai par défaut."""
    value = err.headers.get("Retry-After") if err.headers else None
    try:
        return max(float(value), default)
    except (TypeError, ValueError):
        return default


def fetch(url, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers={"User-Agent": USER_AGENT})
    delay = RETRY_DELAY
    for attempt in range(1, MAX_ATTEMPTS + 1):
        _throttle()
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.read().decode(charset, errors="replace")
        except urllib.error.HTTPError as err:
            if err.code not in RETRY_STATUSES or attempt == MAX_ATTEMPTS:
                raise
            wait = _retry_after(err, delay)
            print(f"HTTP {err.code}, nouvel essai {attempt + 1}/{MAX_ATTEMPTS} dans {wait:.0f} s…", file=sys.stderr)
            time.sleep(wait)
            delay *= 2


def normalize(text):
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def search(query):
    """Renvoie (html de la page de résultats, [(url, titre, artiste), ...])."""
    page = fetch(f"{BASE_URL}/search", {"search": query})
    # On ne lit que la section « Chansons » : le reste de la page (barre latérale,
    # tendances) contient aussi des liens de chansons sans rapport avec la recherche.
    start = page.find(">Chansons</h2>")
    if start == -1:
        return page, []
    section = page[start:page.find("</section>", start)]
    results, seen = [], set()
    for url, inner in SONG_LINK.findall(section):
        if url in seen:
            continue
        seen.add(url)
        # Le texte du lien vaut "<rang> <titre> <artiste>" : on récupère les morceaux de texte.
        parts = [html.unescape(p).strip() for p in re.split(r"<[^>]+>", inner)]
        parts = [p for p in parts if p and not p.isdigit()]
        title = parts[0] if parts else url.rsplit("/paroles-", 1)[-1]
        artist = parts[-1] if len(parts) > 1 else url.split("/")[3]
        results.append((url, title, artist))
    return page, results


def extract_lyrics(page):
    """Texte des paroles d'une page chanson, ou None si la page n'en contient pas.

    Les paroles sont dans <article class="lyrics">, en blocs <div> sans attribut
    entrecoupés de publicités ; l'analyse qui suit est dans des <div class="...">.
    """
    start = page.find('<article class="lyrics"')
    if start == -1:
        return None
    article = page[start:page.find("</article>", start)]
    blocks = []
    for block in re.findall(r"<div>(.*?)</div>", article, re.S):
        block = re.sub(r"\s*\n\s*", " ", block)          # retours à la ligne du code HTML
        block = re.sub(r"<br\s*/?>", "\n", block, flags=re.I)
        block = html.unescape(re.sub(r"<[^>]+>", "", block))
        blocks.append("\n".join(line.strip() for line in block.split("\n")).strip())
    text = "\n".join(b for b in blocks if b)
    return re.sub(r"\n{3,}", "\n\n", text) or None


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", normalize(text)).strip("-") or "resultat"


def main():
    global MIN_INTERVAL, MAX_ATTEMPTS, RETRY_DELAY
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("titre", help="titre de la chanson à chercher")
    parser.add_argument("-a", "--artiste", help="ne garder que les résultats dont l'artiste contient ce texte")
    parser.add_argument("-c", "--choix", type=int, default=1, help="numéro du résultat à télécharger (défaut : 1)")
    parser.add_argument("-l", "--liste", action="store_true", help="afficher les résultats sans rien télécharger")
    parser.add_argument("-r", "--resultats", action="store_true", help="enregistrer aussi la page de résultats de recherche")
    parser.add_argument("-o", "--sortie", default="paroles", help="dossier de sortie (défaut : paroles)")
    parser.add_argument("--intervalle", type=float, default=MIN_INTERVAL,
                        help=f"secondes minimum entre deux requêtes (défaut : {MIN_INTERVAL:g})")
    parser.add_argument("--essais", type=int, default=MAX_ATTEMPTS,
                        help=f"nombre d'essais par requête en cas de 503 (défaut : {MAX_ATTEMPTS})")
    parser.add_argument("--attente", type=float, default=RETRY_DELAY,
                        help=f"secondes d'attente après la première 503, doublées ensuite (défaut : {RETRY_DELAY:g})")
    args = parser.parse_args()

    MIN_INTERVAL, MAX_ATTEMPTS, RETRY_DELAY = args.intervalle, max(1, args.essais), args.attente

    try:
        search_page, results = search(args.titre)
    except urllib.error.URLError as err:
        print(f"Recherche impossible sur paroles.net : {err}", file=sys.stderr)
        return 1
    if args.artiste:
        wanted = normalize(args.artiste)
        results = [r for r in results if wanted in normalize(r[2]) or wanted in r[0]]

    out_dir = Path(args.sortie)
    if args.resultats:
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"recherche-{slugify(args.titre)}.html"
        path.write_text(search_page, encoding="utf-8")
        print(f"Page de résultats enregistrée : {path}")

    if not results:
        print(f"Aucune chanson trouvée pour « {args.titre} ».", file=sys.stderr)
        return 1

    if args.liste:
        for i, (url, title, artist) in enumerate(results, 1):
            print(f"{i:3}. {title} — {artist}\n     {url}")
        return 0

    if not 1 <= args.choix <= len(results):
        print(f"--choix doit être entre 1 et {len(results)}.", file=sys.stderr)
        return 1

    url, title, artist = results[args.choix - 1]
    try:
        page = fetch(url)
    except urllib.error.URLError as err:
        print(f"Téléchargement impossible de {url} : {err}", file=sys.stderr)
        return 1
    lyrics = extract_lyrics(page)
    if not lyrics:
        print(f"Paroles introuvables sur {url}", file=sys.stderr)
        return 1
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{slugify(artist)}_{slugify(title)}.txt"
    path.write_text(lyrics + "\n", encoding="utf-8")
    print(f"{title} — {artist}\n{url}\n→ {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
