/**
 * Excalidraw page interpretation — worker-safe scene → plain-text representation.
 *
 * Track 3C: this module is SELF-CONTAINED. It must NEVER import
 * `@excalidraw/excalidraw` — that package is client-only and cannot load in the
 * Worker. It parses the serialized scene JSON defensively and reduces it to
 * metadata + text that the AI layer can consume. Raw scene JSON is NEVER
 * passed to a model: routes feed `JSON.stringify(buildPageRepresentation(...))`
 * as the USER message instead.
 *
 * Guarantees:
 *   - never throws on malformed input (falls back to a text representation)
 *   - never includes image data (no dataURLs, no pixel data) — metadata only
 *   - bounded output: text ≤ 8000 chars, relationships ≤ 200, serialized
 *     representation ≤ ~12000 chars
 */
import { z } from "zod";

/** Hard cap on the concatenated page text inside a representation. */
export const PAGE_TEXT_MAX_CHARS = 8_000;
/** Hard cap on extracted arrow relationships. */
export const PAGE_RELATIONSHIPS_MAX = 200;
/** Hard cap on the JSON-serialized representation (fits the AI window). */
export const PAGE_REPRESENTATION_MAX_CHARS = 12_000;
/** Max length of a relationship label pulled from a bound element's text. */
const RELATIONSHIP_LABEL_MAX = 100;
/** Marker appended when a field is truncated. */
const TRUNCATION_MARKER = "\n…[truncated]";

/** The interpreted page representation (zod-validated shape, model-safe). */
export const PageRepresentationSchema = z.object({
  page_id: z.string(),
  title: z.string(),
  text: z.string(),
  structure: z.object({
    /** Element-type histogram of non-deleted elements (getNonDeletedElements). */
    element_counts: z.record(z.string(), z.number()),
    /** Frames → sections: frame name + count of members (via frameId). */
    sections: z.array(z.object({ name: z.string(), element_count: z.number() })),
  }),
  /** Arrows with startBinding/endBinding → bound element text (or id). */
  relationships: z.array(z.object({ from: z.string(), to: z.string() })),
  /** IMAGE METADATA ONLY — count, mime types, approx bytes. Never dataURLs. */
  images: z.object({
    count: z.number(),
    mime_types: z.array(z.string()),
    total_bytes_approx: z.number(),
  }),
  /** Unique element.link URLs + how many elements carry each. */
  links: z.array(z.object({ url: z.string(), count: z.number() })),
  /** scene.version ?? 1. */
  version: z.number(),
});
export type PageRepresentation = z.infer<typeof PageRepresentationSchema>;

export interface PageRepresentationInput {
  pageId: string;
  title: string;
  kind: string;
  scene: string | null;
  body: string;
}

/** Minimal structural view of an Excalidraw element (defensive typing). */
interface SceneElement {
  id?: unknown;
  type?: unknown;
  text?: unknown;
  containerId?: unknown;
  startBinding?: unknown;
  endBinding?: unknown;
  fileId?: unknown;
  link?: unknown;
  isDeleted?: unknown;
  frameId?: unknown;
  name?: unknown;
}

function isElement(v: unknown): v is SceneElement {
  return !!v && typeof v === "object";
}

function isScene(v: unknown): v is { version?: unknown; elements: unknown[]; files?: unknown } {
  return !!v && typeof v === "object" && Array.isArray((v as { elements?: unknown }).elements);
}

/**
 * Build a model-safe representation of a note/page.
 *
 * For `kind !== "excalidraw"`, or when the scene is missing / malformed /
 * not an object with an elements array, this falls back to a plain text
 * representation (title + body, no structure) — it never throws.
 */
