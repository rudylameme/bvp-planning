/**
 * MagasinContext V5
 *
 * Contexte global pour le Wizard Manager.
 * Gère l'état de l'import et les données chargées.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveHandle, loadHandle, verifyHandlePermission } from '../services/handleStorage';
import { appliquerArchiveSurBruts, nettoyerGamme } from '../services/nettoyageGamme';
// SB-5 — Persistance centralisée derrière IPersistanceMagasin. Le rebranchement
// remplace les accès directs à localStorage par les helpers de l'adapter
// (iso-comportement strict : même clé `bvp_corrections_doublons`, même JSON).
// Le bug 1 reste OUVERT à la fin de SB-5 — la race condition useEffect ×
// localStorage n'est PAS corrigée ici (cf. SB-6).
import {
  adapterFichierLocal,
  obtenirCorrectionsLocales,
  sauvegarderCorrectionsLocales,
} from '../domain/persistence/adapterFichierLocal.js';

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

  // SB-6 — Corrections manuelles : VRAIE source de vérité (état typé qui voyage
  // avec la gamme et qui est persisté dans le .bvp.json v3.1 via l'adapter).
  // Init : lecture UNE FOIS de localStorage au montage (migration douce des
  // utilisateurs qui n'ont leurs corrections que dans localStorage). Après cela,
  // l'état React fait foi pour le flux gamme — plus de lecture ambient.
  const [correctionsManuelles, setCorrectionsManuelles] = useState(() =>
    obtenirCorrectionsLocales() ?? {
      separations: [], fusions: [], dissociations: [], associations: [],
    },
  );

  // Dossier BVP partagé — unique dossier pour Manager et Équipe (persisté via IndexedDB)
  const [dossierBVP, setDossierBVPState] = useState(null);

  // Personnalisations équipe lues depuis le fichier EQUIPE-*.bvp.json
  const [personnalisationsEquipe, setPersonnalisationsEquipe] = useState(null);

  // Flag : nettoyage nécessaire (mis à true par EtapeConfigPlanning quand aucune archive n'est trouvée)
  const [nettoyageNecessaire, setNettoyageNecessaire] = useState(false);

  // Plaquage : pourcentage par programme de cuisson (ex: { "Viennoiserie classique": 80 })
  const [plaquageProgrammes, setPlaquageProgrammes] = useState({});

  // Pâtisserie : couverture multi-jours (ex: { jours: 3, jourDepart: "mercredi", exemplesIds: [] })
  const [couverturePatisserie, setCouverturePatisserie] = useState({ jours: 2, jourDepart: 'lundi', exemplesIds: [] });

  // Sélection d'association (Set d'IDs produits) — remonté ici pour survivre aux changements de filtre
  const [selectionAssociation, setSelectionAssociation] = useState(new Set());

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

  // SB-6 — Verrou bug 1. Reçoit les corrections d'une archive (fichier .bvp.json
  // chargé par Etape2ObjectifCA) et les merge SYNCHRONIQUEMENT dans l'état
  // typé `correctionsManuelles`. Met aussi à jour localStorage pour iso-comportement
  // avec les consommateurs legacy (Etape5Communication export, 4 fonctions de
  // correction manuelle dans nettoyageGamme.js).
  //
  // Remplace le useEffect ancien sur `archiveCorrectionsEnAttente` (cause racine
  // de la race condition décrite dans la fiche Bug 1 — diagnostic SB-0).
  const chargerCorrectionsArchive = useCallback((archiveCorrections) => {
    if (!archiveCorrections) return;
    setCorrectionsManuelles(prev => {
      const merged = {
        separations: [...new Set([
          ...(prev.separations || []),
          ...(archiveCorrections.separations || []),
        ])],
        fusions: [
          ...(prev.fusions || []),
          ...(archiveCorrections.fusions || []),
        ].reduce((acc, f) => {
          if (!acc.find(a => a.source === f.source)) acc.push(f);
          return acc;
        }, []),
        dissociations: [...new Set([
          ...(prev.dissociations || []),
          ...(archiveCorrections.dissociations || []),
        ])],
        associations: [
          ...(prev.associations || []),
          ...(archiveCorrections.associations || []),
        ].reduce((acc, a) => {
          if (!acc.find(x => x.libelle === a.libelle)) acc.push(a);
          return acc;
        }, []),
      };
      sauvegarderCorrectionsLocales(merged);
      return merged;
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SB-6 — VERROU BUG 1.
  // useEffect UNIFIÉ pour l'application de la gamme. Remplace les 2
  // useEffects historiques (archive + nettoyage Cas D) ET supprime le 3e
  // useEffect de merge corrections (qui causait la race condition contre
  // `appliquerArchiveSurBruts`). Les corrections sont désormais passées
  // EN ARGUMENT EXPLICITE — la fonction du domaine ne lit plus localStorage
  // en ambient. La race condition est éliminée par construction.
  //
  // RÈGLE FONDAMENTALE (CDC §19) : archive et nettoyage sont MUTUELLEMENT
  // EXCLUSIFS. La branche A (archive) prime sur la branche B (nettoyage Cas D).
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!produitsVentesBrutes || produitsVentesBrutes.length === 0) return;

    // Branche A — Archive disponible (priorité)
    if (archiveProduitsEnAttente) {
      const updated = appliquerArchiveSurBruts(
        produitsVentesBrutes,
        archiveProduitsEnAttente,
        correctionsManuelles,
      );
      setArchiveAppliquee(true);
      if (!archiveTrouvee) {
        setArchiveTrouvee({ nomFichier: 'archive MANAGER', estMemeSemaine: false });
      }
      setProduitsGamme(updated);
      setArchiveProduitsEnAttente(null);
      return;
    }

    // Branche B — Nettoyage automatique Cas D (déclenché par EtapeConfigPlanning
    // quand la recherche d'archive échoue)
    if (nettoyageNecessaire && !archiveAppliquee) {
      const sem = semainePlanning;
      const moisP = sem ? new Date(sem.annee, 0, 1 + (sem.semaine - 1) * 7).getMonth() + 1 : null;
      const { produits: nettoyes } = nettoyerGamme(
        produitsVentesBrutes,
        sem?.semaine,
        moisP,
        null,
        correctionsManuelles,
      );
      setProduitsGamme(nettoyes);
      setNettoyageNecessaire(false);
    }
  }, [
    produitsVentesBrutes,
    archiveProduitsEnAttente,
    correctionsManuelles,
    nettoyageNecessaire,
    semainePlanning,
    archiveAppliquee,
    archiveTrouvee,
  ]);

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
      if (perso.famille && perso.famille !== pg.famille) {
        changes.famille = perso.famille;
        changes.rayon = perso.famille;
      }
      if (Object.keys(changes).length > 0) {
        changedCount++;
        return { ...pg, ...changes };
      }

      // Fallback : chercher par libellé si pas trouvé par itm8
      const persoByLib = Object.values(personnalisationsEquipe).find(
        pe => pe.libelle && pe.libelle === pg.libelle
      );
      if (persoByLib?.famille && persoByLib.famille !== pg.famille) {
        changedCount++;
        return { ...pg, famille: persoByLib.famille, rayon: persoByLib.famille };
      }
      return pg;
    });

    if (changedCount > 0) {
      setProduitsGamme(updated);
    }
  }, [personnalisationsEquipe, produitsGamme?.length]);

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
    setNettoyageNecessaire(false);
    setPersonnalisationsEquipe(null);
    setRefMagasin(null);
    setRapportIdentification(null);
    setPlaquageProgrammes({});
    setCouverturePatisserie({ jours: 2, jourDepart: 'lundi', exemplesIds: [] });
    setSelectionAssociation(new Set());
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

    // SB-6 — Corrections manuelles : source de vérité unique, typée, persistée
    // dans le .bvp.json v3.1. Voyagent avec la gamme.
    correctionsManuelles,
    setCorrectionsManuelles,
    // Remplace setArchiveCorrectionsEnAttente (race condition éliminée) :
    // merge SYNCHRONE des corrections d'archive dans le state — pas de useEffect
    // intermédiaire qui courrait contre appliquerArchiveSurBruts.
    chargerCorrectionsArchive,

    // Nettoyage automatique (Cas D — pas d'archive)
    nettoyageNecessaire,
    setNettoyageNecessaire,

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

    // Sélection association (survit aux changements de filtre)
    selectionAssociation,
    setSelectionAssociation,

    // Helpers
    reinitialiser,
    importComplet,

    // SB-5 — Adapter de persistance (contrat IPersistanceMagasin).
    // Exposé pour les futurs sous-blocs (SB-6+) qui consommeront les méthodes
    // typées (importer / exporter / charger / sauvegarder / fusionner).
    // En SB-5 la V5 utilise déjà ce module pour les helpers localStorage
    // (cf. useEffect ci-dessus). Le contrat est en place ; les chemins live
    // d'import/export viendront en SB-6.
    persistance: adapterFichierLocal,
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
