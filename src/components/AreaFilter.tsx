"use client";

import styles from "./AreaFilter.module.css";

export function AreaFilter({
  value,
  onChange,
  areas,
}: {
  value: string;
  onChange: (area: string) => void;
  areas: string[];
}) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter by area"
    >
      <option value="all">All areas</option>
      {areas.map((area) => (
        <option key={area} value={area}>
          {area}
        </option>
      ))}
    </select>
  );
}
