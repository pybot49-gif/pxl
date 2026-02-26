---
name: pixel-art
description: 'Create, edit, and manage pixel art game assets programmatically. Use when creating character sprites, animations, tilesets, scene compositions, or any pixel-based game art. Supports isometric and top-down styles, character part assembly, sprite sheet export, and animation frame generation. Use for tasks like: generating character sprites with mix-and-match parts, creating walk/idle/attack animations, building isometric scenes, exporting sprite sheets for Unity/Godot/Tiled, batch-generating NPC variations, or editing individual pixels/regions by color or semantic tag.'
---

# Pixel Art Skill

Create pixel art game assets via code. No GUI needed — draw pixels, compose characters, animate, and export sprite sheets entirely through scripts and CLI commands.

## Quick Reference

- **Project root:** Use `pxl.json` to find project context. If no PXL project exists, work with raw PNGs + JSON metadata.
- **Resolution:** Always work in integer pixels. No anti-aliasing, no sub-pixel. Common sizes: 8x8, 16x16, 16x24, 32x32, 32x48, 64x64.
- **Color depth:** 32-bit RGBA. Transparency = alpha channel.
- **Coordinate system:** (0,0) = top-left. X increases right, Y increases down.

## Core Workflow

### 1. Canvas Operations (sharp + Node.js)

Use `sharp` for all image I/O. Create canvases as raw RGBA buffers:

```js
const sharp = require('sharp');

// Create blank transparent canvas
const width = 32,
  height = 48;
const buffer = Buffer.alloc(width * height * 4, 0); // RGBA, all transparent

// Set pixel at (x, y) to color
function setPixel(buf, w, x, y, r, g, b, a = 255) {
  const i = (y * w + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

// Read pixel at (x, y)
function getPixel(buf, w, x, y) {
  const i = (y * w + x) * 4;
  return { r: buf[i], g: buf[i + 1], b: buf[i + 2], a: buf[i + 3] };
}

// Save as PNG (nearest-neighbor, no interpolation)
await sharp(buffer, { raw: { width, height, channels: 4 } })
  .png()
  .toFile('output.png');

// Load existing PNG to raw buffer
const { data, info } = await sharp('input.png')
  .raw()
  .ensureAlpha()
  .toBuffer({ resolveWithObject: true });
// data is Buffer, info.width/info.height/info.channels
```

### 2. Drawing Primitives

```js
// Horizontal line
function drawLineH(buf, w, x1, x2, y, r, g, b, a = 255) {
  for (let x = x1; x <= x2; x++) setPixel(buf, w, x, y, r, g, b, a);
}

// Vertical line
function drawLineV(buf, w, x, y1, y2, r, g, b, a = 255) {
  for (let y = y1; y <= y2; y++) setPixel(buf, w, x, y, r, g, b, a);
}

// Filled rectangle
function fillRect(buf, w, x, y, rw, rh, r, g, b, a = 255) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++) setPixel(buf, w, x + dx, y + dy, r, g, b, a);
}

// Outline rectangle
function strokeRect(buf, w, x, y, rw, rh, r, g, b, a = 255) {
  drawLineH(buf, w, x, x + rw - 1, y, r, g, b, a);
  drawLineH(buf, w, x, x + rw - 1, y + rh - 1, r, g, b, a);
  drawLineV(buf, w, x, y, y + rh - 1, r, g, b, a);
  drawLineV(buf, w, x + rw - 1, y, y + rh - 1, r, g, b, a);
}

// Flood fill
function floodFill(buf, w, h, sx, sy, r, g, b, a = 255) {
  const target = getPixel(buf, w, sx, sy);
  if (target.r === r && target.g === g && target.b === b && target.a === a) return;
  const stack = [[sx, sy]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const p = getPixel(buf, w, cx, cy);
    if (p.r !== target.r || p.g !== target.g || p.b !== target.b || p.a !== target.a)
      continue;
    setPixel(buf, w, cx, cy, r, g, b, a);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}
```

