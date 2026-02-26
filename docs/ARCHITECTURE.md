# Architecture

## Tech Stack

| Layer            | Choice                     | Rationale                                                                              |
| ---------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| Language         | TypeScript                 | Team familiarity, web UI sharing                                                       |
| Runtime          | Node.js                    | Stable sharp support, mature ecosystem                                                 |
| Image I/O        | sharp (libvips)            | PNG read/write only — fastest native option                                            |
| Pixel Ops        | Raw RGBA buffers           | Manual setPixel/composite for full control                                             |
| CLI              | Commander.js               | Lightweight, subcommand support, widely used                                           |
| Web UI           | React + Vite               | Familiar, fast HMR, component model fits panel-based editor                            |
| Canvas Rendering | HTML5 Canvas 2D            | Sufficient for pixel art scale; `imageSmoothingEnabled = false` for pixel-perfect zoom |
| File Format      | PNG + sidecar JSON         | Git-friendly, human-readable, AI-agent accessible                                      |
| Testing          | Vitest                     | Fast, Vite-native, supports pixel buffer snapshot comparisons                          |
| Package          | npm                        | `npx pxl init` / `npm i -g pxl` — target users have Node.js                            |
| Monorepo         | Single package (initially) | Split `@pxl/core`, `@pxl/cli`, `@pxl/ui` only when needed                              |

## Architecture Overview

```
┌────────────────────────────────────────────────────┐
│                     pxl (npm)                      │
├──────────┬──────────────────┬──────────────────────┤
│  CLI     │    Web UI        │   (future: API)      │
│ (cmdr)   │ (React + Vite)   │                      │
├──────────┴──────────────────┴──────────────────────┤
│                   Core Engine                       │
│  ┌─────────┬──────────┬───────────┬──────────────┐ │
│  │ Canvas  │ Character│ Animation │ Scene        │ │
│  │ + Layer │ + Parts  │ + Timeline│ + Iso Grid   │ │
│  ├─────────┴──────────┴───────────┴──────────────┤ │
│  │ Primitives (draw, fill, composite, outline)   │ │
│  ├───────────────────────────────────────────────┤ │
│  │ Palette    │ Color     │ Semantic Tags        │ │
│  ├───────────────────────────────────────────────┤ │
│  │ Export (sheet, gif, apng, tiled, unity, godot)│ │
│  ├───────────────────────────────────────────────┤ │
│  │ Procedural Gen (template + randomization)     │ │
│  └───────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│  I/O Layer (sharp: PNG encode/decode only)         │
├────────────────────────────────────────────────────┤
│  File System (project folder + JSON + PNG)         │
└────────────────────────────────────────────────────┘
```

## Core Engine

The core engine is a pure TypeScript library with **zero I/O dependencies**. It operates entirely on in-memory RGBA buffers. sharp is only used at the I/O boundary for PNG read/write.

This separation means:

- Core is testable without filesystem
- Core works in browser (Web UI) and Node.js (CLI)
- Core can be extracted to `@pxl/core` later without refactoring

### Buffer Convention

All image data flows as raw `Uint8Array` / `Buffer` in RGBA format:

- 4 bytes per pixel: R, G, B, A (0-255 each)
- Row-major order, top-left origin
- Pixel at (x, y) starts at index `(y * width + x) * 4`
- Canvas state = `{ buffer: Uint8Array, width: number, height: number }`

No wrapper classes around buffers — keep it simple. Helper functions take `(buf, w, h, ...)` parameters directly.

### Module Boundaries

