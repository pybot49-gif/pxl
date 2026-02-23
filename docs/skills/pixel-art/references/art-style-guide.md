# Art Style & Expressive Pixel Art Guide

## Fundamentals

### The Pixel Art Mindset

Every pixel is a deliberate decision. At low resolutions, a single pixel can be an eye, a nostril, or the difference between a smile and a frown. There is no "close enough" — each pixel either contributes or detracts.

### Resolution and Detail Budget

| Resolution | Detail Level | Facial Expression | Body Language |
|-----------|-------------|-------------------|---------------|
| 8×12 | Minimal | 2 dots for eyes, 0-1px mouth | Silhouette only |
| 16×24 | Low | 2-4px eyes, 1-2px mouth, no nose | Simple arm/leg poses |
| 32×48 | Medium | Distinct eyes/brows/mouth/nose | Full pose range |
| 64×96 | High | Detailed expression, teeth possible | Subtle gestures |

**Rule of thumb:** If you can't clearly tell what a pixel represents, it shouldn't be there.

## Color Theory for Pixel Art

### Palette Size

- **4 colors:** GameBoy style. Forces extreme clarity of form.
- **8-16 colors:** Sweet spot for most game sprites. Enough for skin + 2 outfits + environment.
- **32 colors:** Rich. Good for detailed scenes.
- **64+ colors:** Diminishing returns. Usually means you're not thinking in pixel art terms.

### Hue Shifting

The most important pixel art color technique. Shadows are NOT just darker versions of the base color — they shift hue:

```
Skin example:
  Highlight: warm yellow  #FFE8C8  (H: 30°, shift toward yellow)
  Base:      peach        #FFD5A0  (H: 28°)
  Shadow:    warm brown   #D4A574  (H: 25°, shift toward red/orange)
  Deep shadow: cool brown #8B6040  (H: 22°, shift further toward red)

Green foliage:
  Highlight: yellow-green #A8D848  (shift toward yellow in light)
  Base:      green        #68A830  
  Shadow:    blue-green   #3A7828  (shift toward blue in shadow)
  Deep shadow: dark teal  #205020  (even more blue)
```

**General rule:**
- Highlights shift toward **warm** (yellow/orange)
- Shadows shift toward **cool** (blue/purple)
- This mimics how natural light works and makes colors feel alive

### Saturation in Shadows

Shadows are often **less saturated** than midtones, but not always:
- Skin shadows: slightly less saturated
- Fabric shadows: can maintain or increase saturation
- Metal shadows: much less saturated (toward grey)
- Magic/gems: shadows can be MORE saturated

### Ramp Construction

A color ramp is a sequence of colors from dark to light for one material:

```
3-color ramp (minimum for readable pixel art):
  Shadow → Base → Highlight

4-color ramp (comfortable):
  Deep Shadow → Shadow → Base → Highlight

5-color ramp (detailed):
  Deep Shadow → Shadow → Base → Highlight → Bright Highlight
```

**Building a ramp:**
1. Start with the base/midtone color
2. For shadow: decrease lightness 15-20%, shift hue 5-10° toward cool, decrease saturation 5-10%
3. For highlight: increase lightness 10-15%, shift hue 5-10° toward warm, decrease saturation 5%
4. For deep shadow: repeat shadow shift from shadow color
5. Check: do the colors read as the same material at different lighting?

### Palette Harmony

Choose palette colors that share underlying harmony:

- **Analogous:** Colors within 30-60° hue range. Cohesive, calm.
- **Complementary accent:** One accent color opposite on wheel. Creates focal point.
- **Triadic:** Three colors 120° apart. Vibrant, balanced.

For game sprites, a practical approach:
1. Pick 2-3 base hues for the character's outfit
2. Add skin tone ramp (3 colors)
3. Add outline color (usually dark desaturated version of dominant hue, NOT pure black)
4. Add hair ramp (3 colors)
5. Total: 12-16 colors covers a full character

## Outlines

### Outline Styles

**Full black outline:**
- Every sprite edge has #000000 or near-black outline
- Highest contrast, most readable at tiny sizes
- Classic retro feel (NES, GBA era)
- Best for: 16×24 and smaller, high-contrast art styles

**Colored outline (sel-out / selective outlining):**
- Outline color matches nearby fill but darker
- Skin outline = dark warm brown, not black
- Hair outline = dark version of hair color
- Softer, more modern feel
- Best for: 32×48 and larger, painterly styles

**Selective outline:**
- Black outline on outside/bottom edges (ground contact, shadow side)
- Colored or no outline on inside edges and light-facing edges
- Most sophisticated look
- Best for: medium to large sprites, detailed styles

**No outline:**
- Sprites defined purely by color contrast
- Requires strong palette with high contrast between adjacent materials
- Ethereal, soft feel
- Hardest to execute well

### Outline Consistency Rules

1. Pick ONE outline style for the entire project. Mixing looks amateurish.
2. Outline is always 1 pixel wide. Never 2px (wastes precious space at low res).
3. Bottom/ground-contact edges are darker than top/light-facing edges.
4. Inside corners of outlines: use a slightly lighter "corner pixel" to avoid chunky joints.

