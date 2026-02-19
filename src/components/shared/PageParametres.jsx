/**
 * PageParametres — Écran de pré-configuration des dossiers/fichiers
 *
 * Affiché entre AccueilGlobal et chaque wizard/module.
 * Permet de sélectionner et persister les dossiers/fichiers nécessaires.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  FolderOpen,
  FileText,
  Check,
  AlertCircle,
  ChevronRight,
  Loader2,
  HelpCircle,
  X,
} from 'lucide-react';
import { saveHandle, loadHandle, verifyHandlePermission } from '../../services/handleStorage';
import { useFileAccess, checkHandlePermission } from '../../hooks/useFileAccess';

// Couleurs par thème
const THEMES = {
  blue: {
    bg: 'bg-blue-700',
    hover: 'hover:bg-blue-800',
    text: 'text-blue-600',
    border: 'border-blue-500',
    bgLight: 'bg-blue-50',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
  },
  bordeaux: {
    bg: 'bg-mousquetaires-bordeaux',
    hover: 'hover:bg-mousquetaires-bordeaux/90',
    text: 'text-mousquetaires-bordeaux',
    border: 'border-mousquetaires-bordeaux',
    bgLight: 'bg-red-50',
    btnBg: 'bg-mousquetaires-rouge hover:bg-mousquetaires-bordeaux',
  },
  emerald: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    bgLight: 'bg-emerald-50',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

const PageParametres = ({
  titre,
  sousTitre,
  couleur = 'bordeaux',
  items = [],
  onValider,
  onRetour,
}) => {
  const theme = THEMES[couleur] || THEMES.bordeaux;
  const { selectDirectory, selectFile } = useFileAccess();

  // État par item : { handle, status: 'gris'|'vert'|'rouge', name, loading }
  const [etats, setEtats] = useState(() =>
    items.reduce((acc, item) => {
      acc[item.id] = { handle: null, status: 'gris', name: '', loading: false };
      return acc;
    }, {})
  );

  // Modale d'aide
  const [aideOuverte, setAideOuverte] = useState(null);

  // Pour les items de type 'file' : stocker les données du fichier chargé
  const [fichierData, setFichierData] = useState(null);
  const fileInputRef = useRef(null);
  const activeFileItemRef = useRef(null);

  // Au montage : charger les handles persistés depuis IndexedDB
  useEffect(() => {
    items.forEach(async (item) => {
      if (!item.idbKey) return;
      // Les fichiers .bvp.json (equipe) n'ont pas de handle dans IndexedDB
      const isBvpJson = item.type === 'file' && (item.accept || '').includes('.json') && !(item.accept || '').match(/\.xlsx|\.xls|\.csv/);
      if (isBvpJson) return;

      const handle = await loadHandle(item.idbKey);
      if (!handle) return;

      const ok = await checkHandlePermission(handle, 'read');
      if (ok) {
        const name = handle.name || (handle.kind === 'file' ? 'Fichier' : 'Dossier');
        setEtats(prev => ({
          ...prev,
          [item.id]: { handle, status: 'vert', name, loading: false },
        }));
      }
    });
  }, []);

  // Sélection d'un dossier
  const handleSelectDossier = async (item) => {
    setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: true } }));

    try {
      const handle = await selectDirectory({
        id: item.idbKey || 'bvp-data',
        mode: 'read',
        startIn: 'documents',
      });

      // Persister dans IndexedDB
      if (item.idbKey) {
        await saveHandle(item.idbKey, handle);
      }

      setEtats(prev => ({
        ...prev,
        [item.id]: { handle, status: 'vert', name: handle.name, loading: false },
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: false } }));
        return;
      }
      setEtats(prev => ({
        ...prev,
        [item.id]: { handle: null, status: 'rouge', name: error.message, loading: false },
      }));
    }
  };

  // Sélection d'un fichier
  const handleSelectFichier = async (item) => {
    setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: true } }));

    try {
      // Déterminer si c'est un fichier JSON (.bvp.json) ou un autre type (Excel)
      const isBvpJson = (item.accept || '').includes('.json');
      const isExcel = (item.accept || '').match(/\.xlsx|\.xls|\.csv/);

      if (isExcel) {
        // Fichier Excel/CSV : utiliser selectFile pour obtenir un FileHandle persistable
        const fileHandle = await selectFile({
          types: [{
            description: item.label,
            accept: { 'application/octet-stream': (item.accept || '.xlsx').split(',') },
          }],
        });
        // Persister le handle dans IndexedDB
        if (item.idbKey) {
          await saveHandle(item.idbKey, fileHandle);
        }
        const file = await fileHandle.getFile();
        setEtats(prev => ({
          ...prev,
          [item.id]: { handle: fileHandle, status: 'vert', name: file.name, loading: false },
        }));
      } else {
        // Fichier .bvp.json : utiliser input classique + validation
        activeFileItemRef.current = item;
        if (fileInputRef.current) {
          fileInputRef.current.accept = item.accept || '.json,.bvp.json';
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
        // Le loading sera géré par handleFileChange
        setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: false } }));
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: false } }));
        return;
      }
      setEtats(prev => ({
        ...prev,
        [item.id]: { handle: null, status: 'rouge', name: error.message, loading: false },
      }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const item = activeFileItemRef.current;
    if (!file || !item) return;

    setEtats(prev => ({ ...prev, [item.id]: { ...prev[item.id], loading: true } }));

    try {
      const contenu = await file.text();
      const data = JSON.parse(contenu);

      // Validation basique du fichier .bvp.json
      if (!data.produits || !data.configuration) {
        throw new Error('Format invalide : produits ou configuration manquants');
      }

      setFichierData(data);
      // Stocker dans localStorage pour AccueilEquipe
      localStorage.setItem('bvp_fichier_magasin', contenu);

      setEtats(prev => ({
        ...prev,
        [item.id]: { handle: null, status: 'vert', name: file.name, loading: false },
      }));
    } catch (error) {
      setEtats(prev => ({
        ...prev,
        [item.id]: { handle: null, status: 'rouge', name: error.message, loading: false },
      }));
    }
  };

  // Vérifier si tous les items required sont OK
  const tousRequiredOk = items
    .filter(item => item.required)
    .every(item => etats[item.id]?.status === 'vert');

  const handleValider = () => {
    if (tousRequiredOk && onValider) {
      onValider({ etats, fichierData });
    }
  };

  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* Header */}
      <div className={`${theme.bg} text-white px-6 py-4`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onRetour}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Retour à l'accueil"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/30"></div>
            <div>
              <h1 className="text-xl font-bold">{titre}</h1>
              {sousTitre && <p className="text-sm text-white/70">{sousTitre}</p>}
            </div>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Configuration</span>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Chemins d'accès
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Configurez les dossiers et fichiers nécessaires avant de continuer.
            </p>

            <div className="space-y-4">
              {items.map((item) => {
                const etat = etats[item.id] || { status: 'gris', name: '', loading: false };
                const isDirectory = item.type === 'directory';

                return (
                  <div
                    key={item.id}
                    className={`border rounded-xl p-4 transition-colors ${
                      etat.status === 'vert'
                        ? 'border-green-300 bg-green-50/50'
                        : etat.status === 'rouge'
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icône statut */}
                      <div className={`flex-shrink-0 p-2 rounded-lg ${
                        etat.status === 'vert'
                          ? 'bg-green-100'
                          : etat.status === 'rouge'
                          ? 'bg-red-100'
                          : 'bg-gray-100'
                      }`}>
                        {etat.loading ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : etat.status === 'vert' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : etat.status === 'rouge' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : isDirectory ? (
                          <FolderOpen className={`w-5 h-5 ${theme.text}`} />
                        ) : (
                          <FileText className={`w-5 h-5 ${theme.text}`} />
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{item.label}</h3>
                          {item.required && (
                            <span className="text-xs text-red-500">requis</span>
                          )}
                          {item.helpImage && (
                            <button
                              onClick={() => setAideOuverte(item)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title={item.helpTitle || 'Aide'}
                            >
                              <HelpCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                        )}
                        {etat.status === 'vert' && etat.name && (
                          <p className="text-sm text-green-700 mt-1 font-medium truncate">
                            {etat.name}
                          </p>
                        )}
                        {etat.status === 'rouge' && etat.name && (
                          <p className="text-sm text-red-600 mt-1">{etat.name}</p>
                        )}
                      </div>

                      {/* Bouton */}
                      <button
                        onClick={() =>
                          isDirectory ? handleSelectDossier(item) : handleSelectFichier(item)
                        }
                        disabled={etat.loading}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          etat.status === 'vert'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : `${theme.btnBg} text-white`
                        } disabled:opacity-50`}
                      >
                        {etat.status === 'vert' ? 'Changer' : 'Sélectionner'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input fichier caché */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onRetour}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Retour
          </button>

          <button
            onClick={handleValider}
            disabled={!tousRequiredOk}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              tousRequiredOk
                ? `${theme.btnBg} text-white`
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continuer
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Modale d'aide */}
      {aideOuverte && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAideOuverte(null)}
          />
          {/* Contenu */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-800 text-lg">
                {aideOuverte.helpTitle || 'Aide'}
              </h3>
              <button
                onClick={() => setAideOuverte(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Image */}
            <div className="p-6">
              <img
                src={aideOuverte.helpImage}
                alt={aideOuverte.helpTitle || 'Aide'}
                className="w-full rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageParametres;
