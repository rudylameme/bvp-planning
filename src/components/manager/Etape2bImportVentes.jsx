/**
 * Étape 2b : Import Ventes/Casse
 *
 * Import du fichier comparatif Ventes/Casse (export Mercalys).
 * - Upload classique depuis l'ordinateur de l'utilisateur
 * - Validation : minimum 3 semaines de données
 * - Affiche un résumé après import
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Package,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import {
  extraireProduitsVentesCasse,
  formaterPourPilotageCA,
} from '../../services/gammeExtractionService';

const MIN_SEMAINES = 3;

const Etape2bImportVentes = () => {
  const {
    fichierVentesSelectionne,
    setFichierVentesSelectionne,
    donneesGamme,
    setDonneesGamme,
    produitsGamme,
    setProduitsGamme,
    frequentationData,
  } = useMagasin();

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const fileInputRef = useRef(null);

  // Nombre de semaines ISO distinctes (global, calculé par le service)
  const nombreSemaines = useMemo(() => {
    if (!donneesGamme?.statistiques) return 0;
    return donneesGamme.statistiques.nombreSemaines || 0;
  }, [donneesGamme]);

  const validationOK = nombreSemaines >= MIN_SEMAINES;

  // Charger le fichier uploadé
  const chargerFichier = async (file) => {
    if (!file) return;

    setChargement(true);
    setErreur(null);

    try {
      const donneesVC = await extraireProduitsVentesCasse(file, {
        poidsJoursFrequentation: frequentationData?.poidsJours || null,
      });
      setDonneesGamme(donneesVC);
      const produitsFormates = formaterPourPilotageCA(donneesVC);
      setProduitsGamme(produitsFormates);
      setFichierVentesSelectionne({ nom: file.name });
    } catch (error) {
      // TODO: logger professionnel
      setErreur('Impossible de charger le fichier. Vérifiez le format.');
    } finally {
      setChargement(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) chargerFichier(file);
  };

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
          Importez le fichier comparatif Ventes/Casse (export Mercalys) pour analyser la gamme.
        </p>
        <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Minimum {MIN_SEMAINES} semaines de données requises
        </p>
      </div>

      {/* Upload du fichier */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#8B1538]" />
          Importer le fichier Ventes/Casse
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {donneesGamme && fichierVentesSelectionne ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-green-500 bg-green-50">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-800">{fichierVentesSelectionne.nom}</p>
              <p className="text-sm text-green-600">Fichier chargé avec succès</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={chargement}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Changer de fichier
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={chargement}
            className="w-full flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#8B1538] hover:bg-red-50/30 transition-all cursor-pointer"
          >
            {chargement ? (
              <RefreshCw className="w-10 h-10 text-[#8B1538] animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-gray-400" />
            )}
            <div className="text-center">
              <p className="font-medium text-gray-700">
                {chargement ? 'Chargement en cours...' : 'Cliquez pour sélectionner le fichier'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Fichier Excel (.xlsx) exporté depuis Mercalys
              </p>
            </div>
          </button>
        )}

        {erreur && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
