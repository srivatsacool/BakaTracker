/**
 * Test-only stub for the CJS-only `ajv` package.
 *
 * Why: @modelcontextprotocol/sdk statically imports AjvJsonSchemaValidator
 * (its default validator), which pulls in `ajv`. ajv is CJS and its
 * require("./refs/data.json") breaks workerd's CJS→ESM shim under
 * vitest-pool-workers. The platform never uses AjvJsonSchemaValidator — it
 * injects CfWorkerJsonSchemaValidator — so ajv only needs to *load*, never
 * to work. Plain .js (not .ts) so workerd can load it natively.
 */
export default class Ajv {
  compile() {
    throw new Error("ajv stub: AjvJsonSchemaValidator is not used by the platform");
  }
}