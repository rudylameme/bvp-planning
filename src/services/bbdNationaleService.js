/**
 * Service de chargement de la BBD nationale (catégorie).
 *
 * Fichier source : bbd_categorie.json, placé dans le même dossier que info_PDV.json
 * (dossier DATA_perso de l'utilisateur). Mise à jour mensuelle par release : Rudy
 * envoie le nouveau JSON au magasin, le manager le copie dans son dossier DATA_perso.
 *
 * Structure attendue du JSON : dictionnaire indexé par EAN_ADM
 *   {
 *     "3250393012082": {
 *       EAN_ADM: "3250393012082",
 *       CODE_PLU: "12082",
 *       ID_CLE: "...",
 *       LIBELLE_COMMERCIALE_DE_VENTE: "...",
 *       CODE_RAYON_MERCALYS: "...",
 *       CODE_DE_SECTION_BALANCE: "...",
 *       CODE_FAM_MERCALYS: "..."
 *     },
 *     ...
 *   }
 *
 * Si le fichier est absent → retourne null sans erreur. La cascade canonique
 * retombe alors sur les sources locales (ref PLU magasin + hash libellé).
 */

const cache = {
  bbd: null,
  loaded: false,
};

/**
 * Charge la BBD nationale depuis le dossier DATA_perso.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<Object|null>} Dictionnaire EAN → infos, ou null si absent
 */
export async function chargerBBDNationale(dirHandle) {
  if (cache.loaded) return cache.bbd;
  if (!dirHandle) return null;

  try {
    const fileHandle = await dirHandle.getFileHandle('bbd_categorie.json');
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);
    cache.bbd = data;
    cache.loaded = true;
    return data;
  } catch {
    // Fichier absent ou illisible → fallback gracieux
    cache.bbd = null;
    cache.loaded = true;
    return null;
  }
}

/**
 * Résout un EAN via la BBD nationale.
 * @param {string} ean
 * @param {Object} bbd - Dictionnaire retourné par chargerBBDNationale
 * @returns {Object|null} { CODE_PLU, ID_CLE, LIBELLE_COMMERCIALE_DE_VENTE, ... } ou null
 */
export function resoudreParBBD(ean, bbd) {
  if (!bbd || !ean) return null;
  const info = bbd[String(ean)];
  return info || null;
}

/**
 * Vide le cache (utile pour rechargement manuel).
 */
export function viderCacheBBD() {
  cache.bbd = null;
  cache.loaded = false;
}
