/**
 * Parse a positive integer route param like :meetingId. Returns 0 when the
 * param is invalid — no row has id 0, so lookups with it simply 404.
 */
export function parseId(value: string | undefined): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}
