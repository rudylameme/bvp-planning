/**
 * Service de génération de clés d'identification produit STABLES entre semaines.
 *
 * Cascade (priorité décroissante) :
 *   1. CODE_PLU national (BBD nationale)    → "nat-{codePLU}"
 *   2. PLU local (référentiel magasin)      → "plu-{plu}"
 *   3. ITM8 (référentiel V2)                → "itm-{itm8}"
 *   4. EAN13                                → "ean-{ean13}"
 *   5. Hash stable (libellé + famille)      → "hash-{hexa}"
 *
 * Raison : un EAN13 n'est PAS stable (il encode le prix pour certains produits magasin).
 * Le PLU/ITM8 sont des identifiants métier pérennes. Le hash libellé+famille couvre
 * les ~44 % d'EAN locaux non identifiés (ex. "FAB SUR PL").
 */

import { resoudreParBBD } from './bbdNationaleService.js';
import { resoudreParLiaisonEAN } from './referentielMagasin.js';

/**
 * Normalisation basique d'un libellé pour le hash (lowercase + trim + espaces simples).
 * On reste léger pour éviter les collisions et garder le hash stable.
 */
const normaliserLibellePourHash = (lib) => {
  return String(lib || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Hash FNV-1a 32 bits en hexa (stable, déterministe, léger).
 * Sert à identifier de manière stable un produit sans code.
 */
const hashStable = (str) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Construit la clé canonique pour un produit.
 * @param {Object} produit - Produit avec { ean13, codeEAN, itm8, plu, codePLU, libelle, famille, rayon }
 * @param {Object} options
 *   - refMagasin : référentiel PLU magasin (optionnel)
 *   - bbdNationale : BBD nationale (optionnel)
 * @returns {string} Clé canonique (toujours non-vide, jamais undefined)
 */
export function construireIdCanonique(produit, options = {}) {
  const { refMagasin = null, bbdNationale = null } = options;
  const ean = String(produit.ean13 || produit.codeEAN || '').trim();

  // 1. CODE_PLU national via BBD
  if (ean && bbdNationale) {
    const infoBBD = resoudreParBBD(ean, bbdNationale);
    if (infoBBD?.CODE_PLU) {
      return `nat-${String(infoBBD.CODE_PLU).trim()}`;
    }
  }

  // 2. PLU local via référentiel magasin
  if (ean && refMagasin) {
    const infoRef = resoudreParLiaisonEAN(ean, refMagasin);
    if (infoRef?.codePLU) {
      return `plu-${String(infoRef.codePLU).trim()}`;
    }
    if (infoRef?.itm8) {
      return `itm-${String(infoRef.itm8).trim()}`;
    }
  }

  // 3. ITM8 déjà présent sur le produit (via ref V2)
  if (produit.itm8) {
    return `itm-${String(produit.itm8).trim()}`;
  }

  // 4. PLU déjà présent sur le produit
  if (produit.plu || produit.codePLU) {
    return `plu-${String(produit.plu || produit.codePLU).trim()}`;
  }

  // 5. EAN13
  if (ean) {
    return `ean-${ean}`;
  }

  // 6. Hash stable (libellé + famille)
  const base = normaliserLibellePourHash(
    `${produit.libelle || ''}|${produit.famille || produit.rayon || ''}`
  );
  return `hash-${hashStable(base)}`;
}

/**
 * Extrait un triplet de référence stable à joindre aux personnalisations EQUIPE.
 * Permet une future migration sans dépendre de la clé canonique.
 */
export function extraireTripletReference(produit, options = {}) {
  const { refMagasin = null, bbdNationale = null } = options;
  const ean = String(produit.ean13 || produit.codeEAN || '').trim();

  let pluNational = null;
  let pluLocal = null;
  let itm = produit.itm8 ? String(produit.itm8).trim() : null;

  if (ean && bbdNationale) {
    const infoBBD = resoudreParBBD(ean, bbdNationale);
    if (infoBBD?.CODE_PLU) pluNational = String(infoBBD.CODE_PLU).trim();
  }

  if (ean && refMagasin) {
    const infoRef = resoudreParLiaisonEAN(ean, refMagasin);
    if (infoRef?.codePLU) pluLocal = String(infoRef.codePLU).trim();
    if (!itm && infoRef?.itm8) itm = String(infoRef.itm8).trim();
  }

  if (!pluLocal && produit.plu) pluLocal = String(produit.plu).trim();
  if (!pluLocal && produit.codePLU) pluLocal = String(produit.codePLU).trim();

  return {
    itm: itm || null,
    plu_local: pluLocal || null,
    plu_national: pluNational || null,
    ean: ean || null,
    libelle: produit.libelle || null,
    famille: produit.famille || produit.rayon || null,
    rayon: produit.rayon || produit.famille || null,
  };
}
