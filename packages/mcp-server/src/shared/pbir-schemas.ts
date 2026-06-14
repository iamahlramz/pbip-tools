/**
 * Microsoft-published PBIR JSON Schema URLs that pbip-tools writers attach
 * to the top of every generated PBIR document.
 *
 * Bump these constants together when new schema versions ship under
 * https://github.com/microsoft/json-schemas/tree/main/fabric/item/report/definition
 *
 * Versions verified against the upstream repo on 2026-06-04.
 *
 * See Issue #5 in `libs/config/pbip-tools_issues.md` for the why.
 */

const SCHEMA_BASE = 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition';

/** `$schema` URL for `page.json` (page metadata: filters, layout, dimensions). */
export const PBIR_PAGE_SCHEMA_URL = `${SCHEMA_BASE}/page/2.1.0/schema.json`;

/** `$schema` URL for `visual.json` (visual container metadata: visualType, query, formatting). */
export const PBIR_VISUAL_CONTAINER_SCHEMA_URL = `${SCHEMA_BASE}/visualContainer/2.9.0/schema.json`;
