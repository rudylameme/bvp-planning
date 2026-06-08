/**
 * Service de gestion du dossier partagé équipe
 *
 * Fonctions pour scanner, lire et écrire les fichiers MANAGER et EQUIPE
 * dans le dossier partagé désigné par l'utilisateur côté Équipe.
 *
 * Architecture zéro-localStorage : toutes les données modifiables transitent
 * par les fichiers .bvp.json dans le dossier partagé.
 */

import { checkHandlePermission } from '../hooks/useFileAccess';
import { SCHEMA_VERSION } from './fichierEchangeService';

// ============================================
// UTILITAIRES DE NOMMAGE
// ============================================

/**
 * Extrait les infos d'un nom de fichier MANAGER ou EQUIPE.
 * Pattern : TYPE-CODEPDV-SXX-YYYY[_vN].bvp.json
 *
 * @param {string} filename
 * @returns {Object|null} { type, codePDV, semaine, annee, version }
 */
export function parseNomFichier(filename) {
  // Nouveau format : MANAGER-9839-S12-2026.bvp.json ou MANAGER-07499-S12-2026_v2.bvp.json
  // Code PDV : 4 ou 5 chiffres (certains magasins ont un code à 4 chiffres, ex: 9839)
  const regex = /^(MANAGER|EQUIPE)-(\d{4,5})-S(\d{1,2})-(\d{4})(?:_v(\d+))?\.bvp\.json$/i;
  const match = filename.match(regex);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      codePDV: match[2],
      semaine: parseInt(match[3], 10),
      annee: parseInt(match[4], 10),
      version: match[5] ? parseInt(match[5], 10) : 1,
    };
  }

  // Ancien format manager : manager_07499_S12_2026.bvp.json ou manager_9839_S12_2026.bvp.json
  const regexOld = /^manager_(\d{4,5})_S(\d{1,2})_(\d{4})\.bvp\.json$/i;
  const matchOld = filename.match(regexOld);
  if (matchOld) {
    return {
      type: 'manager',
      codePDV: matchOld[1],
      semaine: parseInt(matchOld[2], 10),
      annee: parseInt(matchOld[3], 10),
      version: 1,
    };
  }

  return null;
}

/**
 * Calcule le numéro de semaine ISO courante
 * @returns {{ semaine: number, annee: number }}
 */
export function getSemaineISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // ISO 8601 : le jeudi détermine la semaine
  // On avance au jeudi de la semaine courante (dimanche=7)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const annee = d.getFullYear();
  const yearStart = new Date(annee, 0, 1);
  const semaine = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { semaine, annee };
}

// ============================================
// SCAN DU DOSSIER PARTAGÉ
// ============================================

/**
 * Scanne le dossier partagé pour trouver tous les fichiers .bvp.json
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<Array<{ filename: string, info: Object }>>}
 */
async function scannerDossier(dirHandle) {
  const fichiers = [];
  try {
    const ok = await checkHandlePermission(dirHandle, 'read');
    if (!ok) return fichiers;
  } catch {
    return fichiers;
  }

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.bvp.json')) {
      const info = parseNomFichier(entry.name);
      if (info) {
        fichiers.push({ filename: entry.name, info });
      }
    }
  }

  return fichiers;
}

/**
 * Retourne la liste des semaines disponibles (fichiers MANAGER) dans le dossier partagé.
 * Trié par date décroissante (plus récent en premier).
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<Array<{ semaine: number, annee: number, nomFichier: string, handle: FileSystemFileHandle, label: string }>>}
 */
export async function listerSemainesDisponibles(dirHandle) {
  if (!dirHandle) return [];
  const semaines = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind !== 'file') continue;
      const info = parseNomFichier(entry.name);
      if (info && info.type === 'manager') {
        semaines.push({
          semaine: info.semaine,
          annee: info.annee,
          nomFichier: entry.name,
          handle: entry,
          label: `S${String(info.semaine).padStart(2, '0')} / ${info.annee}`,
        });
      }
    }
  } catch {
    return [];
  }

  // Trier par date décroissante
  semaines.sort((a, b) => (b.annee * 100 + b.semaine) - (a.annee * 100 + a.semaine));
  return semaines;
}

