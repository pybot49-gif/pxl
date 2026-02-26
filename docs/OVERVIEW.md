# PXL — AI-First Pixel Art Toolkit

## Vision

PXL is a CLI + Web UI toolkit for creating, editing, and managing pixel art assets — designed primarily for AI agents. Where traditional pixel art tools optimize for mouse-and-cursor workflows, PXL optimizes for programmatic, scriptable, reproducible asset creation.

**Core philosophy:** An AI agent should be able to create a full set of game-ready character sprites, animations, and scene assets through CLI commands alone — without ever "seeing" the canvas.

---

## Core Concepts

### Canvas

- Fixed-resolution bitmap, 32-bit RGBA (8 bits per channel)
- Supported sizes: 8x8 through 256x256
- Pixel-perfect — no anti-aliasing, no sub-pixel rendering
- Coordinate system: (0,0) = top-left

### Layer

- Each canvas contains ordered layers
- Properties: name, opacity (0-255), blend mode, visible, locked
- Blend modes: normal, multiply, overlay, screen, add
- Layers compose top-down (highest index = top)

### Object

- A named, reusable collection of pixels with a bounding box
- Can be placed on any layer at any position
- Has an anchor point (for alignment/rotation)
- Can be flipped (H/V), rotated (90° increments only — pixel art)
- Objects are referenced by ID, can be instanced across scenes

### Palette

- Named set of colors (2-256 colors)
- Constraint mode: canvas can be locked to a palette
- Built-in presets: NES (54), GameBoy (4), PICO-8 (16), Endesga-32, custom
- Palette operations: remap, reduce, extract-from-image

### Animation

- Frame-based timeline (no tweening by default)
- Each frame = a canvas state (layers + objects)
- Properties: frame duration (ms), loop, ping-pong
- Onion skin: preview N frames before/after (ghost overlay)
- Tags: label frame ranges ("walk", "idle", "attack")
- Keyframe interpolation: pixel-shift (optional, for AI-assisted in-betweening)

### Scene

- Composition of multiple sprites/objects on a larger canvas
- Grid-based placement (optional snap)
- Depth/z-ordering
- Camera viewport for preview
- NOT a tile map editor — use Tiled for that
- Export: flattened PNG, or individual sprites + placement JSON

### Isometric

- First-class isometric support (2:1 pixel ratio)
- Iso grid overlay and snapping
- Iso-aware primitives (cube, floor, wall, stairs)
- Iso depth sorting
- Iso projection helper (approximate 2D→iso conversion)

---

## Character System

The character system is PXL's most opinionated feature. It enables mix-and-match character creation from reusable parts.

### Architecture

```
Character = Base Body + Parts + Colors + Metadata
```

### Base Body

A base body defines the silhouette and proportions. It is the foundation that all parts attach to.

**Body Types (build × height matrix):**

| Build \ Height | very-short | short | average | tall | very-tall |
| -------------- | ---------- | ----- | ------- | ---- | --------- |
| very-skinny    | ✓          | ✓     | ✓       | ✓    | ✓         |
| skinny         | ✓          | ✓     | ✓       | ✓    | ✓         |
| normal         | ✓          | ✓     | ✓       | ✓    | ✓         |
| fat            | ✓          | ✓     | ✓       | ✓    | ✓         |
| very-fat       | ✓          | ✓     | ✓       | ✓    | ✓         |
| muscular       | ✓          | ✓     | ✓       | ✓    | ✓         |
| very-muscular  | ✓          | ✓     | ✓       | ✓    | ✓         |

Each base body is a pixel art template at a specific resolution (e.g., 32x48 for chibi, 16x32 for small). Base bodies define **anchor points** for every attachable part slot.

**Resolution tiers:**

- `micro`: 8x12 — overworld/minimap
- `small`: 16x24 — standard game sprite
- `medium`: 32x48 — detailed chibi
- `large`: 64x96 — portrait/dialogue

### Part Slots

Each base body defines these attachment slots with anchor points:

