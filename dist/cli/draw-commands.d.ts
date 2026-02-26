import { Command } from 'commander';

/**
 * Draw pixel command: sets a single pixel to the specified color
 */
declare function createPixelCommand(): Command;
/**
 * Add all draw commands to the parent command
 */
declare function addDrawCommands(program: Command): void;

export { addDrawCommands, createPixelCommand };
