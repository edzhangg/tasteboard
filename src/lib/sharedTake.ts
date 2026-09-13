import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { z } from "zod";
import { fmtScore } from "./format";
import { personAverage } from "./scores";
import { TIER_WORD, tierOf } from "./tiers";
import type { Place, SharedTake } from "./types";

/**
 * Haiku-tier is plenty for three bullets, and this is the cheapest capable
 * model. Set a spend cap in the Anthropic console as a backstop.
 */
const MODEL = "claude-haiku-4-5";

/**
 * The cache key for a place's shared take.
 *
 * It covers exactly the inputs the take is written from — who logged, when,
 * what they scored, and what they wrote. It deliberately EXCLUDES photos, so a
 * photo-only edit does not burn a model call. Reopening a place does not change
 * the hash either, so a cached take is served as-is.
 */
export function takeHash(place: Place): string {
  const material = [...place.visits]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => `${v.id}|${v.by}|${v.date}|${v.score.toFixed(1)}|${v.note.trim()}`)
    .join("\n");
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

/** A take exists only once both people have logged the place. */
export function bothLogged(place: Place): boolean {
  return (
    personAverage(place, "jenn") != null && personAverage(place, "eddy") != null
  );
}

/** True when the cached take is missing or stale for the current visits. */
export function needsRegeneration(place: Place): boolean {
  if (!bothLogged(place)) return false;
  return place.take?.hash !== takeHash(place);
}

/* ── deterministic fallback ──────────────────────────────────────────────── */

const VERDICTS: Record<string, string> = {
  S: "Verdict: the standing answer. Keep it for the nights that matter.",
  A: "Verdict: a yes almost any week. Book it when you want a sure thing.",
  B: "Verdict: reliable, not thrilling. Good for a hungry Tuesday.",
  C: "Verdict: fine if it's close by. Order differently next time.",
  D: "Verdict: one more chance at most, and only for the rice.",
  F: "Verdict: agreed — we're done here.",
};

/**
 * Composes the three bullets from the data alone. Used when no API key is
 * configured and as the failure path for the model call, so the shared take
 * never renders empty.
 */
export function fallbackBullets(place: Place): string[] {
  const j = personAverage(place, "jenn")!;
  const e = personAverage(place, "eddy")!;
  const combined = (j + e) / 2;
  const gap = Math.abs(j - e);
  const fan = j > e ? "Jenn" : "Eddy";
  const other = j > e ? "Eddy" : "Jenn";
  const n = place.visits.length;

  return [
    `You land in the same neighbourhood: ${TIER_WORD[tierOf(j)!]} for Jenn (${fmtScore(j)}), ${TIER_WORD[tierOf(e)!]} for Eddy (${fmtScore(e)}).`,
    gap < 0.5
      ? `Almost nothing between you — ${gap.toFixed(1)} of a point across ${n} visit${n > 1 ? "s" : ""}.`
      : `${fan} is the bigger fan by ${gap.toFixed(1)}; ${other} keeps it a shade lower.`,
    VERDICTS[tierOf(combined)!],
  ];
}

/* ── model call ──────────────────────────────────────────────────────────── */

const TakeSchema = z.object({
  agreement: z.string().min(1),
  difference: z.string().min(1),
  verdict: z.string().min(1),
});

/**
 * Structured output guarantees the three bullets come back separately and in
 * the right order, so the cached take can never be a blob of prose or a
 * fourth point. Written as a raw JSON schema rather than through the zod
 * helper, which is tied to a specific zod major.
 */
const TAKE_FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      agreement: {
        type: "string",
        description: "What the two of you agree on about this place. One sentence.",
      },
      difference: {
        type: "string",
        description: "Where the two of you differ, referencing the gap. One sentence.",
      },
      verdict: {
        type: "string",
        description: "The verdict — is this place worth returning to? One sentence.",
      },
    },
    required: ["agreement", "difference", "verdict"],
    additionalProperties: false,
  },
} as const;

const SYSTEM = `You write the "shared take" for Tasteboard, a private restaurant journal kept by two people, Jenn and Eddy.

Write exactly three short bullets, in this order:
1. what they agree on
2. where they differ
3. a verdict

Voice: warm, a little playful, second-person-plural ("you land in the same neighbourhood…"), never corporate, never a listicle. One sentence per bullet, no more than about 25 words each. Reference their actual scores and what they wrote in their notes — specifics beat adjectives. Do not invent dishes, visits or opinions that are not in the data. Do not add a greeting, a preamble, or a fourth point.`;

function promptFor(place: Place): string {
  const j = personAverage(place, "jenn")!;
  const e = personAverage(place, "eddy")!;
  const combined = (j + e) / 2;

  const visits = [...place.visits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (v) =>
        `- ${v.by === "jenn" ? "Jenn" : "Eddy"} on ${v.date} scored ${v.score.toFixed(1)}/10${v.note.trim() ? `: "${v.note.trim()}"` : " (no note)"}`,
    )
    .join("\n");

  return `Place: ${place.name} — ${place.cuisine}, ${place.area}

Visits:
${visits}

Jenn's average: ${fmtScore(j)} (${TIER_WORD[tierOf(j)!]})
Eddy's average: ${fmtScore(e)} (${TIER_WORD[tierOf(e)!]})
Combined: ${fmtScore(combined)} — tier ${tierOf(combined)} (${TIER_WORD[tierOf(combined)!]})

Write the shared take.`;
}

/**
 * Generates the take. Runs server-side only — the API key never reaches the
 * client. Falls back to the deterministic composer on any failure so a visit is
 * never left without a take.
 */
export async function generateTake(place: Place): Promise<SharedTake> {
  const hash = takeHash(place);
  const base = { hash, generatedAt: new Date().toISOString() };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ...base, bullets: fallbackBullets(place), fallback: true };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: promptFor(place) }],
      output_config: { format: TAKE_FORMAT },
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = TakeSchema.parse(JSON.parse(text));

    return {
      ...base,
      bullets: [parsed.agreement, parsed.difference, parsed.verdict],
    };
  } catch (error) {
    console.error("[tasteboard] shared take generation failed:", error);
    return { ...base, bullets: fallbackBullets(place), fallback: true };
  }
}
