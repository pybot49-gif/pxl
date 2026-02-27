import { Command } from 'commander';

/**
 * Create project init command: scaffolds a new PXL project
 */
declare function createInitCommand(): Command;
/**
 * Create project status command: displays project overview
 */
declare function createStatusCommand(): Command;
/**
 * Add project commands to the parent command
 */
declare function addProjectCommands(program: Command): void;

export { addProjectCommands, createInitCommand, createStatusCommand };
