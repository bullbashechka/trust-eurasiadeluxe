export const wrapSelection = (index: number, count: number) => ((index % count) + count) % count;

export function isSelectionDrag(dx: number, dy: number) {
  return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy);
}

// Place each of the original cards in the nearest slot of the circular track.
export function selectionOffset(index: number, position: number, count: number) {
  return wrapSelection(index - position + count / 2, count) - count / 2;
}
