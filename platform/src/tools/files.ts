/**
 * Files tools (v2.0 R2 attachments) — registered in the single Tool Registry
 * so MCP/AI clients and REST share one implementation.
 *
 * Binary transport here is Base64 inside JSON (what JSON-based protocols can
 * carry). The REST layer offers multipart upload + raw-binary download over
 * the SAME FileRepository — no duplicated logic.
 */
import { z } from "zod";
import type { Tool } from "../registry";
import { ToolRegistryError } from "../registry";
import { FileError } from "../storage/repositories";

const FileUpload = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1),
  /** Base64-encoded payload. */
  data_base64: z.string().min(1),
});

const FileGet = z.object({
  id: z.string(),
  /** When true, the handler also returns `data_base64` (for agents that need the content). */
  include_data: z.boolean().optional(),
});

const FileList = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});

const FileDelete = z.object({ id: z.string() });

/** Decode a base64 string to bytes (chunked — safe for multi-MiB payloads). */
function base64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

function wrapFileErrors(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    return fn().catch((e) => {
      if (e instanceof FileError) {
        const code =
          e.code === "not_configured" ? "not_configured" : e.code === "not_found" ? "not_found" : "invalid_input";
        throw new ToolRegistryError(code, e.message);
      }
      throw e;
    });
  } catch (e) {
    return Promise.reject(e);
  }
}

export const fileUploadTool: Tool<typeof FileUpload> = {
  name: "file_upload",
  description:
    "Upload a file attachment (max 25 MiB, MIME allowlisted) to the user's personal file store. " +
    "Pass the payload as base64 in `data_base64`. Returns the file metadata (id, filename, mime, size).",
  schema: FileUpload,
  examples: ["file_upload({ filename: 'idea.png', mime_type: 'image/png', data_base64: '...' })"],
  handler: (ctx, input) =>
    wrapFileErrors(async () => {
      const body = base64ToBytes(input.data_base64);
      return ctx.repos.files.upload(ctx.user.sub, {
        filename: input.filename,
        mime_type: input.mime_type,
        body,
      });
    }),
};

export const fileListTool: Tool<typeof FileList> = {
  name: "file_list",
  description: "List the user's uploaded files (metadata only), newest first.",
  schema: FileList,
  examples: ["file_list({ limit: 20 })"],
  handler: (ctx, input) => ctx.repos.files.list(ctx.user.sub, input.limit ?? 100),
};

export const fileGetTool: Tool<typeof FileGet> = {
  name: "file_get",
  description:
    "Get one file's metadata, and — with include_data: true — its base64 content. " +
    "Only the authenticated user's own files can be read.",
  schema: FileGet,
  examples: ["file_get({ id: 'file_…', include_data: true })"],
  handler: (ctx, input) =>
    wrapFileErrors(async () => {
      if (!input.include_data) {
        const meta = await ctx.repos.files.getMeta(ctx.user.sub, input.id);
        if (!meta) throw new FileError("not_found", `File "${input.id}" not found`);
        return meta;
      }
      const file = await ctx.repos.files.get(ctx.user.sub, input.id);
      if (!file) throw new FileError("not_found", `File "${input.id}" not found`);
      const bin = new Uint8Array(file.body);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bin.length; i += CHUNK) {
        binary += String.fromCharCode(...bin.subarray(i, i + CHUNK));
      }
      return { ...file.meta, data_base64: btoa(binary) };
    }),
};

export const fileDeleteTool: Tool<typeof FileDelete> = {
  name: "file_delete",
  description: "Delete one of the user's files (D1 metadata + R2 object). Scoped to the caller.",
  schema: FileDelete,
  examples: ["file_delete({ id: 'file_…' })"],
  handler: (ctx, input) =>
    wrapFileErrors(async () => {
      const removed = await ctx.repos.files.delete(ctx.user.sub, input.id);
      if (!removed) throw new FileError("not_found", `File "${input.id}" not found`);
      return { removed: true };
    }),
};