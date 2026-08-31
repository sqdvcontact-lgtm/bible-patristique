import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

export const metadata = {
  title: { absolute: "Politique de confidentialité · Corpus Scriptura" },
  description: "Traitement des données personnelles sur Corpus Scriptura (corpus-scriptura.fr).",
};

export default function ConfidentialitePage() {
  return (
    <main style={{ background: "var(--cs-fond)", minHeight: "calc(100vh - 3.5rem)", padding: "56px 24px 80px" }}>
      <div style={{ maxWidth: "42.5rem", margin: "0 auto" }}>

        <p style={{
          fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--cs-vert)", marginBottom: "10px",
        }}>
          Informations légales
        </p>

        <h1 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_PAGE,
          fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, marginBottom: "8px", lineHeight: 1.25,
        }}>
          Politique de confidentialité
        </h1>

        <p style={{ fontSize: "0.75rem", color: "var(--cs-texte-doux)", marginBottom: "40px", fontStyle: "italic" }}>
          Dernière mise à jour : juillet 2026
        </p>

        <div style={{ fontSize: "0.84375rem", lineHeight: 1.75, color: "var(--cs-texte)" }}>

          <Section titre="1. Responsable du traitement">
            <p>
              Le responsable du traitement des données personnelles collectées sur{' '}
              <strong>Corpus Scriptura</strong> (corpus-scriptura.fr) est l&rsquo;éditeur du site, personne
              physique agissant à titre non professionnel. Conformément à la loi pour la confiance dans
              l&rsquo;économie numérique, ses coordonnées complètes ont été communiquées à l&rsquo;hébergeur et peuvent
              être obtenues, en cas de besoin légitime, auprès de ce dernier ou de l&rsquo;autorité judiciaire
              compétente.
            </p>
            <p>
              Pour toute question relative à vos données, ou pour exercer vos droits, vous pouvez écrire
              par le{' '}
              <a href="/contact" style={{ color: "var(--cs-vert)", textDecoration: "underline" }}>formulaire de contact</a>
              {' '}du site. Une réponse vous sera apportée dans un délai d&rsquo;un mois.
            </p>
          </Section>

          <Section titre="2. Données collectées">
            <p>Le site collecte les données suivantes, selon votre usage :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>
                <strong>Adresse e-mail</strong> – lors de la création d&rsquo;un compte, via le service
                d&rsquo;authentification Supabase. Elle est utilisée pour l&rsquo;identification et, le cas échéant,
                la récupération de compte.
              </li>
              <li>
                <strong>Identifiant de compte</strong> – généré automatiquement, sans valeur identifiante
                en lui-même.
              </li>
              <li>
                <strong>Prélèvements</strong> – versets bibliques ou extraits patristiques que vous
                choisissez d&rsquo;enregistrer dans votre espace personnel. Ces données sont privées par défaut.
              </li>
              <li>
                <strong>Commentaires et essais</strong> – textes que vous soumettez volontairement, associés
                à votre compte. Ils sont stockés en base de données en attente de modération.
              </li>
              <li>
                <strong>Signalements</strong> – message libre transmis lors du signalement d&rsquo;une erreur,
                éventuellement associé à votre compte si vous êtes connecté.
              </li>
              <li>
                <strong>Données de profil public</strong> – pseudonyme, biographie et bibliothèque
                personnelle que vous choisissez de rendre publics depuis les paramètres de votre compte.
              </li>
              <li>
                <strong>Compteurs de consultation</strong> – le site enregistre en base de données le nombre
                de vues par verset et par essai (<em>nb_vues</em>, <em>nb_lectures</em>) à des fins de mise
                en avant éditoriale. Ces compteurs sont agrégés et ne permettent pas d&rsquo;identifier un
                utilisateur individuellement.
              </li>
              <li>
                <strong>Adresse laissée sur la liste d&rsquo;attente</strong> – si vous demandez à être prévenu
                de l&rsquo;ouverture du site depuis la page d&rsquo;accueil, votre adresse est conservée à cette
                seule fin, avec la date de votre demande. Elle n&rsquo;est associée à aucun compte, n&rsquo;est
                jamais transmise à un tiers, et sera supprimée après l&rsquo;envoi du message d&rsquo;ouverture ou
                sur simple demande de votre part.
              </li>
            </ul>
            <p>
              Le site ne collecte aucune donnée de paiement : les dons sont traités directement par un
              prestataire de paiement tiers (PayPal), sans transit ni conservation des coordonnées bancaires
              par le site lui-même. Suivre le bouton de don vous conduit sur le site de ce prestataire, qui
              applique alors sa propre politique de confidentialité.
            </p>
          </Section>

          <Section titre="3. Finalités du traitement">
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>permettre la création et la gestion de votre compte utilisateur ;</li>
              <li>sauvegarder vos prélèvements bibliques et patristiques d&rsquo;une session à l&rsquo;autre ;</li>
              <li>afficher, après modération, les commentaires et essais que vous publiez ;</li>
              <li>traiter les signalements d&rsquo;erreurs que vous transmettez ;</li>
              <li>alimenter des statistiques de consultation internes (compteurs agrégés) ;</li>
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
              compte ou en soumettant un contenu (article 6.1.b du RGPD), ainsi que, pour les compteurs de
              consultation, sur l&rsquo;intérêt légitime de l&rsquo;éditeur à améliorer l&rsquo;organisation éditoriale du
              site (article 6.1.f du RGPD). Votre consentement explicite (article 6.1.a) vous sera demandé
              pour tout traitement ne relevant pas des bases précédentes, et vous pourrez le retirer à tout
              moment.
            </p>
          </Section>

          <Section titre="5. Destinataires des données">
            <p>
              Vos données sont hébergées par <strong>Supabase Inc.</strong> (base de données et
              authentification) et le site lui-même est servi par <strong>Vercel Inc.</strong> La mesure
              d&rsquo;audience est réalisée par le site lui-même et ne fait intervenir aucun tiers (voir le
              point 8). Ces prestataires agissent en qualité de sous-traitants
              au sens du RGPD et n&rsquo;accèdent à vos données que dans la mesure nécessaire à la fourniture de
              leurs services techniques.
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
              <li>
                Les données de compte sont conservées tant que le compte est actif, et supprimées dans un
                délai raisonnable après une demande de clôture de compte.
              </li>
              <li>
                Les commentaires et essais non validés par la modération sont supprimés au bout de trois
                mois en l&rsquo;absence de réponse de l&rsquo;auteur.
              </li>
              <li>
                Les signalements traités sont conservés six mois à des fins de suivi éditorial, puis
                supprimés.
              </li>
              <li>
                Les compteurs de consultation sont conservés indéfiniment, étant agrégés et non
                personnels.
              </li>
              <li>
                Les données de mesure d&rsquo;audience sont supprimées automatiquement au bout de
                vingt-cinq mois (voir le point 8).
              </li>
            </ul>
          </Section>

          <Section titre="8. Cookies et mesure d’audience">
            <p>
              Le site utilise uniquement des cookies strictement nécessaires à son fonctionnement (maintien
              de la session de connexion). Ces cookies ne nécessitent pas de consentement préalable au titre
              de la réglementation CNIL, dans la mesure où ils sont indispensables à la fourniture du
              service demandé par l&rsquo;utilisateur.
            </p>
            <p>
              La mesure d&rsquo;audience est réalisée par le site lui-même, sans aucun outil tiers. Elle ne
              dépose ni cookie ni identifiant dans votre navigateur, et aucune donnée ne quitte
              l&rsquo;hébergement du site. Google Analytics, employé jusqu&rsquo;au 31 août 2026, a été retiré,
              de même que le bandeau de consentement qui l&rsquo;accompagnait.
            </p>
            <p>
              Pour chaque page consultée, le site enregistre l&rsquo;adresse de la page, la date et l&rsquo;heure,
              le nom de domaine du site depuis lequel vous êtes arrivé le cas échéant, le pays, le fait que
              la page ait été lue sur téléphone ou sur ordinateur, et le fait qu&rsquo;une session de connexion
              ait été ouverte ou non. Le compte lui-même n&rsquo;est jamais consigné.
            </p>
            <p>
              Votre adresse IP n&rsquo;est enregistrée à aucun moment. Elle sert uniquement à calculer une
              empreinte chiffrée, au moyen d&rsquo;une clé qui change chaque jour, afin de distinguer deux
              visiteurs au cours d&rsquo;une même journée. Le lendemain, cette empreinte change, et plus rien
              ne permet de rapprocher les deux visites.
            </p>
            <p>
              Ce traitement relève de la mesure d&rsquo;audience strictement limitée au site, anonyme, non
              recoupée avec d&rsquo;autres traitements et non transmise à des tiers. À ce titre il est dispensé
              de consentement préalable, conformément aux lignes directrices de la CNIL, et aucun bandeau ne
              vous est présenté. Ces données sont supprimées automatiquement au bout de vingt-cinq mois.
            </p>
          </Section>

          <Section titre="9. Vos droits">
            <p>
              Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :
            </p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li><strong>Droit d&rsquo;accès</strong> – obtenir la confirmation que vos données sont traitées et en obtenir une copie ;</li>
              <li><strong>Droit de rectification</strong> – corriger des données inexactes ou incomplètes ;</li>
              <li><strong>Droit à l&rsquo;effacement</strong> – demander la suppression de vos données ;</li>
              <li><strong>Droit à la limitation</strong> – restreindre temporairement le traitement ;</li>
              <li><strong>Droit d&rsquo;opposition</strong> – vous opposer à un traitement fondé sur l&rsquo;intérêt légitime ;</li>
              <li><strong>Droit à la portabilité</strong> – recevoir vos données dans un format structuré et lisible par machine.</li>
            </ul>
            <p>
              Pour exercer ces droits, écrivez par le{' '}
              <a href="/contact" style={{ color: "var(--cs-vert)", textDecoration: "underline" }}>formulaire de contact</a>
              {' '}en précisant votre demande. Une réponse vous sera apportée dans un délai d&rsquo;un mois.
            </p>
            <p>
              Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez
              introduire une réclamation auprès de la CNIL :{' '}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--cs-vert)", textDecoration: "underline" }}>
                www.cnil.fr/fr/plaintes
              </a>,
              ou par courrier à CNIL, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
            </p>
          </Section>

          <Section titre="10. Sécurité">
            <p>
              Des mesures techniques raisonnables sont mises en œuvre pour protéger vos données contre
              l&rsquo;accès non autorisé, la perte ou l&rsquo;altération : chiffrement des échanges en HTTPS, contrôle
              d&rsquo;accès aux données via des règles de sécurité au niveau des lignes (Row Level Security -
              RLS), et séparation des accès entre rôles utilisateur et rôle administrateur.
            </p>
          </Section>

          <Section titre="11. Modification de cette politique">
            <p>
              Cette politique peut être mise à jour pour refléter une évolution du site, l&rsquo;ajout de
              nouvelles fonctionnalités ou une modification de la réglementation applicable. La date de
              dernière mise à jour figure en en-tête de cette page. En cas de modification substantielle
              affectant vos droits, vous en serez informé par un avis visible sur le site.
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
        fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1rem",
        fontWeight: "normal", color: "var(--cs-encre)", marginBottom: "10px",
        borderBottom: "1px solid var(--cs-bord)", paddingBottom: "6px",
      }}>
        {titre}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </section>
  );
}
