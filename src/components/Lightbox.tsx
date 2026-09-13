"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { photoUrl } from "@/lib/cloudinary";
import { useBoard } from "@/state/BoardProvider";
import styles from "./Lightbox.module.css";

const SWIPE_DISTANCE = 60;
const DISMISS_DISTANCE = 90;
const MAX_SCALE = 4;

interface Gesture {
  scale: number;
  x: number;
  y: number;
}

const REST: Gesture = { scale: 1, x: 0, y: 0 };

/**
 * The photo and its gestures: swipe sideways to move through a visit's photos,
 * pinch (or double-tap) to zoom, drag down to dismiss.
 *
 * Mounted with a key per photo, so moving to the next one resets zoom and pan
 * by remounting rather than by an effect.
 */
function PhotoStage({
  src,
  alt,
  canSwipe,
  onStep,
  onDismiss,
}: {
  src: string;
  alt: string;
  canSwipe: boolean;
  onStep: (delta: number) => void;
  onDismiss: () => void;
}) {
  const [gesture, setGesture] = useState<Gesture>(REST);
  const [settling, setSettling] = useState(false);

  // Live pointers, so one finger pans and two fingers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ x: 0, y: 0, distance: 0, scale: 1, originX: 0, originY: 0 });
  const moved = useRef(false);
  const lastTap = useRef(0);

  const distanceBetween = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function onPointerDown(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setSettling(false);
    moved.current = false;

    if (pointers.current.size === 2) {
      start.current = {
        ...start.current,
        distance: distanceBetween(),
        scale: gesture.scale,
        originX: gesture.x,
        originY: gesture.y,
      };
    } else {
      start.current = {
        x: event.clientX,
        y: event.clientY,
        distance: 0,
        scale: gesture.scale,
        originX: gesture.x,
        originY: gesture.y,
      };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const scale = Math.min(
        MAX_SCALE,
        Math.max(1, (start.current.scale * distanceBetween()) / start.current.distance),
      );
      moved.current = true;
      setGesture((g) => ({ ...g, scale }));
      return;
    }

    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;

    // Zoomed in, one finger pans the photo. Otherwise the drag is a swipe.
    setGesture((g) => ({
      ...g,
      x: start.current.originX + dx,
      y: start.current.originY + dy,
    }));
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) return;

    const dx = gesture.x - start.current.originX;
    const dy = gesture.y - start.current.originY;

    // While zoomed, a drag only pans — it never navigates or dismisses.
    if (gesture.scale > 1.05) {
      setSettling(true);
      return;
    }

    if (dy > DISMISS_DISTANCE && Math.abs(dy) > Math.abs(dx)) {
      onDismiss();
      return;
    }

    if (canSwipe && Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      onStep(dx < 0 ? 1 : -1);
      return;
    }

    // A tap that went nowhere: a second one toggles zoom.
    if (!moved.current) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        setSettling(true);
        setGesture((g) => (g.scale > 1.05 ? REST : { scale: 2.5, x: 0, y: 0 }));
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    }

    setSettling(true);
    setGesture((g) => ({ ...g, x: 0, y: 0 }));
  }

  // Fade the photo as it is dragged toward dismissal.
  const dragProgress =
    gesture.scale <= 1.05 ? Math.min(1, Math.max(0, gesture.y) / (DISMISS_DISTANCE * 2)) : 0;

  return (
    <div
      className={styles.stage}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary serves
          a fixed derived size; routing it through next/image would add a second
          optimizer and defeat the CDN cache. */}
      <img
        className={`${styles.photo} ${settling ? styles.settling : ""}`}
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `translate(${gesture.x}px, ${gesture.y}px) scale(${gesture.scale})`,
          opacity: 1 - dragProgress * 0.6,
        }}
      />
    </div>
  );
}

export function Lightbox() {
  const { lightbox, closeLightbox, stepLightbox } = useBoard();

  const step = useCallback((delta: number) => stepLightbox(delta), [stepLightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, step]);

  // Don't let the page behind scroll while the overlay is up.
  useEffect(() => {
    if (!lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightbox]);

  if (!lightbox) return null;

  const { photos, label, index } = lightbox;
  const multiple = photos.length > 1;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onClick={closeLightbox}
    >
      <PhotoStage
        key={`${label}-${index}`}
        src={photoUrl(photos[index], "full")}
        alt={`${label}, photo ${index + 1} of ${photos.length}`}
        canSwipe={multiple}
        onStep={step}
        onDismiss={closeLightbox}
      />

      {/* This row stops propagation so the arrows don't dismiss the overlay. */}
      <div className={styles.captionRow} onClick={(event) => event.stopPropagation()}>
        {multiple && (
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous photo"
            onClick={() => step(-1)}
          >
            ←
          </button>
        )}
        <div className={styles.caption}>
          <div className={styles.captionLabel}>{label}</div>
          <div className={styles.captionCount}>
            {index + 1} of {photos.length}
          </div>
        </div>
        {multiple && (
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next photo"
            onClick={() => step(1)}
          >
            →
          </button>
        )}
      </div>

      <button type="button" className={styles.close} onClick={closeLightbox}>
        Close
      </button>
    </div>
  );
}
