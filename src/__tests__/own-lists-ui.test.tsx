import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

// What a person sees and does when making a list of their own, and the founder's note on the students page. The rules:
// private by default, public is a choice, a first name is a second and separate choice, every place is one they saved,
// and nothing is sent that they did not pick.

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), fetch: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: h.refresh }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("sonner", () => ({ toast: h.toast }));

import { ListEditor } from "@/components/lists/list-editor";
import { OwnListCard } from "@/components/lists/own-list-card";
import { FounderNote } from "@/components/students/founder-note";
import type { SavedChoice } from "@/lib/lists/own-choices";

const choices: SavedChoice[] = Array.from({ length: 12 }, (_, i) => ({ id: `g-ChIJeditor${String(i).padStart(8, "0")}`, title: `Cafe ${i + 1}`, subtitle: "Food & Drink · Testville" }));
const ids = (...ns: number[]) => ns.map((n) => choices[n - 1].id);
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const sent = () => JSON.parse((h.fetch.mock.calls[0][1] as RequestInit).body as string);

beforeEach(() => {
  h.push.mockReset();
  h.refresh.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.fetch.mockReset().mockResolvedValue(reply(201, { list: {} }));
  vi.stubGlobal("fetch", h.fetch);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const add = (n: number) => fireEvent.click(screen.getByRole("button", { name: `Add Cafe ${n}` }));
const saveButton = () => screen.getByRole("button", { name: "Save list" }) as HTMLButtonElement;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("making a list", () => {
  it("needs a title and at least three places before it can be saved, and says how many are chosen", () => {
    render(<ListEditor choices={choices} firstName="Maya" />);
    expect(saveButton().disabled).toBe(true);
    expect(document.body.textContent).toContain("0 of 10, at least 3 needed");
    type("Title", "Late-night study spots");
    add(1);
    add(2);
    expect(saveButton().disabled).toBe(true);
    add(3);
    expect(saveButton().disabled).toBe(false);
    expect(document.body.textContent).toContain("3 of 10");
    type("Title", "   ");
    expect(saveButton().disabled).toBe(true);
  });

  it("lets places be reordered and taken off, and keeps the order it shows", async () => {
    render(<ListEditor choices={choices} firstName="" />);
    type("Title", "T");
    add(1);
    add(2);
    add(3);
    fireEvent.click(screen.getByRole("button", { name: "Move Cafe 3 up" }));
    fireEvent.click(screen.getByRole("button", { name: "Move Cafe 3 up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Cafe 2" }));
    add(2); // and back on, now last
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(sent().experienceIds).toEqual(ids(3, 1, 2));
  });

  it("stops at ten places", () => {
    render(<ListEditor choices={choices} firstName="" />);
    for (let n = 1; n <= 10; n++) add(n);
    expect(document.body.textContent).toContain("10 of 10");
    expect((screen.getByRole("button", { name: "Add Cafe 11" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("is private by default: only me chosen, and no name to show", async () => {
    render(<ListEditor choices={choices} firstName="Maya" />);
    expect((screen.getByRole("radio", { name: /Only me/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Anyone with the link/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole("checkbox")).toBeNull();
    type("Title", "Late-night study spots");
    add(1);
    add(2);
    add(3);
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(h.fetch.mock.calls[0][0]).toBe("/api/my-lists");
    expect((h.fetch.mock.calls[0][1] as RequestInit).method).toBe("POST");
    expect(sent()).toEqual({ title: "Late-night study spots", blurb: null, experienceIds: ids(1, 2, 3), isPublic: false, showName: false });
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/lists"));
    expect(h.toast.success).toHaveBeenCalledWith("Saved. It is private to you.");
  });

  it("offers a first name only on a public list, unticked, and sends it only if ticked", async () => {
    render(<ListEditor choices={choices} firstName="Maya" />);
    type("Title", "T");
    add(1);
    add(2);
    add(3);
    fireEvent.click(screen.getByRole("radio", { name: /Anyone with the link/ }));
    const name = screen.getByRole("checkbox", { name: /Show my first name on it \(Maya\)/ }) as HTMLInputElement;
    expect(name.checked).toBe(false);
    expect(document.body.textContent).toContain("never your surname or your email");
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(sent()).toMatchObject({ isPublic: true, showName: false });

    // (a saved list leaves for the lists page, so the second choice is made on a fresh editor)
    cleanup();
    h.fetch.mockClear();
    render(<ListEditor choices={choices} firstName="Maya" />);
    type("Title", "T");
    add(1);
    add(2);
    add(3);
    fireEvent.click(screen.getByRole("radio", { name: /Anyone with the link/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Show my first name on it/ }));
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(sent()).toMatchObject({ isPublic: true, showName: true });
    expect(h.toast.success).toHaveBeenLastCalledWith("Saved. Anyone with the link can open it.");
  });

  it("sends no name when a ticked box is taken back to private", async () => {
    render(<ListEditor choices={choices} firstName="Maya" />);
    type("Title", "T");
    add(1);
    add(2);
    add(3);
    fireEvent.click(screen.getByRole("radio", { name: /Anyone with the link/ }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("radio", { name: /Only me/ }));
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(sent()).toMatchObject({ isPublic: false, showName: false });
  });

  it("stays on the page, with the server's words, when it does not save", async () => {
    h.fetch.mockResolvedValue(reply(400, { error: "A list can hold only places you have saved." }));
    render(<ListEditor choices={choices} firstName="" />);
    type("Title", "T");
    add(1);
    add(2);
    add(3);
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("A list can hold only places you have saved."));
    expect(h.push).not.toHaveBeenCalled();
    expect(saveButton().disabled).toBe(false);
  });
});

describe("changing a list", () => {
  const initial = { id: "11111111-2222-4333-8444-555555555555", title: "Study spots", blurb: "Quiet tables", experienceIds: ids(4, 5, 6), isPublic: true, showName: true };

  it("starts from what is saved, and changes it with a PATCH", async () => {
    render(<ListEditor choices={choices} firstName="Maya" initial={initial} />);
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Study spots");
    expect((screen.getByRole("radio", { name: /Anyone with the link/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    type("Title", "Study spots, nights");
    fireEvent.click(saveButton());
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(h.fetch.mock.calls[0][0]).toBe(`/api/my-lists/${initial.id}`);
    expect((h.fetch.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
    expect(sent()).toMatchObject({ title: "Study spots, nights", blurb: "Quiet tables", experienceIds: ids(4, 5, 6), isPublic: true, showName: true });
  });

  it("deletes only after being asked, and nothing happens if the person says no", async () => {
    render(<ListEditor choices={choices} firstName="" initial={initial} />);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    expect(h.fetch).not.toHaveBeenCalled();

    h.fetch.mockResolvedValue(reply(200, { ok: true }));
    fireEvent.click(screen.getByRole("button", { name: "Delete list" }));
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect((h.fetch.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/lists"));
  });

  it("offers no delete on a list that has not been made yet", () => {
    render(<ListEditor choices={choices} firstName="" />);
    expect(screen.queryByRole("button", { name: "Delete list" })).toBeNull();
  });
});

describe("your lists page", () => {
  const card = (over = {}) => ({ id: "11111111-2222-4333-8444-555555555555", title: "Late-night study spots", blurb: null, count: 5, isPublic: false, showName: false, url: null, ...over });

  it("says a private list is only yours, and has no link to give out", () => {
    render(<ul><OwnListCard list={card()} /></ul>);
    expect(document.body.textContent).toContain("5 places · Only you");
    expect(screen.queryByLabelText("Link to this list")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(screen.getByRole("link", { name: "Edit" }).getAttribute("href")).toBe("/lists/11111111-2222-4333-8444-555555555555");
  });

  it("shows a public list's link, with who can see it, and copies it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ul><OwnListCard list={card({ isPublic: true, showName: true, url: "https://discoverzolo.com/l/abc" })} /></ul>);
    expect(document.body.textContent).toContain("Anyone with the link, with your first name");
    expect((screen.getByLabelText("Link to this list") as HTMLInputElement).value).toBe("https://discoverzolo.com/l/abc");
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://discoverzolo.com/l/abc"));
    expect(h.toast.success).toHaveBeenCalledWith("Link copied.");
  });

  it("deletes after being asked, and refreshes the list", async () => {
    h.fetch.mockResolvedValue(reply(200, { ok: true }));
    render(<ul><OwnListCard list={card()} /></ul>);
    fireEvent.click(within(document.body).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(h.fetch).toHaveBeenCalledTimes(1));
    expect(h.fetch.mock.calls[0][0]).toBe("/api/my-lists/11111111-2222-4333-8444-555555555555");
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
  });
});

describe("the voice of the editor and the lists page", () => {
  it("has no exclamation points and no emoji", () => {
    render(<ListEditor choices={choices} firstName="Maya" />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/!|\p{Extended_Pictographic}/u);
  });
});

describe("the founder's note on the students page", () => {
  const html = renderToStaticMarkup(<FounderNote />);
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("says why Zolo exists: a college student, tired of the same three places", () => {
    expect(text).toContain("A college student made Zolo because he was tired of the same three places.");
    expect(text).toContain("Why it exists");
  });

  it("is in the brand's voice: no exclamation point, no emoji, no jargon", () => {
    expect(text).not.toMatch(/!|\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/disrupt|revolution|game.?chang|unlock|supercharge|10x|journey|passionate/i);
  });

  it("names no school, no person and no claim about numbers, users or results", () => {
    expect(text).not.toMatch(/loyola|university|college of|\bgreyhound|baltimore/i);
    expect(text).not.toMatch(/\d/);
    expect(html).not.toMatch(/<img|href=/); // unsigned: no name, no photo, no profile to look up
  });
});
