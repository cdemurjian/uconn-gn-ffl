# UCONN-GN-FFL

League site for the UCONN-GN-FFL: stats, champions, history, docs, and Canton data views. The site is static HTML/CSS/JS served as-is (no build step).

## Pages
- `index.html` — landing with quick nav cards.
- `stats.html` — sortable stats table fed by `assets/data/stats.csv`.
- `canton.html` — Team, Awards, Positional, and Player views with search/filter.
- `docs.html` — league rules and info.

## Run locally
From the repo root:
```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

## Editing notes
- Assets: CSS in `assets/css/styles.css`; JS in `assets/js/`; data in `assets/data/`.
- Keep HTML/JS using relative paths for GitHub Pages.
- Use double quotes in JS and 2-space indentation across HTML/CSS/JS.

## Canton awards data
Awards are in `assets/js/canton.js` under `AWARDS_DATA`:
```js
{ year, mvp, mvpPoints, sbMvp, sbNotes }
```
Fill those fields to update the Awards view and the awards indicators/tooltips across Canton views.