```
┌─────────── HEAD ───────────┐
│  hair-back                 │  (behind head)
│  ears (left/right)         │
│  face                      │
│    ├─ eyebrows (left/right)│
│    ├─ eyes (left/right)    │
│    ├─ nose                 │
│    ├─ mouth                │
│    └─ facial-hair          │
│  hair-front                │  (in front of face)
│  head-accessory            │  (hat, helmet, crown, glasses)
├─────────── BODY ───────────┤
│  torso                     │  (shirt, armor, jacket)
│  arms (left/right)         │  (sleeves follow torso style)
│  hands (left/right)        │  (gloves, bare)
│  belt                      │
│  back-accessory            │  (cape, backpack, wings)
├─────────── LEGS ───────────┤
│  legs                      │  (pants, skirt, shorts)
│  feet                      │  (shoes, boots, bare)
├─────────── HELD ───────────┤
│  weapon-main               │  (right hand)
│  weapon-off                │  (left hand / shield)
└────────────────────────────┘
```

### Part Definition

Each part is a pixel art piece designed to fit a specific slot on a specific base body:

```yaml
# parts/hair/spiky.yaml
id: hair-spiky
slot: hair-front
tags: [short, spiky, anime]
colorable: true
color-regions:
  primary: [[5, 2], [6, 2], [7, 2], ...] # pixel coords that accept primary color
  shadow: [[5, 3], [6, 3], ...] # auto-darkened
  highlight: [[6, 1], [7, 1], ...] # auto-lightened
compatible-bodies: [all] # or specific builds
views: [front, front-left, left, back-left, back, back-right, right, front-right]
pixel-data:
  front: 'parts/hair/spiky/front.png'
  front-left: 'parts/hair/spiky/front-left.png'
  # ...
```

### Color System

Characters use a **semantic color palette** — not raw hex values:

```yaml
colors:
  skin:
    primary: '#FFD5A0' # base skin
    shadow: auto # auto-darken 20%
    highlight: auto # auto-lighten 15%
  hair:
    primary: '#3A2A1A'
    shadow: auto
    highlight: auto
  eyes:
    iris: '#4A7ABC'
    pupil: '#1A1A2A'
    white: '#F0F0F0'
  outfit-primary:
    primary: '#CC3333'
    shadow: auto
    highlight: auto
  outfit-secondary:
    primary: '#EEEECC'
    shadow: auto
    highlight: auto
  outline: '#2A2A2A' # character outline color
```

**Skin presets:**

- pale, light, medium-light, medium, medium-dark, dark, very-dark
- fantasy: green (orc), blue (undead), red (demon), etc.

**Auto-shading:** Given a primary color, PXL generates shadow/highlight variants using HSL shifts, maintaining pixel art aesthetic (no gradients, just 2-3 tone shading).

### Character Operations

```bash
# Create from scratch
pxl char create --name hero --body normal/average --res medium

# Browse/search parts
pxl char parts list --slot hair
pxl char parts list --slot torso --tag armor
pxl char parts search "spiky"

# Equip parts
pxl char equip hero --slot hair-front --part spiky
pxl char equip hero --slot eyes --part round-large
pxl char equip hero --slot eyebrows --part thick-angled
pxl char equip hero --slot nose --part small-button
pxl char equip hero --slot mouth --part neutral
pxl char equip hero --slot ears --part normal
pxl char equip hero --slot torso --part leather-armor
pxl char equip hero --slot legs --part cloth-pants
pxl char equip hero --slot feet --part leather-boots
pxl char equip hero --slot weapon-main --part longsword

# Set colors
pxl char color hero --skin medium --hair "#3A2A1A" --eyes "#4A7ABC"
pxl char color hero --outfit-primary "#CC3333" --outfit-secondary "#EEEECC"

# Change body type (re-maps all equipped parts)
pxl char body hero --build muscular --height tall

# Render all 8 views
pxl char render hero --views all

# Render specific view
pxl char render hero --views front,front-left

# Preview (opens web UI)
pxl char preview hero --rotate

# Duplicate & modify
pxl char clone hero --name villain
pxl char color villain --skin dark --hair white --outfit-primary "#440066"

# Export
pxl char export hero --format sheet --layout grid-8dir
```

### View System (8-Direction)

```
        back (N)
    back-left  back-right
   (NW)            (NE)
left (W)        right (E)
   (SW)            (SE)
  front-left  front-right
       front (S)
```

Every part must provide pixel data for all 8 directions. The character system composites all equipped parts per-view, respecting layer order (hair-back behind head, hair-front in front of face, etc.)

---

