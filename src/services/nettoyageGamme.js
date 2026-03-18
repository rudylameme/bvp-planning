/**
 * Service de nettoyage intelligent de la gamme produits
 *
 * Prend un tableau de produits (sortie de formaterPourPilotageCA())
 * et retourne le même tableau enrichi avec des champs de nettoyage :
 * - actif/raisonDesactivation
 * - matchRefV2/libelleRefV2/marqueRefV2
 * - aCreer
 *
 * 6 passes de nettoyage :
 * 1.  Désactiver les promos (*)
 * 1b. Désactiver les codes non-identifiables (DC-xxxxx, TRAD poubelle)
 * 2.  Résoudre PRE/PAC (garder PAC, désactiver PRE) — AVANT doublons
 * 3.  Fusionner les doublons (même libellé normalisé)
 * 4.  Désactiver les produits hors saison (même sur les produits déjà inactifs)
 * 5.  Matching fuzzy avec le référentiel V2 (enrichissement + rayon)
 */

import { getReferentielCache, mapFamilleV2VersRayon } from './referentielITM8';
import { resoudreParLiaisonEAN } from './referentielMagasin';

// ── Produits saisonniers ──

const PRODUITS_SAISONNIERS = [
  // Galettes des rois : janvier uniquement
  { motsCles: ['GALETTE', 'FRANGIPANE', 'EPIPHANIE'], moisValides: [1], sousFamille: 'GALETTE' },
  // Coquilles de Noël : novembre-décembre uniquement
  { motsCles: ['NOEL', 'NOËL'], moisValides: [11, 12] },
  // Bûches de Noël (pas les buchettes pain !) : novembre-décembre
  // ATTENTION : "BUCHETTE" dans sf "BAGUETTE ET PAIN SPECIAUX" n'est PAS saisonnier !
  { motsCles: ['BUCHE DE NOEL', 'BUCHE GLACEE'], moisValides: [11, 12] },
];

// ── Normalisation ──

/**
 * Normalise un libellé pour la détection de doublons.
 * Retire : *, P&C, PAC, CRU, PRE/PREC/PRECUIT(E)(S), PREP/PREPOUSSE, CUI/CUIT,
 *          PC (précuit abrégé), DECONGELE(E)(S), OFF, AOP, S.A,
 *          fractions (1/2→DEMI), poids (250G, 300KG, 235GR), nombres seuls, X1 (unité),
 *          diamètres (D22), ponctuation résiduelle.
 *          Le "/" est traité comme séparateur.
 *          ATTENTION : les conditionnements X2+ (X8, X12, X20) sont GARDÉS car produits différents.
 */
