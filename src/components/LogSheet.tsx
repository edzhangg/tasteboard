"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startDictation, type DictationSession } from "@/lib/dictation";
import { PEOPLE } from "@/lib/types";
import { useBoard } from "@/state/BoardProvider";
import { MicIcon } from "./Icon";
import { PhotoGrid } from "./PhotoGrid";
import { ScoreControl } from "./ScoreControl";
import styles from "./LogSheet.module.css";

const TITLES = {
  new: "New place",
  add: "Log a visit",
  edit: "Edit your visit",
} as const;

export function LogSheet() {
  const router = useRouter();
  const {
    sheet,
    patchSheet,
    closeSheet,
    saveSheet,
    deleteSheetVisit,
    saving,
    places,
    user,
    showToast,
  } = useBoard();

  const [listening, setListening] = useState(false);
  const session = useRef<DictationSession | null>(null);

  // Recognition is stopped on unmount so the mic is never left open.
  useEffect(
    () => () => {
      session.current?.stop();
      session.current = null;
    },
    [],
  );

  // The place-details edit sheet is its own component.
  if (!sheet || sheet.mode === "editPlace") return null;

  const place = places.find((p) => p.id === sheet.placeId);
  const who = PEOPLE[user];

  function toggleMic() {
    if (session.current) {
      session.current.stop();
      session.current = null;
      setListening(false);
      return;
    }
    const started = startDictation(sheet!.note, {
      onTranscript: (text) => patchSheet({ note: text }),
      onStop: () => {
        session.current = null;
        setListening(false);
      },
      onError: showToast,
    });
    if (started) {
      session.current = started;
      setListening(true);
    }
  }

  async function handleSave() {
    session.current?.stop();
    const placeId = await saveSheet();
    // Saving returns to that place's detail view; a new place opens straight
    // into its own.
    if (placeId) router.push(`/place/${placeId}`);
  }

  async function handleDelete() {
    session.current?.stop();
    await deleteSheetVisit();
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={TITLES[sheet.mode]}>
      <div className={styles.sheet}>
        <div className={styles.header}>
          <div style={{ flex: 1 }}>
            <div className={styles.title}>{TITLES[sheet.mode]}</div>
            <div className={styles.sub}>
              {sheet.mode === "new" ? "Somewhere new, together" : (place?.name ?? "")} ·
              scoring as {who}
            </div>
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
          {sheet.mode === "new" && (
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
          )}

          <ScoreControl
            who={who}
            score={sheet.score}
            scoreText={sheet.scoreText}
            onChange={patchSheet}
          />

          <div className={styles.group}>
            <label className={styles.label} htmlFor="when">
              When
            </label>
            <input
              id="when"
              type="date"
              className={styles.input}
              value={sheet.date}
              onChange={(event) => patchSheet({ date: event.target.value })}
            />
          </div>

          <div className={styles.group}>
            <div className={styles.noteHeader}>
              <label className={styles.label} htmlFor="note">
                Note
              </label>
              <button
                type="button"
                className={`${styles.mic} ${listening ? styles.micListening : ""}`}
                onClick={toggleMic}
                aria-pressed={listening}
              >
                <MicIcon />
                {listening ? "Listening…" : "Dictate"}
              </button>
            </div>
            <textarea
              id="note"
              className={styles.textarea}
              rows={4}
              placeholder="What did you eat? What would you order next time?"
              value={sheet.note}
              onChange={(event) => patchSheet({ note: event.target.value })}
            />
          </div>

          <PhotoGrid
            photos={sheet.photos}
            onChange={(photos) => patchSheet({ photos })}
            onError={showToast}
          />

          {sheet.mode === "edit" && (
            <button type="button" className={styles.delete} onClick={handleDelete}>
              Delete this visit
            </button>
          )}
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
            {saving ? "Saving…" : "Save visit"}
          </button>
        </div>
      </div>
    </div>
  );
}
