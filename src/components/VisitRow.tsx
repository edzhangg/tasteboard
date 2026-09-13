"use client";

import { photoUrl } from "@/lib/cloudinary";
import { fmtScore, prettyDate } from "@/lib/format";
import { tierKey, tierOf } from "@/lib/tiers";
import { PEOPLE } from "@/lib/types";
import type { Visit } from "@/lib/types";
import { useBoard } from "@/state/BoardProvider";
import styles from "./VisitRow.module.css";

export function VisitRow({ placeId, visit }: { placeId: string; visit: Visit }) {
  const { user, openEditVisitSheet, openLightbox } = useBoard();

  // Edit and delete are available only on the active person's own visits —
  // switching accounts changes which rows carry these affordances, and the
  // server refuses the write regardless.
  const isMine = visit.by === user;
  const who = PEOPLE[visit.by];
  const letter = tierOf(visit.score);

  return (
    <div className={styles.row}>
      <span
        className={`${styles.rail} ${
          visit.by === "jenn" ? styles.railJenn : styles.railEddy
        }`}
        aria-hidden
      />
      <div className={styles.card}>
        <div className={styles.header}>
          <span
            className={`${styles.who} ${
              visit.by === "jenn" ? styles.whoJenn : styles.whoEddy
            }`}
          >
            {who}
          </span>
          <span className={styles.date}>{prettyDate(visit.date)}</span>
          <span className={styles.chip} data-tier={tierKey(visit.score)}>
            <span className={styles.chipLetter}>{letter}</span>
            {fmtScore(visit.score)}
          </span>
        </div>

        {visit.note && <div className={styles.note}>{visit.note}</div>}

        {visit.photos.length > 0 && (
          <div className={styles.photos}>
            {visit.photos.map((url, index) => (
              <button
                key={url}
                type="button"
                className={styles.photo}
                aria-label={`Enlarge photo ${index + 1} of ${visit.photos.length}`}
                onClick={() =>
                  openLightbox({
                    label: `${who} · ${prettyDate(visit.date)}`,
                    photos: visit.photos,
                    index,
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                    serves a fixed derived size; next/image would add a second
                    optimizer and defeat the CDN cache. */}
                <img
                  className="washed"
                  src={photoUrl(url, "thumb")}
                  alt=""
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {isMine && (
          <button
            type="button"
            className={styles.edit}
            onClick={() => openEditVisitSheet(placeId, visit)}
          >
            Edit this visit
          </button>
        )}
      </div>
    </div>
  );
}
