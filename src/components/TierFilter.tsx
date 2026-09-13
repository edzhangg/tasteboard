"use client";

import { TIER_ORDER } from "@/lib/tiers";
import type { Filter } from "@/lib/types";
import styles from "./TierFilter.module.css";

const CHIPS: { key: Filter; label: string; tier: boolean }[] = [
  { key: "all", label: "All", tier: false },
  ...TIER_ORDER.map((t) => ({ key: t as Filter, label: t, tier: true })),
  { key: "half", label: "Half-logged", tier: false },
];

export function TierFilter({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (filter: Filter) => void;
}) {
  return (
    <div className={styles.row} role="group" aria-label="Filter by tier">
      {CHIPS.map((chip) => {
        const active = value === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            data-tier={chip.tier ? chip.key : undefined}
            className={[
              styles.chip,
              chip.tier ? "" : styles.neutral,
              active ? styles.active : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={active}
            onClick={() => onChange(chip.key)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
