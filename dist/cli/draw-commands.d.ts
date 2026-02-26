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
 * Add all draw commands to the parent command
 */
declare function addDrawCommands(program: Command): void;

export { addDrawCommands, createFillCommand, createLineCommand, createPixelCommand, createRectCommand };
