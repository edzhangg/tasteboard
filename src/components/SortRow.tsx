"use client";

import { SORT_OPTIONS } from "@/lib/scores";
import type { Sort } from "@/lib/types";
import styles from "./SortRow.module.css";

export function SortRow({
  value,
  onChange,
  count,
}: {
  value: Sort;
  onChange: (sort: Sort) => void;
  count: string;
}) {
  return (
    <div className={styles.row}>
      <label htmlFor="sort">Sort by</label>
      <select
        id="sort"
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as Sort)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.count}>{count}</span>
    </div>
  );
}