### 3. Layer Compositing

```js
// Composite foreground onto background (simple alpha blend)
function compositeLayer(bg, fg, w, h, opacity = 255) {
  for (let i = 0; i < w * h * 4; i += 4) {
    const fa = (fg[i + 3] * opacity) / 255 / 255;
    const ba = bg[i + 3] / 255;
    const oa = fa + ba * (1 - fa);
    if (oa === 0) continue;
    for (let c = 0; c < 3; c++) {
      bg[i + c] = Math.round((fg[i + c] * fa + bg[i + c] * ba * (1 - fa)) / oa);
    }
    bg[i + 3] = Math.round(oa * 255);
  }
}

// Composite with offset (paste sprite at position)
function pasteAt(bg, bgW, fg, fgW, fgH, dx, dy) {
  for (let y = 0; y < fgH; y++) {
    for (let x = 0; x < fgW; x++) {
      const tx = dx + x,
        ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= bgW) continue;
      const si = (y * fgW + x) * 4;
      if (fg[si + 3] === 0) continue; // skip transparent
      const di = (ty * bgW + tx) * 4;
      const fa = fg[si + 3] / 255;
      const ba = bg[di + 3] / 255;
      const oa = fa + ba * (1 - fa);
      for (let c = 0; c < 3; c++) {
        bg[di + c] = Math.round((fg[si + c] * fa + bg[di + c] * ba * (1 - fa)) / oa);
      }
      bg[di + 3] = Math.round(oa * 255);
    }
  }
}
```

### 4. Sprite Sheet Generation

```js
// Pack frames into grid sprite sheet
async function createSpriteSheet(framePaths, cols, frameW, frameH, padding = 1) {
  const frames = [];
  for (const p of framePaths) {
    const { data } = await sharp(p)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    frames.push(data);
  }
  const rows = Math.ceil(frames.length / cols);
  const sheetW = cols * (frameW + padding) - padding;
  const sheetH = rows * (frameH + padding) - padding;
  const sheet = Buffer.alloc(sheetW * sheetH * 4, 0);

  const meta = {
    image: 'sheet.png',
    tileWidth: frameW,
    tileHeight: frameH,
    frames: [],
  };

  frames.forEach((frame, i) => {
    const col = i % cols,
      row = Math.floor(i / cols);
    const ox = col * (frameW + padding),
      oy = row * (frameH + padding);
    pasteAt(sheet, sheetW, frame, frameW, frameH, ox, oy);
    meta.frames.push({ x: ox, y: oy, w: frameW, h: frameH });
  });

  await sharp(sheet, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .png()
    .toFile('sheet.png');
  require('fs').writeFileSync('sheet.json', JSON.stringify(meta, null, 2));
}
```

### 5. Color & Palette

```js
// Auto-generate shadow/highlight from base color
function shade(r, g, b, amount = -30) {
  return [
    Math.max(0, Math.min(255, r + amount)),
    Math.max(0, Math.min(255, g + amount)),
    Math.max(0, Math.min(255, b + amount)),
  ];
}

// Recolor: replace all pixels of one color with another
function recolor(buf, w, h, from, to) {
  for (let i = 0; i < w * h * 4; i += 4) {
    if (buf[i] === from.r && buf[i + 1] === from.g && buf[i + 2] === from.b) {
      buf[i] = to.r;
      buf[i + 1] = to.g;
      buf[i + 2] = to.b;
    }
  }
}

// Extract unique colors from buffer
function extractPalette(buf, w, h) {
  const colors = new Set();
  for (let i = 0; i < w * h * 4; i += 4) {
    if (buf[i + 3] > 0) colors.add(`${buf[i]},${buf[i + 1]},${buf[i + 2]}`);
  }
  return [...colors].map((c) => {
    const [r, g, b] = c.split(',').map(Number);
    return { r, g, b };
  });
}
```

### 6. Auto-Outline

