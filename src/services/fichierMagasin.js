/**
 * Service Fichier Magasin V2.1
 * Export/Import de la configuration magasin au format .bvp.json
 * V2.1: Support des créneaux matin/après-midi et statuts ouvert/ferme_habituel/ferme_exceptionnel
 */

const FICHIER_VERSION = '2.1';

/**
 * Structure par défaut d'un créneau
 */
const defaultCreneau = {
  statut: 'ouvert',
  redistribution: {
    memeJourAutreCreneau: 85,
    jourSuivant: 15
  }
};

/**
 * Structure par défaut des jours d'ouverture (V2.1)
 */
const defaultJoursOuverture = () => {
  const jours = {};
  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  JOURS.forEach(jour => {
    jours[jour] = {
      matin: { ...defaultCreneau },
      apresMidi: { ...defaultCreneau }
    };
  });

  // Lundi fermé par défaut (habitude boulangerie)
  jours.lundi.matin.statut = 'ferme_habituel';
  jours.lundi.apresMidi.statut = 'ferme_habituel';

  return jours;
};

/**
 * Migre l'ancien format joursOuverture (boolean) vers le nouveau format (créneaux)
 */
function migrateJoursOuverture(joursOuverture) {
  if (!joursOuverture) return defaultJoursOuverture();

  // Vérifier si c'est déjà le nouveau format (présence de matin/apresMidi)
  if (joursOuverture.lundi?.matin !== undefined) {
    return joursOuverture;
  }

  // Migration depuis l'ancien format (boolean)
  const nouveauFormat = {};
  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  JOURS.forEach(jour => {
    const estOuvert = joursOuverture[jour] === true;
    nouveauFormat[jour] = {
      matin: {
        statut: estOuvert ? 'ouvert' : 'ferme_habituel',
        redistribution: { memeJourAutreCreneau: 85, jourSuivant: 15 }
      },
      apresMidi: {
        statut: estOuvert ? 'ouvert' : 'ferme_habituel',
        redistribution: { memeJourAutreCreneau: 85, jourSuivant: 15 }
      }
    };
  });

  return nouveauFormat;
}

/**
 * Génère un fichier magasin à partir des données de l'application
 */
export function genererFichierMagasin(data) {
  // Supporter les deux formats : data.magasin.nom OU data.magasinNom
  const magasinNom = data.magasin?.nom || data.magasinNom || 'MonMagasin';
  const magasinCode = data.magasin?.code || data.magasinCode || 'CODE';

  const fichier = {
    version: FICHIER_VERSION,
    dateGeneration: new Date().toISOString(),

    magasin: {
      nom: magasinNom,
      code: magasinCode
    },

    joursOuverture: migrateJoursOuverture(data.joursOuverture),

    frequentation: {
      courbeJournaliere: data.courbeJournaliere || {},
      courbeHoraire: data.courbeHoraire || {
        matin: 0.40,
        midi: 0.35,
        apresMidi: 0.25
      }
    },

    commande: {
      joursCommande: data.joursCommande || [],
      joursLivraison: data.joursLivraison || [],
      stockSecurite: data.stockSecurite || 0.10
    },

    pilotageCA: {
      caTotalRayonHebdo: data.caTotalRayonHebdo || 0,
      caMonitoreActuel: data.caMonitoreActuel || 0,
      partRayonActuel: data.partRayonActuel || 0,
      objectifProgression: data.objectifProgression || 0,
      afficherCAEquipes: data.afficherCAEquipes || false
    },

    produits: data.produits || []
  };

  return fichier;
}

/**
 * Exporte le fichier magasin en téléchargement
 * Utilise showSaveFilePicker si disponible pour choisir l'emplacement
 */
export async function exporterFichierMagasin(data, nomFichier = null) {
  const fichier = genererFichierMagasin(data);

  // Générer nom de fichier
  const dateStr = new Date().toISOString().split('T')[0];
  const nom = nomFichier || `${fichier.magasin.code}_${fichier.magasin.nom}_${dateStr}`;
  const nomFichierFinal = `${nom.replace(/[^a-zA-Z0-9]/g, '_')}.bvp.json`;

  const contenu = JSON.stringify(fichier, null, 2);

  // Essayer showSaveFilePicker (API moderne) pour choisir l'emplacement
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: nomFichierFinal,
        types: [{
          description: 'Fichier BVP Planning',
          accept: { 'application/json': ['.json', '.bvp.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(contenu);
      await writable.close();
      return fichier;
    } catch (err) {
      // L'utilisateur a annulé ou erreur - fallback vers méthode classique
      if (err.name === 'AbortError') {
        throw new Error('Export annulé');
      }
      console.warn('showSaveFilePicker non disponible, fallback vers téléchargement classique');
    }
  }

  // Fallback : téléchargement classique (dossier Téléchargements)
  const blob = new Blob([contenu], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = nomFichierFinal;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fichier;
}

/**
 * Charge un fichier magasin depuis un fichier uploadé
 */
export async function chargerFichierMagasin(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const contenu = JSON.parse(e.target.result);

        // Validation basique
        if (!contenu.version) {
          throw new Error('Fichier invalide : version manquante');
        }

        if (!contenu.version.startsWith('2.')) {
          throw new Error(`Version non supportée : ${contenu.version}. Attendu : 2.x`);
        }

        // Migration automatique des anciens formats
        if (contenu.joursOuverture) {
          contenu.joursOuverture = migrateJoursOuverture(contenu.joursOuverture);
        }

        resolve(contenu);
      } catch (error) {
        reject(new Error(`Erreur de lecture : ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}

/**
 * Valide un fichier magasin chargé
 * Note: La validation est souple pour permettre l'import de fichiers partiels
 */
export function validerFichierMagasin(fichier) {
  const erreurs = [];
  const avertissements = [];

  // Erreurs critiques (bloquantes)
  if (!fichier.produits || fichier.produits.length === 0) {
    erreurs.push('Aucun produit dans le fichier');
  }

  // Avertissements (non bloquants)
  if (!fichier.magasin?.nom) {
    avertissements.push('Nom du magasin manquant (valeur par défaut utilisée)');
  }

  if (!fichier.frequentation?.courbeJournaliere) {
    avertissements.push('Courbe de fréquentation manquante');
  }

  return {
    valide: erreurs.length === 0,
    erreurs,
    avertissements
  };
}

/**
 * Fusionne un fichier magasin avec les données locales
 * (utile pour récupérer les états de production, casse, etc.)
 */
export function fusionnerAvecDonneesLocales(fichierMagasin, donneesLocales) {
  return {
    ...fichierMagasin,
    // Conserver les états de production locaux
    productionState: donneesLocales.productionState || {},
    // Conserver l'historique de casse local
    historiqueCasse: donneesLocales.historiqueCasse || [],
    // Conserver les commandes en cours
    commandesEnCours: donneesLocales.commandesEnCours || []
  };
}
