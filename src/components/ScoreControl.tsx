"use client";

import { useRef } from "react";
import { TIER_WORD, clampScore, tierOf } from "@/lib/tiers";
import styles from "./ScoreControl.module.css";

/** Tier midpoints, in percent of the 0–10 track. */
const TICKS: { letter: string; at: number }[] = [
  { letter: "F", at: 20 },
  { letter: "D", at: 50 },
  { letter: "C", at: 65 },
  { letter: "B", at: 75 },
  { letter: "A", at: 87.5 },
  { letter: "S", at: 97.5 },
];

export function ScoreControl({
  who,
  score,
  scoreText,
  onChange,
}: {
  who: string;
  score: number;
  /** Raw typing buffer; null means "show the formatted number". */
  scoreText: string | null;
  onChange: (patch: { score?: number; scoreText?: string | null }) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const tier = tierOf(score)!;

  /** Every entry path — typing, dragging, ± — commits the same clamped value. */
  const commit = (value: number) => onChange({ score: clampScore(value), scoreText: null });

  const handleText = (raw: string) => {
    let cleaned = raw.replace(/[^0-9.]/g, "").slice(0, 4);
    let parsed = Number.parseFloat(cleaned);

    // Clamp in the field itself, so the typed value, the medallion, the slider
    // and what Save commits can never disagree.
    if (!Number.isNaN(parsed) && parsed > 10) {
      parsed = 10;
      cleaned = "10";
    }
    if (!Number.isNaN(parsed) && parsed < 0) {
      parsed = 0;
      cleaned = "0";
    }

    // A cleared or non-numeric entry falls back to the last valid number
    // rather than leaving the field blank.
    if (Number.isNaN(parsed)) {
      onChange({ scoreText: null });
      return;
    }
    onChange({ scoreText: cleaned, score: Math.round(parsed * 10) / 10 });
  };

  const slide = (clientX: number) => {
    const element = trackRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    commit((x / rect.width) * 10);
  };

  return (
    <div className={styles.wrap} data-tier={tier}>
      <div className={styles.top}>
        <div className={styles.medallion}>
          <span className={styles.medallionLetter} aria-hidden>
            {tier}
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="score">
            {who}&rsquo;s score
          </label>
          <input
            id="score"
            type="text"
            inputMode="decimal"
            className={styles.input}
            value={scoreText ?? score.toFixed(1)}
            onChange={(event) => handleText(event.target.value)}
            onBlur={() => onChange({ scoreText: null })}
            aria-label="Score out of 10"
          />
          <div className={styles.hint}>
            <span className={styles.word}>{TIER_WORD[tier]}</span> · type it or
            drag · 0–10
          </div>
        </div>

        <div className={styles.steppers}>
          <button
            type="button"
            className={styles.step}
            aria-label="Increase score by 0.1"
            onClick={() => commit(score + 0.1)}
          >
            +
          </button>
          <button
            type="button"
            className={styles.step}
            aria-label="Decrease score by 0.1"
            onClick={() => commit(score - 0.1)}
          >
            −
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        role="slider"
        aria-label="Score"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={score}
        aria-valuetext={`${score.toFixed(1)} — ${TIER_WORD[tier]}`}
        tabIndex={0}
        // Pointer capture keeps the drag alive outside the track.
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragging.current = true;
          slide(event.clientX);
        }}
        onPointerMove={(event) => {
          if (dragging.current) slide(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            commit(score + 0.1);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            commit(score - 0.1);
          }
        }}
      >
        <span className={styles.rail}>
          <span className={styles.fill} style={{ width: `${score * 10}%` }} />
        </span>
        <span className={styles.thumb} style={{ left: `${score * 10}%` }} />
      </div>

      <div className={styles.ticks} aria-hidden>
        {TICKS.map((tick) => (
          <span key={tick.letter} className={styles.tick} style={{ left: `${tick.at}%` }}>
            {tick.letter}
          </span>
        ))}
      </div>
    </div>
  );
}