## Shading

### Light Source

**Pick one. Stick with it.** Standard convention is **top-left** (light comes from upper-left).

This means:
- Top surfaces: highlight
- Left surfaces: highlight to base
- Right surfaces: base to shadow
- Bottom surfaces: shadow
- Under overhangs: deep shadow

### Dithering

Dithering creates the illusion of more colors by alternating pixels in patterns:

```
Checkerboard (50% mix):
█ ░ █ ░
░ █ ░ █
█ ░ █ ░

Sparse dither (75/25% mix):
█ █ █ ░
█ █ ░ █
█ ░ █ █
░ █ █ █
```

**When to dither:**
- Gradients on large surfaces (sky, water, ground)
- Smooth material transitions
- When your palette is very limited

**When NOT to dither:**
- Small sprites (16×16 or less) — dithering at this size just looks noisy
- Character sprites — keep clean, readable shapes
- UI elements — clarity over texture

### Anti-Aliasing (Manual)

Pixel art AA is done manually by placing intermediate-color pixels at jagged edges:

```
Without AA:          With AA:
  ██                   ░██
 ██                   ░██
██                    ██

░ = intermediate color (50% between background and line color)
```

**Rules:**
- Only AA curves and diagonals that aren't 2:1 or 1:1 stepping
- Never AA at sprite edges (outline should be crisp)
- Don't AA against transparent backgrounds — looks like dirty edges
- At 16×16 or smaller, skip AA entirely

## Expressive Characters

### Eyes — The Most Important Feature

At every resolution, eyes communicate the most emotion. Prioritize eye detail.

**8×12 / 16×24 (tiny):**
```
Happy:    Neutral:   Sad:       Angry:     Surprised:
 ▪ ▪       ● ●       ● ●       ▬ ▬        ◎ ◎
           
 (dots)   (dots)    (dots)    (half-px)   (larger)
  ‿         —         ‿         ▬          ○
(1px smile)(1px line)(1px frown)(1px angry)(1px open)
```

At tiny sizes:
- Happy = eyes are dots/small + curved mouth line below
- Sad = eyes at same position + curved mouth above
- Angry = eyes become horizontal lines (half-closed) + flat/frown mouth
- Surprised = eyes become larger (2px instead of 1px) + round mouth

**32×48 (medium):**
- Eyes: 3-4px wide, 2-3px tall
- Pupil: 1-2px, positioned within eye white
- Pupil position = gaze direction (crucial for expression)
- Eyebrow: 3-5px wide line above eye
- Eyebrow angle communicates most emotion

**Eyebrow expressions at 32×48:**
```
Neutral:    ——  ——     (flat, level)
Happy:      ——  ——     (slightly raised, relaxed)
Angry:     ╲    ╱      (angled inward/down — the universal anger sign)
Sad:       ╱    ╲      (angled outward/up)
Surprised:  ⌒  ⌒      (raised high, curved)
Skeptical: ——  ╱       (one raised, one flat)
Worried:   ╱╱  ╲╲     (angled up + wavy)
```

### Mouth Expressions

**At 16×24 (1-2px mouth):**
```
Happy:     ‿  (single curved pixel below center)
Neutral:   —  (single flat pixel)
Sad:       ‿  (curved pixel, reversed — pixel above center)
Angry:     ▬  (flat + slightly wider, or angled)
Shouting:  □  (2px open square)
Smirk:     —‿ (flat left + curve right)
```

**At 32×48 (3-5px mouth):**
- Open mouth: dark interior (2-3px) + teeth line (1px white/light) on top or bottom
- Smile: curved line, 3-4px wide, thicker at center
- Frown: inverse curve
- Shouting: tall opening (3-4px high), teeth visible
- Gritting teeth: horizontal lines alternating white/dark

### Body Language

Even at low resolutions, body posture communicates emotion:

**Confident/Happy:**
- Chest out (torso shifted 1px forward)
- Shoulders level or slightly raised
- Head up (0-1px higher)
- Arms slightly away from body

**Sad/Defeated:**
- Shoulders hunched (1px inward)
- Head down (1px lower)
- Slight forward lean
- Arms close to body, hanging

**Angry/Aggressive:**
- Wide stance (legs 1-2px further apart)
- Leaning forward (1px)
- Fists clenched (hands as solid blocks)
- Head slightly lowered (looking from under brows)

**Scared/Nervous:**
- Pulling back (1px away from threat direction)
- Arms close/crossed
- Knees slightly bent (smaller silhouette)
- Head turned slightly away

### Squash and Stretch

The most powerful animation principle, even in pixel art:

**Squash** (compression — landing, anticipation, impact):
- Sprite wider by 1-2px
- Sprite shorter by 1-2px
- Communicates weight and force

**Stretch** (extension — jumping, reaching, fast movement):
- Sprite narrower by 1-2px
- Sprite taller by 1-2px
- Communicates speed and energy

At pixel art resolutions, squash/stretch of even 1 pixel is noticeable and effective.

### Secondary Motion (Follow-Through)

