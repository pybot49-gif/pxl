import { Command } from 'commander';

/**
 * Create sprite command: creates a transparent PNG file
 */
declare function createSpriteCommand(): Command;
/**
 * Info sprite command: displays sprite information as JSON
 */
declare function createInfoCommand(): Command;
/**
 * Add all sprite commands to the parent command
 */
declare function addSpriteCommands(program: Command): void;

export { addSpriteCommands, createInfoCommand, createSpriteCommand };
