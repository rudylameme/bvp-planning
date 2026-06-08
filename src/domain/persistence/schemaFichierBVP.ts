/**
 * Schéma du fichier `.bvp.json` v3.1 + migration v2.1/v3.0 → v3.1 +
 * mapping persisté ↔ domaine.
 *
 * SB-4. Le module est construit et testé EN ISOLATION : il n'est pas encore
 * câblé dans le flux V5 (qui continue de tourner via `services/fichierMagasin.js`
 * et `Etape5Communication.jsx` inchangés). Le branchement live arrivera en
 * SB-5 (adapter local) et SB-6 (passage du contexte au domaine typé).
 *
 * Trois couches lisibles séparément :
 *
 *   1. **Types persistés**            — `PersistedFileV31` + ses sous-types ;
 *                                       v2.1 et v3.0 sont volontairement traités
 *                                       en `unknown` puis migrés (1 seule forme
 *                                       canonique typée à la sortie).
 *   2. **Détection + migration**      — `detectVersion`, `migrerV30versV31`,
 *                                       `migrerV21versV31`, `validerFichier`.
 *                                       Stratégie : preserve-by-spread + override
 *                                       des champs v3.1 spécifiques. Les champs
 *                                       inconnus partent dans `_migrationSource`
 *                                       (escape hatch documenté), pas dans le
 *                                       silence — verrou T7 sans perte.
 *   3. **Mapping persisté ↔ domaine** — `parsePersistedV31` / `serializeDonnees`,
 *                                       pont entre le shape disque (riche, ancré
 *                                       sur les noms V5 historiques) et
 *                                       `DonneesMagasin` (domaine propre).
 *                                       Le mapping est asymétrique : parser →
 *                                       domaine peut perdre des champs purement
 *                                       persistés (frequentation, objectifs,
 *                                       referentiel…) ; la version canonique
 *                                       reste stable au 2e tour (cf. T1, SB-6).
 *
 * Décision design (SB-2 reconduite) :
 *   - `IdCanonique` reste opaque — le mapping ne tranche PAS PLU vs ITM8.
 *     La cascade `nat-/plu-/itm-/ean-/hash-` du V5 (`services/idCanonique.js`)
 *     est préservée bit-pour-bit en passant le champ `id` du persisté à
 *     `idCanonique` du domaine (avec cast structurel).
 *   - `correctionsManuelles` : source de vérité = `gamme`. Le miroir au niveau
 *     racine est conservé pour parité avec la fixture v3.1, et `parsePersisted`
 *     vérifie l'égalité racine ↔ gamme (garde anti-divergence).
 */

import type {
  CorrectionAssociation,
  CorrectionDissociation,
  CorrectionFusion,
  CorrectionManuelle,
  CorrectionSeparation,
  DonneesMagasin,
  FeuilleProduction,
  Gamme,
  IdCanonique,
  Jour,
  JoursOuverture,
  LignePlanning,
  Magasin,
  MatchRefV2,
  MetaExport,
  ProduitExceptionnel,
  Produit,
  Promotion,
  RaisonDesactivation,
  RapportNettoyage,
  SemainePlanning,
} from '../types/index.js';

// ============================================================================
// 1. Types persistés v3.1
// ============================================================================

/**
 * Versions supportées par `validerFichier`. v2.1 et v3.0 sont migrées vers v3.1
 * silencieusement, sans perte.
 */
export type SchemaVersion = '2.1' | '3.0' | '3.1';

/** Forme du bloc `correctionsManuelles` racine — groupé par type (cf. fixture). */
export interface PersistedCorrectionsManuellesV31 {
  readonly separations: readonly string[];
  readonly fusions: readonly { readonly source: string; readonly cible: string }[];
  readonly dissociations: readonly string[];
  readonly associations: readonly { readonly libelle: string; readonly itm8: string }[];
}

