/**
 * Track 3C — page interpretation layer unit tests.
 *
 * Pure unit tests for `buildPageRepresentation` (no D1, no providers).
 * The worker must never leak raw Excalidraw scene JSON or image data to the
 * AI layer, and must never throw on malformed scenes.
 */
import { describe, it, expect } from "vitest";
import {
  buildPageRepresentation,
  PageRepresentationSchema,
  PAGE_TEXT_MAX_CHARS,
  PAGE_RELATIONSHIPS_MAX,
  PAGE_REPRESENTATION_MAX_CHARS,
} from "../src/ai/interpret";

/** Marker buried in the raw scene; it must NEVER reach a model. */
const FIXTURE_MARKER = "fixture-secret-marker";

/** Well-formed Excalidraw scene exercising every extraction path. */
function fixtureScene(): unknown {
  return {
    type: "excalidraw",
    version: 7,
    elements: [
      { id: "el_title", type: "text", text: "Design review notes", isDeleted: false },
      { id: "el_rect", type: "rectangle", text: "Container label", backgroundColor: FIXTURE_MARKER, isDeleted: false },
      { id: "el_label", type: "text", text: "Bound label text", containerId: "el_rect", isDeleted: false },
      {
        id: "el_arrow", type: "arrow",
        startBinding: { elementId: "el_title" }, endBinding: { elementId: "el_rect" },
        isDeleted: false,
      },
      { id: "el_frame", type: "frame", name: "Overview", isDeleted: false },
      { id: "el_in_frame", type: "rectangle", frameId: "el_frame", isDeleted: false },
      { id: "el_img", type: "image", fileId: "file_1", link: "https://example.com/design", isDeleted: false },
      { id: "el_link2", type: "text", text: "Linked", link: "https://example.com/design", isDeleted: false },
      { id: "el_deleted", type: "text", text: "Should not appear", isDeleted: true },
      { id: "el_deleted_img", type: "image", fileId: "file_2", isDeleted: true },
    ],
    files: {
      file_1: { mimeType: "image/png", dataURL: "data:image/png;base64,AAAA" },
      file_2: { mimeType: "image/png", dataURL: "data:image/png;base64,BBBB" },
    },
    appState: { viewBackgroundColor: "#ffffff" },
  };
}

function render(scene: unknown, overrides: Partial<{ pageId: string; title: string; kind: string; body: string }> = {}) {
  return buildPageRepresentation({
    pageId: "note_1",
    title: "Design Review",
    kind: "excalidraw",
    scene: JSON.stringify(scene),
    body: "",
    ...overrides,
  });
}

