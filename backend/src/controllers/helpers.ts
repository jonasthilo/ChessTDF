/**
 * Parse a route/query parameter as an integer.
 * Returns the parsed number, or NaN if the param is undefined or not a valid integer.
 * Accepts the broad union that Express's strict types produce for params/query values.
 */
export function parseIntParam(param: string | string[] | undefined): number {
  return parseInt(typeof param === 'string' ? param : '');
}
