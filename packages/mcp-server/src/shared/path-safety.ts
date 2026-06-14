import { relative, resolve, sep } from 'node:path';

/**
 * PBIR object identifier allowlist. Per Microsoft's PBIR docs, page and visual
 * names "must consist of one or more word characters (letters, digits,
 * underscores) or hyphens" — that's exactly the safe filename character set
 * for both Windows and POSIX. We accept the same set for object IDs that
 * become folder names.
 *
 * Source: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report#pbir-naming-convention
 */
const SAFE_PBIR_IDENTIFIER = /^[A-Za-z0-9_-]+$/;

/**
 * Validate a user-supplied PBIR object identifier (pageId, visualId, etc.) and
 * confirm the resolved path stays under the supplied root. Defends against
 * CWE-22 path traversal: `..`, absolute paths, drive letters, UNC paths, and
 * embedded separators (`/`, `\`) all fail the allowlist.
 *
 * Returns the resolved absolute path for the caller to use.
 */
export function safeJoinUnderRoot(
  rootPath: string,
  identifier: string,
  field: string,
  ...additionalSegments: string[]
): string {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  if (!SAFE_PBIR_IDENTIFIER.test(identifier)) {
    throw new Error(
      `${field} must match /^[A-Za-z0-9_-]+$/ (Microsoft PBIR naming convention); supplied value was ${JSON.stringify(identifier)}`,
    );
  }
  // Defense-in-depth: validate every additional segment with the same rules.
  for (const seg of additionalSegments) {
    if (typeof seg !== 'string' || seg.length === 0 || !SAFE_PBIR_IDENTIFIER.test(seg)) {
      throw new Error(
        `Path segment must match /^[A-Za-z0-9_-]+$/; supplied value was ${JSON.stringify(seg)}`,
      );
    }
  }

  const absoluteRoot = resolve(rootPath);
  const joined = resolve(absoluteRoot, identifier, ...additionalSegments);

  // Final containment check — protect against any edge case the allowlist
  // missed (Unicode normalisation, encoding tricks, etc.).
  const rel = relative(absoluteRoot, joined);
  if (rel.length === 0 || rel.startsWith('..') || rel.split(sep).includes('..')) {
    throw new Error(
      `${field} resolved to a path outside the report root; supplied value was ${JSON.stringify(identifier)}`,
    );
  }

  return joined;
}
