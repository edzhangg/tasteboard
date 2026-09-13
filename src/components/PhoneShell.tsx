import styles from "./PhoneShell.module.css";

export function PhoneShell({
  children,
  paddingBottom,
}: {
  children: React.ReactNode;
  /** Room for the sticky CTA so the last card is never trapped under it. */
  paddingBottom: number;
}) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.column} style={{ paddingBottom }}>
        {children}
      </div>
    </div>
  );
}