```typescript
// Core modules — no I/O, no filesystem, pure functions on buffers
src/core/
  canvas.ts       // create, resize, clone, crop
  draw.ts         // pixel, line, rect, circle, fill, erase
  composite.ts    // layer blend, paste, alpha composite
  outline.ts      // auto-outline, inner outline
  palette.ts      // create, constrain, remap, extract, ramps
  color.ts        // hue shift, shade/highlight, HSL ↔ RGB
  tags.ts         // semantic pixel tagging (read/write sidecar data)
  describe.ts     // generate text/JSON description of canvas state

// Character system — builds on core
src/char/
  template.ts     // load/manage base body templates
  parts.ts        // part registry, slot validation, search
  assemble.ts     // composite parts in layer order → rendered buffer
  colorize.ts     // apply color scheme to placeholder-colored parts
  body.ts         // body type matrix, anchor point lookups

// Animation — builds on core + char
src/anim/
  timeline.ts     // frame sequence, timing, loop, tags
  templates.ts    // built-in animation templates (walk, idle, etc.)
  transform.ts    // per-frame part offsets, flip, show/hide
  interpolate.ts  // keyframe interpolation (pixel-shift)
  render.ts       // render animation frames from char + template

// Isometric — builds on core
src/iso/
  grid.ts         // iso ↔ screen coordinate conversion
  primitives.ts   // diamond, cube, wall, stairs drawing
  sort.ts         // depth sorting for scene rendering
  scene.ts        // iso scene composition

// Scene — builds on core + iso
src/scene/
  scene.ts        // place sprites, z-order, viewport
  render.ts       // flatten scene to output buffer

// Procedural generation — builds on core + palette
src/gen/
  trees.ts        // tree generation (pine, oak, etc.)
  terrain.ts      // terrain tile variations
  buildings.ts    // structure generation
  props.ts        // crate, barrel, chest, etc.
  npc.ts          // bulk NPC variation generation
  random.ts       // seeded PRNG for reproducibility

// Export — builds on core
src/export/
  sheet.ts        // sprite sheet packing + JSON metadata
  gif.ts          // animated GIF output
  apng.ts         // animated PNG output
  tiled.ts        // Tiled-compatible TSX + tileset PNG
  unity.ts        // Unity sprite metadata
  godot.ts        // Godot .tres resource
  frames.ts       // individual frame PNG export

// I/O boundary — only place sharp is used
src/io/
  png.ts          // read PNG → buffer, write buffer → PNG
  project.ts      // read/write pxl.json, resolve project paths
  meta.ts         // read/write .meta.json sidecar files
```

## CLI Architecture

Commander.js with nested subcommands:

```
pxl
├── init              # scaffold project
├── status            # project overview
├── validate          # check integrity
├── build             # render all + export all
│
├── sprite
│   ├── create
│   ├── edit          # opens web UI
│   ├── info
│   └── resize
│
├── draw
│   ├── pixel
│   ├── line
│   ├── rect
│   ├── circle
│   ├── fill
│   ├── replace
│   ├── paste
│   ├── erase
│   └── outline
│
├── layer
│   ├── add / remove / reorder / merge / flatten
│   ├── opacity / visible
│   └── list
│
├── palette
│   ├── create / import / preset
│   ├── apply / constrain
│   └── list
│
├── char
│   ├── create / list / info / clone / delete
│   ├── equip / unequip
│   ├── color / body
│   ├── render / preview
│   └── parts (list / search / create / import)
│
├── anim
│   ├── create / list / info
│   ├── keyframe / interpolate / apply
│   ├── timing
│   ├── preview
│   └── export
│
├── iso
│   ├── grid / tile / cube / wall / stairs
│   ├── place
│   └── scene (render)
│
├── gen
│   ├── tree / terrain / building / prop
│   └── npc
│
├── scene
│   ├── create / place / remove
│   ├── render / preview
│   └── list
│
├── tag
│   ├── set / region / fill
│   ├── list / select
│   └── recolor
│
├── describe          # AI-readable output
│
├── export
│   ├── sheet / gif / apng / frames
│   ├── tiled / unity / godot
│   └── all
│
└── ui                # start web UI server
```

Each subcommand is a thin wrapper that:

1. Parses args
2. Loads project context (`pxl.json`)
3. Calls core functions
4. Writes output via I/O layer

## Web UI Architecture

```
src/ui/
  server.ts           // Vite dev server + API routes
  App.tsx             // Root component, panel layout
  components/
    Canvas/
      CanvasView.tsx  // HTML5 Canvas 2D renderer, zoom/pan
      PixelGrid.tsx   // Grid overlay at zoom levels
      Cursor.tsx      // Tool cursor (pencil, fill, eraser)
    Panels/
      LayerPanel.tsx  // Layer list, opacity, visibility
      PalettePanel.tsx// Color picker, palette display
      ToolPanel.tsx   // Drawing tools selector
      CharPanel.tsx   // Character builder (equip, color)
      AnimPanel.tsx   // Timeline, frame list, playback
      ScenePanel.tsx  // Scene object list, iso grid toggle
    Preview/
      AnimPreview.tsx // Animation playback (all views)
      CharPreview.tsx // 8-direction character turnaround
      IsoPreview.tsx  // Isometric scene viewer
  hooks/
    useCanvas.ts      // Canvas state management
    useProject.ts     // Project file watching + reload
    useTool.ts        // Active tool state
  state/
    store.ts          // Zustand store for UI state
```

### Canvas 2D Rendering Strategy

```typescript
// Render pipeline (called on every frame/change)
function render(ctx: CanvasRenderingContext2D, state: EditorState) {
  const { zoom, panX, panY, layers, activeLayer, showGrid } = state;

  ctx.imageSmoothingEnabled = false; // pixel-perfect scaling

  // Clear
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Checkerboard transparency pattern
  drawCheckerboard(ctx, zoom, panX, panY);

  // Draw each visible layer
  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity / 255;
    const imageData = new ImageData(
      new Uint8ClampedArray(layer.buffer),
      layer.width,
      layer.height
    );
    // Draw at 1:1, let CSS transform handle zoom
    ctx.putImageData(imageData, 0, 0);
  }

  // Grid overlay (only at zoom > 4x)
  if (showGrid && zoom >= 4) {
    drawPixelGrid(ctx, zoom, panX, panY, state.width, state.height);
  }

  ctx.globalAlpha = 1;
}
```

