/** Must match `PW_PORT` / `playwright.config.ts` default. */
export function e2eBaseURL(): string {
  const port = process.env.PW_PORT ?? '3100';
  return `http://127.0.0.1:${port}`;
}