export function buildPageRepresentation(input: PageRepresentationInput): PageRepresentation {
  let scene: unknown = null;
  if (input.kind === "excalidraw" && typeof input.scene === "string" && input.scene.trim() !== "") {
    try {
      scene = JSON.parse(input.scene);
    } catch {
      scene = null;
    }
  }

  if (!isScene(scene)) {
    return textFallback(input);
  }

  // getNonDeletedElements equivalent: isDeleted !== true (missing → kept).
  const elements = (scene.elements as unknown[]).filter(isElement).filter((el) => el.isDeleted !== true);
  const byId = new Map<string, SceneElement>();
  for (const el of elements) {
    if (typeof el.id === "string" && el.id !== "") byId.set(el.id, el);
  }

  return enforceSerializedBound({
    page_id: input.pageId,
    title: input.title,
    text: buildText(elements, byId),
    structure: buildStructure(elements),
    relationships: buildRelationships(elements, byId),
    images: buildImages(elements, scene.files),
    links: buildLinks(elements),
    version: typeof scene.version === "number" && Number.isFinite(scene.version) ? scene.version : 1,
  });
}

// --- text -------------------------------------------------------------------

/**
 * Concatenated page text: every non-deleted element's own `text`, plus the
 * text of containers that elements are bound to (containerId → container text,
 * i.e. shape labels). Bounded to PAGE_TEXT_MAX_CHARS with a truncation marker.
 */
function buildText(elements: SceneElement[], byId: Map<string, SceneElement>): string {
  const parts: string[] = [];
  for (const el of elements) {
    if (typeof el.text === "string" && el.text.trim() !== "") {
      parts.push(el.text.trim());
    }
    if (typeof el.containerId === "string" && el.containerId !== "") {
      const container = byId.get(el.containerId);
      if (container && typeof container.text === "string" && container.text.trim() !== "") {
        parts.push(container.text.trim());
      }
    }
  }
  return truncateText(parts.join("\n"), PAGE_TEXT_MAX_CHARS);
}

/** Plain-text fallback for text notes and unparseable/missing scenes. */
function textFallback(input: PageRepresentationInput): PageRepresentation {
  return {
    page_id: input.pageId,
    title: input.title,
    text: truncateText(`${input.title}\n\n${input.body ?? ""}`.trim(), PAGE_TEXT_MAX_CHARS),
    structure: { element_counts: {}, sections: [] },
    relationships: [],
    images: { count: 0, mime_types: [], total_bytes_approx: 0 },
    links: [],
    version: 1,
  };
}

// --- structure --------------------------------------------------------------

/** Element-type histogram + frame sections (name + member count via frameId). */
function buildStructure(elements: SceneElement[]): PageRepresentation["structure"] {
  const element_counts: Record<string, number> = {};
  for (const el of elements) {
    const type = typeof el.type === "string" && el.type !== "" ? el.type : "unknown";
    element_counts[type] = (element_counts[type] ?? 0) + 1;
  }

  const sections: { name: string; element_count: number }[] = [];
  for (const el of elements) {
    if (el.type !== "frame") continue;
    const name =
      typeof el.name === "string" && el.name.trim() !== ""
        ? el.name.trim()
        : typeof el.id === "string"
          ? el.id
          : "frame";
    const members = elements.filter((m) => m.frameId === el.id).length;
    sections.push({ name, element_count: members });
  }

  return { element_counts, sections };
}

// --- relationships ----------------------------------------------------------

/**
 * Arrows with startBinding/endBinding → {from, to}. Labels use the bound
 * element's text when available (capped), else the element id. Capped at
 * PAGE_RELATIONSHIPS_MAX entries.
 */
function buildRelationships(
  elements: SceneElement[],
  byId: Map<string, SceneElement>,
): PageRepresentation["relationships"] {
  const out: { from: string; to: string }[] = [];
  for (const el of elements) {
    if (out.length >= PAGE_RELATIONSHIPS_MAX) break;
    const from = bindingElementId(el.startBinding);
    const to = bindingElementId(el.endBinding);
    if (!from || !to) continue;
    out.push({ from: elementLabel(from, byId), to: elementLabel(to, byId) });
  }
  return out;
}

function bindingElementId(binding: unknown): string | null {
  if (!binding || typeof binding !== "object") return null;
  const id = (binding as { elementId?: unknown }).elementId;
  return typeof id === "string" && id !== "" ? id : null;
}

function elementLabel(id: string, byId: Map<string, SceneElement>): string {
  const el = byId.get(id);
  if (el && typeof el.text === "string" && el.text.trim() !== "") {
    const t = el.text.trim();
    return t.length > RELATIONSHIP_LABEL_MAX ? `${t.slice(0, RELATIONSHIP_LABEL_MAX)}…` : t;
  }
  return id;
}

