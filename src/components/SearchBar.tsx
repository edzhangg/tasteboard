"use client";

import { SearchIcon, XIcon } from "./Icon";
import styles from "./SearchBar.module.css";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.wrap}>
      <SearchIcon size={17} />
      <input
        type="text"
        placeholder="Search places"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.input}
        aria-label="Search places"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <XIcon size={13} />
        </button>
      )}
    </div>
  );
}
