/**
 * Seed Runner — Populates Hugh's knowledge_base via Convex mutations
 *
 * Usage: npx tsx scripts/runSeed.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { KNOWLEDGE_ENTRIES } from "./seedKnowledge";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://admired-goldfish-243.convex.cloud";

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log(`[Seed] Connecting to ${CONVEX_URL}`);
  console.log(`[Seed] ${KNOWLEDGE_ENTRIES.length} entries to seed\n`);

  let success = 0;
  let skipped = 0;

  for (const entry of KNOWLEDGE_ENTRIES) {
    try {
      await client.mutation(api.pheromones.seedKnowledge, {
        category: entry.category as any,
        title: entry.title,
        content: entry.content,
        priority: entry.priority,
        sourceDoc: entry.sourceDoc,
      });
      console.log(`  ✓ [${entry.category}] ${entry.title}`);
      success++;
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        console.log(`  ○ [${entry.category}] ${entry.title} (exists)`);
        skipped++;
      } else {
        console.error(`  ✗ [${entry.category}] ${entry.title}: ${error.message}`);
      }
    }
  }

  console.log(`\n[Seed] Complete: ${success} inserted, ${skipped} skipped`);

  // Summary by category
  const cats = new Map<string, number>();
  for (const e of KNOWLEDGE_ENTRIES) {
    cats.set(e.category, (cats.get(e.category) || 0) + 1);
  }
  console.log("\n[Seed] Knowledge distribution:");
  for (const [cat, count] of cats) {
    console.log(`  ${cat}: ${count} entries`);
  }
}

main().catch(console.error);
