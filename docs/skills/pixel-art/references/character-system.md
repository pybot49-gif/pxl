# Character System Reference

## Body Types

### Build × Height Matrix

7 builds × 5 heights = 35 combinations.

**Builds:** very-skinny, skinny, normal, fat, very-fat, muscular, very-muscular
**Heights:** very-short, short, average, tall, very-tall

### Resolution Tiers

| Tier   | Size  | Use Case             |
| ------ | ----- | -------------------- |
| micro  | 8×12  | Overworld, minimap   |
| small  | 16×24 | Standard game sprite |
| medium | 32×48 | Detailed chibi       |
| large  | 64×96 | Portrait, dialogue   |

### Pixel Budget by Resolution

At **16×24** (small):

- Head: ~8×8 pixels (minimal facial features — dots for eyes, 1px mouth)
- Body: ~8×10
- Legs: ~8×6
- Hair/accessories: 2-4 pixels of clearance

At **32×48** (medium):

- Head: ~16×16 (room for distinct eyes, nose, mouth, eyebrows)
- Body: ~16×20
- Legs: ~16×12
- Hair/accessories: full detail possible

At **64×96** (large):

- Full detail on all features
- Room for anti-aliased-style pixel clusters
- Suitable for close-up / dialogue portraits

## Part Slot Definitions

### Head Slots

| Slot           | Layer Order    | Anchor              | Notes                                    |
| -------------- | -------------- | ------------------- | ---------------------------------------- |
| hair-back      | 1 (behind all) | Top of head         | Long hair, ponytails that go behind body |
| ears           | 7 (with face)  | Side of head        | Left/right variants                      |
| face-base      | 6              | Center of head area | Skin-colored face shape                  |
| eyes           | 7              | Upper face          | Left/right, includes pupil + white       |
| eyebrows       | 8              | Above eyes          | Expression-defining                      |
| nose           | 7              | Center face         | Often 1-2 pixels at small res            |
| mouth          | 7              | Lower face          | Expression variants                      |
| facial-hair    | 9              | Over mouth/chin     | Beard, mustache, goatee                  |
| hair-front     | 10             | Top/front of head   | Bangs, fringe — covers forehead          |
| head-accessory | 11             | Varies              | Hat, helmet, crown, glasses, earrings    |

### Body Slots

| Slot           | Layer Order | Anchor          | Notes                                |
| -------------- | ----------- | --------------- | ------------------------------------ |
| back-accessory | 2           | Center back     | Cape, backpack, wings, quiver        |
| torso          | 5           | Upper body      | Shirt, armor, jacket — main clothing |
| arms           | 5           | Shoulder joints | Left/right, follow torso style       |
| hands          | 5           | Wrist           | Gloves, bare, gauntlets              |
| belt           | 6           | Waist           | Belt, sash, utility belt             |

### Lower Body Slots

| Slot | Layer Order | Anchor    | Notes                             |
| ---- | ----------- | --------- | --------------------------------- |
| legs | 4           | Hip joint | Pants, skirt, shorts, robe bottom |
| feet | 4           | Ankle     | Shoes, boots, sandals, bare       |

### Held Items

| Slot        | Layer Order | Anchor     | Notes                          |
| ----------- | ----------- | ---------- | ------------------------------ |
| weapon-main | 12          | Right hand | Sword, staff, bow, gun         |
| weapon-off  | 12          | Left hand  | Shield, off-hand dagger, torch |

## Color Mapping

### Semantic Color Groups

Each part defines which pixels belong to which color group via a `colorRegions` map in `part.json`:

```json
{
  "colorRegions": {
    "skin.primary": [
      [5, 8],
      [6, 8],
      [7, 8]
    ],
    "skin.shadow": [
      [5, 9],
      [6, 9]
    ],
    "skin.highlight": [[6, 7]],
    "outfit-primary.primary": [
      [4, 12],
      [5, 12],
      [6, 12],
      [7, 12]
    ],
    "outfit-primary.shadow": [
      [4, 13],
      [5, 13],
      [6, 13],
      [7, 13]
    ]
  }
}
```

