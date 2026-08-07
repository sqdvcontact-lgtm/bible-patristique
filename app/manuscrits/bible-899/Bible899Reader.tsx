"use client";

import Image from "next/image";
import { Fragment, useMemo, useState } from "react";

import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import type { Bible899Edition, FacsimileReference } from "./_lib/tei";
import { availableReadingModes, initialColumnKey, type ReadingMode } from "./_lib/readingModes";
import styles from "./bible899.module.css";

const MARKER_PATTERN = /(\[lacune : [^\]]+\]|\[lecture incertaine : [^\]]*\]|\[ajout marginal : [^\]]*\])/gu;

function EditorialText({ text }: { text: string }) {
  return text.split(MARKER_PATTERN).map((part, index) => {
    if (!part) return null;
    const isGap = part.startsWith("[lacune : ");
    const isUnclear = part.startsWith("[lecture incertaine : ");
    const isMarginalAddition = part.startsWith("[ajout marginal : ");
    if (!isGap && !isUnclear && !isMarginalAddition) return <Fragment key={index}>{part}</Fragment>;
    return (
      <span
        key={index}
        className={isGap ? styles.gap : isUnclear ? styles.unclear : styles.marginalAddition}
        title={
          isGap
            ? "Lacune matérielle encodée par gap"
            : isUnclear
              ? "Lecture incertaine encodée par unclear"
              : "Ajout marginal encodé par add"
        }
      >
        {part}
      </span>
    );
  });
}

function Facsimile({
  facsimile,
  folio,
  column,
  priority,
}: {
  facsimile: FacsimileReference | undefined;
  folio: string;
  column: string;
  priority: boolean;
}) {
  if (!facsimile) {
    return (
      <div className={styles.facsimileMissing} role="note">
        Aucun fac-similé n’est référencé pour cette colonne.
      </div>
    );
  }

  const hasDimensions = facsimile.width !== null && facsimile.height !== null;
  const canCrop = hasDimensions && facsimile.coordinates !== null;
  return (
    <figure className={styles.facsimile}>
      {canCrop ? (
        <div
          className={styles.facsimileZone}
          style={{ aspectRatio: `${facsimile.coordinates!.width} / ${facsimile.coordinates!.height}` }}
        >
          <Image
            src={facsimile.publicUrl}
            width={facsimile.width!}
            height={facsimile.height!}
            sizes="(max-width: 900px) 100vw, 42vw"
            alt={`Zone du fac-similé du folio ${folio}, colonne ${column}`}
            priority={priority}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: `${(facsimile.width! / facsimile.coordinates!.width) * 100}%`,
              height: "auto",
              left: `${-(facsimile.coordinates!.x / facsimile.coordinates!.width) * 100}%`,
              top: `${-(facsimile.coordinates!.y / facsimile.coordinates!.height) * 100}%`,
            }}
          />
        </div>
      ) : hasDimensions ? (
        <Image
          src={facsimile.publicUrl}
          width={facsimile.width!}
          height={facsimile.height!}
          sizes="(max-width: 900px) 100vw, 42vw"
          alt={`Fac-similé du folio ${folio}, colonne ${column}`}
          priority={priority}
        />
      ) : (
        <div className={styles.facsimileMissing} role="note">
          Image référencée, dimensions non disponibles dans le manifeste.
        </div>
      )}
      <figcaption>
        {facsimile.coordinatesPresent
          ? `Zone ${facsimile.zoneId ?? "déclarée dans le TEI"}`
          : "Fac-similé référencé, coordonnées détaillées non renseignées"}
      </figcaption>
    </figure>
  );
}

