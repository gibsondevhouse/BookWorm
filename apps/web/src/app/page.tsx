import { productionStage } from "./productionStage";
import styles from "./page.module.css";

export default async function Page() {
  const stage = await productionStage();
  const toneClassName = {
    complete: styles.toneComplete,
    active: styles.toneActive,
    blocked: styles.toneBlocked
  }[stage.tone];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${toneClassName}`}>{stage.badge}</span>
            <span className={styles.eyebrow}>Production Tracker Snapshot</span>
          </div>
          <h1 className={styles.headline}>{stage.headline}</h1>
          <p className={styles.summary}>{stage.summary}</p>
        </section>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Current Readout</h2>
            <ul className={styles.checklist}>
              {stage.checkpoints.map((checkpoint) => (
                <li key={checkpoint}>
                  {checkpoint}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Tracker Metrics</h2>
            <div className={styles.metricGrid}>
              {stage.metrics.map((metric) => (
                <div key={metric.label} className={styles.metric}>
                  <span className={styles.metricLabel}>{metric.label}</span>
                  <span className={styles.metricValue}>{metric.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Next Move</h2>
            <span className={styles.nextStepLabel}>{stage.nextStepLabel}</span>
            <p className={styles.nextStepValue}>{stage.nextStepDetail}</p>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Source of Truth</h2>
            <p className={styles.nextStepDetail}>
              This page is derived from the master plan tracker. Update the tracker first, and the status display will follow on the next render.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
