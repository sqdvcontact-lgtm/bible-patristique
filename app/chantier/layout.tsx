import type { Metadata } from "next";

// La page du chantier est un composant client : elle ne peut pas exporter ses
// propres métadonnées. Un `document.title` posé dans un effet se fait écraser
// par celles de la mise en page racine ; ce layout serveur est la voie prévue.
export const metadata: Metadata = {
  // `absolute` court-circuite le gabarit « %s · Corpus Scriptura » de la racine :
  // le titre porte déjà le nom, inutile de le répéter. Il mène par le projet, non
  // par « en travaux » — c'est ce que Google affichera, et l'avis de chantier est
  // déjà dans la description et sur la page.
  title: { absolute: "Corpus Scriptura — l’Écriture et les Pères de l’Église" },
  description:
    "Corpus Scriptura est un site d’étude consacré aux liens entre la Bible et les textes des Pères de l’Église. Le site ouvre prochainement — laissez votre adresse pour être prévenu.",
  openGraph: {
    title: "Corpus Scriptura — l’Écriture et les Pères de l’Église",
    description:
      "Un site d’étude consacré aux liens entre la Bible et les textes des Pères de l’Église. Le site ouvre prochainement.",
    images: ["/og-image.png"],
  },
};

export default function ChantierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