export const normaliserLibelle = (lib) => {
  return (lib || '')
    .toUpperCase()
    .replace(/^\*/, '')                    // retirer * promo
    // Normaliser les fractions AVANT tout le reste
    .replace(/\b1\/2\b/g, 'DEMI')         // 1/2 → DEMI
    .replace(/\b1\/3\b/g, 'TIERS')        // 1/3 → TIERS
    .replace(/\b1\/4\b/g, 'QUART')        // 1/4 → QUART
    .replace(/\//g, ' ')                   // "/" → espace (séparateur)
    .replace(/[.,;:!?]+/g, ' ')           // ponctuation résiduelle → espace (CHOCO. → CHOCO, NAT.PC → NAT PC)
    .replace(/\bP&C\b/g, '')
    .replace(/\bPAC\b/g, '')
    .replace(/\bCRU\b/g, '')
    .replace(/\bPRE\b|\bPREC\b|\bPRECUI\w*\b/g, '')  // PRE, PREC, PRECUIT, PRECUITE, PRECUITES, PRECUI (tronqué)
    .replace(/\bPREP\b|\bPREPOUS\w*\b/g, '')          // PREP, PREPOUSSE, PREPOUSSEE — méthode cuisson
    .replace(/\bCUI\b|\bCUITS?\b/g, '')                // CUI, CUIT, CUITS — variantes de "cuit"
    .replace(/\bPC\b/g, '')                             // PC — abréviation de "précuit" très fréquente en BVP
    .replace(/\bDECONGELEE?S?\b/g, '')    // DECONGELE, DECONGELEE, DECONGELES, DECONGELEES
    .replace(/\bOFF\b/g, '')              // "OFF" (offre) n'est pas distinctif
    .replace(/\bAOP\b/g, '')              // AOP (Appellation d'Origine Protégée) — classification, pas produit distinct
    .replace(/\bSTICK\w*\b/g, '')         // STICK, STICKER — sticker prix collé sur le produit (pas un produit différent)
    .replace(/\bSTI\b/g, '')              // STI — version tronquée de STICK dans certains libellés
    .replace(/\d+\s*[GK]G?\b/gi, '')      // poids avec unité : 300G, 250KG, 1K, etc.
    .replace(/\d+\s*GR\b/gi, '')           // poids en GR : 235GR, 290GR, etc.
    .replace(/\b(\d+)\+(\d+)\b/g, 'PACK$1PLUS$2')  // Protéger "3+1" → "PACK3PLUS1" AVANT suppression des nombres
    .replace(/\b\d{1,4}\b/g, '')          // nombres seuls de 1-4 chiffres (poids, codes, numéros résiduels)
    .replace(/PACK(\d+)PLUS(\d+)/g, '$1+$2')        // Restaurer "3+1" après suppression des nombres
    .replace(/\bX\d+\b/gi, '')            // X1, X5, X10, X20 — conditionnement lot, même produit vendu en boîte ou à l'unité
    .replace(/\bD\d+\b/g, '')             // D22, D28 — diamètres galettes
    .replace(/\bS\.?A\.?\b/g, '')         // S.A, SA (service arrière)
    .replace(/\s+/g, ' ')
    .trim();
};

// ── Passe 1 : Promos ──

const desactiverPromos = (produits) => {
  return produits.map(p => {
    if (p.libelle.trim().startsWith('*')) {
      return { ...p, actif: false, raisonDesactivation: 'promo' };
    }
    return p;
  });
};

// ── Passe 1b : Codes non-identifiables (DC + poubelle TRAD) ──

/**
 * Désactive les produits dont les ventes ne sont pas exploitables :
 * - DC-xxxxx : "date courte", produits stickés en remise fin de DLC
 * - Codes poubelle TRAD : "Boulangerie TRAD", "Viennoiserie TRAD", etc.
 *   → EAN très court, code caisse générique où l'hôtesse saisit le prix + rayon
 */
const desactiverCodesNonIdentifiables = (produits) => {
  return produits.map(p => {
    const libUpper = (p.libelle || '').toUpperCase().trim();

    // DC-xxxxx : date courte
    if (/^DC[- ]/.test(libUpper)) {
      return { ...p, actif: false, raisonDesactivation: 'date-courte' };
    }

    // Codes poubelle TRAD : "BOULANGERIE TRAD", "VIENNOISERIE TRAD", "PATISSERIE TRAD", etc.
    if (/\bTRAD\b/.test(libUpper)) {
      return { ...p, actif: false, raisonDesactivation: 'code-poubelle' };
    }

    return p;
  });
};

// ── Passe 3 : Fusion des doublons ──

/**
 * Recalcule tous les indicateurs d'un produit à partir de ses ventes quotidiennes brutes.
 * C'est la fonction clé : quand on fusionne deux EAN, on merge leurs ventesQuotidiennes
 * puis on recalcule TOUT depuis zéro (moyHebdo, potentiel, tendance, fiabilité, CA, casse).
 *
 * @param {Object} produit - Produit avec ventesQuotidiennes[] fusionnées
 * @returns {Object} Produit avec tous les indicateurs recalculés
 */
export const recalculerDepuisVentesQuotidiennes = (produit) => {
  const vq = produit.ventesQuotidiennes || [];
  if (vq.length === 0) return produit;

  // ── Agréger par date (en cas de doublons de date après fusion) ──
  const parDate = new Map();
  for (const jour of vq) {
    const key = jour.date;
    if (!parDate.has(key)) {
      parDate.set(key, { ...jour });
    } else {
      const existing = parDate.get(key);
      existing.ventesQte += jour.ventesQte;
      existing.ventesPVTTC += jour.ventesPVTTC;
      existing.casseQte += jour.casseQte;
      existing.cassePAHT += jour.cassePAHT;
    }
  }
  const joursUniques = Array.from(parDate.values());
  const nombreJours = joursUniques.length;

  // ── Totaux bruts ──
  let totalVentesQte = 0, totalVentesPVTTC = 0, totalCasseQte = 0, totalCassePAHT = 0;
  for (const j of joursUniques) {
    totalVentesQte += j.ventesQte;
    totalVentesPVTTC += j.ventesPVTTC;
    totalCasseQte += j.casseQte;
    totalCassePAHT += j.cassePAHT;
  }

  // ── Agréger par jour de semaine (pour moyHebdo) ──
  const ventesParJour = {}; // { jourSemaine: { total, count } }
  const caParJour = {};
  const casseParJour = {};
  for (const j of joursUniques) {
    const js = j.jourSemaine;
    if (!ventesParJour[js]) ventesParJour[js] = { total: 0, count: 0 };
    ventesParJour[js].total += j.ventesQte;
    ventesParJour[js].count += 1;
    if (!caParJour[js]) caParJour[js] = { total: 0, count: 0 };
    caParJour[js].total += j.ventesPVTTC;
    caParJour[js].count += 1;
    if (!casseParJour[js]) casseParJour[js] = { total: 0, count: 0 };
    casseParJour[js].total += j.cassePAHT;
    casseParJour[js].count += 1;
  }

  // ── Moyenne hebdo (somme des moyennes par jour de semaine) ──
  const moyHebdo = Math.round(
    Object.values(ventesParJour).reduce((sum, { total, count }) =>
      sum + (count > 0 ? total / count : 0), 0)
  );

  // ── CA hebdo moyen ──
  const caSemaine = Math.round(
    Object.values(caParJour).reduce((sum, { total, count }) =>
      sum + (count > 0 ? total / count : 0), 0) * 100
  ) / 100;

  // ── Casse PA HT hebdo moyen ──
  const cassePAHTSemaine = Math.round(
    Object.values(casseParJour).reduce((sum, { total, count }) =>
      sum + (count > 0 ? total / count : 0), 0) * 100
  ) / 100;

  // ── Agréger par semaine ISO (pour potentiel, tendance, fiabilité, historiqueParSemaine) ──
  const getISOWeek = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`;
  };

  const ventesParSemaine = new Map();
  for (const j of joursUniques) {
    const sKey = getISOWeek(j.date);
    if (!ventesParSemaine.has(sKey)) {
      ventesParSemaine.set(sKey, { ventesQte: 0, ventesPVTTC: 0, cassePAHT: 0, casseQte: 0 });
    }
    const s = ventesParSemaine.get(sKey);
    s.ventesQte += j.ventesQte;
    s.ventesPVTTC += j.ventesPVTTC;
    s.cassePAHT += j.cassePAHT;
    s.casseQte += j.casseQte;
  }

  const semaines = Array.from(ventesParSemaine.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const nombreSemaines = semaines.length;

  // ── Potentiel (règle des 5B : max des moyennes journalières / poids jour) ──
  const POIDS_JOURS = { 0: 0.09, 1: 0.12, 2: 0.14, 3: 0.14, 4: 0.14, 5: 0.17, 6: 0.20 };
  const potentielsJournaliers = Object.entries(ventesParJour).map(([jourIdx, { total, count }]) => {
    const moyJour = count > 0 ? total / count : 0;
    const poids = POIDS_JOURS[parseInt(jourIdx)] || 0.14;
    return poids > 0 ? moyJour / poids : 0;
  });
  let potentiel = potentielsJournaliers.length > 0
    ? Math.round(Math.max(...potentielsJournaliers))
    : moyHebdo;
  const plancher = moyHebdo > 0 ? Math.ceil(moyHebdo * 0.95) : 0;
  potentiel = Math.max(potentiel, plancher);

  // ── Tendance (première moitié vs deuxième moitié des semaines) ──
  let tendance = 'stable';
  let tendancePourcent = 0;
  if (nombreSemaines >= 2) {
    const mid = Math.ceil(nombreSemaines / 2);
    const moyPremiere = semaines.slice(0, mid).reduce((sum, [, s]) => sum + s.ventesQte, 0) / mid;
    const moyDerniere = semaines.slice(mid).reduce((sum, [, s]) => sum + s.ventesQte, 0) / (nombreSemaines - mid);
    if (moyPremiere > 0) {
      tendancePourcent = Math.round(((moyDerniere - moyPremiere) / moyPremiere) * 100);
      tendance = tendancePourcent > 5 ? 'croissance' : tendancePourcent < -5 ? 'declin' : 'stable';
    }
  }

  // ── Fiabilité (coefficient de variation des ventes par semaine) ──
  let fiabilite = 50;
  if (nombreSemaines >= 2) {
    const vals = semaines.map(([, s]) => s.ventesQte);
    const moy = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + Math.pow(v - moy, 2), 0) / vals.length;
    const cv = moy > 0 ? Math.sqrt(variance) / moy : 1;
    fiabilite = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
  } else if (nombreJours >= 5) {
    fiabilite = 60;
  } else if (nombreJours >= 3) {
    fiabilite = 40;
  } else {
    fiabilite = 20;
  }

  // ── Taux de casse ──
  const tauxCasse = totalVentesPVTTC > 0
    ? Math.round((totalCassePAHT / totalVentesPVTTC) * 1000) / 10
    : 0;

  // ── Prix moyen ──
  const prixMoyen = totalVentesQte > 0
    ? Math.round((totalVentesPVTTC / totalVentesQte) * 100) / 100
    : produit.prixMoyen || 0;

  // ── Casse Qté hebdo ──
  const casseQteSemaine = nombreSemaines > 0
    ? Math.round(totalCasseQte / nombreSemaines * 10) / 10
    : 0;

  // ── Historique par semaine ──
  const historiqueParSemaine = semaines.map(([sKey, data]) => ({
    semaine: sKey,
    semaineLabel: `S${sKey.substring(4)}`,
    ventesQte: data.ventesQte,
    ventesPVTTC: Math.round(data.ventesPVTTC * 100) / 100,
    cassePAHT: Math.round((data.cassePAHT || 0) * 100) / 100,
    casseQte: data.casseQte || 0,
    tauxCasse: data.ventesPVTTC > 0 ? Math.round(((data.cassePAHT || 0) / data.ventesPVTTC) * 1000) / 10 : 0,
  }));

  // ── Poids CA (sera recalculé au niveau global, mais on met à jour le brut) ──
  return {
    ...produit,
    ventesQuotidiennes: joursUniques, // version dédoublonnée
    moyHebdo,
    potentiel,
    caSemaine,
    cassePAHTSemaine,
    casseQteSemaine,
    tauxCasse,
    tendance,
    tendancePourcent,
    fiabilite,
    prixMoyen,
    prixMoyenUnitaire: prixMoyen,
    moyenneHebdo: moyHebdo,
    nombreJours,
    nombreSemaines,
    historiqueParSemaine,
  };
};

// Sous-fonction : fusionner un groupe de membres (actifs avec même clé)
const fusionnerSousGroupe = (membres, resultats) => {
  const actifs = membres.filter(m => m.produit.actif);
  if (actifs.length <= 1) return;

  // Garder celui avec le CA hebdo le plus élevé
  actifs.sort((a, b) => (b.produit.caSemaine || 0) - (a.produit.caSemaine || 0));
  const gagnant = actifs[0];

  let ventesQuotidiennesFusionnees = [...(gagnant.produit.ventesQuotidiennes || [])];

  for (let i = 1; i < actifs.length; i++) {
    ventesQuotidiennesFusionnees = ventesQuotidiennesFusionnees.concat(
      actifs[i].produit.ventesQuotidiennes || []
    );
    resultats[actifs[i].index] = {
      ...actifs[i].produit,
      actif: false,
      raisonDesactivation: 'doublon-fusion',
      _ventesQuotidiennesOriginales: actifs[i].produit.ventesQuotidiennes || [],
    };
  }

  resultats[gagnant.index] = recalculerDepuisVentesQuotidiennes({
    ...gagnant.produit,
    ventesQuotidiennes: ventesQuotidiennesFusionnees,
    _ventesQuotidiennesOriginales: gagnant.produit._ventesQuotidiennesOriginales || gagnant.produit.ventesQuotidiennes || [],
    _eansFusionnes: actifs.map(a => a.produit.codeEAN),
  });
};

const fusionnerDoublons = (produits) => {
  // Grouper par libellé normalisé
  const groupes = new Map();

  produits.forEach((p, idx) => {
    const key = normaliserLibelle(p.libelle);
    if (!groupes.has(key)) {
      groupes.set(key, []);
    }
    groupes.get(key).push({ produit: p, index: idx });
  });

  const resultats = [...produits];

  groupes.forEach((membres) => {
    if (membres.length <= 1) return;

    // ═══ GARDE-FOU ITM8 ═══
    // Si les membres ont des ITM8 DIFFÉRENTS et non-vides, ce ne sont PAS de vrais doublons.
    // Exemple : "BAGUETTE PRECUITE" (ITM8: 18123456) et "BAGUETTE TRADITION" (ITM8: 18789012)
    // ont le même libellé normalisé "BAGUETTE" mais sont des produits différents.
    const itm8Set = new Set(membres.map(m => m.produit.itm8).filter(Boolean));
    if (itm8Set.size > 1) {
      // Plusieurs ITM8 différents → sous-grouper par ITM8
      const sousGroupes = new Map();
      membres.forEach(m => {
        const itm8Key = m.produit.itm8 || `no-itm8-${m.index}`;
        if (!sousGroupes.has(itm8Key)) sousGroupes.set(itm8Key, []);
        sousGroupes.get(itm8Key).push(m);
      });

      // Fusionner uniquement au sein de chaque sous-groupe ITM8
      sousGroupes.forEach((sousGroupe) => {
        if (sousGroupe.length <= 1) return;
        fusionnerSousGroupe(sousGroupe, resultats);
      });
      return;
    }
    // ═══ FIN GARDE-FOU ITM8 ═══

    fusionnerSousGroupe(membres, resultats);
  });

  return resultats;
};

// ── Passe 2 : PRE vs PAC (exécutée AVANT la fusion de doublons) ──

const resoudrePREPAC = (produits) => {
  return produits.map((p, idx) => {
    if (!p.actif) return p;

    const lib = p.libelle.toUpperCase();
    // Détecter toutes les variantes "précuit/prépoussé/cuit" :
    // PRE, PREC, PRECUIT(E)(S), PREP, PREPOUSSE(E), PC, CUI, CUIT(S)
    const isPRE = /\bPRE\b|\bPREC\b|\bPRECUI\w*|\bPREP\b|\bPREPOUS\w*|\bPC\b|\bCUI\b|\bCUITS?\b/.test(lib);

    if (!isPRE) return p;

    const norm = normaliserLibelle(p.libelle);

    // Chercher un équivalent PAC (actif OU inactif — le PAC peut être une promo *)
    const hasEquivalent = produits.some((autre, i) => {
      if (i === idx) return false;
      const autreNorm = normaliserLibelle(autre.libelle);
      if (autreNorm !== norm) return false;
      const autreLib = autre.libelle.toUpperCase();
      // L'autre ne doit PAS être PRE/PC/CUI lui aussi
      return !/\bPRE\b|\bPREC\b|\bPRECUI\w*|\bPREP\b|\bPREPOUS\w*|\bPC\b|\bCUI\b|\bCUITS?\b/.test(autreLib);
    });

    if (hasEquivalent) {
      return { ...p, actif: false, raisonDesactivation: 'doublon-pre' };
    }

    return p;
  });
};

// ── Passe 4 : Hors saison ──

const desactiverHorsSaison = (produits, moisPlanning) => {
  if (!moisPlanning) return produits;

  return produits.map(p => {
    // NE PAS tester p.actif ici — on veut détecter le hors-saison
    // même sur des produits déjà désactivés (promo, doublon)
    const libUpper = p.libelle.toUpperCase();

    for (const saisonnier of PRODUITS_SAISONNIERS) {
      // Vérifier si le produit match un des mots-clés saisonniers
      const matchMotCle = saisonnier.motsCles.some(mot => libUpper.includes(mot));

      if (!matchMotCle) continue;

      // Exception : "BUCHETTE" qui est dans la sous-famille "BAGUETTE ET PAIN SPECIAUX"
      // n'est PAS une bûche de Noël
      if (libUpper.includes('BUCHETTE')) continue;

      // Vérifier si on est hors période
      if (!saisonnier.moisValides.includes(moisPlanning)) {
        return { ...p, actif: false, raisonDesactivation: 'hors-saison' }; // écrase 'promo' si déjà mis
      }
    }

    return p;
  });
};

// ── Passe 5 : Matching fuzzy avec référentiel V2 ──

/**
 * Vérifie si deux tokens matchent (exact ou préfixe)
 * @returns 1.0 pour exact, 0.7 pour préfixe (min 3 chars), 0 sinon
 */
const scoreTokens = (tokenA, tokenB) => {
  if (tokenA === tokenB) return 1.0;
  // Préfixe : le plus court doit faire au moins 3 caractères
  const shorter = tokenA.length <= tokenB.length ? tokenA : tokenB;
  const longer = tokenA.length > tokenB.length ? tokenA : tokenB;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return 0.7;
  return 0;
};

/**
 * Calcul de score de similarité entre deux ensembles de tokens
 * Score pondéré : 50% Jaccard (avec préfixes) + 50% couverture des tokens vente
 */
const calculerScore = (tokensVente, tokensRef) => {
  if (tokensVente.length === 0 || tokensRef.length === 0) return 0;

  // Pour chaque token vente, trouver le meilleur match dans le ref
  let totalScore = 0;
  let matchCount = 0;
  const refUtilises = new Set();

  for (const tv of tokensVente) {
    let bestScore = 0;
    let bestIdx = -1;
    for (let i = 0; i < tokensRef.length; i++) {
      if (refUtilises.has(i)) continue;
      const s = scoreTokens(tv, tokensRef[i]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    if (bestScore > 0 && bestIdx >= 0) {
      totalScore += bestScore;
      matchCount++;
      refUtilises.add(bestIdx);
    }
  }

  if (matchCount === 0) return 0;

  // Tokens du ref NON matchés = tokens distinctifs absents du produit
  // Ex : si ref = "CONSTANCE CEREALES" et vente = "CONSTANCE 3+1",
  // "CEREALES" est non matché → pénalité car c'est un mot discriminant.
  const refNonMatches = tokensRef.length - refUtilises.size;

  // Jaccard-like : score total / nombre total de tokens uniques
  const unionSize = tokensVente.length + tokensRef.length - matchCount;
  const jaccard = totalScore / unionSize;

  // Couverture vente : proportion des tokens vente qui ont trouvé un match
  const couvertureVente = matchCount / tokensVente.length;

  // Couverture ref : proportion des tokens ref qui ont été matchés
  // Pénalise les refs qui ont des mots distinctifs absents du produit
  const couvertureRef = refUtilises.size / tokensRef.length;

  // Score final : pondéré Jaccard + couverture vente + couverture ref
  return (jaccard * 0.35) + (couvertureVente * 0.35) + (couvertureRef * 0.30);
};

const enrichirAvecRefV2 = (produits, refMagasin = null) => {
  const refCache = getReferentielCache();
  if (!refCache || !refCache.itm8Map) return produits;

  // Préparer les tokens normalisés du référentiel
  const refEntries = [];
  refCache.itm8Map.forEach((info, itm8) => {
    const norm = normaliserLibelle(info.libelle);
    const tokens = norm.split(/\s+/).filter(t => t.length > 1);
    refEntries.push({ itm8, info, norm, tokens });
  });

  // Tracker quels produits ref ont été matchés
  const refMatchedItm8 = new Set();

  // Helper pour enrichir un produit avec les infos du référentiel (y compris rayon)
  const enrichirProduit = (p, matchInfo) => {
    const enrichi = {
      ...p,
      matchRefV2: matchInfo,
      libelleRefV2: matchInfo.libelle,
      marqueRefV2: matchInfo.marque || null,
      // Propager les infos techniques du référentiel V2
      programme: matchInfo.programme || p.programme,
      unitesParPlaque: matchInfo.unitesParPlaque || p.unitesParPlaque,
      unitesParVente: matchInfo.unitesParVente || p.unitesParVente,
      itm8: matchInfo.itm8 || p.itm8,
    };
    // Mettre à jour le rayon depuis le référentiel si pertinent
    if (matchInfo.rayon && matchInfo.rayon !== 'AUTRE') {
      enrichi.rayon = matchInfo.rayon;
      enrichi.famille = matchInfo.rayon;
    }
    return enrichi;
  };

  // Helper : valider qu'un match par code (ITM8/EAN) est cohérent avec le libellé
  // Évite que "BAGUETTE CONSTANCE" (ITM8=X) matche avec "BAGUETTE" (ITM8=X dans le ref)
  // quand le ref a le mauvais ITM8 pour ce produit.
  const validerMatchParCode = (produit, refInfo) => {
    const normP = normaliserLibelle(produit.libelle);
    const normR = normaliserLibelle(refInfo.libelle);
    // Si les noms normalisés sont identiques ou l'un contient l'autre → OK
    if (normP === normR) return true;
    if (normP.length >= 8 && normR.length >= 8) {
      const shorter = normP.length <= normR.length ? normP : normR;
      const longer = normP.length > normR.length ? normP : normR;
      if (shorter.length / longer.length >= 0.5 && longer.includes(shorter)) return true;
    }
    // Sinon vérifier les tokens en commun (au moins 50% des tokens vente)
    const tokP = normP.split(/\s+/).filter(t => t.length > 1);
    const tokR = normR.split(/\s+/).filter(t => t.length > 1);
    if (tokP.length === 0) return true; // pas de tokens → accepter par défaut
    let matchCount = 0;
    for (const tp of tokP) {
      if (tokR.some(tr => scoreTokens(tp, tr) > 0)) matchCount++;
    }
    // Un seul token commun est trop générique (ex: "BAGUETTE" matche tout)
    // Exiger au moins 2 tokens communs ET 60% de couverture
    if (matchCount < 2) return false;
    if (matchCount / tokP.length < 0.6) return false;

    // ── Vérification X-tokens (conditionnements) ──
    // Si le produit a un X-token (X2, X8, X20…), la ref DOIT aussi l'avoir,
    // sinon c'est un conditionnement différent (ex: CHOUQUETTE X20 ≠ CHOUQUETTE)
    const xTokensP = tokP.filter(t => /^X\d+$/i.test(t) && t.toUpperCase() !== 'X1');
    if (xTokensP.length > 0) {
      const xTokensR = tokR.filter(t => /^X\d+$/i.test(t) && t.toUpperCase() !== 'X1');
      // Si la ref n'a aucun X-token OU un X-token différent → refuser le match
      const xMatch = xTokensP.every(xp => xTokensR.some(xr => xp.toUpperCase() === xr.toUpperCase()));
      if (!xMatch) return false;
    }

    // ── Vérification lots N+N (ex: 3+1, 2+1) ──
    // Un lot "CONSTANCE 3+1" est un produit COMPLÈTEMENT différent de "CONSTANCE CEREALES"
    // Si le produit a un pattern N+N, la ref DOIT aussi l'avoir (et inversement)
    const packPatternP = tokP.filter(t => /^\d+\+\d+$/.test(t));
    const packPatternR = tokR.filter(t => /^\d+\+\d+$/.test(t));
    if (packPatternP.length > 0 && packPatternR.length === 0) return false;
    if (packPatternP.length === 0 && packPatternR.length > 0) return false;
    if (packPatternP.length > 0 && packPatternR.length > 0) {
      // Les deux ont des packs → vérifier qu'ils sont identiques
      const packMatch = packPatternP.every(pp => packPatternR.includes(pp));
      if (!packMatch) return false;
    }

    return true;
  };

  const enrichis = produits.map(p => {
    // ── NIVEAU 0 : Liaison EAN → ITM via référentiel magasin (priorité maximale) ──
    if (refMagasin && p.codeEAN) {
      const eanStr = String(p.codeEAN).trim();
      const resultat = resoudreParLiaisonEAN(eanStr, refMagasin);
      if (resultat) {
        // Valider la cohérence du match (lot 3+1 ≠ produit simple, etc.)
        if (validerMatchParCode(p, resultat)) {
          refMatchedItm8.add(resultat.itm8);
          return {
            ...p,
            matchRefV2: resultat,
            libelleRefV2: resultat.libelle,
            marqueRefV2: resultat.marque || null,
            rayon: resultat.rayon && resultat.rayon !== 'AUTRE' ? resultat.rayon : p.rayon,
            famille: resultat.rayon && resultat.rayon !== 'AUTRE' ? resultat.rayon : p.famille,
            itm8: resultat.itm8,
            reconnu: true,
            sourceIdentification: resultat.sourceIdentification,
            libelleMagasin: resultat.libelleMagasin,
            prixVenteMagasin: resultat.prixVenteMagasin,
            programme: resultat.programme || p.programme,
            unitesParPlaque: resultat.unitesParPlaque || p.unitesParPlaque,
            unitesParVente: resultat.unitesParVente || p.unitesParVente,
          };
        }
        // Match Niveau 0 rejeté par validation → continuer vers les niveaux suivants
      }
    }

    // ── NIVEAU 1 : Si déjà reconnu par ITM8 direct ──
    // Enrichir — mais VALIDER la cohérence du nom
    if (p.reconnu && p.itm8) {
      const refInfo = refCache.itm8Map.get(p.itm8);
      if (refInfo && validerMatchParCode(p, refInfo)) {
        refMatchedItm8.add(p.itm8);
        return enrichirProduit(p, refInfo);
      }
      // Si le nom ne colle pas → ne pas utiliser ce match, laisser le fuzzy décider
    }

    // EAN match direct — SAUF EAN internes (commencent par "2")
    // Les EAN internes/balance (26xxxx, 28xxxx) sont réutilisés entre produits
    // et ne sont pas fiables pour le matching. On les laisse passer au fuzzy.
    if (p.codeEAN && refCache.eanMap) {
      const eanStr = String(p.codeEAN).trim();
      const isEanInterne = eanStr.startsWith('2');
      if (!isEanInterne) {
        const refByEan = refCache.eanMap.get(p.codeEAN);
        if (refByEan && validerMatchParCode(p, refByEan)) {
          refMatchedItm8.add(refByEan.itm8);
          return enrichirProduit(p, refByEan);
        }
      }
    }

    // ── Helper : vérifier compatibilité des lots N+N entre deux libellés normalisés ──
    const packCompatible = (normA, normB) => {
      const tokA = normA.split(/\s+/).filter(t => /^\d+\+\d+$/.test(t));
      const tokB = normB.split(/\s+/).filter(t => /^\d+\+\d+$/.test(t));
      if (tokA.length > 0 && tokB.length === 0) return false;
      if (tokA.length === 0 && tokB.length > 0) return false;
      if (tokA.length > 0 && tokB.length > 0) {
        return tokA.every(pa => tokB.includes(pa));
      }
      return true;
    };

    // Matching par sous-chaîne (inclusion) avant le fuzzy par tokens
    // IMPORTANT : le plus court des deux doit faire au moins 10 caractères
    // ET représenter au moins 50% du plus long, sinon "PAIN" matcherait tout.
    const normVente = normaliserLibelle(p.libelle);
    if (normVente.length >= 10) {
      for (const entry of refEntries) {
        if (entry.norm.length < 10) continue; // ref trop courte → skip
        // Vérifier compatibilité lots N+N AVANT le match par inclusion
        if (!packCompatible(normVente, entry.norm)) continue;
        const shorter = normVente.length <= entry.norm.length ? normVente : entry.norm;
        const longer = normVente.length > entry.norm.length ? normVente : entry.norm;
        if (shorter.length / longer.length >= 0.5 && longer.includes(shorter)) {
          refMatchedItm8.add(entry.itm8);
          return enrichirProduit(p, entry.info);
        }
      }
    }

    // Matching fuzzy par tokens
    const tokensVente = normVente.split(/\s+/).filter(t => t.length > 1);

    if (tokensVente.length === 0) return p;

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of refEntries) {
      // Vérifier compatibilité lots N+N AVANT le calcul de score
      if (!packCompatible(normVente, entry.norm)) continue;
      const score = calculerScore(tokensVente, entry.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Exiger au moins 2 tokens qui matchent (exact ou préfixe)
    const bestCommuns = bestMatch ? (() => {
      let count = 0;
      const refUsed = new Set();
      for (const tv of tokensVente) {
        for (let i = 0; i < bestMatch.tokens.length; i++) {
          if (refUsed.has(i)) continue;
          if (scoreTokens(tv, bestMatch.tokens[i]) > 0) {
            count++;
            refUsed.add(i);
            break;
          }
        }
      }
      return count;
    })() : 0;
    if (bestScore > 0.4 && bestMatch && bestCommuns >= 2) {
      refMatchedItm8.add(bestMatch.itm8);
      return enrichirProduit(p, bestMatch.info);
    }

    return p;
  });

  // Construire un index des libellés normalisés du ref pour détecter les doublons P&C
  const refNormIndex = new Map(); // normLibelle → [{ itm8, info }]
  refCache.itm8Map.forEach((info, itm8) => {
    const norm = normaliserLibelle(info.libelle);
    if (!refNormIndex.has(norm)) refNormIndex.set(norm, []);
    refNormIndex.get(norm).push({ itm8, info });
  });

  // Ajouter les produits du référentiel V2 non matchés comme "à créer"
  const articlesACreer = [];
  refCache.itm8Map.forEach((info, itm8) => {
    if (refMatchedItm8.has(itm8)) return;

    // Ne pas ajouter les produits P&C s'il existe un non-P&C avec le même libellé normalisé
    if (info.marque && info.marque.toUpperCase() === 'P&C') {
      const norm = normaliserLibelle(info.libelle);
      const siblings = refNormIndex.get(norm) || [];
      const hasNonPC = siblings.some(s =>
        s.itm8 !== itm8 && (!s.info.marque || s.info.marque.toUpperCase() !== 'P&C')
      );
      if (hasNonPC) return; // Skip — le non-P&C sera proposé ou déjà matché
    }

    const rayon = info.rayon || mapFamilleV2VersRayon(info.famille);

    articlesACreer.push({
      id: `ref-v2-${itm8}`,
      libelle: info.libelle,
      libelleRefV2: info.libelle,
      plu: info.codePLU || '',
      codePLU: info.codePLU || '',
      ean13: info.ean13 || '',
      codeEAN: info.ean13 || '',
      itm8: itm8,
      rayon,
      famille: rayon,
      marqueRefV2: info.marque || null,
      programme: info.programme || '',
      unitesParVente: info.unitesParVente || 1,
      unitesParPlaque: info.unitesParPlaque || 0,
      actif: false,
      aCreer: true,
      raisonDesactivation: 'article-a-creer',
      reconnu: true,
      matchRefV2: info,
      // Pas de données de vente
      moyHebdo: 0,
      potentiel: 0,
      caSemaine: 0,
      tauxCasse: 0,
      cassePAHTSemaine: 0,
      casseQteSemaine: 0,
      tendance: 'stable',
      tendancePourcent: 0,
      fiabilite: 0,
      prixMoyen: 0,
      prixMoyenUnitaire: 0,
      moyenneHebdo: 0,
      poidsCA: 0,
      nombreJours: 0,
      nombreSemaines: 0,
      historiqueParSemaine: [],
      cdt: 0,
    });
  });

  return [...enrichis, ...articlesACreer];
};

// ── Passe 6 : Corrections manuelles (localStorage) ──

// ── Passe 5b : Propager les matchs Niveau 0 des doublons ──

/**
 * Quand un même produit existe avec deux EAN différents (un standard type 325…
 * et un code balance type 28…), la fusion de doublons garde le premier vu comme
 * « actif » et désactive l'autre. Or le code balance, lui, bénéficie du Niveau 0
 * (liaison EAN → ITM via le fichier magasin) et obtient un match plus fiable.
 *
 * Cette passe copie le match Niveau 0 des doublons désactivés vers la version
 * active du même produit, si celle-ci a un match de moindre qualité (fuzzy) ou
 * pas de match du tout.
 */
const propagerMatchsDoublons = (produits) => {
  // Index : libellé normalisé → meilleur match Niveau 0 trouvé parmi les inactifs
  const niv0ParLibelle = new Map();

  for (const p of produits) {
    if (p.sourceIdentification && p.sourceIdentification.startsWith('niveau0')) {
      const norm = normaliserLibelle(p.libelle);
      const existing = niv0ParLibelle.get(norm);
      // Garder le match Niveau 0 le plus fiable (refV2 > classification)
      if (!existing || (p.sourceIdentification === 'niveau0-refV2' && existing.sourceIdentification !== 'niveau0-refV2')) {
        niv0ParLibelle.set(norm, p);
      }
    }
  }

  if (niv0ParLibelle.size === 0) return produits;

  return produits.map(p => {
    // Ne propager que vers les produits actifs sans source Niveau 0
    if (!p.actif) return p;
    if (p.sourceIdentification && p.sourceIdentification.startsWith('niveau0')) return p;

    const norm = normaliserLibelle(p.libelle);
    const donneur = niv0ParLibelle.get(norm);
    if (!donneur || !donneur.matchRefV2) return p;

    // Propager le match : copier les infos du donneur Niveau 0
    return {
      ...p,
      matchRefV2: donneur.matchRefV2,
      libelleRefV2: donneur.libelleRefV2,
      marqueRefV2: donneur.marqueRefV2,
      itm8: donneur.itm8 || p.itm8,
      rayon: donneur.rayon && donneur.rayon !== 'AUTRE' ? donneur.rayon : p.rayon,
      famille: donneur.famille && donneur.famille !== 'AUTRE' ? donneur.famille : p.famille,
      reconnu: true,
      sourceIdentification: donneur.sourceIdentification,
      libelleMagasin: donneur.libelleMagasin || p.libelleMagasin,
      prixVenteMagasin: donneur.prixVenteMagasin || p.prixVenteMagasin,
    };
  });
};

// ── Passe 5c : Désactiver les produits à faible contribution CA ──

/**
 * Désactive les produits actifs dont la contribution au CA est marginale.
 *
 * Logique :
 * 1. Trie les produits actifs par CA hebdo décroissant
 * 2. Cumule le CA → garde les produits qui couvrent les premiers 90% du CA
 * 3. Désactive le reste avec raison « faible-ca »
 *
 * Seuil plancher : on garde au minimum 80 produits actifs et au maximum ~120,
 * pour éviter un planning trop vide ou trop chargé.
 *
 * Les produits désactivés restent dans la liste (l'utilisateur peut les
 * réactiver manuellement dans le Pilotage CA).
 */
const desactiverFaibleCA = (produits) => {
  const COUVERTURE_CA_CIBLE = 0.90; // garder les produits qui couvrent 90% du CA
  const MIN_ACTIFS = 80;             // au minimum 80 références actives
  const MAX_ACTIFS = 120;            // au maximum ~120 références actives

  // Séparer actifs et inactifs
  const actifs = [];
  const inactifs = [];
  produits.forEach((p, i) => {
    if (p.actif && !p.aCreer) {
      actifs.push({ produit: p, indexOriginal: i });
    } else {
      inactifs.push(i);
    }
  });

  // Si déjà sous le minimum, rien à faire
  if (actifs.length <= MIN_ACTIFS) return produits;

  // Trier les actifs par CA hebdo décroissant
  actifs.sort((a, b) => (b.produit.caSemaine || 0) - (a.produit.caSemaine || 0));

  // Calculer le CA total des actifs
  const totalCA = actifs.reduce((sum, a) => sum + (a.produit.caSemaine || 0), 0);
  if (totalCA <= 0) return produits;

  // Trouver le seuil : rang du produit où on atteint la couverture cible
  let cumulCA = 0;
  let seuilRang = actifs.length; // par défaut, on garde tout

  for (let i = 0; i < actifs.length; i++) {
    cumulCA += (actifs[i].produit.caSemaine || 0);
    if (cumulCA / totalCA >= COUVERTURE_CA_CIBLE && i + 1 >= MIN_ACTIFS) {
      seuilRang = i + 1;
      break;
    }
  }

  // Appliquer la borne max
  seuilRang = Math.min(seuilRang, MAX_ACTIFS);

  // Garantir le minimum
  seuilRang = Math.max(seuilRang, MIN_ACTIFS);

  // Si le seuil calculé ne change rien, sortir
  if (seuilRang >= actifs.length) return produits;

  // Construire le Set des index à désactiver
  const indexADesactiver = new Set();
  for (let i = seuilRang; i < actifs.length; i++) {
    indexADesactiver.add(actifs[i].indexOriginal);
  }

  // Appliquer la désactivation
  return produits.map((p, i) => {
    if (indexADesactiver.has(i)) {
      return { ...p, actif: false, raisonDesactivation: 'faible-ca' };
    }
    return p;
  });
};

const STORAGE_KEY_CORRECTIONS = 'bvp_corrections_doublons';

/**
 * Charger les corrections manuelles depuis localStorage
 */
export const chargerCorrectionsDoublons = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY_CORRECTIONS) || '{}');
    // Nettoyage : retirer les fusions invalides (source === cible)
    if (data.fusions && data.fusions.length > 0) {
      const before = data.fusions.length;
      data.fusions = data.fusions.filter(f => f.source !== f.cible);
      if (data.fusions.length < before) {
        // Sauvegarder le nettoyage
        localStorage.setItem(STORAGE_KEY_CORRECTIONS, JSON.stringify(data));
      }
    }
    return data;
  } catch {
    return {};
  }
};

/**
 * Sauvegarder les corrections manuelles dans localStorage
 */
export const sauvegarderCorrectionsDoublons = (corrections) => {
  try {
    localStorage.setItem(STORAGE_KEY_CORRECTIONS, JSON.stringify(corrections));
  } catch {
    // silently fail
  }
};

/**
 * Séparer un produit marqué comme doublon (le réactiver)
 */
export const separerDoublon = (libelleNormalise) => {
  const corrections = chargerCorrectionsDoublons();
  if (!corrections.separations) corrections.separations = [];
  if (!corrections.separations.includes(libelleNormalise)) {
    corrections.separations.push(libelleNormalise);
  }
  // Retirer des fusions si présent
  if (corrections.fusions) {
    corrections.fusions = corrections.fusions.filter(f => f.source !== libelleNormalise);
  }
  sauvegarderCorrectionsDoublons(corrections);
};

/**
 * Fusionner manuellement un produit avec un autre
 */
export const fusionnerManuellement = (sourceLibelle, cibleLibelle) => {
  // Si source === cible (même libellé normalisé), ne pas stocker : fusionnerDoublons le gère déjà
  if (sourceLibelle === cibleLibelle) return;
  const corrections = chargerCorrectionsDoublons();
  if (!corrections.fusions) corrections.fusions = [];
  // Retirer fusion existante pour cette source
  corrections.fusions = corrections.fusions.filter(f => f.source !== sourceLibelle);
  corrections.fusions.push({ source: sourceLibelle, cible: cibleLibelle });
  // Retirer des séparations si présent
  if (corrections.separations) {
    corrections.separations = corrections.separations.filter(s => s !== sourceLibelle);
  }
  sauvegarderCorrectionsDoublons(corrections);
};

/**
 * Dissocier manuellement un produit de sa ref V2
 * (l'opérateur juge que le matching automatique est incorrect)
 */
export const dissocierRefV2 = (libelleNormalise) => {
  const corrections = chargerCorrectionsDoublons();
  if (!corrections.dissociations) corrections.dissociations = [];
  if (!corrections.dissociations.includes(libelleNormalise)) {
    corrections.dissociations.push(libelleNormalise);
  }
  sauvegarderCorrectionsDoublons(corrections);
};

/**
 * Re-associer manuellement un produit à une ref V2 (par ITM8)
 */
export const associerRefV2 = (libelleNormalise, itm8Cible) => {
  const corrections = chargerCorrectionsDoublons();
  if (!corrections.associations) corrections.associations = [];
  // Retirer association existante pour ce libellé
  corrections.associations = corrections.associations.filter(a => a.libelle !== libelleNormalise);
  corrections.associations.push({ libelle: libelleNormalise, itm8: itm8Cible });
  // Retirer des dissociations si présent
  if (corrections.dissociations) {
    corrections.dissociations = corrections.dissociations.filter(d => d !== libelleNormalise);
  }
  sauvegarderCorrectionsDoublons(corrections);
};

/**
 * Appliquer les corrections manuelles après les passes automatiques.
 *
 * Les fusions manuelles recalculent les indicateurs depuis les ventes quotidiennes
 * brutes (jour par jour), exactement comme la fusion automatique de doublons.
 */
export const appliquerCorrectionsManuelles = (produits) => {
  const corrections = chargerCorrectionsDoublons();
  const hasCorrections = corrections.separations?.length || corrections.fusions?.length
    || corrections.dissociations?.length || corrections.associations?.length;
  if (!hasCorrections) return produits;

  // Construire un index par libellé normalisé pour lookup rapide
  const indexParNorm = new Map();
  produits.forEach((p, i) => {
    const norm = normaliserLibelle(p.libelle);
    if (!indexParNorm.has(norm)) indexParNorm.set(norm, []);
    indexParNorm.get(norm).push({ produit: p, index: i });
  });

  let result = [...produits];

  // ── Séparations : réactiver les doublons séparés ──
  if (corrections.separations?.length) {
    // 1. Réactiver les produits séparés
    result = result.map(p => {
      const norm = normaliserLibelle(p.libelle);
      if (corrections.separations.includes(norm) &&
          (p.raisonDesactivation === 'doublon-fusion' || p.raisonDesactivation === 'doublon-pre')) {
        return { ...p, actif: true, raisonDesactivation: null };
      }
      return p;
    });

    // 2. Nettoyer _eansFusionnes des produits gagnants
    const eansSepares = new Set();
    result.forEach(p => {
      const norm = normaliserLibelle(p.libelle);
      if (corrections.separations.includes(norm)) {
        if (p.codeEAN) eansSepares.add(p.codeEAN);
        if (p.ean13) eansSepares.add(p.ean13);
      }
    });

    if (eansSepares.size > 0) {
      result = result.map(p => {
        if (p._eansFusionnes && p._eansFusionnes.length > 1) {
          const filtered = p._eansFusionnes.filter(ean => !eansSepares.has(ean));
          if (filtered.length !== p._eansFusionnes.length) {
            return {
              ...p,
              _eansFusionnes: filtered.length > 0 ? filtered : null,
            };
          }
        }
        return p;
      });
    }
  }

  // ── Fusions manuelles : fusionner jour par jour puis recalculer ──
  if (corrections.fusions?.length) {
    // Traiter chaque fusion
    for (const fusion of corrections.fusions) {
      // Si source === cible (même libellé normalisé = doublons d'EAN), SKIP.
      // La fusion de doublons automatique (Passe 3) a déjà traité ce cas.
      if (fusion.source === fusion.cible) continue;

      // Trouver la source et la cible dans le tableau résultat actuel
      const sourceIdx = result.findIndex(p => normaliserLibelle(p.libelle) === fusion.source);
      const cibleIdx = result.findIndex(p => normaliserLibelle(p.libelle) === fusion.cible);

      if (sourceIdx === -1 || cibleIdx === -1) continue;
      // Protection supplémentaire : même index = même produit
      if (sourceIdx === cibleIdx) continue;

      const source = result[sourceIdx];
      const cible = result[cibleIdx];

      // Fusionner les ventes quotidiennes
      const ventesQuotidiennesFusionnees = [
        ...(cible.ventesQuotidiennes || []),
        ...(source.ventesQuotidiennes || []),
      ];

      // Recalculer la cible avec toutes les données
      result[cibleIdx] = recalculerDepuisVentesQuotidiennes({
        ...cible,
        ventesQuotidiennes: ventesQuotidiennesFusionnees,
        _ventesQuotidiennesOriginales: cible._ventesQuotidiennesOriginales || cible.ventesQuotidiennes || [],
        _eansFusionnes: [...(cible._eansFusionnes || [cible.codeEAN]), source.codeEAN],
      });

      // Marquer la source comme fusionnée
      result[sourceIdx] = {
        ...source,
        actif: false,
        raisonDesactivation: 'doublon-fusion',
        _ventesQuotidiennesOriginales: source._ventesQuotidiennesOriginales || source.ventesQuotidiennes || [],
      };
    }
  }

  // ── Dissociations de ref V2 ──
  if (corrections.dissociations?.length) {
    result = result.map(p => {
      const norm = normaliserLibelle(p.libelle);
      if (corrections.dissociations.includes(norm) && p.matchRefV2) {
        return { ...p, matchRefV2: null, libelleRefV2: null, marqueRefV2: null };
      }
      return p;
    });
  }

  return result;
};

// ── Algorithme principal ──

/**
 * Applique une archive MANAGER sur des ventes brutes.
 * MUTUELLEMENT EXCLUSIF avec nettoyerGamme() — l'un OU l'autre, jamais les deux.
 *
 * @param {Array} produitsBruts — ventes brutes (tous actif=true), sortie de formaterPourPilotageCA(skipNettoyage=true)
 * @param {Array} archiveProduits — produits lus depuis le fichier MANAGER .bvp.json
 * @returns {Array} produits finaux (archive appliquée + corrections manuelles)
 */
export function appliquerArchiveSurBruts(produitsBruts, archiveProduits) {
  // Construire les maps de matching (ARRAYS pour gérer les doublons d'EAN)
  const archiveByEan = new Map();
  const archiveByItm8 = new Map();
  const archiveByLibelle = new Map();
  archiveProduits.forEach(p => {
    if (p.ean13) {
      const key = String(p.ean13);
      if (!archiveByEan.has(key)) archiveByEan.set(key, []);
      archiveByEan.get(key).push(p);
    }
    if (p.itm8) {
      const key = String(p.itm8);
      if (!archiveByItm8.has(key)) archiveByItm8.set(key, []);
      archiveByItm8.get(key).push(p);
    }
    if (p.libelle) {
      // Si le libellé existe déjà, garder le produit ACTIF en priorité
      // (cas de doublons : même libellé, EAN différents, un actif et un inactif)
      const existing = archiveByLibelle.get(p.libelle);
      if (!existing || (p.actif && !existing.actif)) {
        archiveByLibelle.set(p.libelle, p);
      }
    }
  });

  // Clé stable : EAN + libellé (les IDs numériques changent d'une semaine à l'autre)
  const getStableKey = (p) => `${p.ean13 || p.codeEAN || ''}|${p.libelle || ''}`;
  const usedArchiveKeys = new Set();

  const findMatch = (pg) => {
    const pgEan = String(pg.ean13 || pg.codeEAN || '');
    const pgItm8 = String(pg.itm8 || '');
    const pgLibelle = pg.libelle || '';

    // 1. Match exact par libellé
    if (pgLibelle) {
      const m = archiveByLibelle.get(pgLibelle);
      if (m) return m;
    }
    // 2. Match par EAN13
    if (pgEan) {
      const candidates = archiveByEan.get(pgEan);
      if (candidates) {
        if (candidates.length === 1) return candidates[0];
        const byLib = candidates.find(c => c.libelle === pgLibelle);
        if (byLib) return byLib;
        const unused = candidates.find(c => !usedArchiveKeys.has(getStableKey(c)));
        if (unused) return unused;
        return candidates[0];
      }
    }
    // 3. Match par ITM8
    if (pgItm8) {
      const candidates = archiveByItm8.get(pgItm8);
      if (candidates) {
        if (candidates.length === 1) return candidates[0];
        const byLib = candidates.find(c => c.libelle === pgLibelle);
        if (byLib) return byLib;
        const unused = candidates.find(c => !usedArchiveKeys.has(getStableKey(c)));
        if (unused) return unused;
        return candidates[0];
      }
    }
    // 4. Match par PLU
    if (pg.plu) {
      const candidates = archiveByItm8.get(String(pg.plu));
      if (candidates) return candidates[0];
    }
    return null;
  };

  let matchCount = 0;
  let changedCount = 0;
  const matchedArchiveKeys = new Set();

  const updated = produitsBruts.map(pg => {
    const match = findMatch(pg);
    if (!match) {
      // Produit dans les ventes mais ABSENT de l'archive → inactif
      changedCount++;
      return { ...pg, actif: false, raisonDesactivation: 'absent-archive' };
    }

    matchCount++;
    const matchKey = getStableKey(match);
    matchedArchiveKeys.add(matchKey);
    usedArchiveKeys.add(matchKey);

    // L'archive PRIME : reprendre actif, rayon, programme, lots, plaques
    const changes = {};
    if (typeof match.actif === 'boolean') {
      changes.actif = match.actif;
      if (match.actif) changes.raisonDesactivation = null;
      if (!match.actif && match.raisonDesactivation) changes.raisonDesactivation = match.raisonDesactivation;
    }
    if (match.famille) changes.famille = match.famille;
    if (match.rayon) changes.rayon = match.rayon;
    if (match.programme !== undefined) changes.programme = match.programme;
    if (match.unitesParPlaque !== undefined) changes.unitesParPlaque = match.unitesParPlaque;
    if (match.unitesParLot !== undefined) changes.unitesParLot = match.unitesParLot;
    if (match.libelleRefV2) changes.libelleRefV2 = match.libelleRefV2;
    if (match.marqueRefV2) changes.marqueRefV2 = match.marqueRefV2;
    if (match._eansFusionnes) changes._eansFusionnes = match._eansFusionnes;
    if (match.unitesParVente) changes.unitesParVente = match.unitesParVente;

    if (Object.keys(changes).length > 0) {
      changedCount++;
      return { ...pg, ...changes };
    }
    return pg;
  });

  // Produits de l'archive absents des ventes brutes → les ajouter (moy=0)
  const brutsEans = new Set(produitsBruts.map(p => String(p.ean13 || p.codeEAN || '')).filter(Boolean));
  const brutsItm8s = new Set(produitsBruts.map(p => String(p.itm8 || '')).filter(Boolean));
  const brutsLibelles = new Set(produitsBruts.map(p => p.libelle || '').filter(Boolean));

  let addedCount = 0;
  archiveProduits.filter(ap => !matchedArchiveKeys.has(getStableKey(ap))).forEach(ap => {
    const dejaPresent = (ap.ean13 && brutsEans.has(String(ap.ean13))) ||
                        (ap.itm8 && brutsItm8s.has(String(ap.itm8))) ||
                        (ap.libelle && brutsLibelles.has(ap.libelle));
    if (!dejaPresent) {
      updated.push({
        id: `archive_${ap.ean13 || ap.itm8 || Date.now()}_${addedCount}`,
        plu: ap.plu || '', itm8: ap.itm8 || '', ean13: ap.ean13 || '',
        libelle: ap.libelle || '', famille: ap.famille || 'AUTRE',
        rayon: ap.rayon || ap.famille || 'AUTRE', actif: ap.actif ?? false,
        programme: ap.programme || '', unitesParPlaque: ap.unitesParPlaque || 0,
        unitesParLot: ap.unitesParLot || 1, moyHebdo: ap.moyenneHebdo || 0,
        caSemaine: 0, potentiel: ap.potentielAlgo || 0, cdt: ap.cdt || 0,
        _sourceArchive: true,
      });
      addedCount++;
    }
  });

  // PAS DE DÉDOUBLONNAGE. L'archive décide, point final.
  // Appliquer les corrections manuelles (séparations, dissociations) PAR-DESSUS
  const final = appliquerCorrectionsManuelles(updated);

  console.log(`[appliquerArchiveSurBruts] ${matchCount} matchés, ${changedCount} modifiés, ${addedCount} ajoutés depuis l'archive`);
  return final;
}

/**
 * Nettoie et enrichit la gamme produits.
 * @param {Array} produits — sortie de formaterPourPilotageCA()
 * @param {number} semaineNumero — numéro de semaine ISO du planning
 * @param {number} moisPlanning — mois du planning (1-12)
 * @param {Object|null} refMagasin — référentiel magasin (liaison EAN→ITM), optionnel
 * @returns {Object} { produits: Array, rapportIdentification: Object }
 */
export function nettoyerGamme(produits, semaineNumero, moisPlanning, refMagasin = null) {
  // Initialiser les champs sur tous les produits
  let result = produits.map(p => ({
    ...p,
    raisonDesactivation: null,
    matchRefV2: null,
    aCreer: false,
    libelleRefV2: null,
    marqueRefV2: null,
    sourceIdentification: null,
  }));

  // Passe 1 : Désactiver les promos (*)
  result = desactiverPromos(result);

  // Passe 1b : Désactiver les codes non-identifiables (DC-xxxxx, TRAD)
  result = desactiverCodesNonIdentifiables(result);

  // Passe 2 : Résoudre PRE/PAC (AVANT la fusion de doublons)
  result = resoudrePREPAC(result);

  // Passe 3 : Détecter et fusionner les doublons (ne fusionne que les actifs)
  result = fusionnerDoublons(result);

  // Passe 4 : Désactiver les produits hors saison (même sur les inactifs)
  result = desactiverHorsSaison(result, moisPlanning);

  // Passe 5 : Matching avec le référentiel V2 (+ Niveau 0 si refMagasin disponible)
  result = enrichirAvecRefV2(result, refMagasin);

  // Passe 5b : Propager les matchs Niveau 0 des doublons désactivés vers les actifs
  // Quand un produit existe en double (EAN standard + code balance), la version
  // balance est souvent désactivée comme doublon mais a un meilleur match via Niveau 0.
  // On propage ce match vers la version active (EAN standard).
  result = propagerMatchsDoublons(result);

  // Passe 5c : Désactiver les produits à faible contribution CA
  result = desactiverFaibleCA(result);

  // Passe 6 : Appliquer les corrections manuelles (localStorage)
  result = appliquerCorrectionsManuelles(result);

  // Générer le rapport d'identification par niveau
  const rapportIdentification = genererRapportIdentification(result);

  return { produits: result, rapportIdentification };
}

/**
 * Génère un rapport d'identification par niveau.
 * Compte combien de produits actifs ont été identifiés par chaque méthode.
 *
 * @param {Array} produits - Produits après nettoyage complet
 * @returns {Object} Rapport { niveau0RefV2, niveau0Classification, niveau1, niveau2, nonIdentifies, total }
 */
function genererRapportIdentification(produits) {
  const rapport = {
    niveau0RefV2: 0,         // Liaison EAN→ITM → ref V2
    niveau0Classification: 0, // Liaison EAN→ITM → classification mots-clés
    niveau1: 0,              // ITM8 direct ou EAN direct
    niveau2: 0,              // Fuzzy / sous-chaîne / mots-clés
    nonIdentifies: 0,        // Aucun match
    total: 0,
    articlesACreer: 0,
  };

  produits.forEach(p => {
    if (p.aCreer) {
      rapport.articlesACreer++;
      return;
    }
    if (!p.actif) return; // Ne compter que les produits actifs

    rapport.total++;

    if (p.sourceIdentification === 'niveau0-refV2') {
      rapport.niveau0RefV2++;
    } else if (p.sourceIdentification === 'niveau0-classification') {
      rapport.niveau0Classification++;
    } else if (p.matchRefV2) {
      // Produit enrichi par ref V2 (niveau 1 ou 2)
      if (p.reconnu && p.itm8) {
        rapport.niveau1++;
      } else {
        rapport.niveau2++;
      }
    } else {
      rapport.nonIdentifies++;
    }
  });

  return rapport;
}