/** Produit persisté tel que sérialisé par `Etape5Communication.jsx` V5. */
export interface PersistedProduitV31 {
  readonly id: string;
  readonly plu: string;
  readonly itm8: string;
  readonly ean13: string;
  readonly libelle: string;
  readonly famille: string;
  readonly rayon: string;
  readonly actif: boolean;
  readonly programme: string;
  readonly unitesParPlaque: number;
  readonly unitesParLot: number;
  readonly moyenneHebdo: number;
  readonly potentielAlgo: number;
  readonly planifieManager: number;
  readonly cdt: number;
  readonly repartitionJours: Readonly<Record<string, number>>;
  readonly raisonDesactivation: string | null;
  readonly libelleRefV2: string | null;
  readonly marqueRefV2: string | null;
  readonly _eansFusionnes: readonly string[] | null;
  readonly unitesParVente: number;
  /** Champ v3.1 (nouveau) : match V2 brut. Optionnel pour rétrocompat v3.0. */
  readonly matchRefV2?: MatchRefV2 | null;
  /** Champ v3.1 (nouveau) : booléen « à créer ». Optionnel pour rétrocompat v3.0. */
  readonly aCreer?: boolean;
}

/** Promotion persistée — shape de `Etape5Communication.jsx:271-294`. */
export interface PersistedPromotionV31 {
  readonly plu: string;
  readonly itm8: string;
  readonly libelle: string;
  readonly type: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly prixNormalTTC: number;
  readonly prixPromoTTC: number;
  readonly prixAchatHT: number;
  readonly margePct: number;
  readonly avantageClient: number;
  readonly margeNormaleEuros: number;
  readonly margePromoEuros: number;
  readonly tauxMargePromo: number;
  readonly elasticite: number;
  readonly qteNormaleHebdo: number;
  readonly qteNormalePeriode: number;
  readonly nbJoursPromo: number;
  readonly qteObjectif: number;
  readonly qteValidee: number;
  readonly qteSupplementaire: number;
}

/**
 * Produit exceptionnel persisté — shape extraite de
 * `ProduitsExceptionnels.jsx:61-69` + augmentée du champ `rattacheFeuilleProduction`
 * (v3.1, verrou bug 2).
 */
export interface PersistedProduitExceptionnelV31 {
  readonly id: number | string;
  readonly nom: string;
  readonly famille: string;
  readonly programme: string;
  readonly prixTTC: number;
  readonly margePct: number;
  readonly qteParJour: number;
  readonly qteValidee: number;
  readonly jours: Readonly<Record<string, boolean>>;
  /** Champ v3.1 — source de vérité bug 2. */
  readonly rattacheFeuilleProduction: boolean;
}

/** Configuration persistée (shape `Etape5Communication.jsx:317-347`). */
export interface PersistedConfigurationV31 {
  readonly joursActifs: readonly string[];
  readonly creneaux: unknown | null;
  readonly regroupements: unknown | null;
  readonly nbTranches: number;
  readonly tranchesParFamille?: unknown;
  readonly livraisons: readonly unknown[];
  readonly operationsSpeciales: readonly unknown[];
  readonly repartitionParFamille: unknown;
}

