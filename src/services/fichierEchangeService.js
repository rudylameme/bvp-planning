/**
 * Service de gestion des fichiers d'échange entre Manager et Équipe
 *
 * Architecture à 2 fichiers :
 * - Fichier MANAGER : Consignes du manager vers l'équipe (planning, commandes)
 * - Fichier ÉQUIPE : Retours de l'équipe vers le manager (inventaire, perso, J+1)
 *
 * Chaque profil écrit uniquement dans son fichier pour éviter les conflits.
 * Chaque profil lit le fichier de l'autre pour récupérer les infos.
 */

// ============================================
// CONSTANTES
// ============================================

export const SCHEMA_VERSION = '2.0';

// ============================================
// GÉNÉRATION DES NOMS DE FICHIERS
// ============================================

/**
 * Génère le nom du fichier manager
 * @param {string} codePDV - Code du point de vente (5 chiffres)
 * @param {number} semaine - Numéro de semaine
 * @param {number} annee - Année
 * @returns {string} Nom du fichier
 */
export function genererNomFichierManager(codePDV, semaine, annee) {
  const semaineStr = String(semaine).padStart(2, '0');
  const codePDVStr = String(codePDV).padStart(5, '0');
  return `manager_${codePDVStr}_S${semaineStr}_${annee}.bvp.json`;
}

/**
 * Génère le nom du fichier équipe
 * @param {string} codePDV - Code du point de vente (5 chiffres)
 * @param {number} semaine - Numéro de semaine
 * @param {number} annee - Année
 * @returns {string} Nom du fichier
 */
export function genererNomFichierEquipe(codePDV, semaine, annee) {
  const semaineStr = String(semaine).padStart(2, '0');
  const codePDVStr = String(codePDV).padStart(5, '0');
  return `EQUIPE-${codePDVStr}-S${semaineStr}-${annee}.bvp.json`;
}

// ============================================
// FICHIER MANAGER (Manager → Équipe)
// ============================================

/**
 * Crée le fichier manager complet
 * Contient toutes les consignes pour l'équipe :
 * - Planning (dates, horaires)
 * - Gamme de produits
 * - Animation commerciale (promos)
 * - Quantités (semaine, jour, heure)
 * - Besoins (articles et cartons)
 * - Commandes (dates, livraisons, stock mini)
 *
 * @param {Object} params
 * @returns {Object} Fichier JSON prêt à exporter
 */
export function creerFichierManager({
  magasin,
  semaine,
  annee,
  horaires,
  produits,
  promosActives = [],
  produitsExceptionnels = [],
  commandeConfig,
  planningCalcule,
  frequentation,
  baseCalcul,
  limitesProgression,
  repartitionParFamille
}) {
  const now = new Date().toISOString();

  // Calculer les dates de la semaine
  const { dateDebut, dateFin } = calculerDatesSemaine(semaine, annee);

  // Préparer les produits avec leurs données
  const produitsExport = produits
    .filter(p => p.actif)
    .map(p => ({
      id: p.id,
      itm8: p.itm8,
      ean13: p.ean13 || p.codeEAN || null,
      libelle: p.libelle,
      libellePersonnalise: p.libellePersonnalise || null,
      rayon: p.rayon,
      plu: p.plu || null,
      programme: p.programme || null,

      // Quantités
      potentielHebdo: Math.round(p.potentielHebdo || 0),
      potentielJour: p.potentielJour || {},
      caHebdoObjectif: Math.round((p.caHebdoObjectif || 0) * 100) / 100,
      prixMoyenUnitaire: Math.round((p.prixMoyenUnitaire || 0) * 100) / 100,

      // Infos cuisson
      tempsPlaquage: p.tempsPlaquage || null,
      unitesParPlaque: p.unitesParPlaque || null,

      // Promo
      enPromo: promosActives.some(promo => promo.itm8 === p.itm8),
      promoInfo: promosActives.find(promo => promo.itm8 === p.itm8) || null
    }));

  // Préparer les données de commande
  const commandeData = commandeConfig ? {
    livraisons: commandeConfig.livraisons || [],
    qtesFixees: commandeConfig.qtesFixees || {},
    cdtPersonnalises: commandeConfig.cdtPersonnalises || {},
    livraisonForte: commandeConfig.livraisonForte || null,
    modeStockDefaut: commandeConfig.modeStockDefaut || 'normal',
    modesStockProduits: commandeConfig.modesStockProduits || {},
    stocksMini: commandeConfig.stocksMini || {}
  } : null;

  return {
    // Métadonnées
    type: 'manager',
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,

    // Identification magasin
    magasin: {
      codePDV: magasin.code || '',
      nom: magasin.nom || ''
    },

    // Configuration semaine
    planning: {
      semaine,
      annee,
      dateDebut,
      dateFin,
      horaires: horaires || {}
    },

    // Paramètres de calcul
    parametres: {
      baseCalcul: baseCalcul || 'PDV',
      limitesProgression: limitesProgression || {},
      repartitionParFamille: repartitionParFamille || {}
    },

    // Fréquentation
    frequentation: frequentation || null,

    // Animation commerciale
    animationCommerciale: {
      promos: promosActives.map(p => ({
        itm8: p.itm8,
        libelle: p.libelle,
        promotion: p.promotion || null,
        dateDebut: p.dateDebut || null,
        dateFin: p.dateFin || null
      })),
      produitsExceptionnels: produitsExceptionnels || []
    },

    // Configuration commande
    commande: commandeData,

    // Planning horaire calculé (si disponible)
    planningHoraire: planningCalcule || null,

    // Liste des produits
    produits: produitsExport,

    // Statistiques
    stats: {
      nbProduits: produitsExport.length,
      nbPromos: promosActives.length,
      nbLivraisons: commandeConfig?.livraisons?.length || 0,
      caHebdoTotal: Math.round(produitsExport.reduce((sum, p) => sum + (p.caHebdoObjectif || 0), 0) * 100) / 100
    }
  };
}

