/** Where each tile sits: a grid sized to the frame, filled from the centre outwards. */
export type Tile = { x: number; y: number; size: number };

export function wallLayout(width: number, height: number, count: number): Tile[] {
  // Columns and rows for `count` square tiles in this aspect ratio.
  const columns = Math.ceil(Math.sqrt((count * width) / height));
  const rows = Math.ceil(count / columns);
  const pitch = Math.min(width / columns, height / rows);
  const gap = pitch * 0.12;
  const size = pitch - gap;
  const offsetX = (width - columns * pitch) / 2 + gap / 2;
  const offsetY = (height - rows * pitch) / 2 + gap / 2;

  const cells: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      cells.push({ x: offsetX + column * pitch + size / 2, y: offsetY + row * pitch + size / 2, size });
    }
  }
  // Nearest the centre first (stretched so it grows as an oval that fits the frame).
  const cx = width / 2;
  const cy = height / 2;
  const stretch = width / height;
  const distance = (tile: Tile) => Math.hypot((tile.x - cx) / stretch, tile.y - cy) + (tile.x * 1e-6);
  return cells.sort((a, b) => distance(a) - distance(b)).slice(0, count);
}
