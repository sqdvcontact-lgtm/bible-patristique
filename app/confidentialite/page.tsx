export const metadata = {
  title: "Politique de confidentialité — Bible & Tradition patristique",
  description: "Traitement des données personnelles sur le site labibledesperes.com.",
};

export default function ConfidentialitePage() {
  return (
    <main style={{ background: "#f7f4ef", minHeight: "calc(100vh - 48px)", padding: "56px 24px 80px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        <p style={{
          fontSize: "10px", fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "#3d6b4f", marginBottom: "10px",
        }}>
          Informations légales
        </p>

        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(26px, 3.5vw, 34px)",
          fontWeight: "normal", color: "#2a3d30", marginBottom: "8px", lineHeight: 1.25,
        }}>
          Politique de confidentialité
        </h1>

        <p style={{ fontSize: "12px", color: "#9a958d", marginBottom: "40px", fontStyle: "italic" }}>
          Dernière mise à jour : juin 2026
        </p>

        <div style={{ fontSize: "13.5px", lineHeight: 1.75, color: "#3a3530" }}>

          <Section titre="1. Responsable du traitement">
            <p>
              Le responsable du traitement des données personnelles collectées sur
              <strong> labibledesperes.com</strong> est l&rsquo;éditeur du site, personne physique agissant à titre
              non professionnel. Conformément à la loi pour la confiance dans l&rsquo;économie numérique, ses
              coordonnées complètes ont été communiquées à l&rsquo;hébergeur et peuvent être obtenues, en cas de
              besoin légitime, auprès de ce dernier ou de l&rsquo;autorité judiciaire compétente.
            </p>
            <p>
              Pour toute question relative à vos données, vous pouvez utiliser le formulaire de signalement
              du site, qui constitue le point de contact disponible.
            </p>
          </Section>

          <Section titre="2. Données collectées">
            <p>Le site collecte les données suivantes, selon votre usage :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li><strong>Adresse e-mail</strong> — lors de la création d&rsquo;un compte, via le service d&rsquo;authentification Supabase.</li>
              <li><strong>Identifiant de compte</strong> — généré automatiquement, sans valeur identifiante en lui-même.</li>
              <li><strong>Prélèvements</strong> — versets bibliques ou extraits patristiques que vous choisissez d&rsquo;enregistrer dans votre espace personnel.</li>
              <li><strong>Commentaires</strong> — nom, adresse e-mail et texte que vous fournissez volontairement lors du dépôt d&rsquo;un commentaire sur un verset.</li>
              <li><strong>Signalements</strong> — message libre transmis lors du signalement d&rsquo;une erreur.</li>
            </ul>
            <p>
              Le site ne collecte aucune donnée de paiement : les dons, lorsqu&rsquo;ils seront proposés, seront
              traités directement par un prestataire de paiement tiers, sans transit ni conservation des
              coordonnées bancaires par le site lui-même.
            </p>
          </Section>

          <Section titre="3. Finalités du traitement">
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>permettre la création et la gestion de votre compte utilisateur ;</li>
              <li>sauvegarder vos prélèvements bibliques et patristiques d&rsquo;une session à l&rsquo;autre ;</li>
              <li>afficher, après modération, les commentaires que vous publiez ;</li>
              <li>traiter les signalements d&rsquo;erreurs que vous transmettez ;</li>
              <li>assurer la sécurité et le bon fonctionnement technique du site.</li>
            </ul>
            <p>
              Aucune donnée n&rsquo;est utilisée à des fins de profilage publicitaire, de revente à des tiers ou
              de prospection commerciale.
            </p>
          </Section>

          <Section titre="4. Base légale">
            <p>
              Le traitement de vos données repose sur l&rsquo;exécution du service que vous demandez en créant un
              compte ou en déposant un commentaire (article 6.1.b du RGPD), ainsi que, le cas échéant, sur
              votre consentement explicite (article 6.1.a), que vous pouvez retirer à tout moment.
            </p>
          </Section>

          <Section titre="5. Destinataires des données">
            <p>
              Vos données sont hébergées par <strong>Supabase Inc.</strong> (base de données et authentification)
              et le site lui-même est servi par <strong>Vercel Inc.</strong> Ces deux prestataires agissent en
              qualité de sous-traitants au sens du RGPD et n&rsquo;accèdent à vos données que dans la mesure
              nécessaire à la fourniture de leurs services techniques.
            </p>
            <p>
              Aucune donnée n&rsquo;est cédée, louée ou transmise à des fins commerciales à un tiers.
            </p>
          </Section>

          <Section titre="6. Transferts hors Union européenne">
            <p>
              Supabase Inc. et Vercel Inc. sont des sociétés dont les infrastructures peuvent impliquer un
              hébergement de données hors de l&rsquo;Union européenne (notamment aux États-Unis). Ces transferts
              sont encadrés par les clauses contractuelles types de la Commission européenne ou par un
              mécanisme équivalent garantissant un niveau de protection adéquat des données.
            </p>
          </Section>

          <Section titre="7. Durée de conservation">
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>Les données de compte sont conservées tant que le compte est actif, et supprimées dans un délai raisonnable après une demande de suppression.</li>
              <li>Les commentaires non validés par la modération sont supprimés après un délai de trois mois.</li>
              <li>Les signalements traités sont conservés six mois à des fins de suivi, puis supprimés.</li>
            </ul>
          </Section>

          <Section titre="8. Cookies et traceurs">
            <p>
              Le site utilise uniquement des cookies strictement nécessaires à son fonctionnement
              (maintien de la session de connexion). Ces cookies ne nécessitent pas de consentement
              préalable au titre de la réglementation CNIL, dans la mesure où ils sont indispensables à la
              fourniture du service demandé par l&rsquo;utilisateur.
            </p>
            <p>
              Le site n&rsquo;utilise, à la date de mise à jour de cette page, aucun cookie de mesure d&rsquo;audience,
              publicitaire ou de traçage à des fins commerciales. Si cela devait évoluer, un bandeau de
              consentement conforme aux recommandations de la CNIL serait mis en place avant tout dépôt de
              cookie non essentiel.
            </p>
          </Section>

          <Section titre="9. Vos droits">
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li><strong>Droit d&rsquo;accès</strong> — obtenir la confirmation que vos données sont traitées et en obtenir une copie ;</li>
              <li><strong>Droit de rectification</strong> — corriger des données inexactes ou incomplètes ;</li>
              <li><strong>Droit à l&rsquo;effacement</strong> — demander la suppression de vos données ;</li>
              <li><strong>Droit à la limitation</strong> — restreindre temporairement le traitement ;</li>
              <li><strong>Droit d&rsquo;opposition</strong> — vous opposer à un traitement pour motif légitime ;</li>
              <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré.</li>
            </ul>
            <p>
              Pour exercer ces droits, utilisez le formulaire de signalement du site en précisant votre
              demande. Une réponse vous sera apportée dans un délai d&rsquo;un mois.
            </p>
            <p>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez
              introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={{ color: "#3d6b4f", textDecoration: "underline" }}>www.cnil.fr/fr/plaintes</a>,
              ou par courrier à CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
            </p>
          </Section>

          <Section titre="10. Sécurité">
            <p>
              Des mesures techniques raisonnables (chiffrement des échanges en HTTPS, contrôle d&rsquo;accès aux
              données via des règles de sécurité au niveau des lignes — RLS) sont mises en œuvre pour
              protéger vos données contre l&rsquo;accès non autorisé, la perte ou l&rsquo;altération.
            </p>
          </Section>

          <Section titre="11. Modification de cette politique">
            <p>
              Cette politique peut être mise à jour pour refléter une évolution du site ou de la
              réglementation. La date de dernière mise à jour figure en en-tête de cette page.
            </p>
          </Section>

        </div>
      </div>
    </main>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{
        fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "16px",
        fontWeight: "normal", color: "#2a3d30", marginBottom: "10px",
        borderBottom: "1px solid #d6d0c4", paddingBottom: "6px",
      }}>
        {titre}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </section>
  );
}