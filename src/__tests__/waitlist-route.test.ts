import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  inserts: [] as Record<string, unknown>[],
  insertError: null as null | { code: string; message: string },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        h.inserts.push(row);
        return { error: h.insertError };
      },
    }),
  }),
}));

import { POST } from "@/app/api/waitlist/route";

let n = 0;
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "x-forwarded-for": `192.0.2.${++n}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

beforeEach(() => {
  h.inserts.length = 0;
  h.insertError = null;
});

describe("the school waitlist", () => {
  it("saves a lowercased email and a trimmed school name", async () => {
    const res = await post({ email: "  Maya@Example.EDU ", school: "  Example College  " });
    expect(res.status).toBe(200);
    expect(h.inserts).toEqual([{ email: "maya@example.edu", school: "Example College", src: null, code: null }]);
  });

  it("records the campaign the visitor arrived from, so demand can be read per poster", async () => {
    await post({ email: "a@example.edu" }, { cookie: `zolo_attr=${encodeURIComponent("src=dorm-flyer&code=HOUSES-1")}` });
    expect(h.inserts[0]).toMatchObject({ src: "dorm-flyer", code: "HOUSES-1", school: null });
  });

  it("collects only an email and a school: nothing else is stored", async () => {
    await post({ email: "a@example.edu", school: "X", name: "Maya", phone: "555", userId: "u1" });
    expect(Object.keys(h.inserts[0]).sort()).toEqual(["code", "email", "school", "src"]);
  });

  it("caps the school name at 100 characters", async () => {
    await post({ email: "a@example.edu", school: "x".repeat(150) });
    expect((h.inserts[0].school as string).length).toBe(100);
  });

  it("answers a repeat email exactly like a new one, so the list cannot be probed", async () => {
    h.insertError = { code: "23505", message: "duplicate key" };
    const res = await post({ email: "a@example.edu" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects an address that is not an email", async () => {
    for (const email of ["nope", "a@b", "", "a b@c.edu"]) expect((await post({ email })).status).toBe(400);
    expect(h.inserts).toHaveLength(0);
  });

  it("turns away a bot that fills the hidden field, without saying so", async () => {
    const res = await post({ email: "a@example.edu", company: "Acme" });
    expect(res.status).toBe(200);
    expect(h.inserts).toHaveLength(0);
  });

  it("treats an unreadable body as a client error", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("reports a genuine failure plainly", async () => {
    h.insertError = { code: "XX000", message: "boom" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ email: "a@example.edu" });
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/try again/i);
  });

  it("is rate-limited per IP", async () => {
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (
        await POST(
          new Request("http://localhost/api/waitlist", {
            method: "POST",
            headers: { "x-forwarded-for": "203.0.113.77" },
            body: JSON.stringify({ email: `p${i}@example.edu` }),
          })
        )
      ).status;
    }
    expect(last).toBe(429);
  });
});
