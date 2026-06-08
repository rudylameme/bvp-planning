/**
 * EtapeConfigPlanning V5.2 — Étape unique « Préparer la semaine »
 *
 * Fusionne l'ancien Etape0Import + Etape2ObjectifCA en une seule étape :
 *
 * 1. Semaine du planning (défaut = S en cours + 1)
 * 2. Magasin (recherche par code/ville)
 *
 * Puis recherche automatique de 2 fichiers :
 * - AS-1 : même semaine, année précédente → CA de référence
 * - S-4  : fréquentation (cascade S-4, S-8… S-52)
 *
 * Objectif CA :
 * - Si benchmark fait (+X%), objectif = CA_AS1 × (1 + X%)
 * - Sinon, saisie manuelle ou pas d'objectif
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Search,
  Store,
  Check,
  AlertCircle,
  Loader2,
  BarChart3,
  Target,
  Edit3,
  X,
  TrendingUp,
  Database,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import { calculateWeekDates, getCurrentWeek } from '../../utils/weekCalculator';
import {
  listerSemainesDisponibles,
  extraireDonneesMagasin,
  chargerInfoPDV,
  extraireListeMagasins,
} from '../../services/dataExtractionService';
import {
  listerFichiersVentesCasse,
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';
import { parseFrequentationExcel } from '../../services/excelParser';
import { checkHandlePermission } from '../../hooks/useFileAccess';
import { chargerBBDNationale } from '../../services/bbdNationaleService';

// ── Utilitaires ──

/** Nombre de semaines ISO d'une année donnée (52 ou 53). */
function nbSemainesISO(annee) {
  const dernierJour = new Date(annee, 11, 28);
  const dayNum = dernierJour.getDay() || 7;
  dernierJour.setDate(dernierJour.getDate() + (4 - dayNum));
  const premierJour = new Date(dernierJour.getFullYear(), 0, 1);
  return Math.ceil(((dernierJour - premierJour) / 86400000 + 1) / 7);
}

/** Calcule la semaine S+N (gestion passage d'année). */
function calculerSemainePlusN(semaine, annee, n = 1) {
  if (!semaine || !annee) return null;
  const maxSem = nbSemainesISO(annee);
  let s = semaine + n;
  let a = annee;
  while (s > nbSemainesISO(a)) {
    s = s - nbSemainesISO(a);
    a += 1;
  }
  return { semaine: s, annee: a };
}

/** Calcule la semaine S-N (gestion passage d'année). */
function calculerSemaineMoinsN(semaine, annee, n = 4) {
  if (!semaine || !annee) return null;
  let s = semaine - n;
  let a = annee;
  while (s <= 0) {
    a -= 1;
    s = nbSemainesISO(a) + s;
  }
  return { semaine: s, annee: a };
}

/** Génère le nom de fichier Vente_Hebdo pour une semaine donnée. */
function nomFichierVenteHebdo(sem) {
  if (!sem) return null;
  return `Vente_Hebdo_BVP_S${String(sem.annee)}-${String(sem.semaine).padStart(2, '0')}.xlsx`;
}

// ── Composant d'affichage des dates d'une semaine ──
const AffichageDatesSemaine = ({ label, semaine, annee, couleur = 'blue', extra }) => {
  const dates = useMemo(() => {
    if (!semaine || !annee) return null;
    return calculateWeekDates(semaine, annee);
  }, [semaine, annee]);

  if (!dates) return null;

  const couleurs = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', textLight: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', textLight: 'text-amber-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', textLight: 'text-green-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', textLight: 'text-purple-600' },
  };
  const c = couleurs[couleur] || couleurs.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Calendar className={`w-4 h-4 ${c.textLight}`} />
        <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
        <span className={`text-xs font-bold ${c.text}`}>
          S{String(semaine).padStart(2, '0')}/{annee}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={c.text}>{dates.lundi}</span>
        <span className={c.textLight}>→</span>
        <span className={c.text}>{dates.dimanche}</span>
      </div>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
