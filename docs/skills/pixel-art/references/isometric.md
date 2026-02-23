# Isometric Reference

## Grid Math

Standard pixel art isometric uses **2:1 ratio** — for every 2 horizontal pixels, 1 vertical pixel.

### Coordinate Conversion

```js
// World grid (gridX, gridY) → Screen pixels (screenX, screenY)
function isoToScreen(gridX, gridY, tileW = 32, tileH = 16) {
  return {
    x: (gridX - gridY) * (tileW / 2),
    y: (gridX + gridY) * (tileH / 2)
  };
}

// Screen pixels → World grid (inverse)
function screenToIso(screenX, screenY, tileW = 32, tileH = 16) {
  return {
    gridX: (screenX / (tileW / 2) + screenY / (tileH / 2)) / 2,
    gridY: (screenY / (tileH / 2) - screenX / (tileW / 2)) / 2
  };
}

// Height offset (z-axis = vertical stacking)
function isoToScreenWithZ(gridX, gridY, gridZ, tileW = 32, tileH = 16, zScale = 16) {
  const base = isoToScreen(gridX, gridY, tileW, tileH);
  return {
    x: base.x,
    y: base.y - gridZ * zScale  // up is negative Y
  };
}
```

### Common Tile Sizes

| Tile | Ratio | Use |
|------|-------|-----|
| 16×8 | 2:1 | Small/retro |
| 32×16 | 2:1 | Standard |
| 64×32 | 2:1 | Detailed |

## Drawing Iso Tiles

### Diamond (Floor Tile)

A 32×16 iso tile is a diamond shape. Draw with 2:1 stepping:

```js
function drawIsoDiamond(buf, w, cx, cy, tileW, tileH, r, g, b) {
  const hw = tileW / 2;
  const hh = tileH / 2;
  // Top half
  for (let row = 0; row < hh; row++) {
    const span = Math.round((row + 1) * hw / hh);
    drawLineH(buf, w, cx - span + 1, cx + span - 1, cy - hh + row, r, g, b);
  }
  // Bottom half
  for (let row = 0; row < hh; row++) {
    const span = Math.round((hh - row) * hw / hh);
    drawLineH(buf, w, cx - span + 1, cx + span - 1, cy + row, r, g, b);
  }
}
```

### Iso Cube (Box)

A cube has 3 visible faces: top, left, right.

```
       /\
      /  \          ← top face
     /    \
    |\ top/|
    | \  / |
    |  \/  |
    |L |  R|        ← left face, right face
    |  |   |
    |  |   |
     \ | /
      \|/
```

```js
function drawIsoCube(buf, w, cx, cy, tileW, tileH, height, topColor, leftColor, rightColor) {
  // Top face (diamond at top)
  drawIsoDiamond(buf, w, cx, cy - height, tileW, tileH, ...topColor);

  // Left face (parallelogram)
  const hw = tileW / 2;
  const hh = tileH / 2;
  for (let row = 0; row < height; row++) {
    // Left edge follows top-left diamond edge downward
    for (let col = 0; col < hw; col++) {
      const edgeY = Math.round(col * hh / hw);
      const px = cx - hw + col;
      const py = cy - hh + edgeY + row - height + hh;
      if (px >= 0 && py >= 0) setPixel(buf, w, px, py, ...leftColor);
    }
  }

  // Right face (parallelogram) — mirror of left
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < hw; col++) {
      const edgeY = Math.round(col * hh / hw);
      const px = cx + col;
      const py = cy + edgeY + row - height;
      if (px >= 0 && py >= 0) setPixel(buf, w, px, py, ...rightColor);
    }
  }
}
```

### Iso Wall Segments

**Left wall** — extends from top-left edge downward:
- Top edge follows 2:1 slope going down-right
- Left edge is vertical
- Standard height: 2-3× tile height

**Right wall** — extends from top-right edge downward:
- Top edge follows 2:1 slope going down-left
- Right edge is vertical

### Iso Stairs

Steps are stacked cubes with decreasing height. For N steps going north:

```js
function drawIsoStairs(buf, w, cx, cy, tileW, tileH, steps, stepH, color) {
  for (let i = 0; i < steps; i++) {
    const offsetY = -i * stepH;
    const gridOffset = i; // each step moves one grid unit
    const pos = isoToScreenWithZ(0, gridOffset, 0, tileW, tileH);
    drawIsoCube(buf, w, cx + pos.x, cy + pos.y + offsetY,
                tileW, tileH, stepH, color.top, color.left, color.right);
  }
}
```

## Depth Sorting

In isometric view, objects further from camera (higher gridX + gridY) render first.

### Painter's Algorithm

```js
// Sort objects for correct draw order
function isoSort(objects) {
  return objects.sort((a, b) => {
    // Primary: sum of grid coords (depth)
    const depthA = a.gridX + a.gridY;
    const depthB = b.gridX + b.gridY;
    if (depthA !== depthB) return depthA - depthB; // draw far first

    // Secondary: z-level (lower z first)
    if (a.gridZ !== b.gridZ) return a.gridZ - b.gridZ;

    // Tertiary: y position (higher gridY first for same depth)
    return a.gridY - b.gridY;
  });
}
```

### Object Footprints

Objects that span multiple tiles need correct sorting. Define footprint as grid cells the object occupies:

```json
{
  "name": "large-tree",
  "footprint": [[0,0], [1,0], [0,1], [1,1]],
  "anchorCell": [0, 0],
  "zHeight": 4
}
```

Sort by the **maximum depth cell** in the footprint.

## Iso Scene Composition

```js
async function renderIsoScene(scene, tileW = 32, tileH = 16) {
  // Calculate screen bounds
  const positions = scene.objects.map(obj =>
    isoToScreenWithZ(obj.gridX, obj.gridY, obj.gridZ || 0, tileW, tileH)
  );
  // ... determine canvas size from min/max positions + sprite sizes

  // Sort by depth
  const sorted = isoSort(scene.objects);

  // Render back-to-front
  const canvas = Buffer.alloc(canvasW * canvasH * 4, 0);
  for (const obj of sorted) {
    const pos = isoToScreenWithZ(obj.gridX, obj.gridY, obj.gridZ || 0, tileW, tileH);
    const sprite = await loadSprite(obj.sprite);
    pasteAt(canvas, canvasW, sprite.data, sprite.width, sprite.height,
            pos.x + offsetX, pos.y + offsetY);
  }
  return canvas;
}
```

## Tips for Iso Pixel Art

1. **Consistent light source** — Top-left is convention. Left faces = medium, right faces = dark, top = light.
2. **2:1 lines only** — Diagonal lines must follow 2px horizontal per 1px vertical. No other angles.
3. **No 1:1 diagonals** — 45° lines look wrong in iso. Always 2:1.
4. **Tile seams** — Adjacent tiles must share edge pixels perfectly. Off-by-one = visible seam.
5. **Character scaling** — A character standing on a 32×16 tile should be roughly 32px wide at feet and 48-64px tall.
6. **Shadow direction** — Cast shadows follow iso grid lines, not arbitrary angles.
7. **Avoid true curves** — Circles in iso are ellipses. Approximate with pixel stepping.
8. **Height markers** — 1 grid unit of height typically = half the tile height (8px for 32×16 tiles). Stay consistent.