## Animation System

### Templates

Built-in animation templates that work with the character system:

| Template       | Frames | Description                          |
| -------------- | ------ | ------------------------------------ |
| `idle`         | 2-4    | Subtle breathing/sway                |
| `walk`         | 6-8    | Standard walk cycle                  |
| `run`          | 6-8    | Faster stride                        |
| `attack-melee` | 6      | Wind up → swing → recover            |
| `attack-range` | 4-6    | Draw → aim → release                 |
| `cast`         | 6      | Raise hands → magic effect → recover |
| `hit`          | 3      | Impact → stagger → recover           |
| `death`        | 6      | Collapse sequence                    |
| `jump`         | 4      | Crouch → rise → air → land           |
| `climb`        | 4      | Ladder/wall climb cycle              |
| `interact`     | 4      | Reach out → grab → pull back         |
| `sit`          | 2      | Standing → seated                    |
| `emote-wave`   | 4      | Hand wave                            |
| `emote-nod`    | 2      | Head nod                             |

Each template defines per-frame transforms for each body part:

- Position offset (dx, dy)
- Rotation (0°, 90°, 180°, 270°)
- Flip (H/V)
- Show/hide
- Frame-specific part override (e.g., open mouth on attack frame 3)

### Animation Operations

```bash
# Create from template
pxl anim create hero/walk --template walk --views all-8

# Custom animation
pxl anim create hero/special --frames 8 --fps 10 --loop false

# Edit keyframes
pxl anim keyframe hero/special --frame 0 --import frame0.png
pxl anim keyframe hero/special --frame 4 --import frame4.png
pxl anim interpolate hero/special --method pixel-shift

# Preview
pxl anim preview hero/walk --view front --speed 1x
pxl anim preview hero/walk --view all --speed 1x  # 8-dir simultaneous

# Apply to character
pxl anim apply hero --template walk
# → generates walk animation for all 8 directions using hero's equipped parts

# Export
pxl anim export hero/walk --format sheet --layout strip-horizontal
pxl anim export hero/walk --format gif --view front --scale 4x
pxl anim export hero --all --format sheet  # all animations in one sheet
```

---

## Isometric System

### Grid

```
Standard iso tile: 2:1 ratio
A 32x16 diamond represents one floor tile:

        /\
       /  \
      / 32  \
     /   ×   \
    /   16    \
   \          /
    \        /
     \      /
      \    /
       \  /
        \/
```

### Primitives

```bash
# Floor tile
pxl iso tile --size 32x16 --color "#8B7355" --output floor.png

# Cube (box)
pxl iso cube --base 32x16 --height 32 --color-top "#8B7355" --color-left "#6B5335" --color-right "#7B6345"

# Wall
pxl iso wall --face left --base 32 --height 48 --color "#A0A0A0"

# Stairs
pxl iso stairs --direction north --steps 4 --base 32x16

# Place character on iso grid
pxl iso place hero --grid 3,2 --z 0 --output scene.png
```

### Iso Character Rendering

Characters rendered for isometric view need adjusted proportions:

- Slightly top-down perspective
- Feet align to iso tile diamond
- Shadow projected onto iso floor plane

```bash
# Render character in iso mode
pxl char render hero --views all --iso true
# → adjusts proportions for iso perspective

# Iso-specific base bodies available
pxl char create npc --body normal/average --res medium --iso true
```

---

## Procedural Generation

```bash
# Vegetation
pxl gen tree --style [pine|oak|willow|palm|dead] --size 48x64 --palette forest
pxl gen bush --style [round|wild|flowering] --size 16x16
pxl gen grass --tile 32x16 --variations 4 --iso true

# Terrain
pxl gen terrain --type [grass|dirt|stone|sand|water|snow] --tile 32x16 --iso true
pxl gen terrain --type water --tile 32x16 --animated --frames 4

# Structures
pxl gen building --style [medieval|modern|fantasy|sci-fi] --size 64x48 --iso true
pxl gen wall --style stone --segment 32x48 --variations [straight|corner|end|gate]
pxl gen fence --style wood --segment 32x32

# Props
pxl gen crate --size 16x16 --material [wood|metal] --iso true
pxl gen barrel --size 16x20 --iso true
pxl gen chest --size 16x12 --state [closed|open] --iso true

# NPC generation (bulk)
pxl gen npc --base villager --count 10 --vary [hair,clothes,skin,height,build]
pxl gen crowd --base villager --count 30 --output npcs/ --sheet true

# Seeds for reproducibility
pxl gen tree --style oak --seed 42  # always produces same tree
```