### Auto-Shading Rules

Given a `primary` color, generate shadow and highlight:

```
shadow    = HSL(H, S, L - 15%)    // darken
highlight = HSL(H, S - 5%, L + 10%) // lighten + slightly desaturate
```

For pixel art, use 3 tones maximum per color region. Never use gradients.

### Skin Presets

| Name         | Primary | Shadow  | Highlight |
| ------------ | ------- | ------- | --------- |
| pale         | #FFF0E0 | #E8D0B8 | #FFF8F0   |
| light        | #FFE0C0 | #D4B898 | #FFF0D8   |
| medium-light | #FFD5A0 | #D4A574 | #FFE8C8   |
| medium       | #C8A070 | #A07850 | #D8B888   |
| medium-dark  | #A07848 | #805830 | #B89060   |
| dark         | #704828 | #583818 | #886038   |
| very-dark    | #503018 | #382010 | #684028   |
| green        | #7BA05A | #5A7840 | #90B870   |
| blue         | #5A7AA0 | #405878 | #70A0B8   |
| red          | #A05A5A | #784040 | #B87070   |

## 8-Direction View System

```
         N (back)
    NW              NE
  (back-left)  (back-right)

W (left)          E (right)

  (front-left) (front-right)
    SW              SE
         S (front)
```

### Drawing Order for 8 Directions

**Minimum effort (draw 3, derive 5):**

1. Draw `front` (S) — primary view
2. Draw `back` (N) — reverse
3. Draw `left` (W) — side view
4. Mirror `left` → `right` (E) — horizontal flip
5. Interpolate `front` + `left` → `front-left` (SW)
6. Mirror `front-left` → `front-right` (SE)
7. Interpolate `back` + `left` → `back-left` (NW)
8. Mirror `back-left` → `back-right` (NE)

**Mirroring caveat:** Asymmetric features (scars, eye patches, weapon hand) need manual correction after mirror.

### View-Specific Part Visibility

| Part                     | Front   | Front-Diag  | Side            | Back-Diag   | Back        |
| ------------------------ | ------- | ----------- | --------------- | ----------- | ----------- |
| Face (eyes, nose, mouth) | Full    | Partial     | Profile/hidden  | Hidden      | Hidden      |
| Hair-front               | Full    | Partial     | Side profile    | Hidden      | Hidden      |
| Hair-back                | Hidden  | Partial     | Partial         | Full        | Full        |
| Ears                     | Hidden  | One visible | One visible     | One visible | Both/hidden |
| Weapon-main (right hand) | Visible | Visible     | Depends on side | Partial     | Behind body |
| Back-accessory           | Hidden  | Partial     | Side edge       | Full        | Full        |

## Part File Format

### part.json

```json
{
  "id": "spiky",
  "slot": "hair-front",
  "displayName": "Spiky Hair",
  "tags": ["short", "spiky", "anime"],
  "colorable": true,
  "colorRegions": {
    "hair.primary": [[coords...]],
    "hair.shadow": [[coords...]],
    "hair.highlight": [[coords...]]
  },
  "compatibleBodies": ["all"],
  "compatibleResolutions": ["small", "medium", "large"],
  "anchor": { "x": 0, "y": -4 },
  "views": {
    "front": "front.png",
    "front-left": "front-left.png",
    "left": "left.png",
    "back-left": "back-left.png",
    "back": "back.png",
    "back-right": "back-right.png",
    "right": "right.png",
    "front-right": "front-right.png"
  }
}
```

### Template Pixel Conventions

Parts are drawn with **placeholder colors** that get remapped at render time:

| Placeholder       | Meaning                |
| ----------------- | ---------------------- |
| #FF0000 (red)     | primary color region   |
| #00FF00 (green)   | shadow color region    |
| #0000FF (blue)    | highlight color region |
| #FF00FF (magenta) | secondary color region |
| #FFFF00 (yellow)  | secondary shadow       |
| #00FFFF (cyan)    | secondary highlight    |

The render pipeline replaces these with the character's actual colors.
