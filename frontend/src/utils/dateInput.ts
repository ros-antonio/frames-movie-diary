function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getTodayDateInputValue(): string {
  return formatDateInputValue(new Date());
}
function toDateInputValue(rawDate?: string): string {
  if (!rawDate) {
    return getTodayDateInputValue();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return getTodayDateInputValue();
  }
  return formatDateInputValue(parsedDate);
}
export { formatDateInputValue, getTodayDateInputValue, toDateInputValue };
