/** One-based half-move index to the notation a player sees on a scoresheet. */
export function moveLabel(ply: number, san = '', initialFen?: string): string {
  const fields = initialFen?.split(' ');
  const offset = fields ? (Number(fields[5]) - 1) * 2 + (fields[1] === 'b' ? 1 : 0) : 0;
  const absolutePly = ply + offset;
  return `${Math.ceil(absolutePly / 2)}${absolutePly % 2 ? '.' : '…'}${san}`;
}
