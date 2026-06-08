/**
 * Module Benchmark Mensuel — Wizard multi-niveaux.
 *
 * Niveau 1 : National
 * Niveau 2 : Région
 * Niveau 3 : Secteur (wrapper autour de SectorManagerDashboard existant)
 * Niveau 4 : Magasin (wrapper autour des Bloc4/5/6 du diagnostic manager)
 *
 * PHASE 1 (avril 2026) : squelette + navigation + grilles 9 KPIs.
 * Phase 2 ajoutera les KPI DEC, Phase 3 les filtres Vocation/Modèle.
 *
 * ARCHITECTURE ISOLÉE : tout le code du module est dans ce dossier
 * (`components/benchmark-mensuel/`). Seules dépendances externes autorisées :
 *   - `secteur/SectorManagerDashboard` (niveau 3, inchangé)
 *   - `manager/diagnostic/{GraphiqueFrequentation,TopFlopProduits}` (niveau 4, lecture seule)
 *   - Services : `benchmarkMultiNiveauService`, `sectorManagerService`, `dataExtractionService`
 *
 * Le module consomme une abstraction `DataSource` (cf. benchmarkMultiNiveauService)
 * au lieu de manipuler directement `dirHandle`. Ça prépare une éventuelle
 * extraction autonome future du module (upload direct, API, etc.).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { MagasinProvider, useMagasin } from '../../contexts/MagasinContext';
import {
  chargerInfoPDV,
  extraireListeMagasins,
  listerMoisDisponibles,
  listerSemainesDisponibles,
  extraireDonneesMagasinMensuel,
} from '../../services/dataExtractionService';
import { chargerDonneesSecteur } from '../../services/sectorManagerService';
import {
  createLocalDirDataSource,
  chargerDonneesNational,
  chargerDonneesRegion,
} from '../../services/benchmarkMultiNiveauService';

import BarreConfig from './BarreConfig';
import VueNational from './VueNational';
import VueRegion from './VueRegion';
import VueSecteurWrapper from './VueSecteurWrapper';
import VueMagasinWrapper from './VueMagasinWrapper';

// ============================================================================
// Breadcrumb
// ============================================================================

function Breadcrumb({ niveau, region, secteur, magasin, onNaviguer }) {
  const segments = [{ label: 'National', niveau: 'national' }];
  if (region) segments.push({ label: region.libelle, niveau: 'region' });
  if (secteur) segments.push({ label: secteur.libelle, niveau: 'secteur' });
  if (magasin) segments.push({ label: magasin.nom || magasin.ville || `PDV ${magasin.code}`, niveau: 'magasin' });

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      {segments.map((seg, i) => {
        const actif = seg.niveau === niveau;
        return (
          <React.Fragment key={seg.niveau}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />}
            <button
              onClick={() => !actif && onNaviguer(seg.niveau)}
              disabled={actif}
              className={`px-2 py-1 rounded transition-colors ${
                actif
                  ? 'font-bold text-white cursor-default'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {seg.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Contenu principal (dans le MagasinProvider)
// ============================================================================

function BenchmarkMensuelContent({ onRetourAccueil }) {
  const {
    dirHandle,
    infoPDV,
    setInfoPDV,
    erreur,
    setErreur,
    setFichiersDetectes,
    setSemainesDisponibles,
  } = useMagasin();

  // Config persistante
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [moisSelectionne, setMoisSelectionne] = useState(null);
  const [baseMesure, setBaseMesure] = useState('mois');

  // Navigation 4 niveaux
  const [niveau, setNiveau] = useState('national');
  const [regionSelectionnee, setRegionSelectionnee] = useState(null);
  const [secteurSelectionne, setSecteurSelectionne] = useState(null);
  const [magasinSelectionne, setMagasinSelectionne] = useState(null);

  // Données de chaque niveau
  const [donneesNational, setDonneesNational] = useState(null);
  const [donneesRegion, setDonneesRegion] = useState(null);
  const [donneesSecteur, setDonneesSecteur] = useState(null);
  const [donneesMagasin, setDonneesMagasin] = useState(null);

  // États de chargement par niveau
  const [chargementNational, setChargementNational] = useState(false);
  const [chargementRegion, setChargementRegion] = useState(false);
  const [chargementSecteur, setChargementSecteur] = useState(false);
  const [chargementMagasin, setChargementMagasin] = useState(false);
  const [scanInitialTermine, setScanInitialTermine] = useState(false);

  // DataSource (Phase 1 : implémentation locale)
  const dataSource = useMemo(() => dirHandle ? createLocalDirDataSource(dirHandle) : null, [dirHandle]);

  // ============================================================================
  // Scan initial du dossier : liste des mois + info_PDV
  // ============================================================================
  useEffect(() => {
    if (!dirHandle || scanInitialTermine) return;
    let annule = false;

    (async () => {
      setErreur(null);
      try {
        // Lister les mois mensuels disponibles
        const mois = await listerMoisDisponibles(dirHandle);
        if (annule) return;
        setMoisDisponibles(mois);
        if (mois.length > 0) setMoisSelectionne(mois[0]);

        // Hebdo (pour compat MagasinContext)
        const semaines = await listerSemainesDisponibles(dirHandle);
        setSemainesDisponibles(semaines);

        // Fichiers détectés (pour compat)
        const fichiers = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            fichiers.push({ nom: entry.name, type: entry.name.endsWith('.json') ? 'json' : 'excel', statut: 'ok' });
          }
        }
        setFichiersDetectes(fichiers);

        // Info PDV
        let info = await chargerInfoPDV(dirHandle);
        if (!info && semaines.length > 0) {
          try {
            const fh = await dirHandle.getFileHandle(semaines[0].fichier);
            const fichierExcel = await fh.getFile();
            info = await extraireListeMagasins(fichierExcel);
          } catch { /* non bloquant */ }
        }
        if (info && !annule) setInfoPDV(info);
      } catch {
        if (!annule) setErreur('Impossible de lire le dossier DATA_perso.');
      } finally {
        if (!annule) setScanInitialTermine(true);
      }
    })();

    return () => { annule = true; };
  }, [dirHandle]);

  // ============================================================================
  // Chargement National quand mois + infoPDV disponibles
  // ============================================================================
  useEffect(() => {
    if (!dataSource || !infoPDV || !moisSelectionne) return;
    let annule = false;

    (async () => {
      setChargementNational(true);
      setErreur(null);
      try {
        const data = await chargerDonneesNational({
          dataSource,
          fichier: moisSelectionne.fichier,
          infoPDV,
          filtres: {}, // Phase 3 : vocation/modèle
        });
        if (!annule) setDonneesNational(data);
      } catch (err) {
        if (!annule) setErreur(`Erreur niveau National : ${err.message}`);
      } finally {
        if (!annule) setChargementNational(false);
      }
    })();

    return () => { annule = true; };
  }, [dataSource, infoPDV, moisSelectionne]);

  // Invalider les niveaux inférieurs quand le mois change
  useEffect(() => {
    setDonneesRegion(null);
    setDonneesSecteur(null);
    setDonneesMagasin(null);
  }, [moisSelectionne]);

  // ============================================================================
  // Navigation Région
  // ============================================================================
  const selectionnerRegion = useCallback(async (region) => {
    if (!dataSource || !infoPDV || !moisSelectionne) return;
    setRegionSelectionnee(region);
    setSecteurSelectionne(null);
    setMagasinSelectionne(null);
    setDonneesSecteur(null);
    setDonneesMagasin(null);
    setNiveau('region');
    setChargementRegion(true);
    setErreur(null);
    try {
      const data = await chargerDonneesRegion({
        dataSource,
        fichier: moisSelectionne.fichier,
        infoPDV,
        regionCode: region.code,
        filtres: {},
      });
      setDonneesRegion(data);
    } catch (err) {
      setErreur(`Erreur niveau Région : ${err.message}`);
    } finally {
      setChargementRegion(false);
    }
  }, [dataSource, infoPDV, moisSelectionne]);

  // ============================================================================
  // Navigation Secteur
  // ============================================================================
  const selectionnerSecteur = useCallback(async (secteur) => {
    if (!dirHandle || !infoPDV || !moisSelectionne) return;
    setSecteurSelectionne(secteur);
    setMagasinSelectionne(null);
    setDonneesMagasin(null);
    setNiveau('secteur');
    setChargementSecteur(true);
    setErreur(null);
    try {
      const fh = await dirHandle.getFileHandle(moisSelectionne.fichier);
      const fichierExcel = await fh.getFile();
      const data = await chargerDonneesSecteur({
        fichierExcel,
        infoPDV,
        secteurCode: secteur.code,
        secteurLibelle: secteur.libelle,
        typePeriode: 'mois',
      });
      setDonneesSecteur(data);
    } catch (err) {
      setErreur(`Erreur niveau Secteur : ${err.message}`);
    } finally {
      setChargementSecteur(false);
    }
  }, [dirHandle, infoPDV, moisSelectionne]);

  // ============================================================================
  // Navigation Magasin (drill-down PDV depuis le Secteur)
  // ============================================================================
  const selectionnerMagasin = useCallback(async (codePdv) => {
    if (!dirHandle || !moisSelectionne) return;
    setChargementMagasin(true);
    setErreur(null);
    try {
      const fh = await dirHandle.getFileHandle(moisSelectionne.fichier);
      const fichierExcel = await fh.getFile();
      const data = await extraireDonneesMagasinMensuel(fichierExcel, codePdv, dirHandle);
      setDonneesMagasin(data);
      setMagasinSelectionne(data?.magasin || { code: codePdv });
      setNiveau('magasin');
    } catch (err) {
      setErreur(`Erreur niveau Magasin : ${err.message}`);
    } finally {
      setChargementMagasin(false);
    }
  }, [dirHandle, moisSelectionne]);

  // ============================================================================
  // Navigation via breadcrumb
  // ============================================================================
  const naviguerVersNiveau = useCallback((cible) => {
    if (cible === 'national') {
      setNiveau('national');
      setRegionSelectionnee(null);
      setSecteurSelectionne(null);
      setMagasinSelectionne(null);
      setDonneesRegion(null);
      setDonneesSecteur(null);
      setDonneesMagasin(null);
    } else if (cible === 'region') {
      setNiveau('region');
      setSecteurSelectionne(null);
      setMagasinSelectionne(null);
      setDonneesSecteur(null);
      setDonneesMagasin(null);
    } else if (cible === 'secteur') {
      setNiveau('secteur');
      setMagasinSelectionne(null);
      setDonneesMagasin(null);
    }
  }, []);

  // ============================================================================
  // Rendu
  // ============================================================================
  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* Header indigo avec breadcrumb */}
      <div className="sticky top-0 z-50 bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onRetourAccueil}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              title="Retour à l'accueil"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/30 flex-shrink-0"></div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Piloter le secteur</h1>
              <Breadcrumb
                niveau={niveau}
                region={regionSelectionnee}
                secteur={secteurSelectionne}
                magasin={magasinSelectionne}
                onNaviguer={naviguerVersNiveau}
              />
            </div>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold flex-shrink-0">
            Benchmark Mensuel · Phase 1
          </span>
        </div>
      </div>

      {/* Barre de config */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <BarreConfig
            moisDisponibles={moisDisponibles}
            moisSelectionne={moisSelectionne}
            onChangeMois={setMoisSelectionne}
            baseMesure={baseMesure}
            onChangeBaseMesure={setBaseMesure}
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Erreur globale */}
          {erreur && (
            <div className="mb-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700">{erreur}</span>
            </div>
          )}

          {/* État initial : scan en cours ou pas encore de mois */}
          {!scanInitialTermine && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="ml-3 text-gray-600">Scan du dossier DATA_perso…</span>
            </div>
          )}

          {scanInitialTermine && moisDisponibles.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p>Aucun fichier mensuel détecté dans le dossier.</p>
              <p className="text-sm mt-1">Placez des fichiers Vente_Mensuelle_BVP_Mxx-20xx.xlsx dans DATA_perso.</p>
            </div>
          )}

          {/* Niveau National */}
          {scanInitialTermine && moisSelectionne && niveau === 'national' && (
            <VueNational
              donnees={donneesNational}
              chargement={chargementNational}
              onSelectionnerRegion={selectionnerRegion}
            />
          )}

          {/* Niveau Région */}
          {niveau === 'region' && (
            <VueRegion
              donnees={donneesRegion}
              chargement={chargementRegion}
              onSelectionnerSecteur={selectionnerSecteur}
            />
          )}

          {/* Niveau Secteur (wrapper SectorManagerDashboard) */}
          {niveau === 'secteur' && (
            <VueSecteurWrapper
              donnees={donneesSecteur}
              chargement={chargementSecteur}
              chargementPdv={chargementMagasin}
              onSelectionnerPdv={selectionnerMagasin}
              onRetour={() => naviguerVersNiveau('region')}
            />
          )}

          {/* Niveau Magasin (wrapper Bloc4/5/6) */}
          {niveau === 'magasin' && (
            <VueMagasinWrapper
              donnees={donneesMagasin}
              chargement={chargementMagasin}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Composant exporté avec MagasinProvider
// ============================================================================
export default function BenchmarkMensuelWizard({ onRetourAccueil }) {
  return (
    <MagasinProvider>
      <BenchmarkMensuelContent onRetourAccueil={onRetourAccueil} />
    </MagasinProvider>
  );
}