---

## Project Structure

```
my-game/
├── pxl.json                    # project manifest
├── docs/                       # design documents
│   ├── README.md               # project overview
│   ├── art-style-guide.md      # visual style reference
│   ├── character-design.md     # character design notes
│   └── asset-list.md           # planned assets checklist
├── palettes/                   # color palettes
│   ├── main.json               # project primary palette
│   └── ui.json                 # UI-specific palette
├── templates/                  # base body templates
│   ├── chibi-medium/           # 32x48 chibi base
│   │   ├── template.json       # anchor points, slots, metadata
│   │   └── bodies/             # body type variants
│   │       ├── normal-average/ # build-height combo
│   │       │   ├── front.png
│   │       │   ├── front-left.png
│   │       │   └── ...         # 8 directions
│   │       ├── muscular-tall/
│   │       └── ...
│   └── iso-medium/             # isometric variant
├── parts/                      # reusable character parts
│   ├── hair/
│   │   ├── spiky/
│   │   │   ├── part.json       # metadata, color regions, tags
│   │   │   ├── front.png
│   │   │   └── ...             # 8 directions
│   │   ├── long-straight/
│   │   └── ...
│   ├── eyes/
│   ├── eyebrows/
│   ├── nose/
│   ├── mouth/
│   ├── ears/
│   ├── facial-hair/
│   ├── torso/
│   ├── legs/
│   ├── feet/
│   ├── head-accessory/
│   ├── back-accessory/
│   ├── belt/
│   └── weapons/
├── chars/                      # assembled characters
│   ├── hero/
│   │   ├── char.json           # equipped parts, colors, body type
│   │   ├── renders/            # generated renders (8-dir PNGs)
│   │   └── anims/              # character animations
│   │       ├── idle/
│   │       │   ├── anim.json   # frame data, timing
│   │       │   └── frames/     # per-frame PNGs (or computed)
│   │       ├── walk/
│   │       └── attack/
│   └── villain/
├── sprites/                    # standalone sprites (non-character)
│   ├── props/
│   │   ├── chest/
│   │   │   ├── sprite.json
│   │   │   └── idle.png
│   │   └── torch/
│   │       ├── sprite.json
│   │       └── frames/         # animated torch
│   └── effects/
│       ├── explosion/
│       └── sparkle/
├── tiles/                      # tileset pieces (for Tiled export)
│   ├── terrain/
│   │   ├── tileset.json
│   │   ├── grass-01.png
│   │   ├── grass-02.png
│   │   └── ...
│   └── walls/
├── scenes/                     # composed scenes
│   ├── village-square/
│   │   ├── scene.json          # sprite placements, layers
│   │   └── preview.png         # rendered preview
│   └── dungeon-entrance/
├── exports/                    # build output (gitignored)
│   ├── sheets/                 # generated sprite sheets
│   │   ├── hero-all.png
│   │   ├── hero-all.json       # metadata (Tiled/Unity/Godot)
│   │   └── ...
│   ├── gif/                    # animation previews
│   └── individual/             # individual frame exports
└── .pxl/                       # local cache/state (gitignored)
    ├── render-cache/           # cached renders
    └── undo-history/           # undo stack per asset
```

### pxl.json (Project Manifest)

```json
{
  "name": "my-game",
  "version": "0.1.0",
  "description": "A pixel art RPG",
  "resolution": {
    "default": "medium",
    "tiers": {
      "micro": [8, 12],
      "small": [16, 24],
      "medium": [32, 48],
      "large": [64, 96]
    }
  },
  "palette": "palettes/main.json",
  "defaultTemplate": "chibi-medium",
  "iso": {
    "enabled": true,
    "tileSize": [32, 16]
  },
  "export": {
    "sheetPadding": 1,
    "sheetLayout": "grid",
    "metadataFormat": "json",
    "targets": ["tiled", "unity", "godot"]
  },
  "docs": {
    "style-guide": "docs/art-style-guide.md",
    "characters": "docs/character-design.md",
    "assets": "docs/asset-list.md"
  }
}
```

