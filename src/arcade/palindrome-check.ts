export function isPalindrome(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized === normalized.split("").reverse().join("");
}
