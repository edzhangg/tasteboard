"use client";

import { useBoard } from "@/state/BoardProvider";
import styles from "./Toast.module.css";

export function Toast() {
  const { toast } = useBoard();
  if (!toast) return null;
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