/** Fichier racine v3.1 — shape canonique typée. */
export interface PersistedFileV31 {
  readonly schemaVersion: '3.1';
  readonly type: 'planning-archive';
  readonly exportDate: string;
  readonly magasin: { readonly code: string; readonly nom: string };
  readonly semaine: {
    readonly numero: number;
    readonly annee: number;
    readonly dateDebut: string;
    readonly dateFin: string;
  };
  readonly configuration: PersistedConfigurationV31;
  readonly promotions: readonly PersistedPromotionV31[];
  readonly objectifs: {
    readonly caHistorique: number;
    readonly objectifPourcent: number;
    readonly caPrevision: number;
  };
  readonly produits: readonly PersistedProduitV31[];
  readonly frequentation: unknown;
  readonly commandes: Readonly<Record<string, unknown>>;
  readonly personnalisationProduits: Readonly<Record<string, unknown>>;
  readonly referentiel: {
    readonly version: string;
    readonly inclus: boolean;
    readonly familles: readonly string[];
    readonly source: string;
  };
  readonly plaquage: unknown | null;
  readonly couverturePatisserie: unknown | null;
  readonly idMapping: Readonly<Record<string, string>>;
  /** v3.1 (obligatoire) — verrou bug 1. */
  readonly correctionsManuelles: PersistedCorrectionsManuellesV31;
  /** v3.1 (obligatoire) — verrou bug 2. */
  readonly produitsExceptionnels: readonly PersistedProduitExceptionnelV31[];
  /**
   * Escape hatch : champs présents dans l'ancien schéma source (v2.1 / v3.0)
   * non mappés à une location v3.1 connue. Garantit l'absence de perte au
   * sens T7 — toute donnée venue d'un ancien fichier est ici, vérifiable.
   * Absent si la migration n'a rien d'inconnu à conserver.
   */
  readonly _migrationSource?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// 2. Détection + migration
// ============================================================================

/**
 * Détecte la version d'un fichier brut. Stratégie :
 *   - `schemaVersion === '3.1'`  → v3.1
 *   - `schemaVersion === '3.0'`  → v3.0
 *   - `version` commence par `'2.'` (V5 historique, fichierMagasin.js) → v2.1
 *   - sinon → null (fichier non identifié)
 */
export function detectVersion(raw: unknown): SchemaVersion | null {
  if (!isRecord(raw)) return null;
  const sv = raw['schemaVersion'];
  if (sv === '3.1') return '3.1';
  if (sv === '3.0') return '3.0';
  const v = raw['version'];
  if (typeof v === 'string' && v.startsWith('2.')) return '2.1';
  return null;
}

/**
 * Source des corrections au moment de la migration. Permet de récupérer
 * `localStorage['bvp_corrections_doublons']` UNE SEULE FOIS en environnement
 * navigateur, sans en faire une dépendance dure du module domaine (la fonction
 * est appelable depuis Node en tests, où la fonction renvoie null).
 */
export type SourceCorrections = (() => PersistedCorrectionsManuellesV31 | null) | null;

const CORRECTIONS_VIDE: PersistedCorrectionsManuellesV31 = {
  separations: [],
  fusions: [],
  dissociations: [],
  associations: [],
};

/**
 * Migre un fichier v3.0 vers v3.1. Stratégie preserve-by-spread : toutes les
 * propriétés du v3.0 sont conservées, seuls les champs spécifiques v3.1 sont
 * forcés / défaut-ajoutés.
 *
 * `correctionsManuelles` : si présent dans v3.0 (cas Etape5Communication.jsx
 * L386-395), on le garde. Sinon on tente la source (`localStorage`), sinon vide.
 * `produitsExceptionnels` : absent du schéma V5 actuel ; on tente une source
 * éventuelle (clé localStorage future), sinon tableau vide.
 */
export function migrerV30versV31(
  raw: unknown,
  source: SourceCorrections = null,
): PersistedFileV31 {
  if (!isRecord(raw)) {
    throw new Error('Fichier v3.0 attendu : objet JSON requis');
  }
  const corrFromFile = sanitizeCorrections(raw['correctionsManuelles']);
  const corrFromSource = corrFromFile ?? source?.() ?? null;
  return {
    ...(raw as Record<string, unknown>),
    schemaVersion: '3.1',
    correctionsManuelles: corrFromSource ?? CORRECTIONS_VIDE,
    produitsExceptionnels: sanitizeProduitsExceptionnels(raw['produitsExceptionnels']),
  } as PersistedFileV31;
}

/**
 * Migre un fichier v2.1 vers v3.1. La forme v2.1 est très différente : on
 * extrait les champs connus (magasin) et on garde l'intégralité du fichier
 * source dans `_migrationSource` pour garantir l'absence de perte (T7).
 *
 * Cette migration est volontairement skeletale (semaine factice, configuration
 * vide…). Le but de SB-4 n'est pas de reconstituer un planning Manager depuis
 * un fichier magasin V2.1 : c'est de garder le fichier ré-importable plus tard
 * sans qu'aucune donnée originale ne soit perdue.
 */
export function migrerV21versV31(
  raw: unknown,
  source: SourceCorrections = null,
): PersistedFileV31 {
  if (!isRecord(raw)) {
    throw new Error('Fichier v2.1 attendu : objet JSON requis');
  }
  const magasin = isRecord(raw['magasin']) ? raw['magasin'] : {};
  return {
    schemaVersion: '3.1',
    type: 'planning-archive',
    exportDate: typeof raw['dateGeneration'] === 'string'
      ? raw['dateGeneration']
      : '2000-01-01T00:00:00.000Z',
    magasin: {
      code: typeof magasin['code'] === 'string' ? magasin['code'] : 'INCONNU',
      nom: typeof magasin['nom'] === 'string' ? magasin['nom'] : 'INCONNU',
    },
    semaine: { numero: 1, annee: 2000, dateDebut: '2000-01-03', dateFin: '2000-01-09' },
    configuration: {
      joursActifs: [],
      creneaux: null,
      regroupements: null,
      nbTranches: 4,
      livraisons: [],
      operationsSpeciales: [],
      repartitionParFamille: {},
    },
    promotions: [],
    objectifs: { caHistorique: 0, objectifPourcent: 0, caPrevision: 0 },
    produits: [],
    frequentation: raw['frequentation'] ?? null,
    commandes: isRecord(raw['commande']) ? (raw['commande'] as Record<string, unknown>) : {},
    personnalisationProduits: {},
    referentiel: {
      version: 'inconnu',
      inclus: false,
      familles: [],
      source: 'migration v2.1',
    },
    plaquage: null,
    couverturePatisserie: null,
    idMapping: {},
    correctionsManuelles: source?.() ?? CORRECTIONS_VIDE,
    produitsExceptionnels: [],
    _migrationSource: raw as Record<string, unknown>,
  };
}

/**
 * Entrée publique : accepte un JSON brut, détecte la version, retourne un
 * `PersistedFileV31` typé. Lance une erreur explicite si la version n'est pas
 * reconnue. C'est l'API utilisée en SB-5 par l'adapter local.
 */
export function validerFichier(
  raw: unknown,
  source: SourceCorrections = null,
): PersistedFileV31 {
  const version = detectVersion(raw);
  if (version === null) {
    throw new Error('Fichier .bvp.json non reconnu (version absente ou inconnue)');
  }
  if (version === '3.1') {
    // v3.1 « brut » : on garantit la présence/forme des champs v3.1-spécifiques.
    // En pratique, un fichier v3.1 valide vient déjà bien formé — on normalise
    // par robustesse (sanitize corrections + exceptionnels).
    if (!isRecord(raw)) throw new Error('Fichier v3.1 invalide');
    return {
      ...(raw as Record<string, unknown>),
      schemaVersion: '3.1',
      correctionsManuelles:
        sanitizeCorrections(raw['correctionsManuelles']) ?? source?.() ?? CORRECTIONS_VIDE,
      produitsExceptionnels: sanitizeProduitsExceptionnels(raw['produitsExceptionnels']),
    } as PersistedFileV31;
  }
  if (version === '3.0') return migrerV30versV31(raw, source);
  return migrerV21versV31(raw, source);
}

// ============================================================================
// 3. Mapping persisté ↔ domaine
// ============================================================================

/**
 * Construit un `DonneesMagasin` (domaine) depuis un `PersistedFileV31`.
 * Mapping asymétrique : les champs purement persistés (frequentation, objectifs,
 * referentiel, commandes, plaquage, couverturePatisserie, idMapping…) sont
 * volontairement non remontés dans le domaine.
 *
 * Garde anti-divergence : `correctionsManuelles` racine vs `gamme.corrections`.
 * Au moment de la construction, ils sont identiques par construction (la
 * source unique est le bloc persisté). En lecture ultérieure on les ré-aligne
 * à chaque transformation (`donnees.gamme.correctionsManuelles` reste la
 * source de vérité conceptuelle, le miroir racine sert au verrou T1).
 */
export function parsePersistedV31(file: PersistedFileV31): DonneesMagasin {
  const corrections = persistedCorrectionsToDomain(file.correctionsManuelles);
  const produits = file.produits.map(persistedProduitToDomain);
  const rapportNettoyage: RapportNettoyage = construireRapportNettoyageDepuisProduits(produits);

  const joursOuverture = construireJoursOuvertureDepuisV5(file.configuration);
  const magasin: Magasin = {
    code: file.magasin.code,
    nom: file.magasin.nom,
    joursOuverture,
  };
  const semaine: SemainePlanning = file.semaine;

  const meta: MetaExport = {
    schemaVersion: '3.1',
    type: 'planning-archive',
    exportDate: file.exportDate,
    source: 'test-fixture',
  };

  const gamme: Gamme = {
    produits,
    correctionsManuelles: corrections,
    semaineNumero: semaine.numero,
    moisPlanning: moisDepuisDate(semaine.dateDebut),
    rapportNettoyage,
  };

  const promotions: Promotion[] = file.promotions.map(persistedPromotionToDomain);
  const produitsExceptionnels: ProduitExceptionnel[] = file.produitsExceptionnels.map(
    persistedExceptionnelToDomain,
  );

  // Le domaine ne reconstruit pas les feuilles de production ici — c'est la
  // règle `propagerPromos` (SB-10) qui les construira à partir des produits
  // actifs + promotions + exceptionnels. SB-4 retourne donc une liste vide
  // (le verrou T3 prendra le relais en SB-11).
  const feuillesProduction: readonly FeuilleProduction[] = [];

  return {
    meta,
    magasin,
    semaine,
    gamme,
    promotions,
    produitsExceptionnels,
    feuillesProduction,
    correctionsManuelles: corrections,
  };
}

/**
 * Réciproque : produit un `PersistedFileV31` à partir d'un `DonneesMagasin`.
 * Les champs purement persistés sont remplis avec des défauts neutres — la
 * cible canonique du round-trip (T1 SB-6).
 */
export function serializeDonneesMagasin(d: DonneesMagasin): PersistedFileV31 {
  return {
    schemaVersion: '3.1',
    type: 'planning-archive',
    exportDate: d.meta.exportDate,
    magasin: { code: d.magasin.code, nom: d.magasin.nom },
    semaine: d.semaine,
    configuration: {
      joursActifs: joursActifsDepuisDomaine(d.magasin.joursOuverture),
      // SB-6 — écrire `creneaux` depuis `joursOuverture` pour que le round-trip
      // soit stable au 2e tour (T1). Format string-court (compatible avec la
      // fixture v3.1 et `lireStatut` au reparse).
      creneaux: creneauxDepuisJoursOuverture(d.magasin.joursOuverture),
      regroupements: null,
      nbTranches: 4,
      livraisons: [],
      operationsSpeciales: [],
      repartitionParFamille: {},
    },
    promotions: d.promotions.map(domainPromotionToPersisted),
    objectifs: { caHistorique: 0, objectifPourcent: 0, caPrevision: 0 },
    produits: d.gamme.produits.map(domainProduitToPersisted),
    frequentation: null,
    commandes: {},
    personnalisationProduits: {},
    referentiel: { version: 'inconnu', inclus: false, familles: [], source: 'domain' },
    plaquage: null,
    couverturePatisserie: null,
    idMapping: {},
    correctionsManuelles: domainCorrectionsToPersisted(d.gamme.correctionsManuelles),
    produitsExceptionnels: d.produitsExceptionnels.map(domainExceptionnelToPersisted),
  };
}

// ============================================================================
// Helpers internes — mapping fine-grained
// ============================================================================

function persistedCorrectionsToDomain(
  c: PersistedCorrectionsManuellesV31,
): readonly CorrectionManuelle[] {
  const liste: CorrectionManuelle[] = [];
  for (const l of c.separations) liste.push({ type: 'separation', libelleNormalise: l } satisfies CorrectionSeparation);
  for (const f of c.fusions) liste.push({ type: 'fusion', source: f.source, cible: f.cible } satisfies CorrectionFusion);
  for (const l of c.dissociations) liste.push({ type: 'dissociation', libelleNormalise: l } satisfies CorrectionDissociation);
  for (const a of c.associations) liste.push({ type: 'association', libelleNormalise: a.libelle, itm8: a.itm8 } satisfies CorrectionAssociation);
  return liste;
}

function domainCorrectionsToPersisted(
  corrections: readonly CorrectionManuelle[],
): PersistedCorrectionsManuellesV31 {
  const separations: string[] = [];
  const fusions: { source: string; cible: string }[] = [];
  const dissociations: string[] = [];
  const associations: { libelle: string; itm8: string }[] = [];
  for (const c of corrections) {
    switch (c.type) {
      case 'separation':   separations.push(c.libelleNormalise); break;
      case 'fusion':       fusions.push({ source: c.source, cible: c.cible }); break;
      case 'dissociation': dissociations.push(c.libelleNormalise); break;
      case 'association':  associations.push({ libelle: c.libelleNormalise, itm8: c.itm8 }); break;
    }
  }
  return { separations, fusions, dissociations, associations };
}

function persistedProduitToDomain(p: PersistedProduitV31): Produit {
  const idCanonique = p.id as IdCanonique;
  const matchRefV2 = p.matchRefV2 ?? null;
  const aCreer = p.aCreer ?? false;

  const base = {
    idCanonique,
    libelle: p.libelle,
    libelleNormalise: '', // SB-3 (`normaliserLibelle`) sera appliqué en SB-7
    caTTC: 0,             // non porté par le persisté v3.1 actuel
    qte: p.moyenneHebdo,
    casse: 0,
    tauxCasse: 0,
    aCreer,
    matchRefV2,
    libelleRefV2: p.libelleRefV2,
    marqueRefV2: p.marqueRefV2,
    rayonRefV2: matchRefV2?.rayon ?? null,
  } as const;

  if (p.actif) {
    return { ...base, actif: true, raisonDesactivation: null };
  }
  return {
    ...base,
    actif: false,
    raisonDesactivation: normaliserRaisonDesactivation(p.raisonDesactivation),
  };
}

function domainProduitToPersisted(p: Produit): PersistedProduitV31 {
  const base = {
    id: p.idCanonique,
    plu: '',
    itm8: '',
    ean13: '',
    libelle: p.libelle,
    famille: '',
    rayon: '',
    actif: p.actif,
    programme: '',
    unitesParPlaque: 0,
    unitesParLot: 1,
    moyenneHebdo: p.qte,
    potentielAlgo: 0,
    planifieManager: 0,
    cdt: 0,
    repartitionJours: {},
    libelleRefV2: p.libelleRefV2,
    marqueRefV2: p.marqueRefV2,
    _eansFusionnes: null,
    unitesParVente: 1,
    matchRefV2: p.matchRefV2,
    aCreer: p.aCreer,
  };
  return p.actif
    ? { ...base, raisonDesactivation: null }
    : { ...base, raisonDesactivation: p.raisonDesactivation };
}

function persistedPromotionToDomain(p: PersistedPromotionV31): Promotion {
  return {
    produit: (p.itm8 || p.plu) as IdCanonique,
    libelle: p.libelle,
    type: 'promo',
    periodeDebut: p.dateDebut,
    periodeFin: p.dateFin,
    nbJoursPromo: p.nbJoursPromo,
    prixNormalTTC: p.prixNormalTTC,
    prixPromoTTC: p.prixPromoTTC,
    prixAchatHT: p.prixAchatHT,
    avantageClient: p.avantageClient,
    margePct: p.margePct,
    margeNormaleEuros: p.margeNormaleEuros,
    margePromoEuros: p.margePromoEuros,
    tauxMargePromo: p.tauxMargePromo,
    elasticite: p.elasticite,
    qteNormaleHebdo: p.qteNormaleHebdo,
    qteNormalePeriode: p.qteNormalePeriode,
    qteObjectif: p.qteObjectif,
    qteValidee: p.qteValidee,
    qteSupplementaire: p.qteSupplementaire,
  };
}

function domainPromotionToPersisted(p: Promotion): PersistedPromotionV31 {
  return {
    plu: '',
    itm8: p.produit,
    libelle: p.libelle,
    type: 'promo',
    dateDebut: p.periodeDebut,
    dateFin: p.periodeFin,
    nbJoursPromo: p.nbJoursPromo,
    prixNormalTTC: p.prixNormalTTC,
    prixPromoTTC: p.prixPromoTTC,
    prixAchatHT: p.prixAchatHT,
    avantageClient: p.avantageClient,
    margePct: p.margePct,
    margeNormaleEuros: p.margeNormaleEuros,
    margePromoEuros: p.margePromoEuros,
    tauxMargePromo: p.tauxMargePromo,
    elasticite: p.elasticite,
    qteNormaleHebdo: p.qteNormaleHebdo,
    qteNormalePeriode: p.qteNormalePeriode,
    qteObjectif: p.qteObjectif,
    qteValidee: p.qteValidee,
    qteSupplementaire: p.qteSupplementaire,
  };
}

const JOURS_VALIDES: readonly Jour[] = [
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
];

function persistedExceptionnelToDomain(p: PersistedProduitExceptionnelV31): ProduitExceptionnel {
  const joursVente = JOURS_VALIDES.filter(j => p.jours[j] === true);
  return {
    id: String(p.id),
    libelle: p.nom,
    famille: p.famille,
    programme: p.programme,
    prixPromoTTC: p.prixTTC,
    margePct: p.margePct,
    qtePrevisionnelle: p.qteParJour,
    qteValidee: p.qteValidee,
    joursVente,
    rattacheFeuilleProduction: p.rattacheFeuilleProduction,
  };
}

function domainExceptionnelToPersisted(p: ProduitExceptionnel): PersistedProduitExceptionnelV31 {
  const jours: Record<Jour, boolean> = {
    lundi: false, mardi: false, mercredi: false, jeudi: false,
    vendredi: false, samedi: false, dimanche: false,
  };
  for (const j of p.joursVente) jours[j] = true;
  return {
    id: p.id,
    nom: p.libelle,
    famille: p.famille,
    programme: p.programme,
    prixTTC: p.prixPromoTTC,
    margePct: p.margePct,
    qteParJour: p.qtePrevisionnelle,
    qteValidee: p.qteValidee,
    jours,
    rattacheFeuilleProduction: p.rattacheFeuilleProduction,
  };
}

// ============================================================================
// Helpers — utilitaires & sanitization
// ============================================================================

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Normalise un bloc `correctionsManuelles` brut. Tolère les champs manquants
 * (les tableaux sont défaut-vide). Retourne null si l'entrée n'est pas un objet
 * exploitable.
 */
function sanitizeCorrections(c: unknown): PersistedCorrectionsManuellesV31 | null {
  if (!isRecord(c)) return null;
  const arr = (k: string): readonly unknown[] => Array.isArray(c[k]) ? (c[k] as unknown[]) : [];
  return {
    separations: arr('separations').filter((x): x is string => typeof x === 'string'),
    fusions: arr('fusions')
      .filter(isRecord)
      .filter(o => typeof o['source'] === 'string' && typeof o['cible'] === 'string')
      .map(o => ({ source: o['source'] as string, cible: o['cible'] as string })),
    dissociations: arr('dissociations').filter((x): x is string => typeof x === 'string'),
    associations: arr('associations')
      .filter(isRecord)
      .filter(o => typeof o['libelle'] === 'string' && typeof o['itm8'] === 'string')
      .map(o => ({ libelle: o['libelle'] as string, itm8: o['itm8'] as string })),
  };
}

/**
 * Force un tableau de `PersistedProduitExceptionnelV31` (filtre les non-objets).
 * Cast structurel : on suppose que les objets passant `isRecord` portent les
 * champs attendus. La fixture et l'export Manager respectent ce shape ;
 * un fichier corrompu sera rattrapé par TS au point d'usage.
 */
function sanitizeProduitsExceptionnels(arr: unknown): readonly PersistedProduitExceptionnelV31[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isRecord) as unknown as readonly PersistedProduitExceptionnelV31[];
}