### File Watching

Web UI watches project files for changes (via `fs.watch` / chokidar). When CLI modifies a PNG or JSON, UI hot-reloads. This enables workflow:

1. AI agent runs CLI commands
2. Web UI updates in real-time
3. Human sees changes immediately

## File Format Details

### PNG Files

Standard PNG, no special encoding. Metadata lives in sidecar JSON, not PNG chunks.

Why not PNG chunks:

- Git diffs are meaningless for binary metadata inside PNG
- AI agents can't easily read PNG tEXt chunks
- Separate JSON = separate version control

### JSON Sidecar Convention

For `sprite.png`, metadata lives in `sprite.meta.json`:

```json
{
  "width": 32,
  "height": 48,
  "layers": [
    { "name": "outline", "opacity": 255, "visible": true, "blend": "normal" },
    { "name": "color", "opacity": 255, "visible": true, "blend": "normal" }
  ],
  "palette": "main",
  "tags": {
    "hair": [
      [5, 2],
      [6, 2],
      [7, 2]
    ],
    "skin": [
      [8, 10],
      [9, 10]
    ]
  }
}
```

Multi-layer sprites store one PNG per layer: `sprite.layer-0.png`, `sprite.layer-1.png`. The flattened composite is `sprite.png` (auto-generated).

### pxl.json

Project root marker + global config. See OVERVIEW.md for full schema.

## Procedural Generation Strategy

**Template + randomization** with seeded PRNG:

```
Input:  template name + parameters + seed
Output: deterministic pixel buffer

Same seed → same output. Always.
```

Templates are rule-based algorithms, not AI-generated:

- Tree: trunk height (random range) + branch pattern (L-system inspired) + leaf cluster placement
- Terrain: base tile + random pixel scatter within palette constraints
- NPC: character template + random part selection from available parts + random color within preset ranges

Seeded PRNG: use a simple xorshift or mulberry32 — fast, deterministic, no crypto needed.

```typescript
// Seeded PRNG (mulberry32)
function createRNG(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

## Performance Considerations

Pixel art operations are trivially cheap:

- A 64×96 sprite = 6,144 pixels = 24,576 bytes
- Full composite of 12 layers = ~74K pixel ops = <1ms
- Sprite sheet of 48 frames = ~300K pixels = ~5ms

**No WebGL needed.** Canvas 2D handles this with orders of magnitude headroom.

The only potential bottleneck is **bulk generation** (e.g., `pxl gen npc --count 100`), which is I/O-bound (PNG encoding), not compute-bound. sharp handles this efficiently with its native libvips backend.

### Migration Path to WebGL

If scene rendering ever needs GPU acceleration:

1. Core engine stays the same (pure buffer ops)
2. Only `CanvasView.tsx` renderer swaps from Canvas 2D to WebGL/PixiJS
3. Upload buffers as textures instead of ImageData
4. Zero changes to core, CLI, or data model

This is a rendering-layer-only swap, not an architecture change.

## Testing Strategy

### Unit Tests (Vitest)

Core functions tested with buffer assertions:

```typescript
test('setPixel writes correct RGBA', () => {
  const buf = new Uint8Array(4 * 4 * 4); // 4x4
  setPixel(buf, 4, 2, 1, 255, 0, 0, 255);
  const i = (1 * 4 + 2) * 4;
  expect(buf[i]).toBe(255); // R
  expect(buf[i + 1]).toBe(0); // G
  expect(buf[i + 2]).toBe(0); // B
  expect(buf[i + 3]).toBe(255); // A
});
```

### Visual Snapshot Tests

Generate PNG → compare buffer byte-by-byte:

```typescript
test('outline matches expected output', async () => {
  const input = await loadPNG('fixtures/circle.png');
  const result = addOutline(input.buffer, input.width, input.height, 0, 0, 0);
  const expected = await loadPNG('fixtures/circle-outlined.png');
  expect(Buffer.compare(result, expected.buffer)).toBe(0);
});
```

### CLI Integration Tests

Run CLI commands → verify output files:

```typescript
test('pxl draw pixel creates correct PNG', async () => {
  await exec('pxl draw pixel test.png 5,3 #FF0000');
  const { buffer, width } = await loadPNG('test.png');
  const pixel = getPixel(buffer, width, 5, 3);
  expect(pixel).toEqual({ r: 255, g: 0, b: 0, a: 255 });
});
```
