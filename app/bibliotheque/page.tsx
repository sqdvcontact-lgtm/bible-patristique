import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BoutonCopieRef from "../components/BoutonCopieRef";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Oeuvre = {
  id_oeuvre: string; titre: string; sous_titre: string | null; titre_original: string | null;
  trad_auteur: string | null; trad_date: string | null;
  editeur: string | null; collection: string | null; ville: string | null;
  date_publication: string | null; url_source: string | null;
};
type Auteur = {
  id_auteur: number; nom: string; dates: string | null;
  siecle: number | null; tradition: string | null; oeuvres: Oeuvre[];
};

async function getAuteurs(): Promise<Auteur[]> {
  const { data, error } = await supabase
    .from("auteurs")
    .select(`id_auteur, nom, dates, siecle, tradition,
      oeuvres ( id_oeuvre, titre, sous_titre, titre_original, trad_auteur, trad_date, editeur, collection, ville, date_publication, url_source )`)
    .order("siecle", { ascending: true, nullsFirst: false });
  if (error) { console.error(error); return []; }
  return (data ?? []).filter((a: Auteur) => a.oeuvres?.length > 0);
}

function refBiblio(auteurNom: string, o: Oeuvre, nomSite: string, urlSite: string): string {
  const parties: string[] = [auteurNom];
  parties.push(o.titre + (o.sous_titre ? `. ${o.sous_titre}` : ''));
  if (o.trad_auteur) parties.push(`trad. ${o.trad_auteur}`);
  if (o.trad_date) parties.push(o.trad_date);
  if (o.editeur) parties.push(o.editeur);
  if (o.collection) parties.push(o.collection);
  if (o.ville) parties.push(o.ville);
  if (o.date_publication) parties.push(o.date_publication);
  parties.push(`disponible sur ${nomSite} (${urlSite})`);
  return parties.join(', ');
}

const NOM_SITE = "Bible & Tradition patristique";
const URL_SITE = "https://www.bible-et-tradition.fr";

export const metadata = {
  title: "Bibliothèque — Bible & Tradition",
  description: "Pères de l'Église et théologiens disponibles dans la bibliothèque.",
};

export default async function BibliothequePage() {
  const auteurs = await getAuteurs();
  const nbOeuvres = auteurs.reduce((s, a) => s + a.oeuvres.length, 0);

  return (
    <main className="flex-1" style={{ background: "#f7f4ef", minHeight: "calc(100vh - 48px)" }}>
      <style>{`
        .oeuvre-lien {
          display: flex; align-items: baseline; flex-wrap: wrap;
          column-gap: 8px; padding: 4px 8px 4px 12px;
          border-radius: 4px; border-left: 2px solid transparent;
          text-decoration: none; transition: background 0.11s, border-color 0.11s;
        }
        .oeuvre-lien:hover { background: rgba(61,107,79,0.06); border-left-color: #3d6b4f; }
      `}</style>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* En-tête centré */}
        <div style={{ textAlign: "center", borderBottom: "1px solid #d4cfc6", paddingBottom: "20px", marginBottom: "28px" }}>
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "24px", fontWeight: "normal",
            color: "#2a3d30", margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            Bibliothèque
          </h1>
          <div style={{ fontSize: "11.5px", color: "#a09890", letterSpacing: "0.03em" }}>
            {auteurs.length} auteur{auteurs.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: "11.5px", color: "#a09890", letterSpacing: "0.03em" }}>
            {nbOeuvres} œuvre{nbOeuvres > 1 ? "s" : ""}
          </div>
        </div>

        {/* Présentation */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{
            fontSize: "11.5px", fontStyle: "italic", color: "#7a8a7e",
            lineHeight: 1.65, margin: "0 auto 6px", maxWidth: "560px",
          }}>
            Chaque texte proposé appartient au domaine public et est librement accessible.
            Un découpage logique et sémantique a été opéré pour en faciliter la lecture&#160;;
            la numérotation qui en résulte sert de référence pour les citations patristiques
            associées aux versets bibliques.
          </p>
          <p style={{
            fontSize: "11.5px", fontStyle: "italic", color: "#7a8a7e",
            lineHeight: 1.65, margin: "0 auto", maxWidth: "560px",
          }}>
            La bibliothèque s'enrichit chaque jour.
            Vous pouvez contribuer à son développement en nous transmettant des textes
            patristiques ou théologiques soigneusement relus, appartenant au domaine public.
          </p>
        </div>

        {/* Liste des auteurs */}
        <div>
          {auteurs.map((auteur) => (
            <div key={auteur.id_auteur} style={{ borderBottom: "1px solid #e4dfd8", paddingBottom: "24px", marginBottom: "24px" }}>

              {/* En-tête auteur */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                <h2 style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "17px", fontWeight: "normal",
                  color: "#1e2e24", margin: 0,
                }}>
                  {auteur.nom}
                </h2>
                {auteur.dates && (
                  <span style={{ fontSize: "11.5px", color: "#a09890" }}>{auteur.dates}</span>
                )}
              </div>

              {/* Œuvres */}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
                {auteur.oeuvres.map((oeuvre) => {
                  // Construire la ligne de détails sans doublon avec le titre principal
                  const details: string[] = [];
                  if (oeuvre.titre_original) details.push(oeuvre.titre_original);
                  if (oeuvre.trad_auteur) {
                    details.push(`trad. ${oeuvre.trad_auteur}${oeuvre.trad_date ? ` (${oeuvre.trad_date})` : ""}`);
                  }
                  if (oeuvre.editeur) details.push(oeuvre.editeur);
                  if (oeuvre.collection) details.push(oeuvre.collection);
                  if (oeuvre.ville) details.push(oeuvre.ville);
                  if (oeuvre.date_publication) details.push(oeuvre.date_publication);

                  return (
                    <li key={oeuvre.id_oeuvre}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                        <Link href={`/oeuvre/${oeuvre.id_oeuvre}`} className="oeuvre-lien" style={{ flex: 1 }}>
                          <span style={{ fontSize: "13px", color: "#2a3d30" }}>
                            {oeuvre.titre}
                            {oeuvre.sous_titre && (
                              <span style={{ fontSize: "12px", color: "#6b6560", fontStyle: "italic" }}>
                                {" "}— {oeuvre.sous_titre}
                              </span>
                            )}
                          </span>
                          {details.length > 0 && (
                            <span style={{ fontSize: "11px", color: "#b0a89e", fontStyle: "italic" }}>
                              {details.join(" · ")}
                            </span>
                          )}
                        </Link>
                        <BoutonCopieRef texte={refBiblio(auteur.nom, oeuvre, NOM_SITE, URL_SITE)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {auteurs.length === 0 && (
            <p style={{ fontSize: "13px", color: "#9a958d", textAlign: "center", padding: "40px 0" }}>
              Aucun auteur disponible pour le moment.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}