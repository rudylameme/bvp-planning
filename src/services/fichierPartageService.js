/**
 * Service de gestion des fichiers partagés entre Manager et Équipe
 *
 * Workflow:
 * 1. Manager exporte une COMMANDE (fichier JSON)
 * 2. Équipe importe la commande, fait l'inventaire, exporte un INVENTAIRE
 * 3. Manager importe l'inventaire et valide la commande finale
 */

// ============================================
// GÉNÉRATION DES FICHIERS
// ============================================

/**
 * Génère le nom de fichier standardisé
 * @param {string} type - 'commande' | 'inventaire' | 'personnalisation'
 * @param {number} semaine
 * @param {number} annee
 * @param {number} livraison - Numéro de livraison (1, 2, 3)
 * @returns {string}
 */
export function genererNomFichier(type, semaine, annee, livraison = null) {
  const semaineStr = String(semaine).padStart(2, '0');
  if (livraison) {
    return `${type}_S${semaineStr}_${annee}_L${livraison}.json`;
  }
  return `${type}_S${semaineStr}_${annee}.json`;
}

// ============================================
// EXPORT COMMANDE (Manager → Équipe)
// ============================================

/**
 * Crée le fichier de commande à exporter vers l'équipe
 * @param {Object} params
 * @param {Array} params.produits - Liste des produits avec besoins calculés
 * @param {Object} params.livraison - Infos de la livraison
 * @param {number} params.semaine
 * @param {number} params.annee
 * @param {Object} params.magasin
 * @param {Array} params.promosActives
 * @returns {Object} - Fichier JSON prêt à exporter
 */
export function creerFichierCommande({ produits, livraison, semaine, annee, magasin, promosActives = [] }) {
  const now = new Date().toISOString();

  // Filtrer les produits actifs et avec CDT connu
  const produitsExport = produits
    .filter(p => p.actif && !p.cdtNonCommunique)
    .map(p => ({
      itm8: p.itm8,
      libelle: p.libelle,
      libellePersonnalise: p.libellePersonnalise || null,
      rayon: p.rayon,
      cdt: p.cdt,
      stockMini: p.stockMini,
      stockMiniUnites: Math.round(p.stockMiniUnites || 0),
      cmdPrevue: p.repartition?.[livraison.id]?.value || 0,
      enPromo: promosActives.some(promo => promo.itm8 === p.itm8),
      promoInfo: promosActives.find(promo => promo.itm8 === p.itm8)?.promotion || null
    }));

  return {
    metadata: {
      type: 'commande',
      version: '1.0',
      semaine,
      annee,
      livraison: {
        numero: livraison.numero || 1,
        dateCommande: livraison.dateCommande,
        dateLivraison: livraison.dateReception
      },
      magasin: {
        code: magasin.code || '',
        nom: magasin.nom || ''
      },
      creePar: 'Manager',
      creeLe: now,
      nbProduits: produitsExport.length,
      totalCmdPrevue: produitsExport.reduce((sum, p) => sum + p.cmdPrevue, 0)
    },
    produits: produitsExport
  };
}

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

// ============================================
// EXPORT INVENTAIRE (Équipe → Manager)
// ============================================

/**
 * Crée le fichier d'inventaire à exporter vers le manager
 * @param {Object} params
 * @param {Array} params.produits - Produits avec stock réel saisi
 * @param {Object} params.metadataCommande - Metadata de la commande importée
 * @param {string} params.inventairePar - Nom de la personne qui a fait l'inventaire
 * @returns {Object}
 */
export function creerFichierInventaire({ produits, metadataCommande, inventairePar = '' }) {
  const now = new Date().toISOString();

  const produitsInventaire = produits.map(p => ({
    itm8: p.itm8,
    libelle: p.libelle,
    stockPrevu: p.stockMini, // Ce qu'on pensait avoir
    stockReel: p.stockReel ?? null, // Ce que l'équipe a compté
    cmdPrevue: p.cmdPrevue,
    cmdFinale: p.cmdFinale ?? p.cmdPrevue, // Commande ajustée ou prévue
    ecartStock: p.stockReel !== null ? p.stockReel - p.stockMini : null,
    observation: p.observation || null
  }));

  // Calculer les stats
  const produitsAvecStock = produitsInventaire.filter(p => p.stockReel !== null);
  const ecartTotal = produitsAvecStock.reduce((sum, p) => sum + Math.abs(p.ecartStock || 0), 0);

  return {
    metadata: {
      type: 'inventaire',
      version: '1.0',
      semaine: metadataCommande.semaine,
      annee: metadataCommande.annee,
      livraison: metadataCommande.livraison,
      magasin: metadataCommande.magasin,
      commandeOriginale: {
        creeLe: metadataCommande.creeLe,
        nbProduits: metadataCommande.nbProduits,
        totalCmdPrevue: metadataCommande.totalCmdPrevue
      },
      inventairePar,
      inventaireLe: now,
      stats: {
        nbProduitsInventories: produitsAvecStock.length,
        nbProduitsTotal: produitsInventaire.length,
        ecartMoyenAbsolu: produitsAvecStock.length > 0 ? Math.round(ecartTotal / produitsAvecStock.length * 10) / 10 : 0,
        totalCmdFinale: produitsInventaire.reduce((sum, p) => sum + (p.cmdFinale || 0), 0)
      }
    },
    produits: produitsInventaire
  };
}

