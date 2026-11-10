import { describe, expect, it } from "vitest";
import { cleanNickname, isBlocked, validateNickname } from "@/lib/nickname";

describe("validateNickname", () => {
  it.each([
    "Ana",
    "João Silva",
    "dev_ops-42",
    "j.doe",
    "Curitiba",
    "Pau Gasol",
    "computador",
    "Assis",
    "Cassandra",
    "Classy",
    "Pica-pau",
    "Mégane",
  ])("accepts %s", (name) => {
    expect(validateNickname(name)).toEqual({ ok: true, value: name });
  });

  it("trims and collapses whitespace", () => {
    expect(validateNickname("  Ana   Paula  ")).toEqual({
      ok: true,
      value: "Ana Paula",
    });
    expect(cleanNickname("\tA  B\n")).toBe("A B");
  });

  it("enforces 3–20 characters (counting accented letters once)", () => {
    expect(validateNickname("ab")).toEqual({ ok: false, error: "too_short" });
    expect(validateNickname("   ab   ")).toEqual({
      ok: false,
      error: "too_short",
    });
    expect(validateNickname("a".repeat(21))).toEqual({
      ok: false,
      error: "too_long",
    });
    expect(validateNickname("ééé").ok).toBe(true);
    expect(validateNickname("é".repeat(20)).ok).toBe(true);
  });

  it.each(["<script>", "ana@site", "drop;table", "emoji🔥", "a/b/c"])(
    "rejects invalid characters: %s",
    (name) => {
      expect(validateNickname(name)).toEqual({
        ok: false,
        error: "invalid_chars",
      });
    },
  );

  it.each([
    "fuck",
    "FUCK",
    "f.u.c.k",
    "fuuuuck",
    "xXfuckXx",
    "sh1t",
    "p0rr4",
    "caralho",
    "C4r4lh0",
    "fdp",
    "vai tnc",
    "seu cu",
    "puta",
    "Anthropic",
    "Anthr0pic Staff",
    "admin",
    "Moderador",
    "Claude Official",
  ])("blocks %s", (name) => {
    expect(validateNickname(name)).toEqual({ ok: false, error: "blocked" });
  });
});

describe("isBlocked", () => {
  it("ignores accents when matching", () => {
    expect(isBlocked("mérda")).toBe(true);
  });
});
