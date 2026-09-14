"use client";

import { useBoard } from "@/state/BoardProvider";
import styles from "./LogSheet.module.css";

export function EditPlaceSheet() {
  const { sheet, patchSheet, closeSheet, saveSheet, saving } = useBoard();

  if (!sheet || sheet.mode !== "editPlace") return null;

  async function handleSave() {
    await saveSheet();
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Edit place details"
    >
      <div className={styles.sheet}>
        <div className={styles.header}>
          <div style={{ flex: 1 }}>
            <div className={styles.title}>Edit place</div>
            <div className={styles.sub}>Name, cuisine, and area</div>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={closeSheet}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.newFields}>
            <input
              className={styles.input}
              placeholder="Restaurant name"
              value={sheet.name ?? ""}
              onChange={(event) => patchSheet({ name: event.target.value })}
              aria-label="Restaurant name"
            />
            <div className={styles.newRow}>
              <input
                className={`${styles.input} ${styles.inputHalf}`}
                placeholder="Cuisine"
                value={sheet.cuisine ?? ""}
                onChange={(event) => patchSheet({ cuisine: event.target.value })}
                aria-label="Cuisine"
              />
              <input
                className={`${styles.input} ${styles.inputHalf}`}
                placeholder="Neighbourhood"
                value={sheet.area ?? ""}
                onChange={(event) => patchSheet({ area: event.target.value })}
                aria-label="Neighbourhood"
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={closeSheet}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