/**
 * Trouve le fichier MANAGER le plus récent pour une semaine donnée (ou la courante).
 * Cherche d'abord la semaine exacte, puis S-1, S-2... jusqu'à S-4 max.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {number} [semaine] - Semaine recherchée (défaut: courante)
 * @param {number} [annee] - Année recherchée (défaut: courante)
 * @returns {Promise<{ data: Object, filename: string, semaine: number, annee: number, version: number } | null>}
 */
export async function trouverDernierFichierManager(dirHandle, semaine, annee) {
  if (!dirHandle) return null;

  const iso = getSemaineISO();
  const semCible = semaine || iso.semaine;
  const anCible = annee || iso.annee;

  const fichiers = await scannerDossier(dirHandle);
  const managers = fichiers.filter(f => f.info.type === 'manager');

  // Chercher : semaine S+1 (avance), S (courante), S-1, S-2, S-3, S-4 (passées)
  // Le manager prépare souvent la semaine suivante pendant la semaine en cours
  const offsets = [+1, 0, -1, -2, -3, -4];
  for (const offset of offsets) {
    let sem = semCible + offset;
    let an = anCible;
    if (sem <= 0) {
      sem += 52;
      an -= 1;
    } else if (sem > 52) {
      sem -= 52;
      an += 1;
    }

    // Filtrer les fichiers pour cette semaine
    const fichiersSemaine = managers
      .filter(f => f.info.semaine === sem && f.info.annee === an)
      .sort((a, b) => b.info.version - a.info.version); // version la plus haute en premier

    if (fichiersSemaine.length > 0) {
      const meilleur = fichiersSemaine[0];
      try {
        const fileHandle = await dirHandle.getFileHandle(meilleur.filename);
        const file = await fileHandle.getFile();
        const data = JSON.parse(await file.text());
        return {
          data,
          filename: meilleur.filename,
          semaine: meilleur.info.semaine,
          annee: meilleur.info.annee,
          version: meilleur.info.version,
        };
      } catch {
        // Fichier illisible, continuer
      }
    }
  }

  return null;
}

/**
 * Trouve le fichier EQUIPE le plus récent pour une semaine donnée.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {number} semaine
 * @param {number} annee
 * @returns {Promise<{ data: Object, filename: string, version: number } | null>}
 */
export async function trouverDernierFichierEquipe(dirHandle, semaine, annee) {
  if (!dirHandle) return null;

  const fichiers = await scannerDossier(dirHandle);
  const equipes = fichiers
    .filter(f => f.info.type === 'equipe')
    .sort((a, b) => {
      // Trier par année desc, puis semaine desc, puis version desc
      if (b.info.annee !== a.info.annee) return b.info.annee - a.info.annee;
      if (b.info.semaine !== a.info.semaine) return b.info.semaine - a.info.semaine;
      return (b.info.version || 1) - (a.info.version || 1);
    });

  if (equipes.length === 0) return null;

  const meilleur = equipes[0];
  try {
    const fileHandle = await dirHandle.getFileHandle(meilleur.filename);
    const file = await fileHandle.getFile();
    const data = JSON.parse(await file.text());
    return {
      data,
      filename: meilleur.filename,
      semaine: meilleur.info.semaine,
      annee: meilleur.info.annee,
      version: meilleur.info.version,
    };
  } catch {
    return null;
  }
}

// ============================================
// ÉCRITURE DU FICHIER EQUIPE
// ============================================

/**
 * Génère le nom de fichier EQUIPE avec versioning.
 * Si un fichier existe déjà pour cette semaine, incrémente la version.
 *
 * @param {string} codePDV
 * @param {number} semaine
 * @param {number} annee
 * @param {number} versionActuelle - Version du dernier fichier équipe trouvé (1 si aucun)
 * @returns {string}
 */
function genererNomFichierEquipeVersionne(codePDV, semaine, annee, versionActuelle) {
  const codePDVStr = String(codePDV).padStart(5, '0');
  const semaineStr = String(semaine).padStart(2, '0');
  if (versionActuelle <= 1) {
    return `EQUIPE-${codePDVStr}-S${semaineStr}-${annee}.bvp.json`;
  }
  return `EQUIPE-${codePDVStr}-S${semaineStr}-${annee}_v${versionActuelle}.bvp.json`;
}

