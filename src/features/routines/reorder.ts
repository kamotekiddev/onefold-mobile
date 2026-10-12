/** Find the closest row midpoint, including scroll displacement and variable text heights. */
export function getDropIndex(entries: { id: string }[], heights: Record<string, number>, sourceId: string, translation: number) {
  let offset = 0;
  const midpoints = entries.map(entry => {
    const height = heights[entry.id] ?? 320;
    const midpoint = offset + height / 2;
    offset += height + 12;
    return midpoint;
  });
  const from = entries.findIndex(entry => entry.id === sourceId);
  if (from < 0) return 0;
  const destination = midpoints[from] + translation;
  return midpoints.reduce((closest, midpoint, index) => Math.abs(midpoint - destination) < Math.abs(midpoints[closest] - destination) ? index : closest, from);
}
