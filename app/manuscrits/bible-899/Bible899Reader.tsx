"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";

import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import type { Bible899ReaderEdition, FacsimileReference } from "./_lib/tei";
import { availableReadingModes, type ReadingMode } from "./_lib/readingModes";
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
  caption,
}: {
  facsimile: FacsimileReference | undefined;
  folio: string;
  column: string;
  priority: boolean;
  caption?: string;
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
        {caption ?? (facsimile.coordinatesPresent
          ? `Zone ${facsimile.zoneId ?? "déclarée dans le TEI"}`
          : "Fac-similé référencé, coordonnées détaillées non renseignées")}
      </figcaption>
    </figure>
  );
}

function FacsimileViewer({
  primary,
  alternatives,
  folio,
  column,
}: {
  primary: FacsimileReference | undefined;
  alternatives: FacsimileReference[];
  folio: string;
  column: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const facsimiles = primary ? [primary, ...alternatives] : alternatives;
  const selected = facsimiles[selectedIndex] ?? facsimiles[0];

  return (
    <div className={styles.facsimileViewer}>
      {facsimiles.length > 1 ? (
        <div className={styles.facsimileChoices} role="group" aria-label="Choix du scan">
          {facsimiles.map((item, index) => (
            <button
              key={item.imageReference}
              type="button"
              aria-pressed={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
            >
              {index === 0 ? "Scan principal" : `Scan alternatif ${index}`}
            </button>
          ))}
        </div>
      ) : null}
      <Facsimile
        facsimile={selected}
        folio={folio}
        column={column}
        priority
        caption={selectedIndex === 0 ? undefined : `Scan alternatif ${selectedIndex}`}
      />
    </div>
  );
}

export default function Bible899Reader({ edition }: { edition: Bible899ReaderEdition }) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [mode, setMode] = useState<ReadingMode>("diplomatic");
  const [lineBreaks, setLineBreaks] = useState(true);
  const modes = availableReadingModes(edition);
  const lineBasedMode = mode !== "modernized";
  const currentMode = modes.find((item) => item.value === mode) ?? modes[0];
  const selectedColumn = edition.columns[0];
  const folioIndex = selectedColumn
    ? edition.folios.findIndex((folio) => folio.n === selectedColumn.folio)
    : -1;
  const selectedFolio = folioIndex >= 0 ? edition.folios[folioIndex] : undefined;

  const selectColumn = (columnKey: string) => {
    startNavigation(() => {
      router.replace(`/manuscrits/bible-899?colonne=f${encodeURIComponent(columnKey)}`, { scroll: false });
    });
  };

  const selectFolio = (nextIndex: number) => {
    const nextFolio = edition.folios[nextIndex];
    const firstColumnKey = nextFolio?.columnKeys[0];
    if (firstColumnKey) selectColumn(firstColumnKey);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Manuscrit biblique</p>
        <h1>Bible française du XIII<sup style={{ fontSize: '0.62em', lineHeight: 0, verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>e</sup> siècle</h1>
        <p className={styles.shelfmark}>
          {edition.manuscript.repository}, {edition.manuscript.shelfmark}
        </p>
        <p className={styles.introduction}>
          {edition.manuscript.sample ? `${edition.manuscript.sample}. ` : ""}Transcription intégrale du manuscrit. Le texte a fait l’objet d’une première campagne de relecture ; certaines lectures demeurent incertaines et sont signalées comme telles. La révision éditoriale pourra être poursuivie progressivement.
        </p>
        <dl className={styles.metadata}>
          {edition.manuscript.date ? (
            <div>
              <dt>Datation</dt>
              <dd>{edition.manuscript.date}</dd>
            </div>
          ) : null}
          <div>
            <dt>Édition</dt>
            <dd>Version {edition.manuscript.version}</dd>
          </div>
          <div>
            <dt>Étendue</dt>
            <dd>{edition.materialLeaves} feuillets matériels, {edition.materialFaces} faces, {edition.statistics.columns} colonnes, {edition.totalLines} lignes</dd>
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
          <nav className={styles.manuscriptNavigation} aria-label="Navigation dans le manuscrit" aria-busy={isNavigating}>
            <button
              type="button"
              disabled={folioIndex <= 0 || isNavigating}
              onClick={() => selectFolio(folioIndex - 1)}
            >
              Folio précédent
            </button>
            <label>
              Folio
              <select value={selectedColumn.folio} onChange={(event) => {
                const index = edition.folios.findIndex((folio) => folio.n === event.target.value);
                if (index >= 0) selectFolio(index);
              }} disabled={isNavigating}>
                {edition.folios.map((folio) => (
                  <option key={folio.n} value={folio.n}>{folio.n}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={folioIndex >= edition.folios.length - 1 || isNavigating}
              onClick={() => selectFolio(folioIndex + 1)}
            >
              Folio suivant
            </button>
            <div className={styles.columnNavigation} role="group" aria-label={`Colonnes du folio ${selectedFolio.n}`}>
              {selectedFolio.columnKeys.map((key) => {
                const column = edition.columnIndex.find((item) => item.key === key);
                if (!column) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selectedColumn.key === key}
                    disabled={isNavigating}
                    className={selectedColumn.key === key ? styles.columnNavigationActive : ""}
                    onClick={() => selectColumn(key)}
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
                <FacsimileViewer
                  key={selectedColumn.key}
                  primary={selectedColumn.facsimiles[0]}
                  alternatives={edition.selectedAlternativeFacsimiles}
                  folio={selectedColumn.folio}
                  column={selectedColumn.column}
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
        {edition.alternativeImages.length > 0 ? (
          <details className={styles.alternativeSources}>
            <summary>{edition.alternativeImages.length} scans alternatifs conservés</summary>
            <ul>
              {edition.alternativeImages.map((image) => (
                <li key={image.reference}>
                  <a href={image.publicUrl} target="_blank" rel="noreferrer">{image.file}</a>
                  {image.alternativeFor ? `, alternative de ${image.alternativeFor.split("/").at(-1)}` : ", scan terminal sans surface distincte"}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </footer>
    </main>
  );
}