// --- images (metadata ONLY) -------------------------------------------------

/**
 * Image metadata: counts files referenced by NON-deleted elements, unique
 * mime types, and approximate total bytes. dataURLs are never included —
 * byte size is derived as ≈ (payload.length * 3/4) for base64.
 */
function buildImages(elements: SceneElement[], files: unknown): PageRepresentation["images"] {
  const seen = new Map<string, { mimeType: string | null; bytes: number }>();

  // Only files referenced by a live (non-deleted) element count.
  const referenced: string[] = [];
  for (const el of elements) {
    if (typeof el.fileId === "string" && el.fileId !== "" && !referenced.includes(el.fileId)) {
      referenced.push(el.fileId);
    }
  }
  if (files && typeof files === "object") {
    const fileMap = files as Record<string, unknown>;
    for (const fileId of referenced) {
      const f = fileMap[fileId];
      if (!f || typeof f !== "object") continue;
      const entry = f as { mimeType?: unknown; dataURL?: unknown };
      seen.set(fileId, {
        mimeType: typeof entry.mimeType === "string" && entry.mimeType !== "" ? entry.mimeType : null,
        bytes: dataUrlBytes(entry.dataURL),
      });
    }
  }
  // Live image elements without a files entry still count (no metadata).
  for (const el of elements) {
    if (el.type === "image" && typeof el.fileId === "string" && el.fileId !== "" && !seen.has(el.fileId)) {
      seen.set(el.fileId, { mimeType: null, bytes: 0 });
    }
  }

  const mime_types = [...new Set([...seen.values()].map((v) => v.mimeType).filter((m): m is string => m !== null))].sort();
  const total_bytes_approx = [...seen.values()].reduce((sum, v) => sum + v.bytes, 0);
  return { count: seen.size, mime_types, total_bytes_approx };
}

/** Approximate base64 byte size of a dataURL (metadata only — never stored). */
function dataUrlBytes(dataUrl: unknown): number {
  if (typeof dataUrl !== "string" || dataUrl === "") return 0;
  const comma = dataUrl.indexOf(",");
  const payload = (comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl).replace(/\s/g, "");
  return Math.floor((payload.length * 3) / 4);
}

// --- links ------------------------------------------------------------------

/** Unique element.link URLs + count of elements carrying each. */
function buildLinks(elements: SceneElement[]): PageRepresentation["links"] {
  const counts = new Map<string, number>();
  for (const el of elements) {
    if (typeof el.link === "string" && el.link.trim() !== "") {
      const url = el.link.trim();
      counts.set(url, (counts.get(url) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([url, count]) => ({ url, count }));
}

// --- bounds -----------------------------------------------------------------

function truncateText(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  const keep = Math.max(0, max - TRUNCATION_MARKER.length);
  return `${text.slice(0, keep)}${TRUNCATION_MARKER}`;
}

/**
 * Enforce the serialized cap (~12k chars): keep as-is if it fits; otherwise
 * drop links first, then shrink the text until it fits.
 */
function enforceSerializedBound(rep: PageRepresentation): PageRepresentation {
  const size = (r: PageRepresentation) => JSON.stringify(r).length;
  if (size(rep) <= PAGE_REPRESENTATION_MAX_CHARS) return rep;

  const noLinks: PageRepresentation = { ...rep, links: [] };
  if (size(noLinks) <= PAGE_REPRESENTATION_MAX_CHARS) return noLinks;

  const overhead = size({ ...noLinks, text: "" });
  const budget = Math.max(0, PAGE_REPRESENTATION_MAX_CHARS - overhead);
  let text = truncateText(rep.text, budget);
  let out: PageRepresentation = { ...noLinks, text };
  // Converge: JSON escaping can inflate past the raw char budget.
  while (text.length > 0 && size(out) > PAGE_REPRESENTATION_MAX_CHARS) {
    const excess = size(out) - PAGE_REPRESENTATION_MAX_CHARS;
    text = truncateText(text, text.length - excess - 1);
    out = { ...noLinks, text };
  }
  return out;
}