const EtapeConfigPlanning = () => {
  const {
    dirHandle,
    setDirHandle,
    semainesDisponibles,
    setSemainesDisponibles,
    semaineSelectionnee,
    setSemaineSelectionnee,
    magasinSelectionne,
    setMagasinSelectionne,
    chargement,
    setChargement,
    erreur,
    setErreur,
    donneesMagasin,
    setDonneesMagasin,
    infoPDV,
    setInfoPDV,
    fichiersDetectes,
    setFichiersDetectes,
    importComplet,
    fichiersVentesCasse,
    setFichiersVentesCasse,
    fichierVentesSelectionne,
    setFichierVentesSelectionne,
    setDonneesGamme,
    setProduitsGamme,
    // Config planning
    objectifCA,
    setObjectifCA,
    objectifPourcent,
    setObjectifPourcent,
    semainePlanning,
    setSemainePlanning,
    setSemaineFrequentation,
    setFrequentationData,
    typePonderation,
    setTypePonderation,
    setJoursOuverture,
    setPlanifieManager,
    setPromosActives,
    setPromosPrecedentes,
    dossierBVP,
    setArchiveProduitsEnAttente,
    setPersonnalisationsEquipe,
    archiveProduitsEnAttente,
    setProduitsVentesBrutes,
    setNettoyageNecessaire,
  } = useMagasin();

  const [etapeChargement, setEtapeChargement] = useState('');

  // ── Scanner le dossier (réutilisable) ──
  const scannerDossier = async (handle) => {
    // Lister les fichiers
    const fichiers = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const isExcel = entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls');
        const isJson = entry.name.endsWith('.json');
        const isVenteHebdo = entry.name.startsWith('Vente_Hebdo_BVP_S');
        const isInfoPDV = entry.name === 'info_PDV.json';
        const isVentesCasse = /^\d+\s+AU\s+\d+\s+\w+\s+\d{4}\.xlsx$/i.test(entry.name);

        fichiers.push({
          nom: entry.name,
          type: isExcel ? 'excel' : isJson ? 'json' : 'autre',
          statut: isVenteHebdo || isInfoPDV || isVentesCasse ? 'ok' : 'ignore',
          description: isVenteHebdo ? 'Ventes hebdo' : isInfoPDV ? 'Référence magasins' : isVentesCasse ? 'Ventes/casse' : 'Autre',
          isVentesCasse,
        });
      }
    }
    setFichiersDetectes(fichiers);

    const semaines = await listerSemainesDisponibles(handle);
    setSemainesDisponibles(semaines);
    if (semaines.length > 0) setSemaineSelectionnee(semaines[0]);

    let info = await chargerInfoPDV(handle);
    // Si info_PDV.json absent → extraire la liste des magasins depuis le dernier Vente_Hebdo
    if (!info && semaines.length > 0) {
      try {
        const derniereSemaine = semaines[0]; // la plus récente
        const fh = await handle.getFileHandle(derniereSemaine.fichier);
        const fichierExcel = await fh.getFile();
        info = await extraireListeMagasins(fichierExcel);
      } catch { /* non bloquant */ }
    }
    if (info) setInfoPDV(info);

    const fichiersVC = await listerFichiersVentesCasse(handle);
    setFichiersVentesCasse(fichiersVC);
    if (fichiersVC.length > 0) setFichierVentesSelectionne(fichiersVC[0]);
  };

  // ── Auto-scan quand dirHandle est pré-chargé depuis IndexedDB ──
  useEffect(() => {
    if (dirHandle && semainesDisponibles.length === 0 && fichiersDetectes.length === 0 && !chargement) {
      setChargement(true);
      setErreur(null);
      scannerDossier(dirHandle)
        .catch(() => setErreur('Impossible de lire le dossier. Vérifiez les permissions.'))
        .finally(() => setChargement(false));
    }
  }, [dirHandle]);

  // ── Semaine par défaut = S en cours + 1 ──
  const semaineDefaut = useMemo(() => {
    const { weekNumber, year } = getCurrentWeek();
    return calculerSemainePlusN(weekNumber, year, 1);
  }, []);

  const [inputSemaine, setInputSemaine] = useState(
    semainePlanning
      ? String(semainePlanning.semaine).padStart(2, '0')
      : String(semaineDefaut.semaine).padStart(2, '0')
  );
  const [inputAnnee, setInputAnnee] = useState(
    semainePlanning ? String(semainePlanning.annee) : String(semaineDefaut.annee)
  );
  const [semaineAppliquee, setSemaineAppliquee] = useState(semainePlanning || null);

  // ── Recherche magasin ──
  const [rechercheMagasin, setRechercheMagasin] = useState('');
  const [magasinsTrouves, setMagasinsTrouves] = useState([]);
  const [afficherResultats, setAfficherResultats] = useState(false);
  const [codePDVManuel, setCodePDVManuel] = useState('');

  // ── AS-1 ──
  const [caAS1, setCaAS1] = useState(null); // CA BVP de la semaine AS-1
  const [fichierAS1Existe, setFichierAS1Existe] = useState(null);
  const [rechercheAS1EnCours, setRechercheAS1EnCours] = useState(false);

  // ── S-4 fréquentation ──
  const [fichierFreqExiste, setFichierFreqExiste] = useState(null);
  const [semaineFreqTrouvee, setSemaineFreqTrouvee] = useState(null);
  const [rechercheFreqEnCours, setRechercheFreqEnCours] = useState(false);

  // ── Archive ──
  const [archiveTrouvee, setArchiveTrouvee] = useState(null);
  const [rechercheArchiveEnCours, setRechercheArchiveEnCours] = useState(false);

  // Overlay global : visible tant qu'une opération de chargement est en cours
  const isChargementGlobal = chargement || rechercheAS1EnCours || rechercheFreqEnCours || rechercheArchiveEnCours;

  // Message d'étape dynamique selon la phase active
  const messageChargementGlobal = useMemo(() => {
    if (etapeChargement) return etapeChargement; // message prioritaire du handleSelectMagasin
    if (rechercheAS1EnCours) return 'Recherche des données année précédente (AS-1)…';
    if (rechercheFreqEnCours) return 'Recherche de la fréquentation (S-4)…';
    if (rechercheArchiveEnCours) return 'Recherche des archives…';
    return 'Préparation…';
  }, [etapeChargement, rechercheAS1EnCours, rechercheFreqEnCours, rechercheArchiveEnCours]);

  // ── Objectif ──
  const [benchmarkPourcent, setBenchmarkPourcent] = useState(
    () => {
      const saved = localStorage.getItem('bvp_benchmark_objectif_pourcent');
      return saved ? parseFloat(saved) : null;
    }
  );
  const [modeObjectif, setModeObjectif] = useState(benchmarkPourcent ? 'benchmark' : 'ignorer');
  const [objectifManuel, setObjectifManuel] = useState('');

  // ── Calculs dérivés ──
  const semaineAS1 = useMemo(() => {
    if (!semaineAppliquee) return null;
    return { semaine: semaineAppliquee.semaine, annee: semaineAppliquee.annee - 1 };
  }, [semaineAppliquee]);

  const semaineS4 = useMemo(() => {
    if (!semaineAppliquee) return null;
    return calculerSemaineMoinsN(semaineAppliquee.semaine, semaineAppliquee.annee, 4);
  }, [semaineAppliquee]);

  const inputsModifies = useMemo(() => {
    const s = parseInt(inputSemaine, 10);
    const a = parseInt(inputAnnee, 10);
    if (!s || !a || s < 1 || s > 53) return false;
    if (!semaineAppliquee) return true;
    return s !== semaineAppliquee.semaine || a !== semaineAppliquee.annee;
  }, [inputSemaine, inputAnnee, semaineAppliquee]);

  // Objectif calculé
  const objectifCalcule = useMemo(() => {
    if (modeObjectif === 'benchmark' && caAS1 && benchmarkPourcent) {
      return Math.round(caAS1 * (1 + benchmarkPourcent / 100));
    }
    if (modeObjectif === 'manuel' && objectifManuel) {
      return parseFloat(objectifManuel);
    }
    return null;
  }, [modeObjectif, caAS1, benchmarkPourcent, objectifManuel]);

  // ═══════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════

  // Recherche magasin
  useEffect(() => {
    if (!infoPDV || rechercheMagasin.length < 2) {
      setMagasinsTrouves([]);
      setAfficherResultats(false);
      return;
    }
    const recherche = rechercheMagasin.toLowerCase();
    const resultats = Object.entries(infoPDV)
      .filter(([code, info]) => {
        const ville = (info.ville || info.VILLE || info.Ville || info.nom || info.NOM_ADHERENT || '').toLowerCase();
        return ville.includes(recherche) || String(code).includes(recherche);
      })
      .slice(0, 10)
      .map(([code, info]) => ({
        code,
        ville: info.ville || info.VILLE || info.Ville || info.nom || info.NOM_ADHERENT || 'Inconnu',
        enseigne: info.enseigne || info.ENSEIGNE || info.Enseigne || 'INTERMARCHE',
        secteur: info.secteurLibelle || info.SECTEUR || info.Secteur || '',
      }));
    setMagasinsTrouves(resultats);
    setAfficherResultats(resultats.length > 0);
  }, [rechercheMagasin, infoPDV]);

  // Sélection magasin → charger donneesMagasin (dernière semaine dispo)
  const handleSelectMagasin = async (magasin) => {
    setMagasinSelectionne(magasin);
    setRechercheMagasin(`${magasin.ville} (${magasin.code})`);
    setAfficherResultats(false);

    if (semaineSelectionnee && dirHandle) {
      // Forcer React à peindre l'overlay avant le traitement CPU-intensif
      const attendrePeinture = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 150)));

      try {
        setChargement(true);
        setErreur(null);
        setEtapeChargement('Ouverture du fichier…');
        await attendrePeinture();

        const fileHandle = await dirHandle.getFileHandle(semaineSelectionnee.fichier);
        const file = await fileHandle.getFile();

        setEtapeChargement('Extraction des données du magasin…');
        await attendrePeinture();

        const donnees = await extraireDonneesMagasin(file, magasin.code, dirHandle);
        setDonneesMagasin(donnees);

        if (fichierVentesSelectionne) {
          try {
            setEtapeChargement('Analyse de la gamme produits…');
            await attendrePeinture();

            const vcFileHandle = await dirHandle.getFileHandle(fichierVentesSelectionne.nom);
            const vcFile = await vcFileHandle.getFile();
            const donneesVC = await extraireProduitsVentesCasse(vcFile);
            setDonneesGamme(donneesVC);

            setEtapeChargement('Préparation de la gamme…');
            await attendrePeinture();

            const semApp = semaineAppliquee || semainePlanning;
            const moisP = semApp ? new Date(semApp.annee, 0, 1 + (semApp.semaine - 1) * 7).getMonth() + 1 : null;

            // Charger la BBD nationale (non bloquant)
            const bbdNationale = dirHandle ? await chargerBBDNationale(dirHandle) : null;

            // Extraire les ventes brutes (sans nettoyage)
            const produitsBruts = formaterPourPilotageCA(donneesVC, {
              semaineNumero: semApp?.semaine,
              moisPlanning: moisP,
              bbdNationale,
              skipNettoyage: true,
            });
            setProduitsVentesBrutes(produitsBruts);

            // Toujours passer les bruts. Le MagasinContext décidera :
            // archive (si trouvée) ou nettoyage (sinon).
            setProduitsGamme(produitsBruts);
          } catch { /* non bloquant */ }
        }

        setEtapeChargement('Terminé !');
      } catch {
        setErreur('Impossible de charger les données du magasin.');
      } finally {
        setChargement(false);
        setEtapeChargement('');
      }
    }
  };

  // Sélection magasin manuelle (sans info_PDV.json)
  const handleSelectMagasinManuel = async () => {
    const code = codePDVManuel.trim();
    if (!code) return;
    const magasin = { code, ville: `PDV ${code}`, enseigne: 'INTERMARCHE', secteur: '' };
    handleSelectMagasin(magasin);
  };

  // Appliquer la semaine planning
  const handleAppliquerSemaine = () => {
    const s = parseInt(inputSemaine, 10);
    const a = parseInt(inputAnnee, 10);
    if (!s || !a || s < 1 || s > 53) return;
    setSemaineAppliquee({ semaine: s, annee: a });
  };

  // Auto-appliquer la semaine par défaut au premier montage
  useEffect(() => {
    if (!semaineAppliquee && semaineDefaut) {
      setSemaineAppliquee(semaineDefaut);
    }
  }, []);

  // ═══════════════════════════════════════════════════════
  // RECHERCHE FICHIER AS-1 (CA de référence année précédente)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!dirHandle || !semaineAppliquee || !magasinSelectionne) {
      setFichierAS1Existe(null);
      setCaAS1(null);
      return;
    }
    let cancelled = false;
    setRechercheAS1EnCours(true);
    setCaAS1(null);
    setFichierAS1Existe(null);

    (async () => {
      const nomAS1 = nomFichierVenteHebdo(semaineAS1);
      try {
        const fileHandle = await dirHandle.getFileHandle(nomAS1);
        if (cancelled) return;
        const file = await fileHandle.getFile();
        // Extraire les données du magasin pour cette semaine AS-1
        const donneesAS1 = await extraireDonneesMagasin(file, magasinSelectionne.code, dirHandle);
        if (!cancelled) {
          const ca = donneesAS1?.indicateurs?.global?.pdv?.caBVP || 0;
          setCaAS1(ca);
          setFichierAS1Existe(true);
        }
      } catch {
        if (!cancelled) {
          setFichierAS1Existe(false);
          setCaAS1(null);
        }
      } finally {
        if (!cancelled) setRechercheAS1EnCours(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dirHandle, semaineAppliquee, magasinSelectionne, semaineAS1]);

  // ═══════════════════════════════════════════════════════
  // RECHERCHE FICHIER S-4 (fréquentation, cascade S-4 → S-52)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!dirHandle || !semaineAppliquee) {
      setFichierFreqExiste(null);
      setSemaineFreqTrouvee(null);
      return;
    }
    let cancelled = false;
    setRechercheFreqEnCours(true);
    setSemaineFreqTrouvee(null);
    setFichierFreqExiste(null);

    (async () => {
      for (let offset = 4; offset <= 52; offset += 4) {
        if (cancelled) return;
        const sem = calculerSemaineMoinsN(semaineAppliquee.semaine, semaineAppliquee.annee, offset);
        const nom = nomFichierVenteHebdo(sem);
        try {
          const fileHandle = await dirHandle.getFileHandle(nom);
          if (cancelled) return;
          setSemaineFreqTrouvee(sem);
          setFichierFreqExiste(true);

          const file = await fileHandle.getFile();
          const freqData = await parseFrequentationExcel(file, typePonderation);
          if (!cancelled) {
            setFrequentationData({
              poidsJours: freqData.poidsParJour,
              poidsTranchesParJour: freqData.poidsTranchesParJour,
              parJour: freqData.parJour,
              parJourDetail: freqData.parJourDetail,
              totalBvpHebdo: freqData.totalBvpHebdo,
              totalPdvHebdo: freqData.totalPdvHebdo,
              tauxPenetration: freqData.tauxPenetration,
              nombreSemaines: freqData.nombreSemaines,
              typePonderation: freqData.typePonderation,
              ponderations: freqData.ponderations,
              sourceFrequentation: freqData.sourceFrequentation,
            });
          }
          setRechercheFreqEnCours(false);
          return;
        } catch { /* continuer */ }
      }
      if (!cancelled) {
        setFichierFreqExiste(false);
        setFrequentationData(null);
        setSemaineFreqTrouvee(null);
        setRechercheFreqEnCours(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dirHandle, semaineAppliquee, typePonderation, setFrequentationData]);

  // ═══════════════════════════════════════════════════════
  // RECHERCHE ARCHIVE MANAGER — 3 étapes : Promos S(X), Gamme hautes, Gamme basses
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!dossierBVP || !semaineAppliquee || !magasinSelectionne) {
      setArchiveTrouvee(null);
      if (!dossierBVP) setNettoyageNecessaire(true);
      return;
    }
    const codePDV = magasinSelectionne.code;
    const semX = semaineAppliquee.semaine;
    const anX = semaineAppliquee.annee;
    let cancelled = false;
    setRechercheArchiveEnCours(true);
    setArchiveTrouvee(null);

    // Helper : ajuster semaine/année si débordement
    const ajusterSemAn = (sem, an) => {
      if (sem > 52) return { semaine: sem - 52, annee: an + 1 };
      if (sem <= 0) return { semaine: sem + 52, annee: an - 1 };
      return { semaine: sem, annee: an };
    };

    // Helper : tenter de charger un fichier MANAGER
    const chargerFichier = async (sem) => {
      const nom = `MANAGER-${codePDV}-S${String(sem.semaine).padStart(2, '0')}-${sem.annee}.bvp.json`;
      const fileHandle = await dossierBVP.getFileHandle(nom);
      const file = await fileHandle.getFile();
      const data = JSON.parse(await file.text());
      return { data, nom, sem };
    };

    (async () => {
      try {
        const ok = await checkHandlePermission(dossierBVP, 'read');
        if (!ok || cancelled) { setRechercheArchiveEnCours(false); return; }
      } catch { setRechercheArchiveEnCours(false); return; }

      // ── ÉTAPE A : Promos uniquement depuis S(X) ──
      try {
        if (!cancelled) {
          const { data } = await chargerFichier({ semaine: semX, annee: anX });
          if (!cancelled && data.promotions?.length > 0) {
            setPromosPrecedentes(data.promotions.map(p => ({
              plu: p.plu || '', itm8: p.itm8 || '',
              libelle: p.libelle || '',
              qteValidee: p.qteValidee || p.quantitePrevue || 0,
            })));
          } else if (!cancelled) {
            setPromosPrecedentes([]);
          }
        }
      } catch {
        // S(X) n'existe pas → pas de promos
        if (!cancelled) setPromosPrecedentes([]);
      }

      // ── ÉTAPE B : Gamme depuis les hautes S(X+10) → S(X) ──
      let gammeTrouvee = false;
      for (let offset = 10; offset >= 0; offset--) {
        if (cancelled) return;
        const sem = ajusterSemAn(semX + offset, anX);
        try {
          const { data, nom } = await chargerFichier(sem);
          if (cancelled) return;

          // Restaurer la configuration (tranches horaires, créneaux)
          if (data.configuration) {
            setJoursOuverture({
              creneaux: data.configuration.creneaux || null,
              redistribution: null,
              regroupements: data.configuration.regroupements || null,
              tranchesParFamille: data.configuration.tranchesParFamille || null,
            });
          }
          // Restaurer la gamme
          if (data.produits?.length > 0) setArchiveProduitsEnAttente(data.produits);
          setPromosActives([]);

          // planifieManager seulement si c'est la semaine exacte (offset 0 = S(X))
          const estSemaineExacte = (sem.semaine === semX && sem.annee === anX);
          if (estSemaineExacte && data.produits) {
            const planifie = {};
            data.produits.forEach(p => {
              if (p.planifieManager > 0)
                planifie[p.plu || p.itm8 || p.libelle] = p.planifieManager;
            });
            if (Object.keys(planifie).length > 0) setPlanifieManager(planifie);
          } else {
            setPlanifieManager({});
          }

          setArchiveTrouvee({ semaine: sem, estExacte: estSemaineExacte, nomFichier: nom });
          gammeTrouvee = true;
          setRechercheArchiveEnCours(false);
          return;
        } catch { /* fichier non trouvé, continuer */ }
      }

      // ── ÉTAPE C : Gamme depuis les basses S(X-1) → S(X-52) ──
      if (!gammeTrouvee) {
        for (let offset = 1; offset <= 52; offset++) {
          if (cancelled) return;
          const sem = ajusterSemAn(semX - offset, anX);
          try {
            const { data, nom } = await chargerFichier(sem);
            if (cancelled) return;

            if (data.configuration) {
              setJoursOuverture({
                creneaux: data.configuration.creneaux || null,
                redistribution: null,
                regroupements: data.configuration.regroupements || null,
                tranchesParFamille: data.configuration.tranchesParFamille || null,
              });
            }
            if (data.produits?.length > 0) setArchiveProduitsEnAttente(data.produits);
            setPromosActives([]);
            setPlanifieManager({});

            setArchiveTrouvee({ semaine: sem, estExacte: false, nomFichier: nom });
            setRechercheArchiveEnCours(false);
            return;
          } catch { /* continuer */ }
        }
      }

      // Rien trouvé nulle part → nettoyage automatique
      if (!cancelled) {
        setArchiveTrouvee(null);
        setRechercheArchiveEnCours(false);
        setNettoyageNecessaire(true);
      }
    })();
    return () => { cancelled = true; };
  }, [dossierBVP, semaineAppliquee, magasinSelectionne]);

  // ═══════════════════════════════════════════════════════
  // RECHERCHE FICHIER EQUIPE (retour personnalisations équipe)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!dossierBVP || !semaineAppliquee || !magasinSelectionne) {
      setPersonnalisationsEquipe(null);
      return;
    }
    const codePDV = magasinSelectionne.code;
    let cancelled = false;

    (async () => {
      try {
        const ok = await checkHandlePermission(dossierBVP, 'read');
        if (!ok || cancelled) return;
      } catch { return; }

      // Chercher le fichier EQUIPE pour la semaine en cours puis S-1, S-2...
      for (let offset = 0; offset <= 4; offset++) {
        if (cancelled) return;
        const sem = offset === 0
          ? semaineAppliquee
          : calculerSemaineMoinsN(semaineAppliquee.semaine, semaineAppliquee.annee, offset);
        const nomFichier = `EQUIPE-${codePDV}-S${String(sem.semaine).padStart(2, '0')}-${sem.annee}.bvp.json`;
        try {
          const fileHandle = await dossierBVP.getFileHandle(nomFichier);
          if (cancelled) return;
          const file = await fileHandle.getFile();
          const data = JSON.parse(await file.text());
          if (data.type === 'equipe' && data.personnalisations) {
            setPersonnalisationsEquipe(data.personnalisations);
          }
          return; // Fichier trouvé, on arrête
        } catch { /* fichier non trouvé, essayer la semaine suivante */ }
      }
      if (!cancelled) setPersonnalisationsEquipe(null);
    })();
    return () => { cancelled = true; };
  }, [dossierBVP, semaineAppliquee, magasinSelectionne]);

  // ── Persister semaine planning dans le contexte ──
  useEffect(() => {
    if (semaineAppliquee) {
      setSemainePlanning(semaineAppliquee);
      setSemaineFrequentation(semaineFreqTrouvee || semaineS4);
    }
  }, [semaineAppliquee, semaineS4, semaineFreqTrouvee, setSemainePlanning, setSemaineFrequentation]);

  // ── Persister l'objectif CA ──
  useEffect(() => {
    if (objectifCalcule) {
      setObjectifCA(objectifCalcule);
      if (caAS1 && caAS1 > 0) {
        setObjectifPourcent(Math.round((objectifCalcule - caAS1) / caAS1 * 100));
      }
    } else {
      setObjectifCA(null);
      setObjectifPourcent(null);
    }
  }, [objectifCalcule, caAS1, setObjectifCA, setObjectifPourcent]);

  // ═══════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Préparer la semaine</h2>
        <p className="text-mousquetaires-gris text-sm">
          Semaine du planning et magasin
        </p>
      </div>

      <>
          {/* ──── 1. SEMAINE DU PLANNING (défaut S+1) ──── */}
          {dirHandle && (
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-mousquetaires-bordeaux" />
                <h3 className="font-bold text-gray-800">1. Semaine du planning</h3>
              </div>

              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Semaine</label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm">S</span>
                    <input
                      type="number" min="1" max="53"
                      value={inputSemaine}
                      onChange={(e) => setInputSemaine(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none text-center font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
                  <input
                    type="number" min="2024" max="2030"
                    value={inputAnnee}
                    onChange={(e) => setInputAnnee(e.target.value)}
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none text-center font-mono"
                  />
                </div>
                <button
                  onClick={handleAppliquerSemaine}
                  disabled={!inputsModifies}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1 ${
                    inputsModifies ? 'bg-[#8B1538] text-white hover:bg-[#6d1029]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" /> Appliquer
                </button>
              </div>

              {/* Dates : Planning + AS-1 + S-4 */}
              {semaineAppliquee && (
                <div className="grid md:grid-cols-3 gap-3">
                  <AffichageDatesSemaine
                    label="Planning"
                    semaine={semaineAppliquee.semaine}
                    annee={semaineAppliquee.annee}
                    couleur="blue"
                  />
                  <AffichageDatesSemaine
                    label="Réf. CA (AS-1)"
                    semaine={semaineAS1?.semaine}
                    annee={semaineAS1?.annee}
                    couleur="purple"
                    extra={
                      rechercheAS1EnCours ? (
                        <div className="flex items-center gap-1 text-xs text-purple-500 mt-1">
                          <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          Recherche…
                        </div>
                      ) : fichierAS1Existe === true && caAS1 !== null ? (
                        <div className="text-xs font-bold text-purple-700 mt-1">
                          CA BVP : {caAS1.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                        </div>
                      ) : fichierAS1Existe === false ? (
                        <div className="text-xs text-red-500 mt-1">Fichier non trouvé</div>
                      ) : null
                    }
                  />
                  <AffichageDatesSemaine
                    label="Fréquentation (S-4)"
                    semaine={semaineFreqTrouvee?.semaine || semaineS4?.semaine}
                    annee={semaineFreqTrouvee?.annee || semaineS4?.annee}
                    couleur={semaineFreqTrouvee ? 'green' : 'amber'}
                    extra={
                      rechercheFreqEnCours ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Recherche…
                        </div>
                      ) : fichierFreqExiste === true ? (
                        <div className="text-xs text-green-600 mt-1">Fichier trouvé</div>
                      ) : fichierFreqExiste === false ? (
                        <div className="text-xs text-red-500 mt-1">Non trouvé (S-4 à S-52)</div>
                      ) : null
                    }
                  />
                </div>
              )}

              {/* Pondération */}
              {fichierFreqExiste === true && !rechercheFreqEnCours && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-[#8B1538]" /> Pondération
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'standard', label: 'Standard', desc: 'S-1: 40% | AS-1: 30% | S-2: 30%' },
                      { id: 'saisonnier', label: 'Saisonnier', desc: 'S-1: 30% | AS-1: 50% | S-2: 20%' },
                      { id: 'fortePromo', label: 'Forte Promo', desc: 'S-1: 60% | AS-1: 20% | S-2: 20%' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setTypePonderation(mode.id)}
                        className={`px-4 py-2 rounded-lg transition-all font-semibold text-sm text-left ${
                          typePonderation === mode.id
                            ? 'bg-[#8B1538] text-white border-2 border-[#8B1538]'
                            : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-[#8B1538]'
                        }`}
                      >
                        {mode.label}
                        <span className={`text-xs block mt-0.5 font-normal ${typePonderation === mode.id ? 'text-red-200' : 'text-gray-400'}`}>
                          {mode.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──── 2. MAGASIN ──── */}
          {dirHandle && (
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center gap-3 mb-3">
                <Store className="w-5 h-5 text-mousquetaires-bordeaux" />
                <h3 className="font-bold text-gray-800">2. Magasin</h3>
              </div>

              {infoPDV ? (
                /* Recherche par ville/code (info_PDV.json disponible) */
                <div className="relative">
                  <p className="text-sm text-gray-500 mb-2">Recherchez par code ou nom de ville</p>
                  <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={rechercheMagasin}
                    onChange={(e) => setRechercheMagasin(e.target.value)}
                    onFocus={() => setAfficherResultats(magasinsTrouves.length > 0)}
                    placeholder="Ex: 07499 ou Bordeaux..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent text-sm"
                  />
                  {afficherResultats && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {magasinsTrouves.map((mag) => (
                        <button
                          key={mag.code}
                          onClick={() => handleSelectMagasin(mag)}
                          className="w-full px-3 py-2.5 text-left hover:bg-mousquetaires-beige transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0"
                        >
                          <Store className="w-4 h-4 text-mousquetaires-gris flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm">
                              {mag.ville} <span className="text-mousquetaires-gris">({mag.code})</span>
                            </p>
                            <p className="text-xs text-mousquetaires-gris truncate">{mag.enseigne} • {mag.secteur}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              ) : (
                /* Saisie manuelle du code PDV (pas d'info_PDV.json) */
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Saisissez votre code point de vente (ex : 07499)
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={codePDVManuel}
                        onChange={(e) => setCodePDVManuel(e.target.value.replace(/\D/g, '').slice(0, 5))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectMagasinManuel()}
                        placeholder="Code PDV (5 chiffres)"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-mousquetaires-rouge focus:border-transparent text-sm font-mono"
                        maxLength={5}
                      />
                    </div>
                    <button
                      onClick={handleSelectMagasinManuel}
                      disabled={codePDVManuel.trim().length < 4 || chargement}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-1 ${
                        codePDVManuel.trim().length >= 4 && !chargement
                          ? 'bg-mousquetaires-rouge text-white hover:bg-mousquetaires-bordeaux'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Valider
                    </button>
                  </div>
                </div>
              )}

              {/* Chargement inline (petit indicateur en complément de l'overlay) */}
              {chargement && magasinSelectionne && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  <p className="font-medium text-amber-800 text-sm">{etapeChargement || 'Chargement des données…'}</p>
                </div>
              )}
              {!chargement && magasinSelectionne && donneesMagasin && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="font-medium text-green-800 text-sm">
                      {donneesMagasin.magasin.nom} ({donneesMagasin.magasin.code})
                      <span className="text-green-500 ml-2 text-xs">{donneesMagasin.comparaison.nombreMagasinsComparables} comparables</span>
                    </p>
                  </div>
                </div>
              )}
              {!chargement && magasinSelectionne && !donneesMagasin && erreur && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 text-sm">{erreur}</p>
                </div>
              )}
            </div>
          )}

          {/* ──── 3. OBJECTIF CA ──── */}
          {importComplet && semaineAppliquee && (
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#8B1538]" />
                Objectif CA
                <span className="text-xs text-gray-400 font-normal">(optionnel)</span>
              </h3>

              {/* Résumé CA AS-1 */}
              {caAS1 !== null && caAS1 > 0 && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="text-purple-700">CA AS-1 (S{String(semaineAS1?.semaine).padStart(2, '0')}/{semaineAS1?.annee}) :</span>
                    <span className="font-bold text-purple-900 ml-2">
                      {caAS1.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {/* Option benchmark */}
                {caAS1 > 0 && (
                  <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    modeObjectif === 'benchmark' ? 'border-mousquetaires-rouge bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="obj" value="benchmark" checked={modeObjectif === 'benchmark'} onChange={() => setModeObjectif('benchmark')} className="w-4 h-4 mt-1 text-mousquetaires-rouge" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">Appliquer un % sur AS-1</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">+</span>
                        <input
                          type="number"
                          value={benchmarkPourcent || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setBenchmarkPourcent(isNaN(v) ? null : v);
                            if (!isNaN(v)) localStorage.setItem('bvp_benchmark_objectif_pourcent', String(v));
                          }}
                          placeholder="45"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                        />
                        <span className="text-sm text-gray-600">%</span>
                        {benchmarkPourcent && caAS1 > 0 && (
                          <span className="text-sm font-bold text-mousquetaires-bordeaux ml-2">
                            = {Math.round(caAS1 * (1 + benchmarkPourcent / 100)).toLocaleString('fr-FR')} €
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                )}

                {/* Option manuelle */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  modeObjectif === 'manuel' ? 'border-mousquetaires-rouge bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="obj" value="manuel" checked={modeObjectif === 'manuel'} onChange={() => setModeObjectif('manuel')} className="w-4 h-4 mt-1 text-mousquetaires-rouge" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">Objectif libre</p>
                    {modeObjectif === 'manuel' && (
                      <div className="flex items-center gap-2 mt-1">
                        <input type="number" value={objectifManuel} onChange={(e) => setObjectifManuel(e.target.value)} placeholder="5000" className="w-28 px-2 py-1 border border-gray-300 rounded text-sm" />
                        <span className="text-sm text-gray-600">€ / sem</span>
                      </div>
                    )}
                  </div>
                  <Edit3 className={`w-4 h-4 mt-1 ${modeObjectif === 'manuel' ? 'text-mousquetaires-rouge' : 'text-gray-300'}`} />
                </label>

                {/* Pas d'objectif */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  modeObjectif === 'ignorer' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="obj" value="ignorer" checked={modeObjectif === 'ignorer'} onChange={() => setModeObjectif('ignorer')} className="w-4 h-4 text-gray-500" />
                  <p className="font-semibold text-gray-600 text-sm">Pas d'objectif</p>
                  <X className={`w-4 h-4 ml-auto ${modeObjectif === 'ignorer' ? 'text-gray-500' : 'text-gray-300'}`} />
                </label>
              </div>
            </div>
          )}

          {/* Erreur */}
          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm">{erreur}</p>
            </div>
          )}

          {/* Overlay plein écran de chargement — couvre TOUTES les phases */}
          {isChargementGlobal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-mousquetaires-rouge animate-spin" />
                    <Database className="w-5 h-5 text-mousquetaires-rouge absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Chargement en cours</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {messageChargementGlobal}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-mousquetaires-rouge h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Merci de patienter, ne fermez pas la page
                </p>
              </div>
            </div>
          )}
        </>
    </div>
  );
};

export default EtapeConfigPlanning;
