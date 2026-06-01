export function rollDie(sides: number): number {
  if (!Number.isFinite(sides) || !Number.isInteger(sides) || sides <= 0) {
    throw new Error(`Invalid number of sides: ${sides}`);
  }
  return Math.floor(Math.random() * sides) + 1;
}
