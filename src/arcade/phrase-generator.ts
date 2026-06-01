export const ANALOGIES: readonly string[] = [
  'Uber',
  'Netflix',
  'Airbnb',
  'Spotify',
  'Tinder',
  'Slack',
  'DoorDash',
  'Robinhood',
  'Tesla',
  'Zoom',
  'Duolingo',
];

export const MARKETS: readonly string[] = [
  'dogs',
  'grandparents',
  'zombies',
  'houseplants',
  'clowns',
  'chess pieces',
  'left-handed people',
  'goldfish',
  'insomniacs',
  'bakers',
  'time travelers',
];

export function generateStartupIdea(): string {
  const x = ANALOGIES[Math.floor(Math.random() * ANALOGIES.length)];
  const y = MARKETS[Math.floor(Math.random() * MARKETS.length)];
  return `It's like ${x} for ${y}!`;
}
