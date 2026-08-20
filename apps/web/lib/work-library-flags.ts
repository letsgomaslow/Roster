export function isWorkLibraryEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() !== 'false';
}
