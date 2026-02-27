// src/char/view.ts
var ALL_VIEW_DIRECTIONS = [
  "front",
  "back",
  "left",
  "right",
  "front-left",
  "front-right",
  "back-left",
  "back-right"
];
function isValidViewDirection(direction) {
  return ALL_VIEW_DIRECTIONS.includes(direction);
}
function parseViewDirections(viewsString) {
  if (viewsString.toLowerCase() === "all") {
    return [...ALL_VIEW_DIRECTIONS];
  }
  const parts = viewsString.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new Error("No valid view directions found");
  }
  const validDirections = [];
  for (const part of parts) {
    if (isValidViewDirection(part)) {
      validDirections.push(part);
    } else {
      throw new Error(`Invalid view direction: ${part}. Valid directions: ${ALL_VIEW_DIRECTIONS.join(", ")}`);
    }
  }
  return validDirections;
}

export { ALL_VIEW_DIRECTIONS, isValidViewDirection, parseViewDirections };