---

## CLI Reference

### Project

```bash
pxl init [--name <name>] [--iso] [--template <starter>]
pxl status                        # project overview: assets, chars, anims count
pxl validate                      # check for missing parts, broken refs
pxl build                         # render all + export all sheets
```

### Canvas / Sprite

```bash
pxl sprite create <path> --size <WxH>
pxl sprite edit <path>            # open in web UI
pxl sprite info <path>            # dimensions, layers, palette
pxl sprite resize <path> --size <WxH> [--anchor center|top-left|...]
```

### Drawing (CLI)

```bash
pxl draw pixel <path> <x,y> <color>
pxl draw line <path> <x1,y1> <x2,y2> <color>
pxl draw rect <path> <x,y,w,h> <color> [--fill]
pxl draw circle <path> <cx,cy,r> <color> [--fill]
pxl draw fill <path> <x,y> <color>          # flood fill
pxl draw replace <path> <old-color> <new-color>  # global replace
pxl draw paste <path> <source> <x,y> [--layer <n>]
pxl draw erase <path> <x,y>                 # set to transparent
pxl draw outline <path> <color>              # auto-outline non-transparent pixels
```

### Layer

```bash
pxl layer add <path> --name <name> [--above <n>] [--below <n>]
pxl layer remove <path> <name-or-index>
pxl layer reorder <path> <name> --to <index>
pxl layer merge <path> <layer1> <layer2>
pxl layer flatten <path>
pxl layer opacity <path> <name> <0-255>
pxl layer visible <path> <name> <true|false>
```

### Palette

```bash
pxl palette create <name> --colors "#FF0000,#00FF00,#0000FF"
pxl palette import <name> --from <image.png>     # extract palette from image
pxl palette preset <name>                         # nes, gameboy, pico-8, etc.
pxl palette apply <path> --palette <name>         # remap sprite to palette
pxl palette constrain <path> --palette <name>     # lock future edits to palette
```

### Character

```bash
pxl char create --name <n> --body <build/height> --res <tier> [--iso]
pxl char list
pxl char info <name>
pxl char clone <source> --name <target>
pxl char delete <name>

pxl char equip <name> --slot <slot> --part <part-id>
pxl char unequip <name> --slot <slot>
pxl char color <name> --skin <preset|hex> --hair <hex> --eyes <hex> \
  --outfit-primary <hex> --outfit-secondary <hex>
pxl char body <name> --build <build> --height <height>

pxl char render <name> --views <all|csv> [--iso]
pxl char preview <name>                           # open web UI

pxl char parts list [--slot <slot>] [--tag <tag>]
pxl char parts search <query>
pxl char parts create --slot <slot> --id <id>     # open editor for new part
pxl char parts import <path> --slot <slot> --id <id>
```

### Animation

```bash
pxl anim create <char/anim-name> --template <template> --views <views>
pxl anim create <char/anim-name> --frames <n> --fps <fps> [--loop]
pxl anim list <char>
pxl anim info <char/anim-name>

pxl anim keyframe <char/anim> --frame <n> --import <png>
pxl anim interpolate <char/anim> --method pixel-shift
pxl anim apply <char> --template <template>       # generate from char + template
pxl anim timing <char/anim> --frame <n> --duration <ms>

pxl anim preview <char/anim> [--view <view>] [--speed <multiplier>]
pxl anim export <char/anim> --format <sheet|gif|apng|frames>
```

### Isometric

```bash
pxl iso grid --tile <WxH> --show                  # overlay reference
pxl iso tile --size <WxH> --color <hex>
pxl iso cube --base <WxH> --height <px> --color-top <hex> --color-left <hex> --color-right <hex>
pxl iso wall --face <left|right> --base <px> --height <px>
pxl iso stairs --direction <n|s|e|w> --steps <n> --base <WxH>
pxl iso place <sprite> --grid <x,y> --z <n>
pxl iso scene render <scene-path>
```

### Procedural Generation

```bash
pxl gen tree --style <style> [--size WxH] [--palette <name>] [--seed <n>]
pxl gen terrain --type <type> [--tile WxH] [--iso] [--variations <n>]
pxl gen building --style <style> [--size WxH] [--iso]
pxl gen prop --type <type> [--size WxH] [--iso]
pxl gen npc --base <template> --count <n> --vary <fields>
```

