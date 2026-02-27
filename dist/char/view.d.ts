/**
 * View directions for character rendering
 */
type ViewDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';
/**
 * All available view directions
 */
declare const ALL_VIEW_DIRECTIONS: ViewDirection[];
/**
 * Check if a string is a valid ViewDirection
 */
declare function isValidViewDirection(direction: string): direction is ViewDirection;
/**
 * Parse a comma-separated string of view directions
 */
declare function parseViewDirections(viewsString: string): ViewDirection[];

export { ALL_VIEW_DIRECTIONS, type ViewDirection, isValidViewDirection, parseViewDirections };
