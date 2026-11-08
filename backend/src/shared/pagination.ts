export type Cursor = {
  created_at: string;
  id: string;
};

export function encodeCursor(row: Cursor): string {
  return Buffer.from(`${row.created_at}|${row.id}`).toString("base64url");
}

export function decodeCursor(cursor: string): Cursor | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const splitAt = decoded.indexOf("|");
    if (splitAt === -1) return null;
    const created_at = decoded.slice(0, splitAt);
    const id = decoded.slice(splitAt + 1);
    if (!created_at || !id) return null;
    return { created_at, id };
  } catch {
    return null;
  }
}

export function parseLimit(limit: string | undefined, fallback = 10): number | "invalid" {
  if (limit === undefined || limit === "") return fallback;
  if (!/^[0-9]+$/.test(limit)) return "invalid";
  const value = Number(limit);
  if (value < 1 || value > 50) return "invalid";
  return value;
}