Things that trail behind primary movement:

| Element | Delay | Amplitude | Decay |
|---------|-------|-----------|-------|
| Hair (short) | 1 frame | 1-2px | Quick (2 frames) |
| Hair (long) | 1-2 frames | 2-4px | Slow (3-4 frames) |
| Cape/cloak | 2 frames | 3-5px | Slow, wave motion |
| Earrings | 1 frame | 1px | Quick |
| Scarf | 1-2 frames | 2-3px | Medium |
| Weapon (held) | 0 frames | Follows hand exactly | N/A |
| Armor plates | 1 frame | 1px | Quick |

**Implementation:** On movement frame N, secondary element shows position from frame N-1 (or N-2 for heavier items).

## Material Rendering

### Skin

- 3-tone ramp: shadow, base, highlight
- Warm hues (peach/brown family)
- Highlight on forehead, nose tip, cheekbone
- Shadow under chin, around eyes, neck

### Metal (Armor, Sword)

- High contrast ramp (more than skin)
- Very bright highlight (near-white specular)
- Very dark shadow
- Low saturation in shadows (toward grey)
- Specular highlight: 1-2 bright pixels at light angle

### Fabric (Cloth, Leather)

- Medium contrast ramp
- Folds create shadow lines (1px dark lines on surface)
- Leather: warmer shadows, subtle shine (1px highlight on edges)
- Cloth: softer shadows, matte (no bright specular)

### Hair

- 3-4 tone ramp
- Individual strand details at 32×48+ (single dark pixel lines for strand separation)
- Highlight follows hair flow direction (usually top of head)
- At small sizes: treat as solid shape with simple shading

### Wood

- Warm brown ramp
- Grain lines: slightly darker parallel lines (1px)
- Knots: small dark circles
- End grain (cut surface): concentric patterns

### Stone/Rock

- Cool grey ramp with slight hue variation
- Irregular surface: dithering or scattered dark pixels
- Cracks: 1px dark lines, irregular paths
- Moss: 1-2 green pixels in crevices (for aged look)

### Water

- Blue ramp with high saturation
- Animated: shift highlight pattern each frame
- Reflection: 1-2px lighter spots, moving
- Surface: horizontal light bands, moving at different speeds
- Foam/edge: white/near-white pixels at shore

### Glass/Crystal

- High contrast with transparency
- Strong specular (bright white spots)
- See-through: use 50% alpha for glass area
- Edge highlight stronger than surface
- Colored light: tint surrounding pixels

## Common Mistakes

### "Pillow Shading"
❌ Shading from edges inward (dark border → light center), ignoring light direction.
✅ Always shade according to a consistent light source direction.

### "Banding"
❌ Lines of same-width color running parallel to edges. Looks like contour map.
✅ Break up bands with single-pixel irregularities. Vary shadow edge shapes.

### "Too Many Colors"
❌ Using 50+ colors because you can. Every material has its own unrelated palette.
✅ Build a unified palette. Reuse colors across materials where possible. Shared colors = visual cohesion.

### "Noise"
❌ Random pixels scattered for "texture." Reads as static/dirt, not detail.
✅ Every pixel should have intent. Texture comes from deliberate dithering patterns or meaningful details.

### "Jaggies"
❌ Unintended staircase patterns on curves and diagonals.
✅ Follow consistent stepping patterns. For curves: gradually change step length (1,1,2,3,3,2,1,1 not 1,2,1,2,1,2).

### "Black Outline Overuse"
❌ Thick black lines everywhere, eating up interior detail space.
✅ 1px max. Consider colored outlines for softer look. Skip inner outlines where contrast is sufficient.

### "Symmetry Addiction"
❌ Everything perfectly mirrored. Characters look stiff and robotic.
✅ Slight asymmetry is natural. Off-center hair part, one arm slightly different from other, weight shifted to one leg.

## Style Presets

### NES / 8-bit
- Palette: 4 colors per sprite (hardware limit)
- Outline: black
- Shading: 2-tone (base + shadow)
- Size: 8×8, 16×16, 16×32
- Vibe: Chunky, iconic, maximally readable

### SNES / 16-bit
- Palette: 16 colors per sprite
- Outline: colored (selective)
- Shading: 3-4 tone with dithering
- Size: 16×16, 32×32, 16×24
- Vibe: Rich, detailed, golden era RPG

### GBA
- Palette: 16-256 colors
- Outline: mix (black outer, colored inner)
- Shading: smooth ramps, some AA
- Size: 16×16 to 64×64
- Vibe: Clean, bright, polished

### Modern Indie
- Palette: 16-32 colors (intentionally limited)
- Outline: selective or none
- Shading: hue-shifted ramps, selective dithering
- Size: 16×16 to 48×48
- Vibe: Artistic, expressive, Celeste/Dead Cells style

### Chibi
- Head:body ratio 1:1 or larger
- Exaggerated eyes (30-40% of face)
- Stubby limbs, round shapes
- Simplified hands (mitten or 3-finger)
- Maximum expressiveness via oversized face
- Best for: RPGs, casual games, cute aesthetic
