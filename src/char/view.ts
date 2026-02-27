/**
 * View directions for character rendering
 */
export type ViewDirection = 
  | 'front' 
  | 'back' 
  | 'left' 
  | 'right' 
  | 'front-left' 
  | 'front-right' 
  | 'back-left' 
  | 'back-right';

/**
 * All available view directions
 */
export const ALL_VIEW_DIRECTIONS: ViewDirection[] = [
  'front', 
  'back', 
  'left', 
  'right', 
  'front-left', 
  'front-right', 
  'back-left', 
  'back-right'
];

/**
 * Check if a string is a valid ViewDirection
 */
export function isValidViewDirection(direction: string): direction is ViewDirection {
  return ALL_VIEW_DIRECTIONS.includes(direction as ViewDirection);
}

/**
 * Parse a comma-separated string of view directions
 */
export function parseViewDirections(viewsString: string): ViewDirection[] {
  if (viewsString.toLowerCase() === 'all') {
    return [...ALL_VIEW_DIRECTIONS];
  }

  const parts = viewsString.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    throw new Error('No valid view directions found');
  }

  const validDirections: ViewDirection[] = [];

  for (const part of parts) {
    if (isValidViewDirection(part)) {
      validDirections.push(part);
    } else {
      throw new Error(`Invalid view direction: ${part}. Valid directions: ${ALL_VIEW_DIRECTIONS.join(', ')}`);
    }
  }

  return validDirections;
}