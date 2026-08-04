// Données structurées schema.org (JSON-LD) — préparation SEO « vitrine ».
//
// Objectif : faire exister chaque ENTITÉ du corpus (auteur, œuvre, essai,
// péricope) comme un objet compris par Google, avec ses NOMS et VARIANTES —
// c'est ce qui capte les mots-clés (noms d'auteurs, titres d'œuvres, noms des
// bibles, appellations de péricopes) et donne les « rich results ».
//
// Ces balises sont INERTES tant que le site est fermé (les pages redirigent les
// anonymes) : on les pose maintenant pour qu'elles soient prêtes à l'ouverture.
// Rien ici n'expose de texte intégral — seulement l'identité de l'entité.

const BASE = 'https://corpus-scriptura.fr'

// Sérialisation sûre : on neutralise « < » pour qu'aucune valeur ne puisse
// refermer la balise <script> (unique vecteur d'injection dans du JSON-LD).
function serialiser(donnees: unknown): string {
  return JSON.stringify(donnees).replace(/</g, '\\u003c')
}

export function JsonLd({ donnees }: { donnees: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiser(donnees) }} />
  )
}

// ── Site : Organisation + WebSite (posé une seule fois, dans le layout racine). ──
export function donneesSite() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'Corpus Scriptura',
        url: BASE,
        logo: `${BASE}/icon.png`,
        description: "Bibliothèque d'étude consacrée aux liens entre la Bible et les textes des Pères de l'Église.",
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: 'Corpus Scriptura',
        inLanguage: 'fr-FR',
        publisher: { '@id': `${BASE}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/recherche?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

// ── Auteur : Person (le nom + ses variantes captent « nom d'auteur »). ──
export function donneesPersonne(a: {
  id: string; nom: string; nomOriginal?: string | null; description?: string | null
}) {
  const alternate = [a.nomOriginal].filter((v): v is string => !!v && v !== a.nom)
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${BASE}/auteur/${a.id}#person`,
    name: a.nom,
    ...(alternate.length ? { alternateName: alternate } : {}),
    ...(a.description ? { description: a.description } : {}),
    url: `${BASE}/auteur/${a.id}`,
  }
}

// ── Œuvre : Book (titre + titre original + traducteur/éditeur). ──
export function donneesLivre(o: {
  id: string; titre: string; titreOriginal?: string | null
  auteur?: string | null; auteurId?: string | null; traducteur?: string | null
  editeur?: string | null; langue?: string | null; description?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${BASE}/oeuvre/${o.id}#book`,
    name: o.titre,
    ...(o.titreOriginal && o.titreOriginal !== o.titre ? { alternateName: o.titreOriginal } : {}),
    url: `${BASE}/oeuvre/${o.id}`,
    inLanguage: o.langue || 'fr',
    isPartOf: { '@id': `${BASE}/#website` },
    ...(o.auteur ? { author: { '@type': 'Person', name: o.auteur, ...(o.auteurId ? { '@id': `${BASE}/auteur/${o.auteurId}#person` } : {}) } } : {}),
    ...(o.traducteur ? { translator: { '@type': 'Person', name: o.traducteur } } : {}),
    ...(o.editeur ? { publisher: { '@type': 'Organization', name: o.editeur } } : {}),
    ...(o.description ? { description: o.description } : {}),
  }
}

// ── Essai : Article ──
export function donneesArticle(e: {
  id: number; titre: string; sousTitre?: string | null; resume?: string | null
  auteur?: string | null; publieAt?: string | null; modifieAt?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${BASE}/essais/${e.id}#article`,
    headline: e.titre,
    ...(e.sousTitre ? { alternativeHeadline: e.sousTitre } : {}),
    ...(e.resume ? { description: e.resume } : {}),
    url: `${BASE}/essais/${e.id}`,
    inLanguage: 'fr-FR',
    ...(e.auteur ? { author: { '@type': 'Person', name: e.auteur } } : {}),
    ...(e.publieAt ? { datePublished: e.publieAt } : {}),
    ...(e.modifieAt ? { dateModified: e.modifieAt } : {}),
    publisher: { '@id': `${BASE}/#organization` },
    isPartOf: { '@id': `${BASE}/#website` },
  }
}

// ── Péricope : CreativeWork (nom + appellations + référence biblique). ──
export function donneesPericope(p: {
  id: string; nom: string; appellations?: string[]; description?: string | null; reference?: string | null
}) {
  const alt = (p.appellations ?? []).filter(a => a && a !== p.nom)
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${BASE}/pericopes/${p.id}#pericope`,
    name: p.nom,
    ...(alt.length ? { alternateName: alt } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.reference ? { citation: p.reference } : {}),
    url: `${BASE}/pericopes/${p.id}`,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': `${BASE}/#website` },
  }
}

// ── Fil d'Ariane (BreadcrumbList) : aide au crawl et à l'affichage Google. ──
export function donneesFilAriane(elements: { nom: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements.map((el, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: el.nom,
      item: el.url.startsWith('http') ? el.url : `${BASE}${el.url}`,
    })),
  }
}
