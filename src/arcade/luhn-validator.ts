export function isValidLuhn(number: string): boolean {
  if (number.length === 0) return false;
  if (!/^\d+$/.test(number)) return false;

  let sum = 0;
  let double = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = number.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}
