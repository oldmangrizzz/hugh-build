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
 *   If runtime unreachable or unverified → halt UI in production, warn in dev
 */

const RUNTIME_HEALTH = '/api/health';

/**
 * Verify that the H.U.G.H. runtime has passed Soul Anchor validation.
 * Must be awaited before React mounts.
 *
 * @returns true if verified (safe to mount), false if halted
 */
export async function verifySoulAnchor(): Promise<boolean> {
  console.log(
    "\n═══════════════════════════════════════════\n" +
    "  H.U.G.H. — Soul Anchor Client Gate\n" +
    "  Verifying runtime identity...\n" +
    "═══════════════════════════════════════════\n"
  );

  try {
    const res = await fetch(RUNTIME_HEALTH);

    if (!res.ok) {
      throw new Error(`Runtime health returned ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.soul_anchor_verified !== true) {
      throw new Error(
        "Runtime is running but Soul Anchor is NOT verified. " +
        "Hardware identity unconfirmed."
      );
    }

    console.log("[Soul Anchor] Runtime identity confirmed ✓");
    console.log("[Soul Anchor] Hardware root of trust: ACTIVE\n");
    return true;

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Soul Anchor] VERIFICATION FAILED: ${msg}`);

    if (import.meta.env.DEV) {
      console.warn(
        "[Soul Anchor] Development mode — continuing without verification.\n" +
        "[Soul Anchor] In production, this WILL halt the application.\n"
      );
      return true;
    }

    console.error(
      "[Soul Anchor] Production boot halted.\n" +
      "[Soul Anchor] Runtime unreachable or unverified — refusing to render.\n"
    );
    return false;
  }
}
