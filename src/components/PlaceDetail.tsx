"use client";

import Link from "next/link";
import { fmtScore } from "@/lib/format";
import { personAverage, scoresOf, visitsNewestFirst } from "@/lib/scores";
import { TIER_WORD, tierKey, tierOf } from "@/lib/tiers";
import { PEOPLE } from "@/lib/types";
import type { PersonId, Place } from "@/lib/types";
import { useBoard } from "@/state/BoardProvider";
import { AccountToggle } from "./AccountToggle";
import { PhoneShell } from "./PhoneShell";
import { SharedTake } from "./SharedTake";
import { VisitRow } from "./VisitRow";
import styles from "./PlaceDetail.module.css";

function PersonRow({ person, score }: { person: PersonId; score: number | null }) {
  const letter = tierOf(score);
  return (
    <div className={styles.personRow}>
      <span
        className={`${styles.personName} ${
          person === "jenn" ? styles.jenn : styles.eddy
        }`}
      >
        {PEOPLE[person]}
      </span>
      <span className={styles.personTrack}>
        <span
          className={styles.personFill}
          data-tier={tierKey(score)}
          style={{ width: `${(score ?? 0) * 10}%` }}
        />
      </span>
      <span className={styles.personScore}>
        {score == null ? "not yet" : fmtScore(score)}
        {letter && <span className={styles.personTier}> {letter}</span>}
      </span>
    </div>
  );
}

export function PlaceDetail({ placeId }: { placeId: string }) {
  const { places, user, openAddVisitSheet } = useBoard();
  const place = places.find((p) => p.id === placeId);

  if (!place) {
    return (
      <PhoneShell paddingBottom={40}>
        <div className={styles.nav}>
          <Link href="/" className={styles.back}>
            <span className={styles.backArrow} aria-hidden>
              ←
            </span>
            Board
          </Link>
        </div>
        <p className={styles.missing}>That place isn&rsquo;t on the board.</p>
      </PhoneShell>
    );
  }

  return <Detail place={place} user={user} onAddVisit={() => openAddVisitSheet(place.id)} />;
}

function Detail({
  place,
  user,
  onAddVisit,
}: {
  place: Place;
  user: PersonId;
  onAddVisit: () => void;
}) {
  const { jenn, eddy, combined } = scoresOf(place);
  const halfLogged = combined == null;
  const key = tierKey(combined);

  // The CTA is contextual: the active person's first visit, or another one.
  const alreadyLogged = personAverage(place, user) != null;
  const cta = alreadyLogged
    ? "Log another visit"
    : `Add ${PEOPLE[user]}'s first visit`;

  return (
    <PhoneShell paddingBottom={110}>
      <div className={styles.nav}>
        <Link href="/" className={styles.back}>
          <span className={styles.backArrow} aria-hidden>
            ←
          </span>
          Board
        </Link>
        <div className={styles.navToggle}>
          <AccountToggle />
        </div>
      </div>

      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{place.name}</h1>
        <div className={styles.titleMeta}>
          {place.cuisine} · {place.area}
        </div>
      </div>

      <div className={styles.heroWrap}>
        <div
          data-tier={key}
          className={`${styles.hero} ${halfLogged ? styles.heroHalf : ""}`}
        >
          <div className={styles.heroInner}>
            <div
              className={`${styles.medallion} ${
                halfLogged ? styles.medallionHalf : ""
              }`}
            >
              <span className={styles.medallionLetter} aria-hidden>
                {tierOf(combined) ?? "·"}
              </span>
              <span className={styles.medallionScore}>{fmtScore(combined)}</span>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.kicker}>
                Together — {halfLogged ? "only half-logged" : TIER_WORD[key]}
              </div>
              <PersonRow person="jenn" score={jenn} />
              <PersonRow person="eddy" score={eddy} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px var(--gutter) 0" }}>
        <SharedTake place={place} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Visits</div>
        <div className={styles.visitList}>
          {visitsNewestFirst(place).map((visit) => (
            <VisitRow key={visit.id} placeId={place.id} visit={visit} />
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.cta} onClick={onAddVisit}>
          {cta}
        </button>
      </div>
    </PhoneShell>
  );
}