export default function Bible899Reader({ edition, initialColumn }: { edition: Bible899Edition; initialColumn?: string }) {
  const firstColumnKey = initialColumnKey(edition, initialColumn);
  const [mode, setMode] = useState<ReadingMode>("diplomatic");
  const [lineBreaks, setLineBreaks] = useState(true);
  const [selectedColumnKey, setSelectedColumnKey] = useState(firstColumnKey);
  const modes = availableReadingModes(edition);
  const lineBasedMode = mode !== "modernized";
  const currentMode = modes.find((item) => item.value === mode) ?? modes[0];
  const selectedColumn = useMemo(
    () => edition.columns.find((column) => column.key === selectedColumnKey) ?? edition.columns[0],
    [edition.columns, selectedColumnKey],
  );
  const folioIndex = selectedColumn
    ? edition.folios.findIndex((folio) => folio.n === selectedColumn.folio)
    : -1;
  const selectedFolio = folioIndex >= 0 ? edition.folios[folioIndex] : undefined;

  const selectFolio = (nextIndex: number) => {
    const nextFolio = edition.folios[nextIndex];
    const firstColumn = nextFolio
      ? edition.columns.find((column) => column.key === nextFolio.columnKeys[0])
      : undefined;
    if (firstColumn) setSelectedColumnKey(firstColumn.key);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Manuscrit biblique</p>
        <h1>Bible française du XIII<sup>e</sup> siècle</h1>
        <p className={styles.shelfmark}>
          {edition.manuscript.repository}, {edition.manuscript.shelfmark}
        </p>
        <p className={styles.introduction}>
          {edition.manuscript.sample}. Transcription intégrale du manuscrit. Le texte a fait l’objet d’une première campagne de relecture ; certaines lectures demeurent incertaines et sont signalées comme telles. La révision éditoriale pourra être poursuivie progressivement.
        </p>
        <dl className={styles.metadata}>
          <div>
            <dt>Datation</dt>
            <dd>{edition.manuscript.date}</dd>
          </div>
          <div>
            <dt>Édition</dt>
            <dd>Version {edition.manuscript.version}</dd>
          </div>
          <div>
            <dt>Étendue</dt>
            <dd>{edition.statistics.folios} folios, {edition.statistics.columns} colonnes, {edition.totalLines} lignes</dd>
          </div>
          <div>
            <dt>Statut</dt>
            <dd>{edition.manuscript.status}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.controls} style={{ top: HAUTEUR_NAVBAR }} aria-label="Réglages de lecture">
        <div className={styles.modes} role="group" aria-label="Mode de lecture">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              className={mode === item.value ? styles.modeActive : styles.mode}
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className={`${styles.lineToggle} ${!lineBasedMode ? styles.lineToggleDisabled : ""}`}>
          <input
            type="checkbox"
            checked={lineBreaks}
            disabled={!lineBasedMode}
            onChange={(event) => setLineBreaks(event.target.checked)}
          />
          Conserver les retours à la ligne
        </label>
        <p className={styles.modeDescription} aria-live="polite">{currentMode.description}</p>
      </section>

      {selectedColumn && selectedFolio ? (
        <>
          <nav className={styles.manuscriptNavigation} aria-label="Navigation dans le manuscrit">
            <button
              type="button"
              disabled={folioIndex <= 0}
              onClick={() => selectFolio(folioIndex - 1)}
            >
              Folio précédent
            </button>
            <label>
              Folio
              <select value={selectedColumn.folio} onChange={(event) => {
                const index = edition.folios.findIndex((folio) => folio.n === event.target.value);
                if (index >= 0) selectFolio(index);
              }}>
                {edition.folios.map((folio) => (
                  <option key={folio.n} value={folio.n}>{folio.n}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={folioIndex >= edition.folios.length - 1}
              onClick={() => selectFolio(folioIndex + 1)}
            >
              Folio suivant
            </button>
            <div className={styles.columnNavigation} role="group" aria-label={`Colonnes du folio ${selectedFolio.n}`}>
              {selectedFolio.columnKeys.map((key) => {
                const column = edition.columns.find((item) => item.key === key);
                if (!column) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selectedColumn.key === key}
                    className={selectedColumn.key === key ? styles.columnNavigationActive : ""}
                    onClick={() => setSelectedColumnKey(key)}
                  >
                    Colonne {column.column}
                  </button>
                );
              })}
            </div>
          </nav>

          <section className={styles.columns} aria-label="Fac-similé et transcription">
            <article className={styles.column} key={selectedColumn.key}>
              <header className={styles.columnHeader}>
                <h2>Folio {selectedColumn.folio}, colonne {selectedColumn.column}</h2>
                <span>
                  {selectedColumn.lines.length} lignes
                  {selectedColumn.catchwords.length > 0
                    ? ` · ${selectedColumn.catchwords.length} réclame${selectedColumn.catchwords.length > 1 ? "s" : ""}`
                    : ""}
                </span>
              </header>
              <div className={styles.columnBody}>
                <Facsimile
                  facsimile={selectedColumn.facsimiles[0]}
                  folio={selectedColumn.folio}
                  column={selectedColumn.column}
                  priority={selectedColumn.key === firstColumnKey}
                />

                <div className={styles.transcription} lang={mode === "modernized" ? "fr" : "fro"}>
                  {mode === "modernized" ? (
                    selectedColumn.modernizedParagraphs.length > 0 ? (
                      selectedColumn.modernizedParagraphs.map((paragraph, index) => (
                        <p className={styles.prose} key={`${selectedColumn.key}-modernized-${index}`}>
                          <EditorialText text={paragraph} />
                        </p>
                      ))
                    ) : (
                      <p className={styles.missingModernized} role="note">
                        Aucune couche modernisée n’est fournie par le TEI pour cette colonne.
                      </p>
                    )
                  ) : lineBreaks ? (
                    <ol className={styles.lines}>
                      {selectedColumn.lines.map((line) => (
                        <li key={line.xmlId} data-break-after={line.breakAfter}>
                          <span className={styles.lineNumber} aria-hidden="true">{line.n}</span>
                          <span className={styles.lineText}>
                            <EditorialText text={line[mode]} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.prose}>
                      <EditorialText text={
                        mode === "diplomatic"
                          ? selectedColumn.diplomaticContinuous
                          : selectedColumn.expandedContinuous
                      } />
                    </p>
                  )}
                  {selectedColumn.catchwords.length > 0 ? (
                    <aside className={styles.catchwords} aria-label="Réclame">
                      {selectedColumn.catchwords.map((catchword) => (
                        <p key={catchword.xmlId}>
                          <span className={styles.catchwordLabel}>
                            {mode === "modernized"
                              ? "Réclame — forme TEI non modernisée"
                              : "Réclame"}
                          </span>{" "}
                          <EditorialText text={
                            mode === "diplomatic" ? catchword.diplomatic : catchword.expanded
                          } />
                        </p>
                      ))}
                    </aside>
                  ) : null}
                </div>
              </div>
            </article>
          </section>
        </>
      ) : (
        <p className={styles.emptyEdition}>Le TEI ne contient aucune colonne à afficher.</p>
      )}

      <footer className={styles.sourceNote}>
        <p>Source unique : TEI/XML Bible 899 v{edition.manuscript.version}</p>
        <p>Empreinte du fichier intégré : <code>{edition.teiSha256}</code></p>
      </footer>
    </main>
  );
}
