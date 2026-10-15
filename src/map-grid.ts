// Calibrated against the original 4000px game map and the retained landmark data.
// Grid boundaries: A begins at x≈171, row 17 at y≈185; cells are ≈226.7px.
export function mapGrid(x: number, y: number): string | null {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 171 ||
    y < 185 ||
    x > 4000 ||
    y > 4000
  )
    return null;
  const col = Math.floor((x - 171) / 226.7),
    row = 17 - Math.floor((y - 185) / 226.7);
  if (col < 0 || col > 16 || row < 1 || row > 17) return null;
  return `${String.fromCharCode(65 + col)}${row}`;
}
