/**
 * SectorManagerWizard
 *
 * Wizard dédié au responsable secteur :
 * Étape 0 : Scan dossier DATA_perso + sélection période (hebdo/mensuel)
 * Étape 1 : Sélection secteur → Dashboard secteur
 * Étape 2 : Drill-down benchmark PDV (DashboardBenchmark existant)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Home,
  Upload,
  Users,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  CalendarDays,
  Calendar,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { MagasinProvider, useMagasin } from '../../contexts/MagasinContext';
import {
  listerSemainesDisponibles,
  chargerInfoPDV,
  extraireListeMagasins,
  listerMoisDisponibles,
  extraireDonneesMagasin,
  extraireDonneesMagasinMensuel,
} from '../../services/dataExtractionService';
import { listerSecteurs, chargerDonneesSecteur } from '../../services/sectorManagerService';
import SectorManagerDashboard from './SectorManagerDashboard';
import { Bloc4Penetration, Bloc5FluxClient } from '../manager/diagnostic/GraphiqueFrequentation';
import { Bloc6Potentiel } from '../manager/diagnostic/TopFlopProduits';
import {
  Store,
  TrendingUp,
  ShoppingCart,
  Ticket,
} from 'lucide-react';

// ============================================================================
// Composant interne
// ============================================================================
const SectorManagerContent = ({ onRetourAccueil }) => {
  const {
    dirHandle,
    semainesDisponibles,
    setSemainesDisponibles,
    fichiersDetectes,
    setFichiersDetectes,
    infoPDV,
    setInfoPDV,
    chargement,
    setChargement,
    erreur,
    setErreur,
    setDirHandle,
  } = useMagasin();

  // État local
  const [etape, setEtape] = useState(0); // 0=import, 1=dashboard secteur, 2=drill-down PDV
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [typePeriode, setTypePeriode] = useState('mois'); // 'mois' par défaut
  const [semaineSelectionnee, setSemaineSelectionnee] = useState(null);
  const [moisSelectionnee, setMoisSelectionnee] = useState(null);

  // État secteur
  const [secteurSelectionne, setSecteurSelectionne] = useState(null);
  const [donneesSecteur, setDonneesSecteur] = useState(null);
  const [chargementSecteur, setChargementSecteur] = useState(false);

  // État drill-down PDV
  const [donneesPdvDetail, setDonneesPdvDetail] = useState(null);
  const [chargementPdv, setChargementPdv] = useState(false);

  // Recherche secteur
  const [rechercheSecteur, setRechercheSecteur] = useState('');

  const contentRef = useRef(null);

  // Liste des secteurs
  const secteurs = useMemo(() => listerSecteurs(infoPDV), [infoPDV]);

  // Scroll vers le haut au changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etape]);

  // Scanner le dossier DATA_perso
  const scannerDossier = useCallback(async (handle) => {
    const fichiers = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const isVenteHebdo = entry.name.startsWith('Vente_Hebdo_BVP_S');
        const isVenteMensuelle = entry.name.startsWith('Vente_Mensuelle_BVP_M');
        const isInfoPDV = entry.name === 'info_PDV.json';

        if (isVenteHebdo || isVenteMensuelle || isInfoPDV) {
          fichiers.push({
            nom: entry.name,
            type: entry.name.endsWith('.json') ? 'json' : 'excel',
            statut: 'ok',
            description: isVenteHebdo ? 'Ventes hebdomadaires'
              : isVenteMensuelle ? 'Ventes mensuelles'
              : 'Référence magasins',
          });
        }
      }
    }
    setFichiersDetectes(fichiers);

    // Semaines
    const semaines = await listerSemainesDisponibles(handle);
    setSemainesDisponibles(semaines);
    if (semaines.length > 0) setSemaineSelectionnee(semaines[0]);

    // Mois
    const mois = await listerMoisDisponibles(handle);
    setMoisDisponibles(mois);
    if (mois.length > 0) setMoisSelectionnee(mois[0]);

    // Info PDV
    let info = await chargerInfoPDV(handle);
    if (!info && semaines.length > 0) {
      try {
        const fh = await handle.getFileHandle(semaines[0].fichier);
        const fichierExcel = await fh.getFile();
        info = await extraireListeMagasins(fichierExcel);
      } catch { /* non bloquant */ }
    }
    if (info) setInfoPDV(info);
  }, [setFichiersDetectes, setSemainesDisponibles, setInfoPDV]);

  // Auto-scan au montage (dirHandle pré-chargé par PageParametres)
  useEffect(() => {
    if (dirHandle && semainesDisponibles.length === 0 && fichiersDetectes.length === 0 && !chargement) {
      setChargement(true);
      setErreur(null);
      scannerDossier(dirHandle)
        .catch(() => setErreur('Impossible de lire le dossier.'))
        .finally(() => setChargement(false));
    }
  }, [dirHandle]);

  // Charger les données du secteur sélectionné
  const chargerSecteur = useCallback(async (secteur) => {
    if (!dirHandle || !infoPDV) return;

    setChargementSecteur(true);
    setErreur(null);

    try {
      const periode = typePeriode === 'mois' ? moisSelectionnee : semaineSelectionnee;
      if (!periode) throw new Error('Aucune période sélectionnée');

      const fh = await dirHandle.getFileHandle(periode.fichier);
      const fichierExcel = await fh.getFile();

      const result = await chargerDonneesSecteur({
        fichierExcel,
        infoPDV,
        secteurCode: secteur.code,
        secteurLibelle: secteur.libelle,
        typePeriode,
      });

      setDonneesSecteur(result);
      setSecteurSelectionne(secteur);
      setEtape(1);
    } catch (err) {
      setErreur(`Erreur chargement secteur : ${err.message}`);
    } finally {
      setChargementSecteur(false);
    }
  }, [dirHandle, infoPDV, typePeriode, moisSelectionnee, semaineSelectionnee]);

  // Drill-down : charger le benchmark d'un PDV
  const chargerBenchmarkPdv = useCallback(async (codePdv) => {
    if (!dirHandle) return;

    setChargementPdv(true);
    setErreur(null);

    try {
      const periode = typePeriode === 'mois' ? moisSelectionnee : semaineSelectionnee;
      const fh = await dirHandle.getFileHandle(periode.fichier);
      const fichierExcel = await fh.getFile();

      let result;
      if (typePeriode === 'mois') {
        result = await extraireDonneesMagasinMensuel(fichierExcel, codePdv, dirHandle);
      } else {
        result = await extraireDonneesMagasin(fichierExcel, codePdv, dirHandle);
      }

      setDonneesPdvDetail(result);
      setEtape(2);
    } catch (err) {
      setErreur(`Erreur chargement PDV ${codePdv} : ${err.message}`);
    } finally {
      setChargementPdv(false);
    }
  }, [dirHandle, typePeriode, moisSelectionnee, semaineSelectionnee]);

  // Retour au dashboard secteur depuis le drill-down
  const retourDashboardSecteur = useCallback(() => {
    setDonneesPdvDetail(null);
    setEtape(1);
  }, []);

  // La période a-t-elle des données ?
  const periodeDisponible = typePeriode === 'mois'
    ? moisDisponibles.length > 0
    : semainesDisponibles.length > 0;

  // Rendu Étape 0 : Import
  const renderImport = () => (
    <div className="space-y-6">
      {/* Status chargement */}
      {chargement && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-sm text-indigo-700">Scan du dossier en cours...</span>
        </div>
      )}

      {/* Dossier chargé */}
      {dirHandle && !chargement && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">Dossier DATA_perso chargé</span>
        </div>
      )}

      {/* Erreur */}
      {erreur && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{erreur}</span>
        </div>
      )}

      {/* Toggle Mensuel / Hebdo */}
      {moisDisponibles.length > 0 && semainesDisponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type de période</label>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTypePeriode('mois')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                typePeriode === 'mois'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Mensuel ({moisDisponibles.length})
            </button>
            <button
              onClick={() => setTypePeriode('semaine')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                typePeriode === 'semaine'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" /> Hebdo ({semainesDisponibles.length})
            </button>
          </div>
        </div>
      )}

      {/* Sélecteur de période */}
      {typePeriode === 'mois' && moisDisponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
          <select
            value={moisSelectionnee?.code || ''}
            onChange={e => {
              const m = moisDisponibles.find(m => m.code === e.target.value);
              setMoisSelectionnee(m);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {moisDisponibles.map(m => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {typePeriode === 'semaine' && semainesDisponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Semaine</label>
          <select
            value={semaineSelectionnee?.code || ''}
            onChange={e => {
              const s = semainesDisponibles.find(s => s.code === e.target.value);
              setSemaineSelectionnee(s);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {semainesDisponibles.map(s => (
              <option key={s.code} value={s.code}>{s.label || `S${s.semaine} - ${s.annee}`}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sélection secteur */}
      {infoPDV && secteurs.length > 0 && periodeDisponible && (() => {
        const secteursFiltres = secteurs.filter(s =>
          !rechercheSecteur ||
          s.libelle.toLowerCase().includes(rechercheSecteur.toLowerCase()) ||
          String(s.code).includes(rechercheSecteur)
        );
        return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un secteur ({secteurs.length} disponibles)
          </label>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un secteur par nom ou code..."
              value={rechercheSecteur}
              onChange={e => setRechercheSecteur(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            />
          </div>
          <div className="grid gap-2 max-h-96 overflow-y-auto pr-2">
            {secteursFiltres.map(s => (
              <button
                key={s.code}
                onClick={() => chargerSecteur(s)}
                disabled={chargementSecteur}
                className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.libelle}</p>
                    <p className="text-xs text-gray-500">Code {s.code} — {s.count} PDV</p>
                  </div>
                </div>
                {chargementSecteur ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>
        );
      })()}

      {/* Message si pas de données */}
      {!chargement && dirHandle && !periodeDisponible && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun fichier de ventes détecté dans le dossier.</p>
          <p className="text-sm mt-1">Vérifiez que le dossier contient des fichiers Vente_Hebdo_BVP_S*.xlsx ou Vente_Mensuelle_BVP_M*.xlsx</p>
        </div>
      )}
    </div>
  );

  // ===== RENDU PRINCIPAL =====
  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* Header indigo */}
      <div className="sticky top-0 z-50">
        <div className="bg-indigo-700 text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={etape === 2 ? retourDashboardSecteur : etape === 1 ? () => setEtape(0) : onRetourAccueil}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={etape > 0 ? 'Retour' : 'Retour à l\'accueil'}
              >
                {etape > 0 ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
              </button>
              <div className="h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="text-xl font-bold">
                  {etape === 2 ? 'Benchmark PDV' : 'Piloter le secteur'}
                </h1>
                <p className="text-sm text-white/70">
                  {etape === 0 && 'Sélection du secteur'}
                  {etape === 1 && (secteurSelectionne?.libelle || 'Dashboard secteur')}
                  {etape === 2 && (donneesPdvDetail?.magasin?.ville || 'Détail PDV')}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Secteur</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div ref={contentRef} className="flex-1 overflow-auto pb-8">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {etape === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {renderImport()}
            </div>
          )}

          {etape === 1 && donneesSecteur && (
            <SectorManagerDashboard
              donnees={donneesSecteur}
              typePeriode={typePeriode}
              onClickPdv={chargerBenchmarkPdv}
              chargementPdv={chargementPdv}
              onRetour={() => setEtape(0)}
            />
          )}

          {etape === 2 && donneesPdvDetail && (() => {
            const { magasin, indicateurs, metadata } = donneesPdvDetail;
            const pdv = indicateurs.global.pdv;
            const tp = metadata?.typePeriode || 'semaine';
            const mult = tp === 'mois' ? 12 : 52;
            const pLabel = tp === 'mois' ? 'mois' : 'semaine';

            // Calculer meilleurePenetration (même logique que Etape1Diagnostic)
            const parTranche = indicateurs.parTrancheHoraire || {};
            const totalTk = Object.values(parTranche).reduce((s, d) => s + (d.ticketsTotal || 0), 0);
            const seuil = totalTk * 0.10;
            let meilPen = 0;
            Object.values(parTranche).forEach(d => {
              if ((d.ticketsTotal || 0) >= seuil && (d.penetration || 0) > meilPen) meilPen = d.penetration;
            });

            return (
              <div className="space-y-6">
                {/* En-tête magasin — style Bloc1 */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-[#8B1538] text-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                          <Store className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {String(magasin.code).padStart(5, '0')} - {magasin.nom || magasin.ville}
                          </div>
                          <div className="text-white/80 flex items-center gap-2 mt-1">
                            <span>{magasin.enseigne}</span>
                            {magasin.surface && <span>• {magasin.surface.toLocaleString('fr-FR')} m²</span>}
                            {magasin.modele && <span className="px-2 py-0.5 bg-white/20 rounded text-sm">{magasin.modele}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
                          <div className="text-xs text-white/70">Tickets PDV</div>
                          <div className="text-2xl font-bold">{pdv.ticketsTotal.toLocaleString('fr-FR')}</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
                          <div className="text-xs text-white/70">Tickets BVP</div>
                          <div className="text-2xl font-bold">{pdv.ticketsBVP.toLocaleString('fr-FR')}</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
                          <div className="text-xs text-white/70">Ticket Moyen</div>
                          <div className="text-2xl font-bold">{pdv.ticketMoyen.toFixed(2)} €</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-white/20 rounded-lg min-w-[100px]">
                          <div className="text-xs text-white/70">CA BVP</div>
                          <div className="text-2xl font-bold">{pdv.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloc 6 : Potentiel total */}
                <Bloc6Potentiel
                  indicateurs={indicateurs}
                  panierMoyen={pdv.ticketMoyen || 0}
                  caBVPActuel={pdv.caBVP || 0}
                  multiplier={mult}
                  periodLabel={pLabel}
                />

                {/* Bloc 4 : Barres de pénétration par tranche horaire */}
                <Bloc4Penetration indicateurs={indicateurs} />

                {/* Bloc 5 : Analyse Flux Client (double barres 🥐/🏪 + RÉFÉRENCE/PRIORITÉ) */}
                <Bloc5FluxClient
                  indicateurs={indicateurs}
                  panierMoyen={pdv.ticketMoyen || 0}
                  meilleurePenetration={meilPen}
                />

                {/* Métadonnées */}
                <div className="text-center text-sm text-gray-400">
                  Données extraites en {metadata?.tempsExtraction || '?'}ms •
                  Source : {metadata?.fichierSource || 'Inconnu'}
                </div>
              </div>
            );
          })()}

          {/* Overlay chargement PDV */}
          {chargementPdv && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Chargement du benchmark PDV...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Étape 0 uniquement */}
      {etape === 0 && (
        <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={onRetourAccueil}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </button>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                {infoPDV ? `${Object.keys(infoPDV).length} PDV référencés` : 'En attente...'}
              </span>
              {secteurs.length > 0 && (
                <>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-sm font-medium text-indigo-600">{secteurs.length} secteurs</span>
                </>
              )}
            </div>
            <div className="w-32"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Composant principal avec MagasinProvider
// ============================================================================
const SectorManagerWizard = ({ onRetourAccueil }) => {
  return (
    <MagasinProvider>
      <SectorManagerContent onRetourAccueil={onRetourAccueil} />
    </MagasinProvider>
  );
};

export default SectorManagerWizard;
