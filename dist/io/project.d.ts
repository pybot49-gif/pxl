/**
 * Project configuration schema based on OVERVIEW.md
 */
interface ProjectConfig {
    name: string;
    version: string;
    description?: string;
    resolution: {
        default: string;
        tiers: {
            micro: [number, number];
            small: [number, number];
            medium: [number, number];
            large: [number, number];
        };
    };
    palette: string;
    defaultTemplate: string;
    iso: {
        enabled: boolean;
        tileSize: [number, number];
    };
    export?: {
        sheetPadding?: number;
        sheetLayout?: string;
        metadataFormat?: string;
        targets?: string[];
    };
    docs?: {
        'style-guide'?: string;
        characters?: string;
        assets?: string;
    };
}
/**
 * Read project configuration from pxl.json in the given directory
 * @param projectDir Project directory path
 * @returns Project configuration
 * @throws Error if pxl.json is not found or invalid
 */
declare function readProject(projectDir: string): ProjectConfig;
/**
 * Write project configuration to pxl.json in the given directory
 * @param projectDir Project directory path (will be created if it doesn't exist)
 * @param config Project configuration to write
 * @throws Error if write fails
 */
declare function writeProject(projectDir: string, config: ProjectConfig): void;
/**
 * Create default project configuration
 * @param name Project name
 * @param iso Whether to enable isometric support
 * @returns Default project configuration
 */
declare function createDefaultProjectConfig(name: string, iso?: boolean): ProjectConfig;

export { type ProjectConfig, createDefaultProjectConfig, readProject, writeProject };
