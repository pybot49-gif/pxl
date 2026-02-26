/**
 * Anchor point for attaching character parts
 */
interface AnchorPoint {
    x: number;
    y: number;
    slot: string;
}
/**
 * Character body template with anchor points for part attachment
 */
interface BodyTemplate {
    id: string;
    width: number;
    height: number;
    style: string;
    anchors: {
        head: AnchorPoint[];
        torso: AnchorPoint[];
        legs: AnchorPoint[];
        arms: AnchorPoint[];
        feet: AnchorPoint[];
    };
}
/**
 * Create a body template with predefined anchor points
 * @param id Template identifier
 * @param width Template width in pixels
 * @param height Template height in pixels
 * @param style Template style (chibi, realistic, etc.)
 * @returns BodyTemplate with anchor points
 */
declare function createBodyTemplate(id: string, width: number, height: number, style: string): BodyTemplate;
/**
 * Load a template from JSON data
 * @param templateData JSON template data
 * @returns Parsed BodyTemplate
 */
declare function loadTemplate(templateData: object): BodyTemplate;
/**
 * Validate a body template for correctness
 * @param template Template to validate
 * @throws Error if template is invalid
 */
declare function validateTemplate(template: BodyTemplate): void;

export { type AnchorPoint, type BodyTemplate, createBodyTemplate, loadTemplate, validateTemplate };
