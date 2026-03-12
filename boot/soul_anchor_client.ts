/**
 * Soul Anchor — Client Boot Gate
 *
 * Browser-side verification that the H.U.G.H. runtime has passed
 * hardware root-of-trust validation before the Workshop UI mounts.
 *
 * Server-side cryptographic verification: boot/soul_anchor.ts (Node.js)
 * Client-side gate: This file (browser — calls runtime API)
 *
 * Flow:
 *   Browser boot → fetch /api/health → confirm soul_anchor_verified → mount React
 *   If runtime unreachable → degrade gracefully with warning banner
 *   If runtime says NOT verified → hard halt (actual integrity violation)
 */

const RUNTIME_HEALTH = '/api/health';
const HEALTH_TIMEOUT_MS = 3000;

export type SoulAnchorStatus = 'verified' | 'degraded' | 'halted';

export interface SoulAnchorResult {
  status: SoulAnchorStatus;
  reason?: string;
}

/**
 * Verify that the H.U.G.H. runtime has passed Soul Anchor validation.
 * Must be awaited before React mounts.
 *
 * Returns:
 * - verified: API confirmed soul anchor — full trust
 * - degraded: API unreachable/timed out — proceed with warning banner
 * - halted:   API confirmed soul anchor is NOT valid — hard stop
 */
export async function verifySoulAnchor(): Promise<SoulAnchorResult> {
  console.log(
    "\n═══════════════════════════════════════════\n" +
    "  H.U.G.H. — Soul Anchor Client Gate\n" +
    "  Verifying runtime identity...\n" +
    "═══════════════════════════════════════════\n"
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    const res = await fetch(RUNTIME_HEALTH, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      // Server responded but with an error status — treat as unreachable
      console.warn(`[Soul Anchor] Runtime health returned ${res.status} ${res.statusText}`);
      return {
        status: 'degraded',
        reason: `Runtime health endpoint returned ${res.status}`,
      };
    }

    const data = await res.json();

    if (data.soul_anchor_verified === false) {
      // Runtime explicitly reports anchor NOT verified — genuine integrity violation
      console.error("[Soul Anchor] INTEGRITY VIOLATION: Runtime reports anchor unverified.");
      return {
        status: 'halted',
        reason: "Runtime is running but Soul Anchor is NOT verified. Hardware identity unconfirmed.",
      };
    }

    if (data.soul_anchor_verified !== true) {
      // Unexpected response shape — degrade, don't halt
      console.warn("[Soul Anchor] Unexpected health response — missing soul_anchor_verified field.");
      return {
        status: 'degraded',
        reason: "Runtime health response did not include soul_anchor_verified field.",
      };
    }

    console.log("[Soul Anchor] Runtime identity confirmed ✓");
    console.log("[Soul Anchor] Hardware root of trust: ACTIVE\n");
    return { status: 'verified' };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    if (isTimeout) {
      console.warn(`[Soul Anchor] Runtime health timed out after ${HEALTH_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[Soul Anchor] Runtime unreachable: ${msg}`);
    }

    if (import.meta.env.DEV) {
      console.warn(
        "[Soul Anchor] Development mode — continuing without verification.\n"
      );
    }

    // Network failure / timeout = not an integrity violation, just unreachable
    return {
      status: 'degraded',
      reason: isTimeout
        ? `Runtime API timed out after ${HEALTH_TIMEOUT_MS}ms`
        : `Runtime API unreachable: ${msg}`,
    };
  }
}
