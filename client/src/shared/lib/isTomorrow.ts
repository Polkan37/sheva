export function isTomorrow(timestamp: number) {
  const date = new Date(timestamp);
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  return date.toDateString() === tomorrow.toDateString();
}