const RAISONS_VALIDES: readonly RaisonDesactivation[] = [
  'promo', 'hors-saison', 'doublon-fusion', 'faible-ca',
  'absent-archive', 'code-non-identifiable', 'manuel',
];

function normaliserRaisonDesactivation(r: string | null): RaisonDesactivation {
  if (r != null && (RAISONS_VALIDES as readonly string[]).includes(r)) {
    return r as RaisonDesactivation;
  }
  return 'manuel';
}

/** Reconstruit un `JoursOuverture` minimal depuis la `configuration` v3.1. */
function construireJoursOuvertureDepuisV5(
  config: PersistedConfigurationV31,
): JoursOuverture {
  const creneaux = isRecord(config.creneaux) ? config.creneaux : {};
  const out = {} as Record<Jour, { matin: { statut: 'ouvert' | 'ferme_habituel' | 'ferme_exceptionnel'; redistribution: { memeJourAutreCreneau: number; jourSuivant: number } }; apresMidi: { statut: 'ouvert' | 'ferme_habituel' | 'ferme_exceptionnel'; redistribution: { memeJourAutreCreneau: number; jourSuivant: number } } }>;
  for (const j of JOURS_VALIDES) {
    const c = isRecord(creneaux[j]) ? (creneaux[j] as Record<string, unknown>) : {};
    out[j] = {
      matin: {
        statut: lireStatut(c['matin']),
        redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 },
      },
      apresMidi: {
        statut: lireStatut(c['apresMidi']),
        redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 },
      },
    };
  }
  return out as JoursOuverture;
}

