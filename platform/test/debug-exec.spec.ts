import { env, reset } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => { await reset(); });

describe("debug exec", () => {
  it("newline inside parens", async () => {
    await env.BAKA_DB.exec("CREATE TABLE IF NOT EXISTS t5 (\n  id TEXT PRIMARY KEY\n)");
    expect(true).toBe(true);
  });
  it("CRLF inside parens", async () => {
    await env.BAKA_DB.exec("CREATE TABLE IF NOT EXISTS t6 (\r\n  id TEXT PRIMARY KEY\r\n)");
    expect(true).toBe(true);
  });
  it("one-line with spaces then paren", async () => {
    await env.BAKA_DB.exec("CREATE TABLE IF NOT EXISTS t7 (   id TEXT PRIMARY KEY   )");
    expect(true).toBe(true);
  });
  it("two statements separated by newline", async () => {
    await env.BAKA_DB.exec("CREATE TABLE IF NOT EXISTS t8 (id TEXT);\nCREATE TABLE IF NOT EXISTS t9 (id TEXT)");
    expect(true).toBe(true);
  });
});
