import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Oeuvre = {
  id_oeuvre: number;
  titre: string;
  titre_original: string | null;
  trad_auteur: string | null;
  trad_date: string | null;
};

type Auteur = {
  id_auteur: number;
  nom: string;
  dates: string | null;
  siecle: number | null;
  tradition: string | null;
  oeuvres: Oeuvre[];
};

async function getAuteurs(): Promise<Auteur[]> {
  const { data, error } = await supabase
    .from("auteurs")
    .select(`
      id_auteur, nom, dates, siecle, tradition,
      oeuvres ( id_oeuvre, titre, titre_original, trad_auteur, trad_date )
    `)
    .order("siecle", { ascending: true, nullsFirst: false });

  if (error) { console.error(error); return []; }
  return (data ?? []).filter((a: Auteur) => a.oeuvres?.length > 0);
}

function siecleLabel(n: number | null): string {
  if (!n) return "";
  const abs = Math.abs(n);
  const romains: [number, string][] = [
    [1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
    [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"],
  ];
  let r = "", v = abs;
  for (const [val, sym] of romains) { while (v >= val) { r += sym; v -= val; } }
  return n < 0 ? `${r} av. J.-C.` : `${r}e s.`;
}

export const metadata = {
  title: "Bibliothèque — Bible & Tradition",
  description: "Pères de l'Église et théologiens disponibles dans la bibliothèque.",
};

export default async function BibliothequePage() {
  const auteurs = await getAuteurs();
  const nbOeuvres = auteurs.reduce((s, a) => s + a.oeuvres.length, 0);

  return (
    <main
      className="flex-1"
      style={{ background: "#f7f4ef", minHeight: "calc(100vh - 48px)" }}
    >
      {/* Styles hover — balise style standard, compatible Server Component */}
      <style>{`
        .oeuvre-lien {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          column-gap: 8px;
          padding: 6px 10px 6px 13px;
          border-radius: 4px;
          border-left: 2px solid transparent;
          text-decoration: none;
          transition: background 0.11s, border-color 0.11s;
        }
        .oeuvre-lien:hover {
          background: rgba(61,107,79,0.06);
          border-left-color: #3d6b4f;
        }
      `}</style>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Encart invitation */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd8cf",
            borderLeft: "3px solid #3d6b4f",
            borderRadius: "6px",
            padding: "13px 18px",
            marginBottom: "38px",
          }}
        >
          <p style={{ fontSize: "13px", color: "#5a6b5e", lineHeight: 1.65, margin: 0 }}>
            Nous enrichissons quotidiennement la bibliothèque. Vous pouvez nous aider
            en nous faisant parvenir des textes propres de patristique ou de théologie,
            libres de droit.
          </p>
        </div>

        {/* Titre + compteur */}
        <div
          className="flex items-baseline gap-4"
          style={{ borderBottom: "1px solid #d4cfc6", paddingBottom: "16px", marginBottom: "32px" }}
        >
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "26px",
              fontWeight: "normal",
              color: "#2a3d30",
              margin: 0,
            }}
          >
            Bibliothèque
          </h1>
          <span style={{ fontSize: "12px", color: "#9a958d" }}>
            {auteurs.length} auteur{auteurs.length > 1 ? "s" : ""} · {nbOeuvres} œuvre{nbOeuvres > 1 ? "s" : ""}
          </span>
        </div>

        {/* Liste des auteurs */}
        <div>
          {auteurs.map((auteur) => (
            <div
              key={auteur.id_auteur}
              style={{ borderBottom: "1px solid #e4dfd8", paddingBottom: "26px", marginBottom: "26px" }}
            >
              {/* En-tête auteur */}
              <div className="flex items-start justify-between flex-wrap gap-2" style={{ marginBottom: "12px" }}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: "16px",
                      fontWeight: "normal",
                      color: "#2a3d30",
                      margin: 0,
                    }}
                  >
                    {auteur.nom}
                  </h2>
                  {auteur.dates && (
                    <span style={{ fontSize: "12px", color: "#9a958d" }}>{auteur.dates}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {auteur.siecle && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#3d6b4f",
                        background: "rgba(61,107,79,0.08)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {siecleLabel(auteur.siecle)}
                    </span>
                  )}
                  {auteur.tradition && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#9a958d",
                        background: "#eeeae4",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {auteur.tradition}
                    </span>
                  )}
                </div>
              </div>

              {/* Œuvres */}
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
                {auteur.oeuvres.map((oeuvre) => (
                  <li key={oeuvre.id_oeuvre}>
                    <Link href={`/oeuvre/${oeuvre.id_oeuvre}`} className="oeuvre-lien">
                      <span style={{ fontSize: "13.5px", color: "#2a3d30" }}>{oeuvre.titre}</span>
                      {oeuvre.titre_original && (
                        <span style={{ fontSize: "12px", color: "#9a958d", fontStyle: "italic" }}>
                          {oeuvre.titre_original}
                        </span>
                      )}
                      {(oeuvre.trad_auteur || oeuvre.trad_date) && (
                        <span style={{ fontSize: "11px", color: "#b0a89e", marginLeft: "auto" }}>
                          Trad.{oeuvre.trad_auteur ? ` ${oeuvre.trad_auteur}` : ""}
                          {oeuvre.trad_date ? `, ${oeuvre.trad_date}` : ""}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
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