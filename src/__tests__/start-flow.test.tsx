import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// The first-list page as a visitor meets it: two questions and a place, one list, and an
// account asked for only to keep what they were given. Plus what the browser keeps, and
// the moment the list is kept in a new account.

const h = vi.hoisted(() => ({ fetch: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/services/analytics/track", () => ({ track: vi.fn() }));

import { ClaimFirstList } from "@/components/start/claim-first-list";
import { StartFlow } from "@/components/start/start-flow";
import { FIRST_LIST_SRC, FIRST_LIST_STORAGE_KEY } from "@/lib/config/start";
import { readFirstList, writeFirstList } from "@/lib/start/storage";

const place = (i: number) => ({
  id: `g-ChIJfixture${i}0000000`,
  slug: `g-place-${i}`,
  title: `Place ${i}`,
  category: "food_drink",
  tags: ["food"],
  images: [],
  city: "Testville",
  priceLevel: "low",
  priceEstimate: 12,
  isHiddenGem: false,
  distanceMiles: 0.5 * i,
  why: `Why ${i}`,
});
const LIST = { title: "Your first list", blurb: "Chosen from what you told us.", places: [1, 2, 3, 4].map(place) };

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const calls = (path: string) => h.fetch.mock.calls.filter(([url]) => String(url).startsWith(path));

function mockGeolocation(result: "ok" | "denied") {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: (p: unknown) => void, failure: () => void) => (result === "ok" ? success({ coords: { latitude: 39.29, longitude: -76.61 } }) : failure()),
    },
  });
}

async function answerAndSubmit() {
  fireEvent.click(await screen.findByRole("button", { name: "A good meal" }));
  fireEvent.click(screen.getByRole("button", { name: "Under $25" }));
  fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
  fireEvent.click(await screen.findByRole("button", { name: /show my list/i }));
}