function lireStatut(v: unknown): 'ouvert' | 'ferme_habituel' | 'ferme_exceptionnel' {
  if (v === 'ouvert' || v === 'ferme_habituel' || v === 'ferme_exceptionnel') return v;
  if (isRecord(v) && typeof v['statut'] === 'string') {
    const s = v['statut'];
    if (s === 'ouvert' || s === 'ferme_habituel' || s === 'ferme_exceptionnel') return s;
  }
  return 'ouvert';
}

function joursActifsDepuisDomaine(j: JoursOuverture): readonly string[] {
  return JOURS_VALIDES.filter(jour =>
    j[jour].matin.statut === 'ouvert' || j[jour].apresMidi.statut === 'ouvert',
  );
}

/**
 * Réciproque de `construireJoursOuvertureDepuisV5` côté serialize — produit un
 * bloc `creneaux` au format string-court attendu par la fixture v3.1.
 */
function creneauxDepuisJoursOuverture(
  j: JoursOuverture,
): Readonly<Record<string, { matin: string; apresMidi: string }>> {
  const out: Record<string, { matin: string; apresMidi: string }> = {};
  for (const jour of JOURS_VALIDES) {
    out[jour] = {
      matin: j[jour].matin.statut,
      apresMidi: j[jour].apresMidi.statut,
    };
  }
  return out;
}