```js
// Add 1px outline around non-transparent pixels
function addOutline(buf, w, h, r, g, b) {
  const out = Buffer.from(buf); // copy
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (buf[i + 3] > 0) continue; // skip non-transparent
      // check 4 neighbors
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (buf[(ny * w + nx) * 4 + 3] > 0) {
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = 255;
          break;
        }
      }
    }
  }
  return out;
}
```

## Art Style & Expression

See `references/art-style-guide.md` for comprehensive guidance on:

- **Color theory** — hue shifting, ramp construction, palette harmony
- **Outlines** — full black, colored (sel-out), selective, none
- **Shading** — light source, dithering, manual AA
- **Expressive characters** — eyes, mouth, eyebrows, body language at each resolution
- **Material rendering** — skin, metal, fabric, hair, wood, stone, water, glass
- **Common mistakes** — pillow shading, banding, noise, jaggies
- **Style presets** — NES, SNES, GBA, modern indie, chibi

## Character Assembly

Characters are built by compositing part layers in order. See `references/character-system.md` for the full part slot system, body types, and color mapping.

### Assembly Order (back to front)

1. `hair-back` — behind head
2. `back-accessory` — cape, wings
3. `body` (base body silhouette)
4. `legs`, `feet`
5. `torso`, `belt`
6. `arms`, `hands`
7. `face` (eyes, eyebrows, nose, mouth, ears)
8. `facial-hair`
9. `hair-front` — in front of face
10. `head-accessory` — hat, helmet, glasses
11. `weapon-main`, `weapon-off`

### Character JSON Format

```json
{
  "name": "hero",
  "template": "chibi-medium",
  "body": { "build": "normal", "height": "average" },
  "parts": {
    "hair-front": "spiky",
    "eyes": "round-large",
    "eyebrows": "thick-angled",
    "nose": "small-button",
    "mouth": "neutral",
    "torso": "leather-armor",
    "legs": "cloth-pants",
    "feet": "leather-boots",
    "weapon-main": "longsword"
  },
  "colors": {
    "skin": { "primary": "#FFD5A0", "shadow": "#D4A574", "highlight": "#FFE8C8" },
    "hair": { "primary": "#3A2A1A" },
    "eyes": { "iris": "#4A7ABC" },
    "outfit-primary": { "primary": "#CC3333" },
    "outline": "#2A2A2A"
  },
  "views": [
    "front",
    "front-left",
    "left",
    "back-left",
    "back",
    "back-right",
    "right",
    "front-right"
  ]
}
```

### Rendering a Character

```js
async function renderCharacter(charJson, view) {
  const { body, parts, colors } = charJson;
  const template = loadTemplate(charJson.template, body.build, body.height);
  const { width, height } = template;
  const canvas = Buffer.alloc(width * height * 4, 0);

  // Layer order
  const slotOrder = [
    'hair-back',
    'back-accessory',
    '_body',
    'legs',
    'feet',
    'torso',
    'belt',
    'arms',
    'hands',
    'ears',
    'eyes',
    'eyebrows',
    'nose',
    'mouth',
    'facial-hair',
    'hair-front',
    'head-accessory',
    'weapon-main',
    'weapon-off',
  ];

  for (const slot of slotOrder) {
    if (slot === '_body') {
      // Composite base body
      const bodyLayer = await loadBodyView(template, view);
      applyColors(bodyLayer, width, height, colors.skin);
      pasteAt(canvas, width, bodyLayer, width, height, 0, 0);
    } else if (parts[slot]) {
      const partData = await loadPartView(parts[slot], slot, view);
      const colorGroup = getColorGroup(slot); // maps slot → color key
      if (colorGroup && colors[colorGroup]) {
        applyColors(partData.buffer, partData.w, partData.h, colors[colorGroup]);
      }
      pasteAt(
        canvas,
        width,
        partData.buffer,
        partData.w,
        partData.h,
        partData.anchor.x,
        partData.anchor.y
      );
    }
  }

  return { buffer: canvas, width, height };
}
```

## Animation

### Frame-Based Animation

