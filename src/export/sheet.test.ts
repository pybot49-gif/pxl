import { describe, expect, it } from 'vitest';
import { packSheet, generateTiledMetadata, type Frame } from './sheet.js';
import { createCanvas } from '../core/canvas.js';
import { setPixel } from '../core/draw.js';

describe('packSheet', () => {
  // Helper function to create a test frame with colored pixels
  function createTestFrame(width: number, height: number, r: number, g: number, b: number, name?: string): Frame {
    const canvas = createCanvas(width, height);
    
    // Fill with the specified color
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        setPixel(canvas.buffer, width, x, y, r, g, b, 255);
      }
    }
    
    return {
      buffer: canvas.buffer,
      width,
      height,
      name,
    };
  }

  it('packs 4 frames (16x16) into 2x2 grid layout', () => {
    const frames: Frame[] = [
      createTestFrame(16, 16, 255, 0, 0, 'frame1'), // Red
      createTestFrame(16, 16, 0, 255, 0, 'frame2'), // Green
      createTestFrame(16, 16, 0, 0, 255, 'frame3'), // Blue
      createTestFrame(16, 16, 255, 255, 0, 'frame4'), // Yellow
    ];

    const result = packSheet(frames, 'grid');

    // Should result in 32x32 sheet (2x2 grid)
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(result.metadata.frames).toHaveLength(4);
    expect(result.metadata.tileWidth).toBe(16);
    expect(result.metadata.tileHeight).toBe(16);

    // Check frame positions
    expect(result.metadata.frames[0]).toEqual({ name: 'frame1', x: 0, y: 0, w: 16, h: 16 });
    expect(result.metadata.frames[1]).toEqual({ name: 'frame2', x: 16, y: 0, w: 16, h: 16 });
    expect(result.metadata.frames[2]).toEqual({ name: 'frame3', x: 0, y: 16, w: 16, h: 16 });
    expect(result.metadata.frames[3]).toEqual({ name: 'frame4', x: 16, y: 16, w: 16, h: 16 });
  });

  it('packs 3 frames into horizontal strip with 2px padding', () => {
    const frames: Frame[] = [
      createTestFrame(16, 16, 255, 0, 0, 'red'),
      createTestFrame(16, 16, 0, 255, 0, 'green'),
      createTestFrame(16, 16, 0, 0, 255, 'blue'),
    ];

    const result = packSheet(frames, 'strip-horizontal', 2);

    // Should result in 52x16 (16+2+16+2+16 = 52 width, 16 height)
    expect(result.width).toBe(52);
    expect(result.height).toBe(16);
    expect(result.metadata.frames).toHaveLength(3);
    expect(result.metadata.tileWidth).toBe(16);
    expect(result.metadata.tileHeight).toBe(16);

    // Check frame positions with padding
    expect(result.metadata.frames[0]).toEqual({ name: 'red', x: 0, y: 0, w: 16, h: 16 });
    expect(result.metadata.frames[1]).toEqual({ name: 'green', x: 18, y: 0, w: 16, h: 16 });
    expect(result.metadata.frames[2]).toEqual({ name: 'blue', x: 36, y: 0, w: 16, h: 16 });
  });

  it('packs frames into vertical strip layout', () => {
    const frames: Frame[] = [
      createTestFrame(16, 16, 255, 0, 0, 'red'),
      createTestFrame(16, 16, 0, 255, 0, 'green'),
    ];

    const result = packSheet(frames, 'strip-vertical', 1);

    // Should result in 16x33 (16 width, 16+1+16 = 33 height)
    expect(result.width).toBe(16);
    expect(result.height).toBe(33);
    expect(result.metadata.frames).toHaveLength(2);

    // Check frame positions
    expect(result.metadata.frames[0]).toEqual({ name: 'red', x: 0, y: 0, w: 16, h: 16 });
    expect(result.metadata.frames[1]).toEqual({ name: 'green', x: 0, y: 17, w: 16, h: 16 });
  });

  it('handles empty frames array', () => {
    const result = packSheet([], 'grid');

    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.buffer).toHaveLength(0);
    expect(result.metadata.frames).toHaveLength(0);
    expect(result.metadata.tileWidth).toBe(0);
    expect(result.metadata.tileHeight).toBe(0);
  });

  it('handles single frame for all layouts', () => {
    const frame = createTestFrame(16, 16, 255, 0, 0, 'single');

    const gridResult = packSheet([frame], 'grid');
    expect(gridResult.width).toBe(16);
    expect(gridResult.height).toBe(16);

    const hStripResult = packSheet([frame], 'strip-horizontal');
    expect(hStripResult.width).toBe(16);
    expect(hStripResult.height).toBe(16);

    const vStripResult = packSheet([frame], 'strip-vertical');
    expect(vStripResult.width).toBe(16);
    expect(vStripResult.height).toBe(16);

    // All should have the same frame position
    [gridResult, hStripResult, vStripResult].forEach(result => {
      expect(result.metadata.frames[0]).toEqual({ name: 'single', x: 0, y: 0, w: 16, h: 16 });
    });
  });

  it('handles frames with different sizes', () => {
    const frames: Frame[] = [
      createTestFrame(16, 16, 255, 0, 0),
      createTestFrame(20, 24, 0, 255, 0),
      createTestFrame(8, 12, 0, 0, 255),
    ];

    const result = packSheet(frames, 'grid');

    // Grid should accommodate largest frame (20x24)
    expect(result.width).toBe(40); // 2 cols * 20 (max width)
    expect(result.height).toBe(48); // 2 rows * 24 (max height)
    expect(result.metadata.tileWidth).toBe(20);
    expect(result.metadata.tileHeight).toBe(24);
  });

  it('handles frames without names', () => {
    const frames: Frame[] = [
      createTestFrame(16, 16, 255, 0, 0), // No name
      createTestFrame(16, 16, 0, 255, 0, 'named'), // Has name
    ];

    const result = packSheet(frames, 'strip-horizontal');

    expect(result.metadata.frames[0].name).toBe('frame_0');
    expect(result.metadata.frames[1].name).toBe('named');
  });
});

