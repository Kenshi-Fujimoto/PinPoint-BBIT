# Satellite harvester (dev tool)

The build sandbox used for this repository has **no direct internet egress to tile
servers** (only the npm registry and GitHub are reachable), so campus imagery is
captured by the *reviewer's own browser* and handed back as files.

Two ways to run it:

1. **Standalone (recommended)** — open `capture-standalone.html` in any browser.
   It stitches Esri World Imagery tiles for the BBIT campus, burns in a
   lat/lng grid, slices the mosaic into readable crops and downloads them.
   No server, nothing uploaded.

2. **Server mode** — `node tools/satellite-harvester/server.mjs`, then open the
   page it serves. The page polls `/api/jobs` (see `jobs.json`), captures each
   job and POSTs the mosaics back, where they are written to `out/`.

Captures land in `out/` and are consumed by `tools/verify-traces.mjs`, which
draws the surveyed geometry over a mosaic so footprints can be compared against
the imagery they were traced from.
