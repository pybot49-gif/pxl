// src/char/template.ts
function createBodyTemplate(id, width, height, style) {
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid template dimensions: width and height must be positive");
  }
  const headCenterX = Math.floor(width / 2);
  const headCenterY = Math.floor(height * 0.28);
  const torsoCenterX = Math.floor(width / 2);
  const torsoCenterY = Math.floor(height * 0.66);
  const legsCenterX = Math.floor(width / 2);
  const legsCenterY = Math.floor(height * 0.84);
  return {
    id,
    width,
    height,
    style,
    anchors: {
      head: [
        { x: headCenterX - 6, y: headCenterY - 4, slot: "hair-back" },
        { x: headCenterX - 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX + 4, y: headCenterY, slot: "eyes" },
        { x: headCenterX, y: headCenterY + 2, slot: "nose" },
        { x: headCenterX, y: headCenterY + 4, slot: "mouth" },
        { x: headCenterX - 8, y: headCenterY, slot: "ears" },
        { x: headCenterX + 8, y: headCenterY, slot: "ears" },
        { x: headCenterX - 6, y: headCenterY - 2, slot: "hair-front" }
      ],
      torso: [
        { x: torsoCenterX, y: torsoCenterY, slot: "torso" }
      ],
      legs: [
        { x: legsCenterX, y: legsCenterY, slot: "legs" }
      ],
      arms: [
        { x: torsoCenterX - 10, y: torsoCenterY, slot: "arms-left" },
        { x: torsoCenterX + 10, y: torsoCenterY, slot: "arms-right" }
      ],
      feet: [
        { x: legsCenterX - 4, y: height - 4, slot: "feet-left" },
        { x: legsCenterX + 4, y: height - 4, slot: "feet-right" }
      ]
    }
  };
}
function loadTemplate(templateData) {
  if (!isBodyTemplate(templateData)) {
    throw new Error("Invalid template data structure");
  }
  validateTemplate(templateData);
  return templateData;
}
function isBodyTemplate(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const template = obj;
  return typeof template.id === "string" && typeof template.width === "number" && typeof template.height === "number" && typeof template.style === "string" && template.anchors !== void 0 && typeof template.anchors === "object" && Array.isArray(template.anchors.head) && Array.isArray(template.anchors.torso) && Array.isArray(template.anchors.legs) && Array.isArray(template.anchors.arms) && Array.isArray(template.anchors.feet);
}
function validateTemplate(template) {
  if (template.width <= 0 || template.height <= 0) {
    throw new Error("Invalid template dimensions: width and height must be positive");
  }
  const allAnchors = [
    ...template.anchors.head,
    ...template.anchors.torso,
    ...template.anchors.legs,
    ...template.anchors.arms,
    ...template.anchors.feet
  ];
  for (const anchor of allAnchors) {
    if (anchor.x < 0 || anchor.x >= template.width || anchor.y < 0 || anchor.y >= template.height) {
      throw new Error(`Anchor point outside canvas bounds: (${anchor.x}, ${anchor.y}) for ${template.width}x${template.height} template`);
    }
  }
  const requiredSlots = [
    "hair-back",
    "hair-front",
    "eyes",
    "nose",
    "mouth",
    "ears",
    "torso",
    "arms-left",
    "arms-right",
    "legs",
    "feet-left",
    "feet-right"
  ];
  const availableSlots = new Set(allAnchors.map((anchor) => anchor.slot));
  for (const slot of requiredSlots) {
    if (!availableSlots.has(slot)) {
      throw new Error(`Missing required slot: ${slot}`);
    }
  }
}

export { createBodyTemplate, loadTemplate, validateTemplate };
