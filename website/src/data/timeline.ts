/** Map native scroll progress to a scene and the final 10% crossfade. */
export function tourFrame(progress: number, count: number) {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("A tour needs at least one scene");
  const safe = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const position = safe * count;
  const index = Math.min(count - 1, Math.floor(position));
  const local = safe === 1 ? 1 : position - index;
  const hasNext = index < count - 1;
  return {
    index,
    time: hasNext ? Math.min(1, local / 0.9) : local,
    blend: hasNext ? Math.max(0, Math.min(1, (local - 0.9) / 0.1)) : 0,
  };
}