describe("buildPageRepresentation (unit)", () => {
  it("builds a complete representation from a well-formed scene", () => {
    const rep = render(fixtureScene());

    expect(rep).toEqual({
      page_id: "note_1",
      title: "Design Review",
      text: "Design review notes\nContainer label\nBound label text\nContainer label\nLinked",
      structure: {
        element_counts: { text: 3, rectangle: 2, arrow: 1, frame: 1, image: 1 },
        sections: [{ name: "Overview", element_count: 1 }],
      },
      relationships: [{ from: "Design review notes", to: "Container label" }],
      images: { count: 1, mime_types: ["image/png"], total_bytes_approx: 3 },
      links: [{ url: "https://example.com/design", count: 2 }],
      version: 7,
    });

    // The representation itself satisfies the schema.
    expect(PageRepresentationSchema.safeParse(rep).success).toBe(true);
  });

  it("never leaks raw scene internals, image data, or deleted elements", () => {
    const json = JSON.stringify(render(fixtureScene()));

    // Raw Excalidraw scene fields — the model must never see them.
    expect(json).not.toContain("startBinding");
    expect(json).not.toContain("containerId");
    expect(json).not.toContain(FIXTURE_MARKER);
    // Image data — metadata only.
    expect(json).not.toContain("dataURL");
    expect(json).not.toContain("AAAA");
    expect(json).not.toContain("BBBB");
    expect(json).not.toContain("file_2");
    // Deleted elements are excluded from text/structure/relationships/images.
    expect(json).not.toContain("Should not appear");
    expect(json).not.toContain("el_deleted_img");
  });

  it("falls back to a text representation for malformed scene JSON (never throws)", () => {
    const rep = render("{ definitely not json");
    expect(rep).toEqual({
      page_id: "note_1",
      title: "Design Review",
      text: "Design Review",
      structure: { element_counts: {}, sections: [] },
      relationships: [],
      images: { count: 0, mime_types: [], total_bytes_approx: 0 },
      links: [],
      version: 1,
    });
  });

  it("falls back for a scene without an elements array", () => {
    const rep = render({ type: "excalidraw", version: 3 });
    expect(rep.structure).toEqual({ element_counts: {}, sections: [] });
    expect(rep.relationships).toEqual([]);
    expect(rep.version).toBe(1);
  });

  it("ignores the scene entirely for kind=text notes", () => {
    const rep = buildPageRepresentation({
      pageId: "note_2",
      title: "Plain note",
      kind: "text",
      scene: JSON.stringify(fixtureScene()),
      body: "Just some words.",
    });
    expect(rep.text).toBe("Plain note\n\nJust some words.");
    expect(rep.structure).toEqual({ element_counts: {}, sections: [] });
    expect(rep.relationships).toEqual([]);
    expect(rep.images.count).toBe(0);
    expect(rep.links).toEqual([]);
    expect(rep.version).toBe(1);
  });

  it("defaults version to 1 when the scene has no version", () => {
    const scene = fixtureScene() as { version?: number };
    delete scene.version;
    expect(render(scene).version).toBe(1);
  });

  it("truncates page text at PAGE_TEXT_MAX_CHARS with a marker", () => {
    const elements = Array.from({ length: 90 }, (_, i) => ({
      id: `t${i}`, type: "text", text: `lorem ipsum dolor sit amet consectetur adipiscing elit ${i}`.padEnd(100, "x"),
      isDeleted: false,
    }));
    const rep = render({ type: "excalidraw", version: 1, elements });

    expect(rep.text.length).toBeLessThanOrEqual(PAGE_TEXT_MAX_CHARS);
    expect(rep.text.endsWith("\n…[truncated]")).toBe(true);
  });

  it("caps relationships at PAGE_RELATIONSHIPS_MAX", () => {
    const elements: unknown[] = [];
    for (let i = 0; i < 250; i++) {
      elements.push({ id: `a${i}`, type: "arrow", startBinding: { elementId: `s${i}` }, endBinding: { elementId: `e${i}` }, isDeleted: false });
      elements.push({ id: `s${i}`, type: "text", text: `start ${i}`, isDeleted: false });
      elements.push({ id: `e${i}`, type: "text", text: `end ${i}`, isDeleted: false });
    }
    const rep = render({ type: "excalidraw", version: 1, elements });

    expect(rep.relationships.length).toBe(PAGE_RELATIONSHIPS_MAX);
    expect(rep.relationships[0]).toEqual({ from: "start 0", to: "end 0" });
    expect(rep.relationships[PAGE_RELATIONSHIPS_MAX - 1]).toEqual({ from: "start 199", to: "end 199" });
  });

  it("drops links when the serialized representation exceeds the cap", () => {
    const elements: unknown[] = [];
    for (let i = 0; i < 500; i++) {
      elements.push({ id: `l${i}`, type: "text", text: `t${i}`, link: `https://example.com/link/${i}`, isDeleted: false });
    }
    const rep = render({ type: "excalidraw", version: 1, elements });

    expect(JSON.stringify(rep).length).toBeLessThanOrEqual(PAGE_REPRESENTATION_MAX_CHARS);
    expect(rep.links).toEqual([]);
    // Text survives (dropping links was enough) — nothing was truncated away.
    expect(rep.text).toContain("t499");
  });

  it("shrinks text further when dropping links is not enough", () => {
    // Lots of links (dropped first) + 200 arrow relationships + a full 8k
    // text window still exceed the cap, so the text must shrink to fit.
    const elements: unknown[] = [];
    for (let i = 0; i < 1000; i++) {
      elements.push({ id: `l${i}`, type: "text", text: `text ${i}`, link: `https://example.com/link/${i}`, isDeleted: false });
    }
    for (let i = 0; i < 250; i++) {
      elements.push({ id: `a${i}`, type: "arrow", startBinding: { elementId: `s${i}` }, endBinding: { elementId: `e${i}` }, isDeleted: false });
      elements.push({ id: `s${i}`, type: "text", text: `s${i}`, isDeleted: false });
      elements.push({ id: `e${i}`, type: "text", text: `e${i}`, isDeleted: false });
    }
    const rep = render({ type: "excalidraw", version: 1, elements });

    expect(JSON.stringify(rep).length).toBeLessThanOrEqual(PAGE_REPRESENTATION_MAX_CHARS);
    expect(rep.links).toEqual([]);
    expect(rep.relationships.length).toBe(PAGE_RELATIONSHIPS_MAX);
    expect(rep.text.endsWith("\n…[truncated]")).toBe(true);
  });
});
