import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import pt from "@/i18n/messages/pt.json";

function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? keyPaths(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("i18n messages", () => {
  it("pt and en define exactly the same keys", () => {
    expect(keyPaths(en).sort()).toEqual(keyPaths(pt).sort());
  });

  it("has no empty strings", () => {
    for (const messages of [pt, en]) {
      const flat = JSON.stringify(messages);
      expect(flat).not.toContain('""');
    }
  });
});