beforeEach(() => {
  window.localStorage.clear();
  h.fetch.mockReset().mockImplementation((url: string) => {
    if (url === "/api/start/list") return json({ list: LIST });
    if (url === "/api/start/places") return json({ list: LIST });
    return json({});
  });
  vi.stubGlobal("fetch", h.fetch);
  h.toast.success.mockReset();
  mockGeolocation("ok");
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("asking for a first list", () => {
  it("shows the two questions and where you are, with nothing chosen and the button unavailable", async () => {
    render(<StartFlow />);
    expect(await screen.findByText("What kind of outing?")).toBeTruthy();
    expect(screen.getByText("What feels right to spend?")).toBeTruthy();
    expect(screen.getByText("Where are you?")).toBeTruthy();
    expect((screen.getByRole("button", { name: /show my list/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(calls("/api/start")).toHaveLength(0);
  });

  it("makes the list from the two answers and the location, and says what it does with the location", async () => {
    render(<StartFlow />);
    expect(await screen.findByText("We use it once, to find places, and do not keep it.")).toBeTruthy();
    await answerAndSubmit();
    expect(await screen.findByText("Your first list")).toBeTruthy();
    expect(JSON.parse(calls("/api/start/list")[0][1].body)).toEqual({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 });
    for (const i of [1, 2, 3, 4]) expect(screen.getByText(`Place ${i}`)).toBeTruthy();
    expect(screen.getByText("Why 2")).toBeTruthy();
  });

  it("looks a typed city up first, and asks again if it cannot be found", async () => {
    h.fetch.mockImplementation((url: string) => {
      if (url.startsWith("/api/geocode?q=Nowhere")) return json({ results: [] });
      if (url.startsWith("/api/geocode?q=Lisbon")) return json({ results: [{ city: "Lisbon", latitude: 38.72, longitude: -9.14 }] });
      return json({ list: LIST });
    });
    render(<StartFlow />);
    fireEvent.click(await screen.findByRole("button", { name: "Time outdoors" }));
    fireEvent.click(screen.getByRole("button", { name: "Free" }));
    const city = screen.getByLabelText("A city");

    fireEvent.change(city, { target: { value: "Nowhere" } });
    fireEvent.click(screen.getByRole("button", { name: /show my list/i }));
    expect(await screen.findByText("We could not find that city. Try another.")).toBeTruthy();
    expect(calls("/api/start/list")).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("A city"), { target: { value: "Lisbon" } });
    fireEvent.click(screen.getByRole("button", { name: /show my list/i }));
    expect(await screen.findByText("Your first list")).toBeTruthy();
    expect(JSON.parse(calls("/api/start/list")[0][1].body)).toMatchObject({ outing: "outdoors", budget: "free", latitude: 38.72, longitude: -9.14 });
  });

  it("asks for a city instead when the location cannot be had", async () => {
    mockGeolocation("denied");
    render(<StartFlow />);
    fireEvent.click(await screen.findByRole("button", { name: /use my location/i }));
    expect(await screen.findByText("We could not get your location. Type a city instead.")).toBeTruthy();
  });

  it("says so plainly when no list could be made", async () => {
    h.fetch.mockImplementation(() => json({ list: null }));
    render(<StartFlow />);
    await answerAndSubmit();
    expect(await screen.findByText("We could not find places near you just now. Try again in a little while.")).toBeTruthy();
  });
});

describe("an account is asked for only to keep what you were given", () => {
  async function withList() {
    render(<StartFlow />);
    await answerAndSubmit();
    await screen.findByText("Your first list");
  }

  it("shows the list first, with the card beneath it already saying 'Keep this list', never in the way", async () => {
    await withList();
    expect(screen.getByText("Keep this list")).toBeTruthy();
    expect(screen.getByText("Make an account and this list stays with you.")).toBeTruthy();
    expect(screen.getByText("Place 1")).toBeTruthy(); // the list is still on screen
  });

  it("sends the account link with the first-list source, and offers a way to log in", async () => {
    await withList();
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(`/signup?src=${FIRST_LIST_SRC}`);
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  });

  it("answers the heart on a place with 'Keep this place', and saves nothing", async () => {
    await withList();
    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(screen.getByText("Keep this place")).toBeTruthy();
    expect(calls("/api/saved")).toHaveLength(0);
  });

  it("answers 'Start another list' with a second prompt: the first list is theirs to keep", async () => {
    await withList();
    fireEvent.click(screen.getByRole("button", { name: "Start another list" }));
    expect(screen.getByText("Another list")).toBeTruthy();
    expect(screen.getByText("This first list is yours to keep. Make an account to start another.")).toBeTruthy();
    expect(calls("/api/start/list")).toHaveLength(1); // no second list was made
  });

  it("is worded in the brand's voice: no exclamation points and no emoji anywhere on the page", async () => {
    await withList();
    fireEvent.click(screen.getByRole("button", { name: "Start another list" }));
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("what the browser remembers", () => {
  it("keeps the answers and the places' ids once a list is made, and nothing of the places themselves", async () => {
    render(<StartFlow />);
    await answerAndSubmit();
    await screen.findByText("Your first list");
    const kept = JSON.parse(window.localStorage.getItem(FIRST_LIST_STORAGE_KEY)!);
    expect(kept).toMatchObject({ v: 1, outing: "meal", budget: "low" });
    expect(kept.picks).toHaveLength(4);
    expect(JSON.stringify(kept)).not.toMatch(/Place 1|Why 1|Testville|39\.29|-76\.61/);
  });

  it("shows the same list again after a reload or a trip into a place, asking for the places by id and not for a new list", async () => {
    writeFirstList({ outing: "meal", budget: "low", picks: LIST.places.map((p) => ({ experienceId: p.id, tags: p.tags, category: p.category })) });
    render(<StartFlow />);
    expect(await screen.findByText("Place 1")).toBeTruthy();
    expect(calls("/api/start/list")).toHaveLength(0);
    expect(JSON.parse(calls("/api/start/places")[0][1].body)).toEqual({ outing: "meal", budget: "low", ids: LIST.places.map((p) => p.id) });
    expect(screen.queryByText("What kind of outing?")).toBeNull(); // the questions are not asked a second time
  });

  it("says the list is saved when its places cannot be loaded just now, and still offers to keep it", async () => {
    writeFirstList({ outing: "meal", budget: "low", picks: LIST.places.map((p) => ({ experienceId: p.id, tags: p.tags, category: p.category })) });
    h.fetch.mockImplementation(() => json({ list: null }));
    render(<StartFlow />);
    expect(await screen.findByText(/Your first list is saved\. We could not load its places just now/)).toBeTruthy();
    expect(screen.getByText("Keep this list")).toBeTruthy();
  });

  it("works when storage is not available: the list still shows", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<StartFlow />);
    await answerAndSubmit();
    expect(await screen.findByText("Place 1")).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe("keeping the list once there is an account", () => {
  const picks = LIST.places.slice(0, 3).map((p) => ({ experienceId: p.id, tags: p.tags, category: p.category }));

  it("saves the places to the account, forgets the list in the browser, and says so once", async () => {
    writeFirstList({ outing: "meal", budget: "low", picks });
    render(<ClaimFirstList />);
    await waitFor(() => expect(calls("/api/start/claim")).toHaveLength(1));
    expect(JSON.parse(calls("/api/start/claim")[0][1].body)).toEqual({ picks });
    await waitFor(() => expect(readFirstList()).toBeNull());
    expect(h.toast.success).toHaveBeenCalledWith("Kept. Your first list is in Saved.");
    expect(h.toast.success).toHaveBeenCalledTimes(1);
  });

  it("does nothing, and asks for nothing, when there is no list", async () => {
    render(<ClaimFirstList />);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("leaves the list where it is, to try again on the next page, if it could not be kept", async () => {
    writeFirstList({ outing: "meal", budget: "low", picks });
    h.fetch.mockImplementation(() => Promise.reject(new Error("offline")));
    render(<ClaimFirstList />);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(readFirstList()).not.toBeNull();
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it("drops a list the server refuses as malformed, since trying again cannot help", async () => {
    writeFirstList({ outing: "meal", budget: "low", picks });
    h.fetch.mockImplementation(() => json({ error: "That is not a list." }, 400));
    render(<ClaimFirstList />);
    await waitFor(() => expect(readFirstList()).toBeNull());
    expect(h.toast.success).not.toHaveBeenCalled();
  });
});
