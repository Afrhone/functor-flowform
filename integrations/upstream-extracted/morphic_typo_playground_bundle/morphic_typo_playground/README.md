# Morphic Typo Playground

Offline HTML5 Canvas + SVG bundle generated from the uploaded one-page handwritten symbol study.

## What is inside

- `index.html` — polished interactive playground, no build step, no CDN.
- `styles.css` — responsive UI, soft paper gradients, rounded typographic control surface.
- `js/glyphs.js` — normalized vector glyph library and Bezier helpers.
- `js/playground.js` — Canvas renderer, morphing, pointer interaction, SVG export.
- `assets/glyphs.svg` — static SVG symbol deck.
- `assets/specimen.svg` — poster-style specimen composition.
- `assets/glyphs.json` — reusable normalized glyph data.
- `design-notes.md` — drawing analysis and typographic system notes.

## Run

Open `index.html` in any modern browser. Everything is local/offline.

A tiny static server is optional:

```bash
cd morphic_typo_playground
python3 -m http.server 8080
# open http://localhost:8080
```

## Playground gestures

- Choose a glyph family from the control panel.
- Move the morph slider to blend into the next glyph.
- Switch modulation functions: φ spiral bloom, sine ribbon, ρ radial ripple, λ fold, ζ swirl.
- Drag over the canvas to bend the live vector field.
- Turn on sampled control points to inspect the curve skeleton.
- Export the current live state as an editable SVG.

## Reuse

The glyphs are normalized to a 0..1 square. You can reuse `assets/glyphs.json` in other rendering systems, convert the paths into a font with tools like FontForge/Glyphs/FontLab, or keep them as direct SVG symbols.

No third-party font files or external assets are included. The UI uses system font stacks and the symbol curves are generated from the uploaded study.
