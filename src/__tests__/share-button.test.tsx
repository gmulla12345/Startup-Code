import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const shareEntity = vi.hoisted(() => vi.fn());
vi.mock("@/lib/utils/share", () => ({ shareEntity }));

import { ShareButton, type ShareTarget } from "@/components/share/share-button";
import { toast } from "sonner";
import { SHARE_NOTE_MAX } from "@/lib/config/share";

// The sharing panel. It only collects what the person chose and sends it to the
// server, which makes every real decision. What matters here: the name is off
// until they turn it on, nothing is sent until they ask, an existing link shows up
// instead of a second one being made, and turning a link off really asks to delete it.

const PLACE: ShareTarget = { kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" };
const PLAN: ShareTarget = { kind: "plan", itineraryId: "0b8f3c9e-1111-4222-8333-444455556666" };
const LINK = { token: "T".repeat(22), url: `https://discoverzolo.com/s/${"T".repeat(22)}`, note: null, showName: false };

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const open = async () => {
  fireEvent.click(screen.getByRole("button", { name: /share/i }));
  await screen.findByRole("dialog");
};
const posted = () => JSON.parse((fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST")![1] as RequestInit).body as string);

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return json({ link: LINK }, 201);
    if (init?.method === "DELETE") return json({ ok: true });
    return json({ link: null });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  shareEntity.mockReset().mockResolvedValue("shared");
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("opening the panel", () => {
  it("shows nothing until it is asked for, and asks the server whether there is already a link", async () => {
    render(<ShareButton target={PLACE} shareTitle="Fells Point Roasters" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    expect(fetchMock).toHaveBeenCalledWith(`/api/shares?kind=place&experienceId=${encodeURIComponent(PLACE.kind === "place" ? PLACE.experienceId : "")}`);
  });

  it("starts private: no note, and the name unticked, with the promise printed beside it", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    expect((screen.getByLabelText(/a note/i) as HTMLTextAreaElement).value).toBe("");
    const name = screen.getByRole("checkbox", { name: /show my first name/i }) as HTMLInputElement;
    expect(name.checked).toBe(false);
    expect(screen.getByRole("dialog").textContent).toContain("Your name stays hidden unless you tick this.");
    expect(screen.getByRole("dialog").textContent).toContain("Anyone with the link can see it. You can turn the link off at any time.");
  });

  it("limits a note to the allowed length", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    expect(screen.getByLabelText(/a note/i).getAttribute("maxlength")).toBe(String(SHARE_NOTE_MAX));
  });

  it("closes on Escape and on a click outside", async () => {
    render(
      <div>
        <ShareButton target={PLACE} shareTitle="x" />
        <p>elsewhere</p>
      </div>
    );
    await open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    fireEvent.mouseDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends a signed-out visitor to sign in instead, and asks the server nothing", () => {
    const onNeedLogin = vi.fn();
    render(<ShareButton target={PLACE} shareTitle="x" onNeedLogin={onNeedLogin} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));
    expect(onNeedLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("making a link", () => {
  it("sends nothing until asked, and then exactly what was chosen: private by default", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    expect(fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === "POST")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /create link/i }));
    await screen.findByDisplayValue(LINK.url);
    expect(posted()).toEqual({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", note: null, showName: false });
  });

  it("sends the note and the name when the person chose them", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    fireEvent.change(screen.getByLabelText(/a note/i), { target: { value: "  Get the plum tart  " } });
    fireEvent.click(screen.getByRole("checkbox", { name: /show my first name/i }));
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));
    await screen.findByDisplayValue(LINK.url);
    expect(posted()).toMatchObject({ note: "Get the plum tart", showName: true });
  });

  it("works the same for a plan", async () => {
    render(<ShareButton target={PLAN} shareTitle="Lisbon" label="Share" size="sm" />);
    await open();
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));
    await screen.findByDisplayValue(LINK.url);
    expect(posted()).toEqual({ kind: "plan", itineraryId: "0b8f3c9e-1111-4222-8333-444455556666", note: null, showName: false });
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("Share this plan");
  });

  it("tells the caller once when a new link is made, not when one is updated", async () => {
    const onCreated = vi.fn();
    render(<ShareButton target={PLACE} shareTitle="x" onCreated={onCreated} />);
    await open();
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));
    await screen.findByDisplayValue(LINK.url);
    expect(onCreated).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(async () => json({ link: LINK }, 200)); // an update answers 200
    fireEvent.click(screen.getByRole("button", { name: /update link/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link updated."));
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("shows the server's reason when it is refused, and keeps what was typed", async () => {
    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ error: "Notes cannot contain links." }, 400) : json({ link: null })
    );
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    fireEvent.change(screen.getByLabelText(/a note/i), { target: { value: "see example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /create link/i }));
    expect((await screen.findByRole("alert")).textContent).toBe("Notes cannot contain links.");
    expect((screen.getByLabelText(/a note/i) as HTMLTextAreaElement).value).toBe("see example.com");
    expect(screen.queryByLabelText(/your link/i)).toBeNull();
  });
});

describe("a link that already exists", () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return json({ ok: true });
      if (init?.method === "POST") return json({ link: { ...LINK, note: "Edited" } });
      return json({ link: { ...LINK, note: "Get the plum tart", showName: true } });
    });
  });

  it("is shown, with its note and name as they were, instead of making another", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    expect(await screen.findByDisplayValue(LINK.url)).toBeTruthy();
    expect((screen.getByLabelText(/a note/i) as HTMLTextAreaElement).value).toBe("Get the plum tart");
    expect((screen.getByRole("checkbox", { name: /show my first name/i }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: /update link/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /create link/i })).toBeNull();
  });

  it("can be copied, and sent through the system share sheet", async () => {
    render(<ShareButton target={PLACE} shareTitle="Fells Point Roasters" />);
    await open();
    await screen.findByDisplayValue(LINK.url);

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK.url));

    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(shareEntity).toHaveBeenCalledWith({ title: "Fells Point Roasters", url: LINK.url }));
  });

  it("can be turned off, which asks the server to delete it and goes back to making a new one", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    await screen.findByDisplayValue(LINK.url);
    fireEvent.click(screen.getByRole("button", { name: /turn off this link/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link turned off."));

    const deleted = fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "DELETE")!;
    expect(deleted[0]).toBe(`/api/shares/${LINK.token}`);
    expect(screen.queryByDisplayValue(LINK.url)).toBeNull();
    expect(screen.getByRole("button", { name: /create link/i })).toBeTruthy();
    // and what was typed is cleared: a new link starts private again
    expect((screen.getByLabelText(/a note/i) as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByRole("checkbox", { name: /show my first name/i }) as HTMLInputElement).checked).toBe(false);
  });

  it("stays shown, with the reason, if it could not be turned off: never claims it is off when it is not", async () => {
    fetchMock.mockImplementation(async (_u: string, init?: RequestInit) =>
      init?.method === "DELETE" ? json({ error: "Something went wrong. Please try again." }, 500) : json({ link: { ...LINK, note: "x", showName: false } })
    );
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    await screen.findByDisplayValue(LINK.url);
    fireEvent.click(screen.getByRole("button", { name: /turn off this link/i }));
    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong. Please try again.");
    expect(screen.getByDisplayValue(LINK.url)).toBeTruthy();
    expect(toast.success).not.toHaveBeenCalledWith("Link turned off.");
  });
});

describe("copy", () => {
  it("keeps to the brand voice: no exclamation points", async () => {
    render(<ShareButton target={PLACE} shareTitle="x" />);
    await open();
    expect(screen.getByRole("dialog").textContent).not.toContain("!");
  });
});
