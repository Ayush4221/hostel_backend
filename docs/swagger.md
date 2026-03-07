# Swagger / OpenAPI (Zod)

## Overview

The API uses **Zod** schemas and **@asteasolutions/zod-to-openapi** to build the OpenAPI 3 spec. One source of truth: define schemas and paths in `src/openapi/spec.ts`; the same Zod schemas can be used for optional request validation.

- **Schemas:** Zod schemas (e.g. `LoginRequestSchema`, `LoginResponseSchema`) with `.openapi("Name")` for the spec.
- **Paths:** Registered via `registry.registerPath({ method, path, request, responses })`.
- **No codegen:** No tsoa or separate spec file; run the app and the spec is built at runtime from the Zod definitions.

## Configuration

| File | Purpose |
|------|--------|
| `src/openapi/spec.ts` | Zod schemas, path registration, and `getOpenApiSpec()` that returns the OpenAPI document. |
| `src/server.ts` | Calls `getOpenApiSpec()` and serves Swagger UI at `/api-docs` and the spec at `/api-docs.json` (non-production only). |

## Adding or changing APIs

1. **Schemas:** In `src/openapi/spec.ts`, add or update Zod schemas with `.openapi("SchemaName")`.
2. **Paths:** Call `registry.registerPath({ method, path, summary, request: { body: { content: { "application/json": { schema: YourSchema } } } }, responses: { ... } })`.
3. **Server:** No build step; restart the app and the spec updates. Optionally use the exported schemas (e.g. `LoginRequestSchema`) in a validation middleware to validate `req.body` with `schema.safeParse(req.body)`.

## Availability

| Environment   | Swagger UI   | Raw spec     |
|---------------|-------------|-------------|
| Non-production| Available   | Available   |
| Production    | Not mounted | Not mounted |

## URLs

- **Swagger UI:** `http://localhost:5000/api-docs`
- **OpenAPI spec:** `http://localhost:5000/api-docs.json` (for Postman, etc.)

## Dependencies

- `zod` – schemas and optional validation.
- `@asteasolutions/zod-to-openapi` – builds OpenAPI 3 doc from Zod schemas and path registration.
- `swagger-ui-express` – serves the UI and spec.

## Related files

| File | Purpose |
|------|--------|
| `src/openapi/spec.ts` | All Zod schemas, path definitions, and `getOpenApiSpec()`. Exports schemas for optional validation. |
| `src/server.ts` | Mounts auth, password, and other Express routes; in non-production, serves Swagger from `getOpenApiSpec()`. |