### Scene

```bash
pxl scene create <name> --size <WxH>
pxl scene place <scene> <sprite> --pos <x,y> [--z <n>]
pxl scene remove <scene> <instance-id>
pxl scene render <scene> --output <path>
pxl scene preview <scene>                         # open web UI
```

### Export

```bash
pxl export sheet <path> [--layout grid|strip-h|strip-v] [--padding <px>]
pxl export gif <path> [--view <view>] [--scale <n>x]
pxl export apng <path> [--view <view>] [--scale <n>x]
pxl export frames <path> --output <dir>
pxl export tiled <tileset-path>                   # Tiled-compatible TSX + PNG
pxl export unity <path>                           # Unity sprite metadata
pxl export godot <path>                           # Godot .tres resource
pxl export all                                    # build everything in exports/
```

### Semantic Tags (AI-assist)

```bash
pxl tag set <path> <x,y> <tag>                    # tag a pixel
pxl tag region <path> <x,y,w,h> <tag>             # tag a region
pxl tag fill <path> <x,y> <tag>                   # flood-tag connected pixels
pxl tag list <path>                                # list all tags
pxl tag select <path> <tag>                        # get all pixels with tag
pxl tag recolor <path> <tag> <color>               # recolor by tag
```

### Describe (AI-readable)

```bash
pxl describe <path>                                # text description of asset
pxl describe <path> --format json                  # structured description
pxl describe char <name>                           # character summary
pxl describe scene <name>                          # scene layout description
```

### Web UI

```bash
pxl ui                           # start web UI server (default :3000)
pxl ui --port 8080               # custom port
# Web UI provides:
#   - Canvas editor with pixel drawing tools
#   - Layer panel
#   - Character builder (visual equip/color)
#   - Animation timeline + preview
#   - Scene composer
#   - Isometric grid view
#   - Side-by-side 8-direction preview
#   - Live reload (watches file changes)
```

---

## Semantic Pixel Data

Every pixel can carry optional semantic metadata:

```json
{
  "x": 5,
  "y": 3,
  "rgba": [255, 0, 0, 255],
  "tag": "hair",
  "colorGroup": "hair.primary"
}
```

This enables AI operations like:

- "Change all hair pixels to blue" → `pxl tag recolor hero hair "#0000FF"`
- "Describe what's at position 5,3" → `pxl describe hero --pixel 5,3` → "hair (red)"
- "Select all skin pixels" → `pxl tag select hero skin` → coordinate list

Semantic data is stored in sidecar `.meta.json` files, not embedded in PNGs.

---

## Export Metadata Format

Sprite sheet JSON metadata (compatible with Tiled, Unity, Godot):

```json
{
  "image": "hero-all.png",
  "imageWidth": 256,
  "imageHeight": 384,
  "tileWidth": 32,
  "tileHeight": 48,
  "animations": {
    "idle-front": {
      "frames": [
        {"x": 0, "y": 0, "w": 32, "h": 48, "duration": 500},
        {"x": 32, "y": 0, "w": 32, "h": 48, "duration": 500}
      ],
      "loop": true
    },
    "walk-front": {
      "frames": [...],
      "loop": true
    }
  },
  "tags": {
    "idle": {"from": 0, "to": 1},
    "walk": {"from": 2, "to": 7}
  }
}
```

---

## What PXL Does NOT Do

| Out of Scope          | Use Instead                           |
| --------------------- | ------------------------------------- |
| Tile map editing      | Tiled                                 |
| Game engine / runtime | Unity, Godot                          |
| AI image generation   | DALL-E, Stable Diffusion, then import |
| Vector / SVG graphics | Inkscape, Figma                       |
| 3D modeling           | Blender, MagicaVoxel                  |
| Filters (blur, glow)  | Not pixel art                         |
| Sound / music         | Other tools                           |
| Anti-aliasing         | Pixel art = hard edges                |

---

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js (Bun optional)
- **CLI framework:** Commander.js or oclif
- **Image I/O:** sharp (libvips) for PNG read/write
- **Web UI:** Vite + React/Svelte + HTML5 Canvas
- **File format:** PNG + JSON sidecar (human-readable, git-friendly)
- **Package:** npm (`npx pxl init`)
