"use client";

import { missingPerson } from "@/lib/scores";
import { PEOPLE } from "@/lib/types";
import type { Place } from "@/lib/types";
import styles from "./SharedTake.module.css";

/**
 * The AI shared take: at most three bullets — what you agree on, where you
 * differ, and a verdict.
 *
 * It appears only once both people have logged the place. It is cached
 * server-side and regenerated in the background whenever a score or note
 * changes, so this component only ever picks one of three states.
 */
export function SharedTake({ place }: { place: Place }) {
  const missing = missingPerson(place);

  if (missing) {
    return (
      <div className={styles.half}>
        <div className={styles.halfTitle}>Half-logged</div>
        <div className={styles.halfBody}>
          The shared take unlocks once {PEOPLE[missing]} logs a visit too. No
          combined tier until then.
        </div>
      </div>
    );
  }

  // A regeneration is in flight, or the first take is still being written.
  if (place.takePendingHash || !place.take) {
    return (
      <div className={styles.thinking} role="status">
        <span className={styles.thinkingDot} />
        Rewriting the shared take…
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.glyph} aria-hidden>
          ✧
        </span>
        <span className={styles.heading}>Our shared take</span>
      </div>
      <div className={styles.bullets}>
        {place.take.bullets.slice(0, 3).map((bullet, index) => (
          <div key={index} className={styles.bullet}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.text}>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
