import styles from "./bible899.module.css";

export default function Bible899Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.loadingReader}>
        <p>Chargement du fac-similé et de la transcription…</p>
      </div>
    </main>
  );
}
