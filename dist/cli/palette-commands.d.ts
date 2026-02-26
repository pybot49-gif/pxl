import { Command } from 'commander';

/**
 * Create palette command: creates a palette JSON file from hex colors
 */
declare function createPaletteCreateCommand(): Command;
/**
 * Palette preset command: creates a palette from built-in presets
 */
declare function createPalettePresetCommand(): Command;
/**
 * Palette import command: extracts palette from an image
 */
declare function createPaletteImportCommand(): Command;
/**
 * Palette apply command: remaps sprite colors to a palette
 */
declare function createPaletteApplyCommand(): Command;
/**
 * Palette list command: lists available palettes in the project
 */
declare function createPaletteListCommand(): Command;
/**
 * Add all palette commands to the parent command
 */
declare function addPaletteCommands(program: Command): void;

export { addPaletteCommands, createPaletteApplyCommand, createPaletteCreateCommand, createPaletteImportCommand, createPaletteListCommand, createPalettePresetCommand };
