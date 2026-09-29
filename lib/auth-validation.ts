export function isObjectBody(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function passwordError(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (new TextEncoder().encode(password).byteLength > 72) return "Password must be 72 UTF-8 bytes or fewer (Arabic characters can use more than one byte).";
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) return "Password must include at least one letter and one number.";
  return null;
}