/**
 * Sauvegarde le fichier EQUIPE dans le dossier partagé.
 * Écrase le fichier existant de même version (pas de nouvelle version à chaque save,
 * mais une nouvelle version si le Manager a régénéré entre-temps).
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {Object} params
 * @param {Object} params.magasin - { code/codePDV, nom }
 * @param {number} params.semaine
 * @param {number} params.annee
 * @param {Object} params.personnalisations - { [itm8]: { nomPersonnalise, programmeFour, ... } }
 * @param {Object} params.inventaires - { [itm8]: { stockReel, dateSaisie, operateur } }
 * @param {Object} params.plaquageJ1 - { produits: [itm8], familles: [] }
 * @param {Array} params.programmesPersonnalises - Liste des programmes personnalisés
 * @param {Object} params.preferencesAffichage - { sectionsOuvertes, ordrePersonnalise, modeImpression, famillesImpression }
 * @param {string} [params.operateur]
 * @returns {Promise<{ success: boolean, filename: string, error?: string }>}
 */
export async function sauvegarderFichierEquipe(dirHandle, {
  magasin,
  semaine,
  annee,
  personnalisations = {},
  inventaires = {},
  plaquageJ1 = {},
  programmesPersonnalises = null,
  preferencesAffichage = {},
  operateur = '',
}) {
  if (!dirHandle) {
    return { success: false, filename: '', error: 'Aucun dossier partagé désigné' };
  }

  try {
    // Vérifier les permissions d'écriture
    const ok = await checkHandlePermission(dirHandle, 'readwrite');
    if (!ok) {
      return { success: false, filename: '', error: 'Permission d\'écriture refusée sur le dossier' };
    }

    const codePDV = magasin.code || magasin.codePDV || '00000';

    // Trouver la version actuelle
    const existant = await trouverDernierFichierEquipe(dirHandle, semaine, annee);
    const versionActuelle = existant ? existant.version : 1;

    // Créer le contenu du fichier avec la structure enrichie
    const contenu = {
      // Métadonnées
      type: 'equipe',
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),

      // Identification
      magasin: {
        codePDV,
        nom: magasin.nom || '',
      },
      semaine,
      annee,
      operateur,

      // Données de personnalisation (ce qui vient de PlanningJour)
      personnalisations,

      // Programmes personnalisés (renommages, ajouts par l'équipe)
      programmesPersonnalises: programmesPersonnalises || [],

      // Préférences d'affichage (ordre familles, sections ouvertes, mode impression)
      preferencesAffichage,

      // Inventaires (via CommandeEquipe)
      inventaires,

      // Plaquage J+1 (via CommandeEquipe)
      plaquageJ1,

      // Statistiques
      stats: {
        nbPersonnalisations: Object.keys(personnalisations).length,
        nbProgrammesPerso: (programmesPersonnalises || []).length,
        nbInventaires: Object.keys(inventaires).length,
        nbProduitsJ1: plaquageJ1.produits?.length || 0,
      },
    };

    // Nom du fichier (même version = on écrase)
    const filename = genererNomFichierEquipeVersionne(codePDV, semaine, annee, versionActuelle);

    // Écrire dans le dossier
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(contenu, null, 2));
    await writable.close();

    return { success: true, filename };
  } catch (error) {
    return { success: false, filename: '', error: error.message };
  }
}

/**
 * Charge toutes les données équipe depuis le dossier partagé :
 * - Le fichier MANAGER (planning, produits)
 * - Le fichier EQUIPE (personnalisations, préférences)
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{ manager: Object|null, equipe: Object|null, error?: string }>}
 */
export async function chargerDonneesDepuisDossier(dirHandle) {
  if (!dirHandle) {
    return { manager: null, equipe: null, error: 'Aucun dossier partagé' };
  }

  // 1. Trouver le dernier fichier MANAGER
  const managerResult = await trouverDernierFichierManager(dirHandle);
  if (!managerResult) {
    return { manager: null, equipe: null, error: 'Aucun fichier Manager trouvé dans le dossier partagé' };
  }

  // 2. Trouver le fichier EQUIPE correspondant à la même semaine
  const equipeResult = await trouverDernierFichierEquipe(
    dirHandle,
    managerResult.semaine,
    managerResult.annee
  );

  return {
    manager: managerResult,
    equipe: equipeResult,
  };
}
