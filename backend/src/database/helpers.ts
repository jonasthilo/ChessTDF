/**
 * Build a dynamic UPDATE query from partial updates.
 *
 * @param fieldMap - Maps TS property names to DB column names.
 *                   Values can be a string (column name) or a tuple [column, transform]
 *                   where transform processes the value before binding (e.g. JSON.stringify).
 * @param updates - The partial updates object (only defined keys are included).
 * @returns { fields, values } ready to splice into a parameterized query,
 *          or null if no fields were provided.
 */
export function buildUpdateFields<T extends Record<string, unknown>>(
  updates: Partial<T>,
  fieldMap: Record<string, string | [string, (v: unknown) => unknown]>
): { fields: string[]; values: unknown[]; nextParam: number } | null {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [tsKey, mapping] of Object.entries(fieldMap)) {
    const value = updates[tsKey as keyof T];
    if (value === undefined) continue;

    if (typeof mapping === 'string') {
      fields.push(`${mapping} = $${paramIndex++}`);
      values.push(value);
    } else {
      const [column, transform] = mapping;
      fields.push(`${column} = $${paramIndex++}`);
      values.push(transform(value));
    }
  }

  if (fields.length === 0) return null;

  return { fields, values, nextParam: paramIndex };
}
