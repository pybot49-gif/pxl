// src/char/registry.ts
function createPartRegistry() {
  return {
    parts: /* @__PURE__ */ new Map()
  };
}
function registerPart(registry, part) {
  if (registry.parts.has(part.id)) {
    throw new Error(`Part with id ${part.id} already exists`);
  }
  const partCopy = {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
  registry.parts.set(part.id, partCopy);
}
function getPart(registry, id) {
  const part = registry.parts.get(id);
  if (!part) {
    return void 0;
  }
  return {
    ...part,
    buffer: new Uint8Array(part.buffer),
    colorRegions: {
      primary: [...part.colorRegions.primary],
      shadow: [...part.colorRegions.shadow],
      ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
    },
    compatibleBodies: [...part.compatibleBodies]
  };
}
function listParts(registry) {
  const parts = [];
  for (const part of registry.parts.values()) {
    parts.push({
      ...part,
      buffer: new Uint8Array(part.buffer),
      colorRegions: {
        primary: [...part.colorRegions.primary],
        shadow: [...part.colorRegions.shadow],
        ...part.colorRegions.highlight ? { highlight: [...part.colorRegions.highlight] } : {}
      },
      compatibleBodies: [...part.compatibleBodies]
    });
  }
  return parts.sort((a, b) => a.id.localeCompare(b.id));
}
function getPartsBySlot(registry, slot) {
  const allParts = listParts(registry);
  return allParts.filter((part) => part.slot === slot);
}
function searchParts(registry, query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const normalizedQuery = query.toLowerCase().trim();
  const allParts = listParts(registry);
  return allParts.filter(
    (part) => part.id.toLowerCase().includes(normalizedQuery)
  );
}

export { createPartRegistry, getPart, getPartsBySlot, listParts, registerPart, searchParts };
