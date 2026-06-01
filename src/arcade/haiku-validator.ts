function countSyllables(line: string): number {
  const words = line.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return 0;

  let count = 0;
  for (const word of words) {
    const groups = word.match(/[aeiouy]+/g) || [];
    let wordCount = groups.length;

    if (word.endsWith('e')) {
      const withoutE = word.slice(0, -1);
      if (/[aeiouy]/.test(withoutE)) {
        wordCount -= 1;
      }
    }

    count += wordCount;
  }

  return count;
}

export function isHaiku(text: string): boolean {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length !== 3) return false;

  const syllables = lines.map(countSyllables);
  return syllables[0] === 5 && syllables[1] === 7 && syllables[2] === 5;
}
