import { describe, it, expect } from 'vitest';
import { addOutline } from './outline.js';
import { createCanvas } from './canvas.js';
import { getPixel, setPixel } from './draw.js';

describe('addOutline (#25)', () => {
  it('should add outline around a single pixel', () => {
    const canvas = createCanvas(3, 3);
    
    // Set center pixel to red
    setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255);
    
    // Add white outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 255, 255, 255, 255);
    
    // Check that center pixel is still red (original buffer unchanged)
    expect(getPixel(canvas.buffer, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    
    // Check that new buffer has outline pixels
    expect(getPixel(outlined, canvas.width, 0, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // left
    expect(getPixel(outlined, canvas.width, 2, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // right
    expect(getPixel(outlined, canvas.width, 1, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // top
    expect(getPixel(outlined, canvas.width, 1, 2)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // bottom
    
    // Check that center pixel is still red in new buffer
    expect(getPixel(outlined, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    
    // Check corners are still transparent (4-connected, not 8-connected)
    expect(getPixel(outlined, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(outlined, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(outlined, canvas.width, 0, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(getPixel(outlined, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('should add outline around a complex shape', () => {
    const canvas = createCanvas(5, 5);
    
    // Create an L-shaped sprite
    setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255); // red
    setPixel(canvas.buffer, canvas.width, 1, 2, 255, 0, 0, 255); // red
    setPixel(canvas.buffer, canvas.width, 1, 3, 255, 0, 0, 255); // red
    setPixel(canvas.buffer, canvas.width, 2, 3, 255, 0, 0, 255); // red
    setPixel(canvas.buffer, canvas.width, 3, 3, 255, 0, 0, 255); // red
    
    // Add blue outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 0, 0, 255, 255);
    
    // Check some expected outline positions
    expect(getPixel(outlined, canvas.width, 0, 1)).toEqual({ r: 0, g: 0, b: 255, a: 255 }); // left of top of L
    expect(getPixel(outlined, canvas.width, 1, 0)).toEqual({ r: 0, g: 0, b: 255, a: 255 }); // above top of L
    expect(getPixel(outlined, canvas.width, 3, 4)).toEqual({ r: 0, g: 0, b: 255, a: 255 }); // below right end of L
    expect(getPixel(outlined, canvas.width, 4, 3)).toEqual({ r: 0, g: 0, b: 255, a: 255 }); // right of right end of L
    
    // Check that interior pixels remain unchanged
    expect(getPixel(outlined, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(getPixel(outlined, canvas.width, 2, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(getPixel(outlined, canvas.width, 3, 3)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it('should add outline to all transparent neighbors of any non-transparent pixel', () => {
    const canvas = createCanvas(3, 3);
    
    // Create a sprite that already has white outline (center + 4 neighbors)
    setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255); // center red
    setPixel(canvas.buffer, canvas.width, 0, 1, 255, 255, 255, 255); // left white
    setPixel(canvas.buffer, canvas.width, 2, 1, 255, 255, 255, 255); // right white
    setPixel(canvas.buffer, canvas.width, 1, 0, 255, 255, 255, 255); // top white
    setPixel(canvas.buffer, canvas.width, 1, 2, 255, 255, 255, 255); // bottom white
    
    // Add green outline (should outline transparent neighbors of the white outline pixels)
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 0, 255, 0, 255);
    
    // Existing non-transparent pixels should remain unchanged
    expect(getPixel(outlined, canvas.width, 1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 }); // center red
    expect(getPixel(outlined, canvas.width, 0, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // left white
    expect(getPixel(outlined, canvas.width, 2, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // right white
    expect(getPixel(outlined, canvas.width, 1, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // top white
    expect(getPixel(outlined, canvas.width, 1, 2)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // bottom white
    
    // Corners should now have green outline (neighbors of white outline pixels)
    expect(getPixel(outlined, canvas.width, 0, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 }); // top-left
    expect(getPixel(outlined, canvas.width, 2, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 }); // top-right
    expect(getPixel(outlined, canvas.width, 0, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 }); // bottom-left
    expect(getPixel(outlined, canvas.width, 2, 2)).toEqual({ r: 0, g: 255, b: 0, a: 255 }); // bottom-right
  });

  it('should handle sprites at canvas edges', () => {
    const canvas = createCanvas(3, 3);
    
    // Place red pixel at edge
    setPixel(canvas.buffer, canvas.width, 0, 1, 255, 0, 0, 255); // left edge
    setPixel(canvas.buffer, canvas.width, 2, 1, 0, 255, 0, 255); // right edge
    
    // Add outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 255, 255, 255, 255);
    
    // Check that outline appears only where there are transparent neighbors within bounds
    expect(getPixel(outlined, canvas.width, 1, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // between the two pixels
    expect(getPixel(outlined, canvas.width, 0, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // above left pixel
    expect(getPixel(outlined, canvas.width, 0, 2)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // below left pixel
    expect(getPixel(outlined, canvas.width, 2, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // above right pixel
    expect(getPixel(outlined, canvas.width, 2, 2)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // below right pixel
  });

  it('should return a new buffer without mutating input', () => {
    const canvas = createCanvas(2, 2);
    
    // Set a pixel
    setPixel(canvas.buffer, canvas.width, 0, 0, 255, 0, 0, 255);
    
    // Store original buffer state
    const originalBuffer = new Uint8Array(canvas.buffer);
    
    // Add outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 0, 255, 0, 255);
    
    // Check that original buffer is unchanged
    for (let i = 0; i < originalBuffer.length; i++) {
      expect(canvas.buffer[i]).toBe(originalBuffer[i]);
    }
    
    // Check that outlined buffer is different
    expect(outlined).not.toBe(canvas.buffer);
    expect(outlined.length).toBe(canvas.buffer.length);
  });

  it('should handle transparent sprites gracefully', () => {
    const canvas = createCanvas(2, 2);
    
    // Leave canvas completely transparent
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 255, 0, 0, 255);
    
    // Should return a buffer that's still all transparent (no non-transparent pixels to outline)
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        expect(getPixel(outlined, canvas.width, x, y)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      }
    }
  });

  it('should handle various outline colors', () => {
    const canvas = createCanvas(3, 3);
    
    // Set center pixel
    setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255);
    
    // Add semi-transparent green outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 0, 255, 0, 128);
    
    // Check outline color and alpha
    expect(getPixel(outlined, canvas.width, 0, 1)).toEqual({ r: 0, g: 255, b: 0, a: 128 });
    expect(getPixel(outlined, canvas.width, 2, 1)).toEqual({ r: 0, g: 255, b: 0, a: 128 });
    expect(getPixel(outlined, canvas.width, 1, 0)).toEqual({ r: 0, g: 255, b: 0, a: 128 });
    expect(getPixel(outlined, canvas.width, 1, 2)).toEqual({ r: 0, g: 255, b: 0, a: 128 });
  });

  it('should only outline 4-connected neighbors, not diagonal', () => {
    const canvas = createCanvas(3, 3);
    
    // Set center pixel
    setPixel(canvas.buffer, canvas.width, 1, 1, 255, 0, 0, 255);
    
    // Add outline
    const outlined = addOutline(canvas.buffer, canvas.width, canvas.height, 255, 255, 255, 255);
    
    // Check 4-connected neighbors have outline
    expect(getPixel(outlined, canvas.width, 0, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // left
    expect(getPixel(outlined, canvas.width, 2, 1)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // right  
    expect(getPixel(outlined, canvas.width, 1, 0)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // top
    expect(getPixel(outlined, canvas.width, 1, 2)).toEqual({ r: 255, g: 255, b: 255, a: 255 }); // bottom
    
    // Check diagonal neighbors are still transparent
    expect(getPixel(outlined, canvas.width, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // top-left
    expect(getPixel(outlined, canvas.width, 2, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // top-right
    expect(getPixel(outlined, canvas.width, 0, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // bottom-left
    expect(getPixel(outlined, canvas.width, 2, 2)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // bottom-right
  });
});