describe('generateTiledMetadata', () => {
  it('produces correct Tiled-compatible JSON structure', () => {
    const sheetMetadata = {
      frames: [
        { name: 'frame1', x: 0, y: 0, w: 16, h: 16 },
        { name: 'frame2', x: 16, y: 0, w: 16, h: 16 },
      ],
      tileWidth: 16,
      tileHeight: 16,
    };

    const result = generateTiledMetadata(sheetMetadata, 'character.png', 32, 16);

    expect(result).toEqual({
      image: 'character.png',
      imageWidth: 32,
      imageHeight: 16,
      frames: [
        { name: 'frame1', x: 0, y: 0, w: 16, h: 16 },
        { name: 'frame2', x: 16, y: 0, w: 16, h: 16 },
      ],
      tileWidth: 16,
      tileHeight: 16,
    });
  });

  it('preserves all frame data in Tiled format', () => {
    const sheetMetadata = {
      frames: [
        { name: 'walk_01', x: 0, y: 0, w: 24, h: 32 },
        { name: 'walk_02', x: 24, y: 0, w: 24, h: 32 },
        { name: 'walk_03', x: 0, y: 32, w: 24, h: 32 },
      ],
      tileWidth: 24,
      tileHeight: 32,
    };

    const result = generateTiledMetadata(sheetMetadata, 'animation.png', 48, 64);

    expect(result.image).toBe('animation.png');
    expect(result.imageWidth).toBe(48);
    expect(result.imageHeight).toBe(64);
    expect(result.frames).toHaveLength(3);
    expect(result.frames[2]).toEqual({ name: 'walk_03', x: 0, y: 32, w: 24, h: 32 });
  });
});