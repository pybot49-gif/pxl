import { Command } from 'commander';

/**
 * Create character command
 */
declare function createCharCreateCommand(): Command;
/**
 * List characters command
 */
declare function createCharListCommand(): Command;
/**
 * Show character command
 */
declare function createCharShowCommand(): Command;
/**
 * Equip part command
 */
declare function createCharEquipCommand(): Command;
/**
 * Set character colors command
 */
declare function createCharColorCommand(): Command;
/**
 * Render character command
 */
declare function createCharRenderCommand(): Command;
/**
 * Remove character command
 */
declare function createCharRemoveCommand(): Command;
/**
 * Export character command
 */
declare function createCharExportCommand(): Command;
/**
 * Add all character commands to the parent command
 */
declare function addCharCommands(program: Command): void;

export { addCharCommands, createCharColorCommand, createCharCreateCommand, createCharEquipCommand, createCharExportCommand, createCharListCommand, createCharRemoveCommand, createCharRenderCommand, createCharShowCommand };
