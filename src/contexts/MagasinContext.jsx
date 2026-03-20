/**
 * MagasinContext V5
 *
 * Contexte global pour le Wizard Manager.
 * Gère l'état de l'import et les données chargées.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveHandle, loadHandle, verifyHandlePermission } from '../services/handleStorage';
import { appliquerArchiveSurBruts } from '../services/nettoyageGamme';

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
  const [produitsVentesBrutes, setProduitsVentesBrutes] = useState([]); // ventes brutes avant nettoyage/archive

  // Pilotage CA — partagés pour l'export Communication
  const [planifieManager, setPlanifieManager] = useState({}); // { [produitId]: quantité }
  const [commandeConfig, setCommandeConfig] = useState({}); // Config commande multi-livraisons
  const [joursOuverture, setJoursOuverture] = useState(null);
  const [promosActives, setPromosActives] = useState([]);

  // PLU/ITM8 des produits qui étaient en promo la semaine précédente (S-1)
  const [promosPrecedentes, setPromosPrecedentes] = useState([]); // [{ plu, itm8, libelle, quantitePrevue }]

  // Référentiel magasin (liaison EAN→ITM, optionnel)
  const [refMagasin, setRefMagasin] = useState(null);
  const [rapportIdentification, setRapportIdentification] = useState(null);

  // Produits archive en attente d'application sur produitsGamme
  const [archiveProduitsEnAttente, setArchiveProduitsEnAttente] = useState(null);

  // Archive trouvée (info pour le switch Gamme magasin / Nettoyage)
  const [archiveTrouvee, setArchiveTrouvee] = useState(null); // { semaine, estMemeSemaine, nomFichier }

  // Flag : l'archive a été appliquée sur les produits
  const [archiveAppliquee, setArchiveAppliquee] = useState(false);

  // Corrections manuelles en attente de restauration depuis l'archive
  const [archiveCorrectionsEnAttente, setArchiveCorrectionsEnAttente] = useState(null);

  // Dossier BVP partagé — unique dossier pour Manager et Équipe (persisté via IndexedDB)
  const [dossierBVP, setDossierBVPState] = useState(null);

  // Personnalisations équipe lues depuis le fichier EQUIPE-*.bvp.json
  const [personnalisationsEquipe, setPersonnalisationsEquipe] = useState(null);

  // Plaquage : pourcentage par programme de cuisson (ex: { "Viennoiserie classique": 80 })
  const [plaquageProgrammes, setPlaquageProgrammes] = useState({});

  // Pâtisserie : couverture multi-jours (ex: { jours: 3, jourDepart: "mercredi", exemplesIds: [] })
  const [couverturePatisserie, setCouverturePatisserie] = useState({ jours: 2, jourDepart: 'lundi', exemplesIds: [] });

  // Charger les handles depuis IndexedDB au montage
  useEffect(() => {
    // Dossier BVP partagé (migration : essayer dossierBVP, sinon dossierArchives, sinon dossierEquipe)
    loadHandle('dossierBVP').then(async (handle) => {
      if (handle) {
        if (await verifyHandlePermission(handle, 'readwrite')) {
          setDossierBVPState(handle);
        }
        return;
      }
      // Migration : chercher les anciennes clés
      const ancien = await loadHandle('dossierArchives') || await loadHandle('dossierEquipe');
      if (ancien && await verifyHandlePermission(ancien, 'readwrite')) {
        setDossierBVPState(ancien);
        saveHandle('dossierBVP', ancien);
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
  const setDossierBVP = useCallback((handle) => {
    setDossierBVPState(handle);
    if (handle) {
      saveHandle('dossierBVP', handle);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RÈGLE FONDAMENTALE (CDC §19) :
  // Archive et nettoyage sont MUTUELLEMENT EXCLUSIFS.
  // Ce useEffect applique l'archive sur les ventes BRUTES (pas sur produitsGamme).
  // Dépend de produitsVentesBrutes (stable) pour éviter les re-déclenchements.
  // PAS de dédoublonnage — l'archive décide, point final.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!archiveProduitsEnAttente || !produitsVentesBrutes || produitsVentesBrutes.length === 0) return;

    const updated = appliquerArchiveSurBruts(produitsVentesBrutes, archiveProduitsEnAttente);

    setArchiveAppliquee(true);
    // Marquer qu'une archive a été trouvée (pour le switch Gamme/Nettoyage dans l'UI)
    if (!archiveTrouvee) {
      setArchiveTrouvee({ nomFichier: 'archive MANAGER', estMemeSemaine: false });
    }
    setProduitsGamme(updated);
    setArchiveProduitsEnAttente(null);
  }, [archiveProduitsEnAttente, produitsVentesBrutes]);

  // Restaurer les corrections manuelles depuis l'archive (merge avec localStorage)
  useEffect(() => {
    if (!archiveCorrectionsEnAttente) return;
    try {
      const existant = JSON.parse(localStorage.getItem('bvp_corrections_doublons') || '{}');
      const merged = {
        separations: [...new Set([...(existant.separations || []), ...(archiveCorrectionsEnAttente.separations || [])])],
        fusions: [...(existant.fusions || []), ...(archiveCorrectionsEnAttente.fusions || [])].reduce((acc, f) => {
          if (!acc.find(a => a.source === f.source)) acc.push(f);
          return acc;
        }, []),
        dissociations: [...new Set([...(existant.dissociations || []), ...(archiveCorrectionsEnAttente.dissociations || [])])],
        associations: [...(existant.associations || []), ...(archiveCorrectionsEnAttente.associations || [])].reduce((acc, a) => {
          if (!acc.find(x => x.libelle === a.libelle)) acc.push(a);
          return acc;
        }, []),
      };
      localStorage.setItem('bvp_corrections_doublons', JSON.stringify(merged));
    } catch { /* ignore */ }
    setArchiveCorrectionsEnAttente(null);
  }, [archiveCorrectionsEnAttente]);

  // Appliquer les personnalisations équipe (unitesParLot, programme, etc.) aux produitsGamme
  useEffect(() => {
    if (!personnalisationsEquipe || !produitsGamme || produitsGamme.length === 0) return;

    let changedCount = 0;
    const updated = produitsGamme.map(pg => {
      // Chercher par itm8 dans les personnalisations
      const perso = personnalisationsEquipe[pg.itm8];
      if (!perso) return pg;

      const changes = {};
      if (perso.unitesParLot && perso.unitesParLot > 1) {
        changes.unitesParLot = perso.unitesParLot;
      }
      if (perso.unitesParPlaque && perso.unitesParPlaque > 0) {
        changes.unitesParPlaque = perso.unitesParPlaque;
      }
      if (perso.programmeFour) {
        changes.programme = perso.programmeFour;
      }
      if (perso.plu) {
        changes.plu = perso.plu;
      }
      if (perso.nomPersonnalise) {
        changes.libellePersonnalise = perso.nomPersonnalise;
      }
      if (Object.keys(changes).length > 0) {
        changedCount++;
        return { ...pg, ...changes };
      }
      return pg;
    });

    if (changedCount > 0) {
      setProduitsGamme(updated);
    }
  }, [personnalisationsEquipe, produitsGamme]);

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
    setProduitsVentesBrutes([]);
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
    setArchiveTrouvee(null);
    setArchiveAppliquee(false);
    setArchiveCorrectionsEnAttente(null);
    setPersonnalisationsEquipe(null);
    setRefMagasin(null);
    setRapportIdentification(null);
    setPlaquageProgrammes({});
    setCouverturePatisserie({ jours: 2, jourDepart: 'lundi', exemplesIds: [] });
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
    produitsVentesBrutes,
    setProduitsVentesBrutes,

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

    // Référentiel magasin (liaison EAN→ITM)
    refMagasin,
    setRefMagasin,
    rapportIdentification,
    setRapportIdentification,

    // Archive produits en attente
    archiveProduitsEnAttente,
    setArchiveProduitsEnAttente,

    // Archive trouvée (info) pour le switch UI
    archiveTrouvee,
    setArchiveTrouvee,
    archiveAppliquee,

    // Corrections manuelles depuis l'archive
    setArchiveCorrectionsEnAttente,

    // Dossier BVP partagé (unique pour Manager + Équipe)
    dossierBVP,
    setDossierBVP,
    personnalisationsEquipe,
    setPersonnalisationsEquipe,

    // Plaquage par programme
    plaquageProgrammes,
    setPlaquageProgrammes,

    // Pâtisserie couverture multi-jours
    couverturePatisserie,
    setCouverturePatisserie,

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
