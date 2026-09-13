"use client";

import { useRef, useState } from "react";
import { photoUrl, uploadPhoto } from "@/lib/cloudinary";
import { MAX_PHOTOS } from "@/lib/tiers";
import styles from "./PhotoGrid.module.css";

export function PhotoGrid({
  photos,
  onChange,
  onError,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  onError: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const remaining = MAX_PHOTOS - photos.length - uploading;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, Math.max(0, remaining));
    if (picked.length === 0) return;

    setUploading((n) => n + picked.length);
    // Each upload goes straight from the phone to Cloudinary; we keep only the
    // URL it returns.
    const results = await Promise.allSettled(picked.map(uploadPhoto));
    setUploading((n) => Math.max(0, n - picked.length));

    const urls = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    const failed = results.find((r) => r.status === "rejected");
    if (failed) onError((failed as PromiseRejectedResult).reason?.message ?? "Photo upload failed");

    if (urls.length) onChange([...photos, ...urls].slice(0, MAX_PHOTOS));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div className={styles.header}>
        <div className={styles.label}>Photos</div>
        <div className={styles.count}>
          {photos.length} of {MAX_PHOTOS}
        </div>
      </div>

      <div className={styles.grid}>
        {photos.map((url, index) => (
          <button
            key={url}
            type="button"
            className={styles.tile}
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => onChange(photos.filter((p) => p !== url))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                serves a fixed derived size; next/image would add a second
                optimizer and defeat the CDN cache. */}
            <img className="washed" src={photoUrl(url, "thumb")} alt="" />
            <span className={styles.remove}>
              <span className={styles.removeDot} aria-hidden>
                ×
              </span>
            </span>
          </button>
        ))}

        {Array.from({ length: uploading }, (_, i) => (
          <div key={`uploading-${i}`} className={styles.uploading}>
            Adding
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            className={styles.add}
            aria-label="Add a photo"
            onClick={() => fileInput.current?.click()}
          >
            +
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        className={styles.file}
        accept="image/*"
        // capture is honoured on phones: the camera opens directly.
        capture="environment"
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
