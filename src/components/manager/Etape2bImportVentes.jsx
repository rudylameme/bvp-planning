/**
 * Étape 2b : Import Ventes/Casse
 *
 * Charge automatiquement le fichier Mercalys depuis IndexedDB
 * (pré-configuré dans PageParametres).
 * - Validation : minimum 3 semaines de données
 * - Affiche un résumé après import
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Package,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import {
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';
import { loadHandle } from '../../services/handleStorage';
import { checkHandlePermission } from '../../hooks/useFileAccess';
import { chargerReferentielMagasin } from '../../services/referentielMagasin';
import { chargerBBDNationale } from '../../services/bbdNationaleService';

const MIN_SEMAINES = 3;

const Etape2bImportVentes = () => {
  const {
    dirHandle,
    fichierVentesSelectionne,
    setFichierVentesSelectionne,
    donneesGamme,
    setDonneesGamme,
    produitsGamme,
    setProduitsGamme,
    frequentationData,
    semainePlanning,
    refMagasin,
    setRefMagasin,
    setRapportIdentification,
    archiveProduitsEnAttente,
    setProduitsVentesBrutes,
  } = useMagasin();

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [fichierNonConfigure, setFichierNonConfigure] = useState(false);

  // Nombre de semaines ISO distinctes (global, calculé par le service)
  const nombreSemaines = useMemo(() => {
    if (!donneesGamme?.statistiques) return 0;
    return donneesGamme.statistiques.nombreSemaines || 0;
  }, [donneesGamme]);

  const validationOK = nombreSemaines >= MIN_SEMAINES;

  // Charger le fichier
  const chargerFichier = async (file) => {
    if (!file) return;

    setChargement(true);
    setErreur(null);

    try {
      const donneesVC = await extraireProduitsVentesCasse(file, {
        poidsJoursFrequentation: frequentationData?.poidsJours || null,
      });
      setDonneesGamme(donneesVC);

      // Charger le référentiel magasin si configuré et pas encore chargé
      let refMagasinLocal = refMagasin;
      if (!refMagasinLocal) {
        try {
          const refHandle = await loadHandle('fichierRefMagasin');
          if (refHandle) {
            const ok = await checkHandlePermission(refHandle, 'read');
            if (ok) {
              const refFile = await refHandle.getFile();
              refMagasinLocal = await chargerReferentielMagasin(refFile);
              if (refMagasinLocal) {
                setRefMagasin(refMagasinLocal);
              }
            }
          }
        } catch {
          // Non bloquant — on continue sans référentiel magasin
        }
      }

      // Charger la BBD nationale si présente dans le dossier DATA_perso (non bloquant)
      const bbdNationale = dirHandle ? await chargerBBDNationale(dirHandle) : null;

      const moisP = semainePlanning ? new Date(semainePlanning.annee, 0, 1 + (semainePlanning.semaine - 1) * 7).getMonth() + 1 : null;
      // Extraire les ventes brutes (sans nettoyage)
      const produitsBruts = formaterPourPilotageCA(donneesVC, {
        semaineNumero: semainePlanning?.semaine,
        moisPlanning: moisP,
        refMagasin: refMagasinLocal || null,
        bbdNationale,
        skipNettoyage: true,
      });
      setProduitsVentesBrutes(produitsBruts);

      // Toujours passer les bruts au contexte.
      // Le MagasinContext décidera : archive (si trouvée) ou nettoyage (sinon).
      // On ne nettoie JAMAIS ici car la recherche d'archive est asynchrone
      // et peut ne pas encore être terminée.
      setProduitsGamme(produitsBruts);
      setFichierVentesSelectionne({ nom: file.name });
    } catch (error) {
      setErreur('Impossible de charger le fichier. Vérifiez le format.');
    } finally {
      setChargement(false);
    }
  };

  // Auto-chargement depuis IndexedDB au montage
  useEffect(() => {
    // Si les données sont déjà chargées, ne rien faire
    if (donneesGamme) return;

    let cancelled = false;

    (async () => {
      try {
        const handle = await loadHandle('fichierMercalys');
        if (cancelled) return;

        if (!handle) {
          setFichierNonConfigure(true);
          return;
        }

        const ok = await checkHandlePermission(handle, 'read');
        if (cancelled) return;

        if (!ok) {
          setErreur('Permission refusée pour le fichier Mercalys. Retournez aux paramètres.');
          return;
        }

        const file = await handle.getFile();
        if (cancelled) return;

        await chargerFichier(file);
      } catch {
        if (!cancelled) {
          setErreur('Impossible de charger le fichier Mercalys depuis les paramètres.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Stats résumé
  const stats = useMemo(() => {
    if (!donneesGamme) return null;
    return donneesGamme.statistiques;
  }, [donneesGamme]);

  // Rayons détectés
  const rayons = useMemo(() => {
    if (!produitsGamme?.length) return [];
    const r = {};
    produitsGamme.forEach((p) => {
      if (!r[p.rayon]) r[p.rayon] = 0;
      r[p.rayon]++;
    });
    return Object.entries(r).sort((a, b) => b[1] - a[1]);
  }, [produitsGamme]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-[#8B1538]" />
          Import Ventes / Casse
        </h2>
        <p className="text-gray-600 mt-1">
          Fichier comparatif Ventes/Casse (export Mercalys) pour analyser la gamme.
        </p>
        <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Minimum {MIN_SEMAINES} semaines de données requises
        </p>
      </div>

      {/* État du fichier */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {chargement && (
          <div className="flex items-center gap-3 p-4">
            <Loader2 className="w-6 h-6 text-[#8B1538] animate-spin" />
            <p className="font-medium text-gray-700">Chargement du fichier Mercalys…</p>
          </div>
        )}

        {!chargement && fichierNonConfigure && !donneesGamme && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Fichier Mercalys non configuré</p>
              <p className="text-sm text-amber-600 mt-1">Retournez aux paramètres pour sélectionner le fichier Mercalys.</p>
            </div>
          </div>
        )}

        {!chargement && donneesGamme && fichierVentesSelectionne && (
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-green-500 bg-green-50">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-800">{fichierVentesSelectionne.nom}</p>
              <p className="text-sm text-green-600">Fichier chargé avec succès</p>
            </div>
          </div>
        )}

        {!chargement && erreur && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {erreur}
          </div>
        )}
      </div>

      {/* Résumé des données importées */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#8B1538]" />
            Résumé de l'import
          </h3>

          {/* Validation semaines */}
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            validationOK
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {validationOK ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span className={validationOK ? 'text-green-700' : 'text-amber-700'}>
              <strong>{nombreSemaines} semaine{nombreSemaines > 1 ? 's' : ''}</strong> de données
              {validationOK
                ? ' — suffisant pour une analyse fiable'
                : ` — minimum ${MIN_SEMAINES} requises pour une analyse fiable`
              }
            </span>
          </div>

          {/* Stats en grille */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Package className="w-6 h-6 text-[#8B1538] mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{stats.nombreProduits}</p>
              <p className="text-sm text-gray-500">Produits</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{nombreSemaines}</p>
              <p className="text-sm text-gray-500">Semaines</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.totalVentesPVTTC)}
              </p>
              <p className="text-sm text-gray-500">CA Total période</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className={`text-2xl font-bold ${stats.tauxCasseGlobal < 5 ? 'text-green-700' : stats.tauxCasseGlobal < 20 ? 'text-amber-700' : 'text-red-700'}`}>
                {stats.tauxCasseGlobal}%
              </p>
              <p className="text-sm text-gray-500">Taux casse global</p>
            </div>
          </div>

          {/* Répartition par rayon */}
          {rayons.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Répartition par rayon :</p>
              <div className="flex flex-wrap gap-2">
                {rayons.map(([rayon, count]) => (
                  <span key={rayon} className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700">
                    {rayon} <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Etape2bImportVentes;
