import { Command } from 'commander';

/**
 * Draw pixel command: sets a single pixel to the specified color
 */
declare function createPixelCommand(): Command;
/**
 * Draw line command: draws a line between two points
 */
declare function createLineCommand(): Command;
/**
 * Draw rectangle command: draws a rectangle (filled or outlined)
 */
declare function createRectCommand(): Command;
/**
 * Flood fill command: fills a connected region
 */
declare function createFillCommand(): Command;
/**
 * Draw circle command: draws a circle (filled or outlined)
 */
declare function createCircleCommand(): Command;
/**
 * Replace color command: replaces all instances of a color with another color
 */
declare function createReplaceCommand(): Command;
/**
 * Erase pixel command: sets a pixel to transparent
 */
declare function createEraseCommand(): Command;
/**
 * Outline command: adds outline to sprite
 */
declare function createOutlineCommand(): Command;
/**
 * Add all draw commands to the parent command
 */
declare function addDrawCommands(program: Command): void;

export { addDrawCommands, createCircleCommand, createEraseCommand, createFillCommand, createLineCommand, createOutlineCommand, createPixelCommand, createRectCommand, createReplaceCommand };
