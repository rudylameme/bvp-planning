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
    .replace(/\d+\s*[GK]G?\b/gi, '')      // poids avec unité : 300G, 250KG, 1K, etc.
    .replace(/\d+\s*GR\b/gi, '')           // poids en GR : 235GR, 290GR, etc.
    .replace(/\b\d{1,4}\b/g, '')          // nombres seuls de 1-4 chiffres (poids, codes, numéros résiduels)
    .replace(/\bX1\b/gi, '')               // X1 (vendu à l'unité) — non distinctif. X2+ = conditionnements différents → garder
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

    // Ne considérer que les membres actifs
    const actifs = membres.filter(m => m.produit.actif);
    if (actifs.length <= 1) return;

    // Garder celui avec le CA hebdo le plus élevé
    actifs.sort((a, b) => (b.produit.caSemaine || 0) - (a.produit.caSemaine || 0));

    const gagnant = actifs[0];

    // Fusionner les quantités dans le gagnant
    // On ADDITIONNE les moyHebdo et caSemaine (c'est la vraie demande totale)
    // Le potentiel est ajusté : au minimum = moyHebdoTotal (on ne peut pas prévoir
    // moins que ce qu'on vend déjà en moyenne)
    let moyHebdoTotal = gagnant.produit.moyHebdo || 0;
    let caSemaineTotal = gagnant.produit.caSemaine || 0;

    for (let i = 1; i < actifs.length; i++) {
      moyHebdoTotal += actifs[i].produit.moyHebdo || 0;
      caSemaineTotal += actifs[i].produit.caSemaine || 0;
      resultats[actifs[i].index] = {
        ...actifs[i].produit,
        actif: false,
        raisonDesactivation: 'doublon-fusion',
      };
    }

    // Mettre à jour le gagnant avec les quantités fusionnées
    // potentiel = max(potentiel actuel, moyHebdoTotal) pour ne pas sous-estimer
    const potentielGagnant = gagnant.produit.potentiel || 0;
    resultats[gagnant.index] = {
      ...gagnant.produit,
      moyHebdo: moyHebdoTotal,
      caSemaine: caSemaineTotal,
      potentiel: Math.max(potentielGagnant, moyHebdoTotal),
    };
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

  // Jaccard-like : score total / nombre total de tokens uniques
  const unionSize = tokensVente.length + tokensRef.length - matchCount;
  const jaccard = totalScore / unionSize;

  // Couverture : proportion des tokens vente qui ont trouvé un match
  const couverture = matchCount / tokensVente.length;

  return (jaccard * 0.5) + (couverture * 0.5);
};

const enrichirAvecRefV2 = (produits) => {
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

    return true;
  };

  const enrichis = produits.map(p => {
    // Si déjà reconnu par EAN/ITM8, enrichir — mais VALIDER la cohérence du nom
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

    // Matching par sous-chaîne (inclusion) avant le fuzzy par tokens
    // IMPORTANT : le plus court des deux doit faire au moins 10 caractères
    // ET représenter au moins 50% du plus long, sinon "PAIN" matcherait tout.
    const normVente = normaliserLibelle(p.libelle);
    if (normVente.length >= 10) {
      for (const entry of refEntries) {
        if (entry.norm.length < 10) continue; // ref trop courte → skip
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

const STORAGE_KEY_CORRECTIONS = 'bvp_corrections_doublons';

/**
 * Charger les corrections manuelles depuis localStorage
 */
export const chargerCorrectionsDoublons = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CORRECTIONS) || '{}');
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
 * Appliquer les corrections manuelles après les passes automatiques
 */
export const appliquerCorrectionsManuelles = (produits) => {
  const corrections = chargerCorrectionsDoublons();
  const hasCorrections = corrections.separations?.length || corrections.fusions?.length
    || corrections.dissociations?.length || corrections.associations?.length;
  if (!hasCorrections) return produits;

  return produits.map(p => {
    const norm = normaliserLibelle(p.libelle);

    // Si ce libellé normalisé est dans les séparations → forcer actif
    if (corrections.separations?.includes(norm) &&
        (p.raisonDesactivation === 'doublon-fusion' || p.raisonDesactivation === 'doublon-pre')) {
      return { ...p, actif: true, raisonDesactivation: null };
    }

    // Si ce libellé est dans les fusions (comme source) → forcer doublon-fusion
    if (corrections.fusions?.some(f => f.source === norm)) {
      return { ...p, actif: false, raisonDesactivation: 'doublon-fusion' };
    }

    // Si ce libellé est dissocié de sa ref V2 → retirer le match ref
    if (corrections.dissociations?.includes(norm) && p.matchRefV2) {
      return { ...p, matchRefV2: null, libelleRefV2: null, marqueRefV2: null };
    }

    return p;
  });
};

// ── Algorithme principal ──

/**
 * Nettoie et enrichit la gamme produits.
 * @param {Array} produits — sortie de formaterPourPilotageCA()
 * @param {number} semaineNumero — numéro de semaine ISO du planning
 * @param {number} moisPlanning — mois du planning (1-12)
 * @returns {Array} produits enrichis avec champs de nettoyage
 */
export function nettoyerGamme(produits, semaineNumero, moisPlanning) {
  // Initialiser les champs sur tous les produits
  let result = produits.map(p => ({
    ...p,
    raisonDesactivation: null,
    matchRefV2: null,
    aCreer: false,
    libelleRefV2: null,
    marqueRefV2: null,
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

  // Passe 5 : Matching fuzzy avec le référentiel V2 (enrichissement + rayon)
  result = enrichirAvecRefV2(result);

  // Passe 6 : Appliquer les corrections manuelles (localStorage)
  result = appliquerCorrectionsManuelles(result);

  return result;
}
