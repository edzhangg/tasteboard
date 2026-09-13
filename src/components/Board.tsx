"use client";

import { useState } from "react";
import { pluralPlaces } from "@/lib/format";
import { filterPlaces, sortPlaces } from "@/lib/scores";
import type { Filter, Sort } from "@/lib/types";
import { useBoard } from "@/state/BoardProvider";
import { AccountToggle } from "./AccountToggle";
import { PhoneShell } from "./PhoneShell";
import { PlaceCard } from "./PlaceCard";
import { SortRow } from "./SortRow";
import { TierFilter } from "./TierFilter";
import styles from "./Board.module.css";

export function Board() {
  const { places, persistent, openNewPlaceSheet } = useBoard();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("combined");

  const visible = sortPlaces(filterPlaces(places, filter), sort);
  const boardIsEmpty = places.length === 0;

  return (
    <PhoneShell paddingBottom={120}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.title}>Tasteboard</div>
            <div className={styles.subtitle}>
              {places.length} places · Jenn &amp; Eddy
            </div>
          </div>
          <AccountToggle />
        </div>

        <TierFilter value={filter} onChange={setFilter} />

        <SortRow value={sort} onChange={setSort} count={pluralPlaces(visible.length)} />
      </div>

      {!persistent && (
        <p className={styles.notice}>
          Running on the in-memory demo store — visits won&rsquo;t persist or sync
          between phones until a datastore is connected.
        </p>
      )}

      {visible.length > 0 && (
        <div className={styles.grid}>
          {visible.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className={styles.empty}>
          {boardIsEmpty ? (
            <>
              <div className={styles.emptyTitle}>Nothing on the board yet</div>
              <div className={styles.emptyBody}>
                Log the first place you two ate at.
              </div>
            </>
          ) : (
            <>
              <div className={styles.emptyTitle}>Nothing in this tier yet</div>
              <div className={styles.emptyBody}>
                Clear the filter, or go eat something.
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.cta} onClick={openNewPlaceSheet}>
          <span className={styles.plus} aria-hidden>
            +
          </span>
          Log a place
        </button>
      </div>
    </PhoneShell>
  );
}