function moisDepuisDate(iso: string): number {
  const m = iso.match(/^\d{4}-(\d{2})/);
  return m && m[1] !== undefined ? parseInt(m[1], 10) : 1;
}

function construireRapportNettoyageDepuisProduits(
  produits: readonly Produit[],
): RapportNettoyage {
  let nbDesactivesPromo = 0;
  let nbDesactivesHorsSaison = 0;
  let nbDoublonsFusionnes = 0;
  let nbDesactivesFaibleCA = 0;
  let nbMatchesRefV2 = 0;
  let nbACreer = 0;
  for (const p of produits) {
    if (p.matchRefV2 !== null) nbMatchesRefV2++;
    if (p.aCreer) nbACreer++;
    if (!p.actif) {
      switch (p.raisonDesactivation) {
        case 'promo':           nbDesactivesPromo++; break;
        case 'hors-saison':     nbDesactivesHorsSaison++; break;
        case 'doublon-fusion':  nbDoublonsFusionnes++; break;
        case 'faible-ca':       nbDesactivesFaibleCA++; break;
        default: break;
      }
    }
  }
  return {
    nbProduitsInitiaux: produits.length,
    nbProduitsFinaux: produits.filter(p => p.actif).length,
    nbDesactivesPromo,
    nbDesactivesHorsSaison,
    nbDoublonsFusionnes,
    nbDesactivesFaibleCA,
    nbMatchesRefV2,
    nbACreer,
    nbCorrectionsManuelles: 0, // rempli par le caller si pertinent
  };
}

// ============================================================================
// Helper avancé : lignes de planning (utilisé en SB-10/SB-11 — exposé ici pour
// que les tests cross-cutting puissent l'utiliser sans dupliquer la logique)
// ============================================================================

/**
 * Conversion typée `LignePlanning` ↔ représentation brute. Posé ici pour SB-10 ;
 * pas appelé par le mapping principal de SB-4. Importable mais inert.
 */
export function ligneVide(): LignePlanning {
  return {
    idCanonique: '' as IdCanonique,
    libelle: '',
    quantitePrevue: 0,
    origine: 'historique',
  };
}
