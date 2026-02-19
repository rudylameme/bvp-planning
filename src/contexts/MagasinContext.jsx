/**
 * MagasinContext V5
 *
 * Contexte global pour le Wizard Manager.
 * Gère l'état de l'import et les données chargées.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveHandle, loadHandle, verifyHandlePermission } from '../services/handleStorage';

const MagasinContext = createContext();

export function MagasinProvider({ children }) {
  // État du dossier DATA
  const [dirHandle, setDirHandle] = useState(null);
  const [semainesDisponibles, setSemainesDisponibles] = useState([]);

  // État de la sélection
  const [semaineSelectionnee, setSemaineSelectionnee] = useState(null);
  const [magasinSelectionne, setMagasinSelectionne] = useState(null);

  // État du chargement
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Données extraites
  const [donneesMagasin, setDonneesMagasin] = useState(null);
  const [infoPDV, setInfoPDV] = useState(null);

  // Liste des fichiers détectés
  const [fichiersDetectes, setFichiersDetectes] = useState([]);

  // État objectif CA
  const [objectifCA, setObjectifCA] = useState(null);
  const [objectifPourcent, setObjectifPourcent] = useState(null);
  const [semainePlanning, setSemainePlanning] = useState(null); // ex: { semaine: 5, annee: 2026 }
  const [semaineFrequentation, setSemaineFrequentation] = useState(null); // S-4 calculée

  // Données de fréquentation (S-4) chargées depuis Etape2
  const [frequentationData, setFrequentationData] = useState(null);

  // Type de pondération des semaines (standard / saisonnier / fortePromo)
  const [typePonderation, setTypePonderation] = useState('standard');

  // État gamme / ventes-casse
  const [fichiersVentesCasse, setFichiersVentesCasse] = useState([]);
  const [fichierVentesSelectionne, setFichierVentesSelectionne] = useState(null);
  const [donneesGamme, setDonneesGamme] = useState(null);
  const [produitsGamme, setProduitsGamme] = useState([]);

  // Pilotage CA — partagés pour l'export Communication
  const [planifieManager, setPlanifieManager] = useState({}); // { [produitId]: quantité }
  const [commandeConfig, setCommandeConfig] = useState({}); // Config commande multi-livraisons
  const [joursOuverture, setJoursOuverture] = useState(null);
  const [promosActives, setPromosActives] = useState([]);

  // PLU/ITM8 des produits qui étaient en promo la semaine précédente (S-1)
  const [promosPrecedentes, setPromosPrecedentes] = useState([]); // [{ plu, itm8, libelle, quantitePrevue }]

  // Produits archive en attente d'application sur produitsGamme
  const [archiveProduitsEnAttente, setArchiveProduitsEnAttente] = useState(null);

  // Dossier d'archives Manager (persisté via IndexedDB)
  const [dossierArchives, setDossierArchivesState] = useState(null);

  // Charger les handles depuis IndexedDB au montage
  useEffect(() => {
    // Dossier archives
    loadHandle('dossierArchives').then(async (handle) => {
      if (!handle) return;
      if (await verifyHandlePermission(handle, 'readwrite')) {
        setDossierArchivesState(handle);
      }
    });
    // Dossier DATA (pré-configuré via PageParametres)
    loadHandle('dirHandle-data').then(async (handle) => {
      if (!handle) return;
      if (await verifyHandlePermission(handle, 'read')) {
        setDirHandle(handle);
      }
    });
  }, []);

  // Setter qui persiste aussi dans IndexedDB
  const setDossierArchives = useCallback((handle) => {
    setDossierArchivesState(handle);
    if (handle) {
      saveHandle('dossierArchives', handle);
    }
  }, []);

  // Appliquer les données archive (actif, rayon) quand produitsGamme se remplit
  useEffect(() => {
    if (!archiveProduitsEnAttente || !produitsGamme || produitsGamme.length === 0) return;

    const archiveMap = new Map();
    archiveProduitsEnAttente.forEach(p => {
      if (p.itm8) archiveMap.set(p.itm8, p);
      if (p.plu) archiveMap.set(p.plu, p);
      if (p.libelle) archiveMap.set(p.libelle, p);
    });

    let matchCount = 0;
    let changedCount = 0;
    const updated = produitsGamme.map(pg => {
      const match = archiveMap.get(pg.itm8) || archiveMap.get(pg.plu) || archiveMap.get(pg.libelle);
      if (!match) return pg;
      matchCount++;
      const changes = {};
      if (typeof match.actif === 'boolean') changes.actif = match.actif;
      if (match.rayon) changes.rayon = match.rayon;
      if (Object.keys(changes).length > 0) {
        changedCount++;
        return { ...pg, ...changes };
      }
      return pg;
    });

    if (changedCount > 0) {
      setProduitsGamme(updated);
    }
    setArchiveProduitsEnAttente(null);
  }, [archiveProduitsEnAttente, produitsGamme]);

  // Reset complet
  const reinitialiser = useCallback(() => {
    setDirHandle(null);
    setSemainesDisponibles([]);
    setSemaineSelectionnee(null);
    setMagasinSelectionne(null);
    setChargement(false);
    setErreur(null);
    setDonneesMagasin(null);
    setInfoPDV(null);
    setFichiersDetectes([]);
    setFichiersVentesCasse([]);
    setFichierVentesSelectionne(null);
    setDonneesGamme(null);
    setProduitsGamme([]);
    setObjectifCA(null);
    setSemainePlanning(null);
    setSemaineFrequentation(null);
    setFrequentationData(null);
    setPlanifieManager({});
    setCommandeConfig({});
    setJoursOuverture(null);
    setPromosActives([]);
    setPromosPrecedentes([]);
    setArchiveProduitsEnAttente(null);
  }, []);

  // Vérifie si l'import est complet (prêt à passer à l'étape suivante)
  const importComplet = Boolean(
    dirHandle &&
    semaineSelectionnee &&
    magasinSelectionne &&
    donneesMagasin
  );

  const value = {
    // État dossier
    dirHandle,
    setDirHandle,
    semainesDisponibles,
    setSemainesDisponibles,
    fichiersDetectes,
    setFichiersDetectes,

    // Sélection
    semaineSelectionnee,
    setSemaineSelectionnee,
    magasinSelectionne,
    setMagasinSelectionne,

    // Chargement
    chargement,
    setChargement,
    erreur,
    setErreur,

    // Données
    donneesMagasin,
    setDonneesMagasin,
    infoPDV,
    setInfoPDV,

    // Objectif CA
    objectifCA,
    setObjectifCA,
    objectifPourcent,
    setObjectifPourcent,
    semainePlanning,
    setSemainePlanning,
    semaineFrequentation,
    setSemaineFrequentation,

    // Fréquentation
    frequentationData,
    setFrequentationData,
    typePonderation,
    setTypePonderation,

    // Données gamme / ventes-casse
    fichiersVentesCasse,
    setFichiersVentesCasse,
    fichierVentesSelectionne,
    setFichierVentesSelectionne,
    donneesGamme,
    setDonneesGamme,
    produitsGamme,
    setProduitsGamme,

    // Pilotage CA / Communication
    planifieManager,
    setPlanifieManager,
    commandeConfig,
    setCommandeConfig,
    joursOuverture,
    setJoursOuverture,
    promosActives,
    setPromosActives,
    promosPrecedentes,
    setPromosPrecedentes,

    // Archive produits en attente
    archiveProduitsEnAttente,
    setArchiveProduitsEnAttente,

    // Dossier archives
    dossierArchives,
    setDossierArchives,

    // Helpers
    reinitialiser,
    importComplet,
  };

  return (
    <MagasinContext.Provider value={value}>
      {children}
    </MagasinContext.Provider>
  );
}

export const useMagasin = () => {
  const context = useContext(MagasinContext);
  if (!context) {
    throw new Error('useMagasin doit être utilisé dans un MagasinProvider');
  }
  return context;
};

export default MagasinContext;
