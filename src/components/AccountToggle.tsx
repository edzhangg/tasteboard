"use client";

import { PEOPLE } from "@/lib/types";
import type { PersonId } from "@/lib/types";
import { useBoard } from "@/state/BoardProvider";
import styles from "./AccountToggle.module.css";

const ORDER: PersonId[] = ["jenn", "eddy"];

/**
 * The honor-system account switch, present in the board and detail headers.
 *
 * Switching changes who a new visit is attributed to, which visits are
 * editable, and the detail CTA label. It never alters stored scores.
 */
export function AccountToggle() {
  const { user, setUser } = useBoard();

  return (
    <div className={styles.toggle} role="group" aria-label="Scoring as">
      {ORDER.map((id) => {
        const active = user === id;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${active ? styles.active : ""}`}
            aria-pressed={active}
            onClick={() => setUser(id)}
          >
            {PEOPLE[id]}
          </button>
        );
      })}
    </div>
  );
}