// ============================================
// FICHIER ÉQUIPE (Équipe → Manager)
// ============================================

/**
 * Crée le fichier équipe complet
 * Contient tous les retours de l'équipe :
 * - Personnalisations (noms, programme four, unités/plaque)
 * - Inventaires (stock réel par produit)
 * - Produits plaquables J+1
 *
 * @param {Object} params
 * @returns {Object} Fichier JSON prêt à exporter
 */
export function creerFichierEquipe({
  magasin,
  semaine,
  annee,
  personnalisations = {},
  inventaires = {},
  plaquageJ1 = {},
  operateur = ''
}) {
  const now = new Date().toISOString();

  return {
    // Métadonnées
    type: 'equipe',
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,

    // Identification magasin
    magasin: {
      codePDV: magasin.code || magasin.codePDV || '',
      nom: magasin.nom || ''
    },

    // Semaine concernée
    semaine,
    annee,

    // Opérateur qui a fait les saisies
    operateur,

    // Personnalisations produits
    // Structure: { [itm8]: { nomPersonnalise, programmeFour, unitesParPlaque } }
    personnalisations,

    // Inventaires par produit
    // Structure: { [itm8]: { stockReel, dateSaisie, operateur } }
    inventaires,

    // Configuration plaquage J+1
    // Structure: { produits: [itm8], familles: ['VIENNOISERIE', ...] }
    plaquageJ1,

    // Statistiques
    stats: {
      nbPersonnalisations: Object.keys(personnalisations).length,
      nbInventaires: Object.keys(inventaires).length,
      nbProduitsJ1: plaquageJ1.produits?.length || 0,
      nbFamillesJ1: plaquageJ1.familles?.length || 0
    }
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Calcule les dates de début et fin d'une semaine ISO
 */
function calculerDatesSemaine(semaine, annee) {
  const premierJanvier = new Date(annee, 0, 1);
  const jourSemaine = premierJanvier.getDay();
  const decalage = (jourSemaine <= 4) ? 1 - jourSemaine : 8 - jourSemaine;

  const lundi = new Date(annee, 0, 1 + decalage + (semaine - 1) * 7);
  const dimanche = new Date(lundi);
  dimanche.setDate(dimanche.getDate() + 6);

  return {
    dateDebut: lundi.toISOString().split('T')[0],
    dateFin: dimanche.toISOString().split('T')[0]
  };
}

// ============================================
// TÉLÉCHARGEMENT / LECTURE FICHIERS
// ============================================

/**
 * Télécharge un fichier JSON
 * @param {Object} data - Données à exporter
 * @param {string} filename - Nom du fichier
 */
export function telechargerJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Lit un fichier JSON uploadé
 * @param {File} file - Fichier à lire
 * @returns {Promise<Object>} - Contenu parsé
 */
export function lireFichierJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch {
        reject(new Error('Fichier JSON invalide'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };

    reader.readAsText(file);
  });
}

// ============================================
// VALIDATION DES FICHIERS
// ============================================

/**
 * Valide un fichier manager
 * @param {Object} data
 * @returns {Object} { valide: boolean, erreur?: string }
 */
export function validerFichierManager(data) {
  if (!data.type || (data.type !== 'manager' && data.type !== 'planning-archive')) {
    return { valide: false, erreur: 'Ce n\'est pas un fichier manager' };
  }
  if (!data.magasin?.codePDV && !data.magasin?.code) {
    return { valide: false, erreur: 'Code PDV manquant' };
  }
  const semaine = data.planning?.semaine || data.semaine?.numero;
  const annee = data.planning?.annee || data.semaine?.annee;
  if (!semaine || !annee) {
    return { valide: false, erreur: 'Informations de semaine manquantes' };
  }
  if (!data.produits || !Array.isArray(data.produits)) {
    return { valide: false, erreur: 'Liste de produits manquante' };
  }
  if (data.produits.length === 0) {
    return { valide: false, erreur: 'Aucun produit dans le fichier' };
  }
  return { valide: true };
}

/**
 * Valide un fichier équipe
 * @param {Object} data
 * @returns {Object} { valide: boolean, erreur?: string }
 */
export function validerFichierEquipe(data) {
  if (!data.type || data.type !== 'equipe') {
    return { valide: false, erreur: 'Ce n\'est pas un fichier équipe' };
  }
  if (!data.magasin?.codePDV) {
    return { valide: false, erreur: 'Code PDV manquant' };
  }
  if (!data.semaine || !data.annee) {
    return { valide: false, erreur: 'Informations de semaine manquantes' };
  }
  return { valide: true };
}

// ============================================
// FUSION DES DONNÉES
// ============================================

/**
 * Fusionne les données du fichier équipe dans les données manager
 * Applique personnalisations, inventaires, etc.
 *
 * @param {Object} managerData - Données du fichier manager
 * @param {Object} equipeData - Données du fichier équipe
 * @returns {Object} Données fusionnées
 */
export function fusionnerDonneesEquipe(managerData, equipeData) {
  if (!equipeData) return managerData;

  const produitsEnrichis = managerData.produits.map(produit => {
    const perso = equipeData.personnalisations?.[produit.itm8];
    const inv = equipeData.inventaires?.[produit.itm8];
    const plaquableJ1 = equipeData.plaquageJ1?.produits?.includes(produit.itm8) ||
                        equipeData.plaquageJ1?.familles?.includes(produit.rayon);

    return {
      ...produit,
      // Personnalisations de l'équipe
      ...(perso && {
        libellePersonnalise: perso.nomPersonnalise || produit.libellePersonnalise,
        programmeFour: perso.programmeFour || produit.programme,
        unitesParPlaque: perso.unitesParPlaque || produit.unitesParPlaque
      }),
      // Inventaire de l'équipe
      ...(inv && {
        stockReel: inv.stockReel,
        dateSaisieStock: inv.dateSaisie,
        operateurStock: inv.operateur
      }),
      // Flag plaquage J+1
      plaquableJ1
    };
  });

  return {
    ...managerData,
    produits: produitsEnrichis,
    equipeData: {
      updatedAt: equipeData.updatedAt,
      operateur: equipeData.operateur,
      stats: equipeData.stats
    }
  };
}

// ============================================
// HISTORIQUE LOCAL (pour traçabilité)
// ============================================

const STORAGE_KEY_HISTORIQUE = 'bvp_historique_echanges_v2';

/**
 * Enregistre un échange dans l'historique local
 * @param {Object} echange
 */
export function enregistrerEchange(echange) {
  try {
    const historique = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORIQUE) || '[]');

    historique.push({
      ...echange,
      timestamp: new Date().toISOString()
    });

    // Garder seulement les 100 derniers échanges
    const historiqueRecent = historique.slice(-100);

    localStorage.setItem(STORAGE_KEY_HISTORIQUE, JSON.stringify(historiqueRecent));
  } catch (err) {
    // TODO: logger professionnel
  }
}

/**
 * Récupère l'historique des échanges
 * @returns {Array}
 */
export function getHistoriqueEchanges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORIQUE) || '[]');
  } catch (e) {
    // TODO: logger professionnel
    return [];
  }
}
