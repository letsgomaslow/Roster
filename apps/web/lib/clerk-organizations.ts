export function isClerkOrganizationsEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}
