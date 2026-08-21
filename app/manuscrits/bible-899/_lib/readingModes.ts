import type { Bible899Edition, Bible899ReaderEdition } from "./tei";

export type ReadingMode = "diplomatic" | "expanded" | "modernized";

export type ReadingModeOption = {
  value: ReadingMode;
  label: string;
  description: string;
};

const CORE_MODES: ReadingModeOption[] = [
  {
    value: "diplomatic",
    label: "Diplomatique",
    description: "Abréviations et graphie du manuscrit",
  },
  {
    value: "expanded",
    label: "Abréviations développées",
    description: "Développements encodés dans le TEI",
  },
];

const MODERNIZED_MODE: ReadingModeOption = {
  value: "modernized",
  label: "Graphie modernisée",
  description: "Version modernisée validée encodée dans le TEI",
};

export function availableReadingModes(
  edition: Bible899Edition | Bible899ReaderEdition,
): ReadingModeOption[] {
  const hasModernizedText = "hasModernizedText" in edition
    ? edition.hasModernizedText
    : edition.columns.some((column) => column.modernizedParagraphs.length > 0);
  return edition.manuscript.modernizedStatus === "validated" && hasModernizedText
    ? [...CORE_MODES, MODERNIZED_MODE]
    : CORE_MODES;
}

export function initialColumnKey(edition: Bible899Edition, requested: string | undefined): string {
  const normalized = requested?.trim().replace(/^f(?=\d)/u, "");
  return edition.columns.some((column) => column.key === normalized)
    ? normalized!
    : edition.columns[0]?.key ?? "";
}