```js
// Generate walk cycle from character + template
async function generateWalkCycle(charJson, view, templateFrames) {
  const frames = [];
  for (const frameTemplate of templateFrames) {
    // Each template frame defines part offsets/transforms
    const modifiedChar = applyFrameTransforms(charJson, frameTemplate);
    const { buffer, width, height } = await renderCharacter(modifiedChar, view);
    frames.push({ buffer, width, height });
  }
  return frames;
}

// Animation metadata
const walkAnim = {
  name: 'walk',
  fps: 8,
  loop: true,
  frames: [
    { duration: 125 }, // ms per frame
    { duration: 125 },
    { duration: 125 },
    { duration: 125 },
    { duration: 125 },
    { duration: 125 },
  ],
};
```

### Common Animation Templates

| Name         | Frames | FPS | Loop | Notes                     |
| ------------ | ------ | --- | ---- | ------------------------- |
| idle         | 2-4    | 2-4 | yes  | Subtle breathing/sway     |
| walk         | 6-8    | 8   | yes  | Weight shift + arm swing  |
| run          | 6-8    | 10  | yes  | Wider stride              |
| attack-melee | 6      | 12  | no   | Wind up → swing → recover |
| attack-range | 4-6    | 10  | no   | Draw → release            |
| hit          | 3      | 8   | no   | Impact → stagger          |
| death        | 6      | 6   | no   | Collapse                  |
| jump         | 4      | 10  | no   | Crouch → air → land       |

## Isometric Helpers

See `references/isometric.md` for iso grid math, tile drawing, depth sorting, and projection formulas.

### Quick Iso Tile

```js
// Draw isometric diamond tile (2:1 ratio)
function drawIsoTile(buf, w, cx, cy, tileW, tileH, r, g, b) {
  const hw = tileW / 2,
    hh = tileH / 2;
  for (let dy = -hh; dy <= hh; dy++) {
    const span = Math.round(hw * (1 - Math.abs(dy) / hh));
    for (let dx = -span; dx <= span; dx++) {
      setPixel(buf, w, cx + dx, cy + dy, r, g, b);
    }
  }
}

// Iso grid position → screen position
function isoToScreen(gridX, gridY, tileW = 32, tileH = 16) {
  return {
    x: (gridX - gridY) * (tileW / 2),
    y: (gridX + gridY) * (tileH / 2),
  };
}
```

## File Organization

When working within a PXL project:

```
chars/<name>/char.json          — character definition
chars/<name>/renders/<view>.png — rendered views
chars/<name>/anims/<anim>/      — animation frames
parts/<slot>/<id>/part.json     — part metadata + color regions
parts/<slot>/<id>/<view>.png    — part pixel data per view
sprites/<name>/sprite.json      — standalone sprite metadata
exports/sheets/                 — generated sprite sheets + JSON
```

When working without PXL project (raw files):

- Keep PNGs + sidecar `.meta.json` for semantic tags
- Use consistent naming: `<name>-<view>-<frame>.png`
- Always export metadata JSON alongside sprite sheets

## Tips for AI Agents

1. **Plan before drawing** — Sketch the pixel layout as a 2D array in comments first
2. **Work in layers** — Base silhouette → color fill → shading → outline → details
3. **Use limited palettes** — 4-16 colors max. Fewer colors = more cohesive pixel art
4. **Respect the grid** — No half-pixels. Every coordinate is integer.
5. **Test symmetry** — Characters often mirror left/right. Draw one side, flip for the other.
6. **3-tone shading** — Base + shadow + highlight per color region. No gradients.
7. **Outline consistency** — Pick one outline style (full dark outline, selective outline, or no outline) and stick with it
8. **Size matters** — At 16x16, every pixel counts. At 32x32, you have room for detail. Don't over-detail small sprites.
9. **8-direction trick** — Draw front, back, left. Mirror left→right. Interpolate diagonals from front+side.
10. **Batch export** — Always generate sprite sheet + JSON metadata together
