/**
 * Anchor point for attaching character parts
 */
export interface AnchorPoint {
  x: number;
  y: number;
  slot: string;
}

/**
 * Character body template with anchor points for part attachment
 */
export interface BodyTemplate {
  id: string;
  width: number;
  height: number;
  style: string;
  anchors: {
    head: AnchorPoint[];
    torso: AnchorPoint[];
    legs: AnchorPoint[];
    arms: AnchorPoint[];
    feet: AnchorPoint[];
  };
}

/**
 * Create a body template with predefined anchor points
 * @param id Template identifier
 * @param width Template width in pixels  
 * @param height Template height in pixels
 * @param style Template style (chibi, realistic, etc.)
 * @returns BodyTemplate with anchor points
 */
export function createBodyTemplate(id: string, width: number, height: number, style: string): BodyTemplate {
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid template dimensions: width and height must be positive');
  }

  // Calculate proportional anchor points based on template dimensions
  // For a chibi 32x48 template, these are the relative positions
  const headCenterX = Math.floor(width / 2);
  const headCenterY = Math.floor(height / 4);
  const torsoCenterX = Math.floor(width / 2);
  const torsoCenterY = Math.floor(height / 2);
  const legsCenterX = Math.floor(width / 2);
  const legsCenterY = Math.floor(height * 3 / 4);

  return {
    id,
    width,
    height,
    style,
    anchors: {
      head: [
        { x: headCenterX - 6, y: headCenterY - 4, slot: 'hair-back' },
        { x: headCenterX - 4, y: headCenterY, slot: 'eyes' },
        { x: headCenterX + 4, y: headCenterY, slot: 'eyes' },
        { x: headCenterX, y: headCenterY + 2, slot: 'nose' },
        { x: headCenterX, y: headCenterY + 4, slot: 'mouth' },
        { x: headCenterX - 8, y: headCenterY, slot: 'ears' },
        { x: headCenterX + 8, y: headCenterY, slot: 'ears' },
        { x: headCenterX - 6, y: headCenterY - 2, slot: 'hair-front' },
      ],
      torso: [
        { x: torsoCenterX, y: torsoCenterY, slot: 'torso' },
      ],
      legs: [
        { x: legsCenterX, y: legsCenterY, slot: 'legs' },
      ],
      arms: [
        { x: torsoCenterX - 10, y: torsoCenterY, slot: 'arms-left' },
        { x: torsoCenterX + 10, y: torsoCenterY, slot: 'arms-right' },
      ],
      feet: [
        { x: legsCenterX - 4, y: height - 4, slot: 'feet-left' },
        { x: legsCenterX + 4, y: height - 4, slot: 'feet-right' },
      ],
    },
  };
}

/**
 * Load a template from JSON data
 * @param templateData JSON template data
 * @returns Parsed BodyTemplate
 */
export function loadTemplate(templateData: object): BodyTemplate {
  // Type guard to ensure the object has required properties
  if (!isBodyTemplate(templateData)) {
    throw new Error('Invalid template data structure');
  }
  
  validateTemplate(templateData);
  return templateData;
}

/**
 * Type guard to check if an object is a valid BodyTemplate
 */
function isBodyTemplate(obj: unknown): obj is BodyTemplate {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const template = obj as Partial<BodyTemplate>;
  
  return (
    typeof template.id === 'string' &&
    typeof template.width === 'number' &&
    typeof template.height === 'number' &&
    typeof template.style === 'string' &&
    template.anchors !== undefined &&
    typeof template.anchors === 'object' &&
    Array.isArray(template.anchors.head) &&
    Array.isArray(template.anchors.torso) &&
    Array.isArray(template.anchors.legs) &&
    Array.isArray(template.anchors.arms) &&
    Array.isArray(template.anchors.feet)
  );
}

/**
 * Validate a body template for correctness
 * @param template Template to validate
 * @throws Error if template is invalid
 */
export function validateTemplate(template: BodyTemplate): void {
  // Check dimensions
  if (template.width <= 0 || template.height <= 0) {
    throw new Error('Invalid template dimensions: width and height must be positive');
  }

  // Check all anchor points are within bounds
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet,
  ];

  for (const anchor of allAnchors) {
    if (anchor.x < 0 || anchor.x >= template.width || anchor.y < 0 || anchor.y >= template.height) {
      throw new Error(`Anchor point outside canvas bounds: (${anchor.x}, ${anchor.y}) for ${template.width}x${template.height} template`);
    }
  }

  // Check for required slots
  const requiredSlots = [
    'hair-back', 'hair-front', 'eyes', 'nose', 'mouth', 'ears',
    'torso', 'arms-left', 'arms-right', 'legs', 'feet-left', 'feet-right'
  ];

  const availableSlots = new Set(allAnchors.map(anchor => anchor.slot));

  for (const slot of requiredSlots) {
    if (!availableSlots.has(slot)) {
      throw new Error(`Missing required slot: ${slot}`);
    }
  }
}