// ============================================
// IMPORT FICHIER
// ============================================

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
      } catch (err) {
        reject(new Error('Fichier JSON invalide'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur de lecture du fichier'));
    };

    reader.readAsText(file);
  });
}

/**
 * Valide un fichier de commande importé
 * @param {Object} data
 * @returns {Object} { valide: boolean, erreur?: string }
 */
export function validerFichierCommande(data) {
  if (!data.metadata) {
    return { valide: false, erreur: 'Metadata manquante' };
  }
  if (data.metadata.type !== 'commande') {
    return { valide: false, erreur: `Type de fichier incorrect: ${data.metadata.type}` };
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
 * Valide un fichier d'inventaire importé
 * @param {Object} data
 * @returns {Object} { valide: boolean, erreur?: string }
 */
export function validerFichierInventaire(data) {
  if (!data.metadata) {
    return { valide: false, erreur: 'Metadata manquante' };
  }
  if (data.metadata.type !== 'inventaire') {
    return { valide: false, erreur: `Type de fichier incorrect: ${data.metadata.type}` };
  }
  if (!data.produits || !Array.isArray(data.produits)) {
    return { valide: false, erreur: 'Liste de produits manquante' };
  }
  return { valide: true };
}

// ============================================
// FUSION DES DONNÉES
// ============================================

/**
 * Fusionne l'inventaire reçu avec les données de commande du manager
 * @param {Array} produitsManager - Produits du manager avec calculs
 * @param {Array} produitsInventaire - Produits de l'inventaire équipe
 * @returns {Array} - Produits fusionnés avec écarts
 */
export function fusionnerInventaire(produitsManager, produitsInventaire) {
  const inventaireMap = new Map(
    produitsInventaire.map(p => [p.itm8, p])
  );

  return produitsManager.map(produit => {
    const inv = inventaireMap.get(produit.itm8);

    if (inv) {
      return {
        ...produit,
        stockReel: inv.stockReel,
        cmdFinale: inv.cmdFinale,
        ecartStock: inv.ecartStock,
        observation: inv.observation,
        inventaireRecu: true
      };
    }

    return {
      ...produit,
      stockReel: null,
      cmdFinale: null,
      ecartStock: null,
      observation: null,
      inventaireRecu: false
    };
  });
}

// ============================================
// EXPORT PERSONNALISATIONS (Bidirectionnel)
// ============================================

/**
 * Crée le fichier de personnalisations
 * @param {Object} params
 * @param {Object} params.libellesPersonnalises - { itm8: libelle }
 * @param {Array} params.produitsInactifs - Liste des ITM8 désactivés
 * @param {Object} params.magasin
 * @returns {Object}
 */
export function creerFichierPersonnalisations({ libellesPersonnalises = {}, produitsInactifs = [], magasin }) {
  return {
    metadata: {
      type: 'personnalisation',
      version: '1.0',
      magasin: {
        code: magasin.code || '',
        nom: magasin.nom || ''
      },
      modifieLe: new Date().toISOString(),
      nbLibelles: Object.keys(libellesPersonnalises).length,
      nbInactifs: produitsInactifs.length
    },
    libellesPersonnalises,
    produitsInactifs
  };
}

/**
 * Fusionne les personnalisations (dernier qui valide gagne)
 * @param {Object} existantes - Personnalisations actuelles
 * @param {Object} nouvelles - Personnalisations importées
 * @returns {Object}
 */
export function fusionnerPersonnalisations(existantes, nouvelles) {
  return {
    libellesPersonnalises: {
      ...existantes.libellesPersonnalises,
      ...nouvelles.libellesPersonnalises
    },
    produitsInactifs: [
      ...new Set([
        ...(existantes.produitsInactifs || []),
        ...(nouvelles.produitsInactifs || [])
      ])
    ]
  };
}

// ============================================
// HISTORIQUE LOCAL (pour traçabilité)
// ============================================

const STORAGE_KEY_HISTORIQUE = 'bvp_historique_echanges';

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
    console.error('Erreur enregistrement historique:', err);
  }
}

/**
 * Récupère l'historique des échanges
 * @returns {Array}
 */
export function getHistoriqueEchanges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORIQUE) || '[]');
  } catch {
    return [];
  }
}

/**
 * Récupère les écarts historiques pour un produit
 * @param {string} itm8
 * @returns {Array}
 */
export function getHistoriqueEcartsProduit(itm8) {
  const historique = getHistoriqueEchanges();

  return historique
    .filter(e => e.type === 'import_inventaire')
    .flatMap(e => e.produits || [])
    .filter(p => p.itm8 === itm8 && p.ecartStock !== null)
    .map(p => ({
      date: p.date,
      ecart: p.ecartStock,
      stockPrevu: p.stockPrevu,
      stockReel: p.stockReel
    }));
}
