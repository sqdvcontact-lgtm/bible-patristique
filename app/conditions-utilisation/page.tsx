export const metadata = {
  title: "Conditions d'utilisation — Corpus Scriptura",
  description: "Conditions générales d'utilisation du site labibledesperes.com.",
};

export default function ConditionsUtilisationPage() {
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
          Conditions d&rsquo;utilisation
        </h1>

        <p style={{ fontSize: "12px", color: "#9a958d", marginBottom: "40px", fontStyle: "italic" }}>
          Dernière mise à jour : juin 2026
        </p>

        <div style={{ fontSize: "13.5px", lineHeight: 1.75, color: "#3a3530" }}>

          <Section titre="1. Présentation du site">
            <p>
              Le site <strong>labibledesperes.com</strong> (ci-après « le site ») propose un accès libre et gratuit
              à plusieurs traductions françaises de la Bible, mises en regard de commentaires issus de la
              tradition patristique chrétienne (Pères de l&rsquo;Église, docteurs et auteurs anciens).
            </p>
            <p>
              Le site est édité à titre non professionnel et non commercial par une personne physique.
              Conformément à l&rsquo;article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
              l&rsquo;économie numérique (LCEN), l&rsquo;éditeur, agissant en qualité de particulier hors activité
              professionnelle, a transmis ses coordonnées à l&rsquo;hébergeur du site et peut conserver l&rsquo;anonymat
              vis-à-vis du public.
            </p>
            <p>
              Pour toute question relative au site ou à l&rsquo;exercice de vos droits, vous pouvez utiliser le
              formulaire de signalement disponible sur le site ou écrire à l&rsquo;adresse de contact qui y est
              indiquée.
            </p>
          </Section>

          <Section titre="2. Hébergement">
            <p>
              Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723,
              États-Unis. La base de données et les services d&rsquo;authentification sont fournis par
              <strong> Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour.
            </p>
          </Section>

          <Section titre="3. Accès au site">
            <p>
              Le site est accessible gratuitement à tout utilisateur disposant d&rsquo;un accès à internet. Tous les
              frais nécessaires pour y accéder (matériel informatique, connexion internet, etc.) sont à la
              charge de l&rsquo;utilisateur.
            </p>
            <p>
              L&rsquo;éditeur s&rsquo;efforce de permettre l&rsquo;accès au site 24 heures sur 24, 7 jours sur 7, sans
              obligation d&rsquo;y parvenir. Il pourra à tout moment suspendre, interrompre ou limiter l&rsquo;accès à
              tout ou partie du site, notamment pour des opérations de maintenance, sans préavis ni
              indemnité.
            </p>
          </Section>

          <Section titre="4. Création d'un compte utilisateur">
            <p>
              Certaines fonctionnalités (enregistrement de prélèvements bibliques ou patristiques, dépôt de
              commentaires) nécessitent la création d&rsquo;un compte à partir d&rsquo;une adresse e-mail valide.
            </p>
            <p>
              L&rsquo;utilisateur s&rsquo;engage à fournir des informations exactes et à conserver la confidentialité
              de ses identifiants de connexion. Il est seul responsable de toute activité effectuée depuis
              son compte. Le compte est gratuit et peut être supprimé à tout moment sur simple demande.
            </p>
          </Section>

          <Section titre="5. Contenus déposés par les utilisateurs">
            <p>
              Les utilisateurs peuvent soumettre des commentaires associés à un verset biblique, ainsi que
              des signalements d&rsquo;erreurs. Ces contenus sont systématiquement soumis à une modération avant
              toute publication.
            </p>
            <p>L&rsquo;utilisateur s&rsquo;engage à ne pas déposer de contenu :</p>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>contraire aux lois et règlements en vigueur ;</li>
              <li>à caractère injurieux, diffamatoire, discriminatoire ou outrageant ;</li>
              <li>portant atteinte aux droits de tiers, notamment aux droits d&rsquo;auteur ;</li>
              <li>sans rapport avec l&rsquo;objet du site.</li>
            </ul>
            <p>
              L&rsquo;éditeur se réserve le droit de refuser, modifier ou retirer, sans préavis, tout contenu ne
              respectant pas ces règles, ainsi que de suspendre le compte d&rsquo;un utilisateur en cas de manquement
              répété.
            </p>
          </Section>

          <Section titre="6. Propriété intellectuelle">
            <p>
              Les traductions bibliques reproduites sur le site relèvent, selon les cas, du domaine public ou
              de droits d&rsquo;usage spécifiques mentionnés sur la page « Traductions ». Les textes patristiques
              proposés sont, sauf indication contraire, issus d&rsquo;éditions et de traductions tombées dans le
              domaine public.
            </p>
            <p>
              La structuration des données, les segmentations, les liens établis entre versets et textes
              patristiques, ainsi que l&rsquo;interface du site, constituent un travail éditorial original protégé
              par le droit d&rsquo;auteur. Toute reproduction substantielle de cette structuration à des fins
              commerciales, sans autorisation préalable, est interdite.
            </p>
            <p>
              Le contenu copié par les utilisateurs via les fonctions de citation du site doit conserver la
              mention de la source (« disponible sur Corpus Scriptura ») lorsqu&rsquo;il est réutilisé
              publiquement.
            </p>
          </Section>

          <Section titre="7. Don et soutien au projet">
            <p>
              Le site propose, ou proposera, une fonctionnalité de don ponctuel destinée à couvrir les frais
              d&rsquo;hébergement et de développement du projet. Ces dons sont volontaires, ne constituent la
              contrepartie d&rsquo;aucun service ni accès privilégié, et n&rsquo;ouvrent droit à aucune déduction
              fiscale, le site n&rsquo;étant pas porté par un organisme habilité à délivrer des reçus fiscaux.
            </p>
          </Section>

          <Section titre="8. Données personnelles">
            <p>
              Le traitement des données personnelles des utilisateurs (adresse e-mail, contenus déposés) est
              décrit dans la <a href="/confidentialite" style={{ color: "#3d6b4f", textDecoration: "underline" }}>politique de confidentialité</a> du
              site, accessible depuis le pied de page. Conformément au Règlement général sur la protection
              des données (RGPD) et à la loi Informatique et Libertés, vous disposez d&rsquo;un droit d&rsquo;accès, de
              rectification, d&rsquo;effacement et de portabilité de vos données, ainsi que du droit d&rsquo;introduire
              une réclamation auprès de la CNIL (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={{ color: "#3d6b4f", textDecoration: "underline" }}>www.cnil.fr/fr/plaintes</a>).
            </p>
          </Section>

          <Section titre="9. Limitation de responsabilité">
            <p>
              Le site est le fruit d&rsquo;un travail éditorial collaboratif et bénévole. Si le plus grand soin est
              apporté à l&rsquo;exactitude des textes, des traductions et des liens établis, l&rsquo;éditeur ne garantit
              pas l&rsquo;absence totale d&rsquo;erreurs, d&rsquo;omissions ou d&rsquo;inexactitudes. Les utilisateurs sont invités
              à signaler toute erreur constatée via la fonction de signalement intégrée au site.
            </p>
            <p>
              L&rsquo;éditeur ne pourra être tenu responsable des dommages directs ou indirects résultant de
              l&rsquo;utilisation du site ou de l&rsquo;impossibilité d&rsquo;y accéder, sauf faute lourde ou intentionnelle
              de sa part.
            </p>
          </Section>

          <Section titre="10. Liens vers des sites tiers">
            <p>
              Le site peut contenir des liens vers des sites tiers. L&rsquo;éditeur n&rsquo;exerce aucun contrôle sur ces
              sites et décline toute responsabilité quant à leur contenu ou à leurs pratiques en matière de
              données personnelles.
            </p>
          </Section>

          <Section titre="11. Modification des conditions">
            <p>
              Les présentes conditions peuvent être modifiées à tout moment, notamment pour se conformer à
              une évolution législative, réglementaire ou pour refléter une nouvelle fonctionnalité du site.
              La version en vigueur est celle publiée sur cette page, dont la date de mise à jour figure en
              en-tête.
            </p>
          </Section>

          <Section titre="12. Droit applicable et litiges">
            <p>
              Les présentes conditions d&rsquo;utilisation sont soumises au droit français. En cas de litige et à
              défaut de résolution amiable, les tribunaux français compétents seront seuls saisis, dans le
              respect des règles de compétence applicables aux consommateurs et non-professionnels lorsque
              l&rsquo;utilisateur relève de cette qualité.
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
