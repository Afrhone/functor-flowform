# Design Notes — Sketch Analysis → Kinetic Typographic System

## Source observations

The drawing is a one-page handwritten system study with a left column of loose glyphs and right-side annotations. The strongest structures are:

1. A bracketed top family labelled **zeta**, with curled, descending marks.
2. A central mark associated with **Pi / Phi / Rho**, drawn as a circular orbit crossed by an axis.
3. Small notes for **iota** and **lambda**, suggesting a typographic/Greek-letter symbolic grammar.
4. A second bracketed family beside **F | PH | Fu** and **Mu / V**, built from looping vertical strokes.
5. A bottom cluster of repeated loops that expands into rising, wave-like strokes.
6. An isolated arch form near the lower right, useful as a minimal accent or cap glyph.

## Translation strategy

The bundle treats each drawing motif as a normalized vector skeleton:

- **Zeta Kite**: hooked curl and upper flick.
- **Iota Root**: descending living stroke.
- **Phi Orbit**: axis, circular orbit, crossbar.
- **Lambda Wing**: split wing/branch structure.
- **Rho Seed**: target-like concentric seed.
- **FiPh Flow**: looped F/phi hybrid.
- **Mu Vessel**: small double valley curve.
- **Vi Hook**: lower open hook.
- **Psi Anchor**: vertical stem with side loops.
- **Braid Wave**: repeated loops and rising wave tails.
- **Sigma Arch**: minimal arch accent.
- **Bracket Gate**: the grouping brackets turned into a structural glyph.

## Curve logic

Each stroke is stored as a short list of normalized points. The renderer resamples those points and converts them into cubic Bezier curves using Catmull–Rom style handles. This keeps the handmade energy but makes the output clean, scalable, and SVG-ready.

## Morphic functions

The playground implements five deformation fields:

- **φ spiral bloom**: golden-angle rotational swelling.
- **sine ribbon**: smooth wave displacement along x/y axes.
- **ρ radial ripple**: orbit-centered expansion and contraction.
- **λ fold**: asymmetric fold based on horizontal sign and distance from center.
- **ζ swirl**: curled vortex field with local sinusoidal shimmer.

## Typography direction

The resulting visual language is playful, kinetic, rounded, and handwritten, but polished enough for identity marks, generative posters, title cards, UI accents, or live-coded algorithmic-art interfaces.
