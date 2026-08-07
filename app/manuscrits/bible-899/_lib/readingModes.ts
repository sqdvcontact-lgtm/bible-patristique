import type { Bible899Edition } from "./tei";

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

export function availableReadingModes(edition: Bible899Edition): ReadingModeOption[] {
  const hasModernizedText = edition.columns.some((column) => column.modernizedParagraphs.length > 0);
  return edition.manuscript.modernizedStatus === "validated" && hasModernizedText
    ? [...CORE_MODES, MODERNIZED_MODE]
    : CORE_MODES;
}
