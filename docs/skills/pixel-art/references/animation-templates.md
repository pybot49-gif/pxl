# Animation Templates Reference

## Template Format

Each animation template defines per-frame transforms for body parts:

```json
{
  "name": "walk",
  "frames": 6,
  "fps": 8,
  "loop": true,
  "keyframes": [
    {
      "frame": 0,
      "label": "contact-right",
      "parts": {
        "body": { "dy": 0 },
        "arms.right": { "dy": -1 },
        "arms.left": { "dy": 1 },
        "legs.right": { "dx": 2 },
        "legs.left": { "dx": -2 },
        "hair-front": { "dy": 0 }
      }
    },
    {
      "frame": 1,
      "label": "passing-right",
      "parts": {
        "body": { "dy": -1 },
        "arms.right": { "dy": 0 },
        "arms.left": { "dy": 0 },
        "legs.right": { "dx": 1 },
        "legs.left": { "dx": -1 }
      }
    }
  ]
}
```

### Transform Properties

| Property | Type | Description |
|----------|------|-------------|
| dx | int | Horizontal pixel offset |
| dy | int | Vertical pixel offset |
| flipH | bool | Horizontal flip |
| flipV | bool | Vertical flip |
| visible | bool | Show/hide part |
| replace | string | Swap part sprite for this frame (e.g., open mouth) |

## Walk Cycle (6 frames)

Classic walk cycle phases:

```
Frame 0: Contact (right foot forward)
  - Body at baseline
  - Right leg extended forward (+2dx)
  - Left leg extended back (-2dx)
  - Right arm back (-1dy swing)
  - Left arm forward (+1dy swing)

Frame 1: Recoil
  - Body dips (-1dy, absorbing weight)
  - Legs converging
  - Arms at midpoint

Frame 2: Passing (right leg under body)
  - Body at lowest point (-1dy)
  - Both legs under body (0dx)
  - Arms swapping direction

Frame 3: Contact (left foot forward)
  - Mirror of frame 0
  - Left leg forward, right leg back
  - Arms swapped

Frame 4: Recoil (mirror)
  - Mirror of frame 1

Frame 5: Passing (left leg under body)
  - Mirror of frame 2
```

### Walk Cycle by Resolution

**16×24 (small):**
- Leg movement: ±1-2px
- Arm movement: ±1px
- Body bob: 0-1px
- Hair bounce: 0px (too small to notice)

**32×48 (medium):**
- Leg movement: ±2-3px
- Arm movement: ±1-2px
- Body bob: 1px
- Hair bounce: 1px on contact frames

**64×96 (large):**
- Leg movement: ±4-6px
- Arm movement: ±2-3px
- Body bob: 1-2px
- Hair bounce: 1-2px, secondary motion delay

## Idle Animation (2-4 frames)

Subtle, slow breathing motion:

```
Frame 0 (500ms): Baseline
  - Everything at default position

Frame 1 (500ms): Breathe in
  - Body: dy = -1 (slight rise)
  - Arms: dy = -1 (rise with body)
  - Hair: no change

Frame 2 (500ms): Peak (optional, for 4-frame)
  - Hold at top position

Frame 3 (500ms): Breathe out (optional)
  - Return to frame 0
```

**Key:** Idle should be almost imperceptible. 1px movement max. Long frame durations (400-600ms).

## Run Cycle (6-8 frames)

Faster than walk, more exaggerated:

```
- Wider leg spread (±3-4px vs ±2px walk)
- Higher body bob (2px vs 1px)
- Arms swing more (±2-3px)
- Both feet leave ground on passing frames (body rises 2px)
- Hair trails behind (1-2px offset opposite to direction)
- FPS: 10-12 (vs 8 for walk)
```

## Attack — Melee (6 frames)

