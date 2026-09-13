"use client";

import Link from "next/link";
import { fmtScore, shortDate } from "@/lib/format";
import { lastVisitDate, scoresOf } from "@/lib/scores";
import { tierKey, tierOf } from "@/lib/tiers";
import type { Place } from "@/lib/types";
import styles from "./PlaceCard.module.css";

function ScoreBar({
  initial,
  person,
  score,
}: {
  initial: string;
  person: "jenn" | "eddy";
  score: number | null;
}) {
  return (
    <div className={styles.barRow}>
      <span className={`${styles.initial} ${styles[person]}`} aria-hidden>
        {initial}
      </span>
      <span className={styles.track}>
        <span
          className={styles.fill}
          data-tier={tierKey(score)}
          style={{ width: `${(score ?? 0) * 10}%` }}
        />
      </span>
      <span className={styles.score}>{fmtScore(score)}</span>
    </div>
  );
}

export function PlaceCard({ place }: { place: Place }) {
  const { jenn, eddy, combined } = scoresOf(place);
  const halfLogged = combined == null;
  const key = tierKey(combined);
  const last = lastVisitDate(place);

  const meta = [place.cuisine, place.area, last ? shortDate(last) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/place/${place.id}`}
      data-tier={key}
      className={`${styles.card} ${halfLogged ? styles.half : ""}`}
      aria-label={`${place.name}, ${
        halfLogged ? "half-logged" : `tier ${key}, combined ${fmtScore(combined)}`
      }`}
    >
      {/* Only the 40px letter and the 24px bold score sit on the solid band. */}
      <div className={`${styles.band} ${halfLogged ? styles.halfBand : ""}`}>
        <span className={styles.letter} aria-hidden>
          {tierOf(combined) ?? "·"}
        </span>
        <span className={styles.combined} aria-hidden>
          {fmtScore(combined)}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.heading}>
          <span className={styles.name}>{place.name}</span>
          <span className={styles.meta}>{meta}</span>
          {halfLogged && <span className={styles.halfPill}>Half-logged</span>}
        </div>

        <div className={styles.bars}>
          <ScoreBar initial="J" person="jenn" score={jenn} />
          <ScoreBar initial="E" person="eddy" score={eddy} />
        </div>
      </div>
    </Link>
  );
}
