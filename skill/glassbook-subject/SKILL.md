---
name: glassbook-subject
description: Write a new Glassbook subject, an interactive textbook spread whose right page grows a working glass, ceramic and aluminium three.js model of one idea. Use when someone asks for a Glassbook page, an interactive book page, or "a book like the heart one" about any topic.
---

# Glassbook: write a subject

You are adding one file, `book/subjects/<name>.js`, to a Glassbook checkout. The engine
(`book/engine.js`) is fixed: read its exports, never edit it.

## 1. Find the machine

Glassbook explains an idea by building it as a small working object on the page, the way a science
museum would. Pick:

- **One control** (`u`, 0..1) that the reader drags: a rate, an angle, a temperature, a load.
- **One event** (`action()`) they tap: a beat, a snap, a full cycle.
- **One readout**, short and numeric: `72 bpm · 5.0 L/min`.

Every number shown comes from the same small model that moves the parts. If the idea needs a label
to be understood, it is not a machine yet. Offer two or three one-line concepts when someone is
there to choose; otherwise take the one with the most obvious motion.

## 2. Build

1. Read `book/subjects/heart.js` end to end: copy its shape (`page`, `camera`, `build`) and its
   readout plaque.
2. Page space: `P(x, y, h)`; the tray is about x ∈ [-8.8, 8.8], y ∈ [-12.6, 12.6], plate top
   h ≈ 0.95. Keep the plaque at the bottom.
3. Materials only from `M` (glass, frosted, ceramic, alu, liquid). One accent colour carries the
   idea. Glow comes from `M.liquid(color)`.
4. Volume sells it: parts stand up off the page, cast shadows, catch highlights. Add the small
   precise parts that make it real: clamps, pins, screws, rings, knurled knobs.
5. Motion only in `update(dt, t, u)`, deterministic (seeded random), no CSS animation, timers or
   `Date`. Keep transmissive meshes under ~60.

## 3. Check

`node tools/look.mjs <name> /tmp/a.jpg --u=0` and again at `--u=0.5` and `--u=1`; look at each
still. The change from 0 to 1 must be obvious at phone size. Fix and repeat. Then open
`book/?s=<name>` and add the book to the gallery in `index.html`.