```
Frame 0 (80ms): Anticipation
  - Body leans back (dx = -1, dy = -1)
  - Weapon arm pulls back (dx = -3)
  - Free arm forward for balance

Frame 1 (60ms): Wind-up
  - Weapon raised high (dy = -4)
  - Body coiling

Frame 2 (40ms): Strike — FAST
  - Weapon swings forward (dx = +4, dy = +2)
  - Body lunges forward (dx = +2)
  - Motion blur optional (trail pixels at 50% alpha)

Frame 3 (40ms): Impact
  - Weapon at full extension (dx = +5)
  - Body fully extended

Frame 4 (100ms): Follow-through
  - Weapon continues past (dx = +3, dy = +2)
  - Body decelerating

Frame 5 (120ms): Recovery
  - Return to idle position
  - Smooth ease-back
```

**Key:** Anticipation is slow, strike is FAST (shortest frame duration). This sells the impact.

## Attack — Ranged (4-6 frames)

```
Frame 0 (120ms): Draw/Aim
  - Arms raise weapon (bow/gun)
  - Body steadies

Frame 1 (100ms): Hold/Aim
  - Slight tension

Frame 2 (40ms): Release
  - Projectile launches
  - Recoil (body leans back 1px)
  - Weapon arm snaps

Frame 3 (60ms): Recoil
  - Body absorbs kickback

Frame 4 (100ms): Recovery
  - Return to idle
```

## Hit Reaction (3 frames)

```
Frame 0 (60ms): Impact
  - Body jerks backward (dx = -2)
  - Head snaps (dy = -1)
  - Flash white overlay (optional — all pixels go white for 1 frame)

Frame 1 (100ms): Stagger
  - Body hunched (dy = +1)
  - Arms limp
  - Lean backward (dx = -1)

Frame 2 (120ms): Recovery
  - Return to idle
  - Slight wobble optional
```

## Death (6 frames)

```
Frame 0 (80ms): Hit
  - Same as hit reaction frame 0

Frame 1 (80ms): Recoil
  - Body bends backward

Frame 2 (100ms): Falling
  - Knees buckle (legs bend)
  - Body rotating

Frame 3 (100ms): Collapse
  - Body nearly horizontal
  - Arms dropping

Frame 4 (120ms): Ground impact
  - Body flat on ground
  - Small bounce (1px up)

Frame 5 (200ms+): Rest
  - Body on ground, still
  - Hold this frame
```

## Jump (4 frames)

```
Frame 0 (80ms): Anticipation / Crouch
  - Body lowers (dy = +2)
  - Legs bend (compressed)

Frame 1 (60ms): Launch
  - Body rising rapidly (dy = -3)
  - Legs extend
  - Arms up

Frame 2 (variable): Airborne
  - Peak height (dy = -6 to -8)
  - Legs tucked slightly
  - Arms out for balance
  - Duration depends on game logic

Frame 3 (80ms): Landing
  - Body compresses on impact (dy = +1)
  - Legs absorb impact
  - Dust effect optional
```

## Applying Templates to 8 Directions

For each direction, adjust the template's dx values:

| Direction | dx multiplier | Notes |
|-----------|--------------|-------|
| front (S) | dx visible | Standard template |
| back (N) | dx visible | Reverse arm/leg front-back |
| left (W) | dx = forward motion | Side view — dx becomes depth |
| right (E) | dx = -forward motion | Mirror of left |
| front-left (SW) | dx × 0.7 | Diagonal — reduce lateral movement |
| front-right (SE) | mirror of SW | |
| back-left (NW) | dx × 0.7 | |
| back-right (NE) | mirror of NW | |

**Diagonal views** show ~70% of the lateral movement and need slight rotation of part offsets.

## Creating Custom Templates

1. Define the number of frames and timing
2. Identify the key poses (contact, extreme, passing)
3. Define part offsets for key poses only
4. Interpolate intermediate frames:
   - Linear interpolation for smooth motion
   - Snap interpolation for pixel-perfect (round to nearest int)
5. Test at target FPS — adjust timing if motion feels wrong
6. Add secondary motion (hair, cape, accessories) AFTER primary motion is right

### Secondary Motion Rules

- **Hair:** Follows head with 1-frame delay, slight overshoot
- **Cape/cloak:** Follows body with 2-frame delay, larger overshoot
- **Weapon:** Follows hand exactly (rigid attachment)
- **Accessories (earrings, pendant):** 1-frame delay, small amplitude
