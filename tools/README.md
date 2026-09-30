# Campus mapping pipeline

The app ships a **surveyed campus plan** (boundary wall, ring road, internal
roads, greens, water, parking, trees, gates and 50 places with real footprints).
This folder holds the tools that produced it and that keep it verifiable.

```
imagery/                 reference captures + georeference transforms (local only)
  transforms.json        centre pixel + metres-per-pixel for each capture
  osm-roads.json         OSM road centrelines and place nodes used as anchors
  campus-spec.json       the campus, authored in screenshot pixel space
  capture-standalone.html  browser tool: stitches satellite tiles and downloads mosaics
  server.mjs             optional local service variant of the same capture

georef.mjs               draw a lat/lng graticule + anchor vectors over a capture
extract-footprints.mjs   region-grow a roof, trace it, simplify it → lat/lng polygon
build-campus-data.mjs    spec (pixel space) → src/data/*.json  + layout QA
render-plan.mjs          render the built data back over a capture (overlay / poster)
smoke-test-tools.mjs     round-trip self test of the extraction maths
verify-traces.mjs        overlay surveyed geometry on a harvested mosaic
```

## Round trip

```bash
# 1. author / edit the campus in pixel space of a georeferenced capture
$EDITOR tools/imagery/campus-spec.json

# 2. rebuild the app data (also runs layout QA)
node tools/build-campus-data.mjs
#   ✔ no building overlaps, every block inside the boundary
#   ✔ no road runs through a building (terminating drives excepted)

# 3. look at it: overlay on the capture, or a clean poster
node tools/render-plan.mjs --shot=1
node tools/render-plan.mjs --shot=1 --style=poster
```

## Why pixel space?

Building sizes only make sense in metres, and the imagery is read in pixels, so
the spec is authored in the pixel space of a georeferenced capture
(`1568 × 787 @ 0.5108 m/px` for the current reference shot). `transforms.json`
holds the mapping, `build-campus-data.mjs` converts every vertex to WGS84, and
`render-plan.mjs` inverts it so the result can be checked against the imagery it
came from.

## Accuracy

Positions are anchored to three independent references: the OpenStreetMap
KP Mondal Road centreline, the OSM service stub at the campus gate
(`22.4583429, 88.1707049` → pixel `1040.5, 391.4`, which is where the main gate
is drawn) and the OSM BBIT / Public School nodes. Block positions and sizes
follow the imagery to roughly ±3 m at the current zoom; individual wall lines of
the larger wings are indicative rather than surveyed.

## Self test

`node tools/smoke-test-tools.mjs` draws known rectangles into a synthetic
georeferenced capture, runs the same grow/trace/simplify path the extractor uses,
and asserts the recovered footprints match to within a fraction of a metre:

```
✔ smoke-a: 41.6×26.0 m (drawn 42×26) · centre off by 0.22 m N-S, 0.08 m E-W
```

## Code bundle

`docs/campus-map-code.md` is a single-file bundle of every map source file plus
the regeneration tooling, regenerated with:

```bash
node tools/bundle-code.mjs
```
