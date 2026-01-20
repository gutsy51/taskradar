export function countFormat(
  number: number,
  one: string,
  two: string,
  five: string,
): string {
  let absNumber = Math.abs(number);

  absNumber %= 100;
  if (number >= 5 && number <= 20) return five;

  absNumber %= 10;
  if (absNumber === 1) return one;

  if (absNumber >= 2 && absNumber <= 4) return two;

  return five;
}
