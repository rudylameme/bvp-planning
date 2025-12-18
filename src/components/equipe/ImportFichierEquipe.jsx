import { useState, useCallback } from 'react';
import { FileJson, Upload, CheckCircle, AlertTriangle, Calendar, Package, Store } from 'lucide-react';

const STORAGE_KEY = 'bvp_fichier_magasin';

/**
 * Composant d'import de fichier pour l'équipier
 * Permet de charger un fichier .bvp.json préparé par le responsable
 */
export default function ImportFichierEquipe({ onFichierCharge }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fichierCharge, setFichierCharge] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [etape, setEtape] = useState('selection'); // 'selection' | 'confirmation'

  // Gérer le drag & drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      traiterFichier(file);
    }
  }, []);

  // Gérer la sélection de fichier
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      traiterFichier(file);
    }
  };

  // Traiter le fichier sélectionné
  const traiterFichier = async (file) => {
    setErreur(null);

    // Vérifier l'extension
    if (!file.name.endsWith('.json') && !file.name.endsWith('.bvp.json')) {
      setErreur('Le fichier doit être au format .bvp.json');
      return;
    }

    try {
      const contenu = await file.text();
      const data = JSON.parse(contenu);

      // Valider la structure du fichier
      if (!data.version || !data.magasin || !data.configuration || !data.produits) {
        setErreur('Le fichier ne semble pas être un fichier BVP Planning valide');
        return;
      }

      // Vérifier la version
      if (!data.version.startsWith('2.')) {
        setErreur('Ce fichier a été créé avec une ancienne version. Demandez un nouveau fichier à votre responsable.');
        return;
      }

      setFichierCharge(data);
      setEtape('confirmation');
    } catch (err) {
      console.error('Erreur parsing fichier:', err);
      setErreur('Impossible de lire le fichier. Vérifiez qu\'il s\'agit bien d\'un fichier BVP Planning.');
    }
  };

  // Confirmer le chargement
  const confirmerChargement = () => {
    if (!fichierCharge) return;

    // Sauvegarder dans localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fichierCharge));

    // Notifier le parent
    onFichierCharge(fichierCharge);
  };

  // Annuler et revenir à la sélection
  const annuler = () => {
    setFichierCharge(null);
    setEtape('selection');
    setErreur(null);
  };

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Étape 1: Sélection du fichier
  if (etape === 'selection') {
    return (
      <div className="max-w-xl mx-auto p-6">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#E8E1D5]/50 rounded-full mb-4">
            <FileJson className="w-10 h-10 text-[#8B1538]" />
          </div>
          <h2 className="text-2xl font-bold text-[#58595B] mb-2">
            Bienvenue !
          </h2>
          <p className="text-gray-500">
            Pour commencer, chargez le fichier préparé par votre responsable.
          </p>
        </div>

        {/* Zone de drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-[#ED1C24] bg-[#ED1C24]/5'
              : 'border-gray-300 hover:border-[#ED1C24]/50'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#ED1C24]' : 'text-gray-400'}`} />
          <p className="text-gray-600 mb-4">
            Glissez-déposez votre fichier ici
          </p>
          <p className="text-sm text-gray-400 mb-4">ou</p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#ED1C24] text-white rounded-lg font-medium hover:bg-[#8B1538] cursor-pointer transition-colors">
            <Upload className="w-5 h-5" />
            Charger le fichier magasin
            <input
              type="file"
              accept=".json,.bvp.json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-4">
            Fichier au format .bvp.json
          </p>
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Erreur</p>
              <p className="text-sm text-red-600">{erreur}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Étape 2: Confirmation du fichier chargé
  return (
    <div className="max-w-xl mx-auto p-6">
      {/* En-tête succès */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#58595B] mb-2">
          Fichier prêt !
        </h2>
        <p className="text-gray-500">
          Vérifiez les informations avant de confirmer
        </p>
      </div>

      {/* Résumé du fichier */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          {/* Magasin */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E8E1D5]/50 rounded-lg">
              <Store className="w-5 h-5 text-[#8B1538]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Magasin</p>
              <p className="font-semibold text-[#58595B]">
                {fichierCharge.magasin.nom}
                {fichierCharge.magasin.code && ` (${fichierCharge.magasin.code})`}
              </p>
            </div>
          </div>

          {/* Semaine */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E8E1D5]/50 rounded-lg">
              <Calendar className="w-5 h-5 text-[#8B1538]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Semaine</p>
              <p className="font-semibold text-[#58595B]">
                Semaine {fichierCharge.configuration.semaine} / {fichierCharge.configuration.annee}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(fichierCharge.configuration.dateDebut)} → {formatDate(fichierCharge.configuration.dateFin)}
              </p>
            </div>
          </div>

          {/* Produits */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E8E1D5]/50 rounded-lg">
              <Package className="w-5 h-5 text-[#8B1538]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Produits actifs</p>
              <p className="font-semibold text-[#58595B]">
                {fichierCharge.produits.length} produits
              </p>
            </div>
          </div>
        </div>

        {/* Date de génération */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Fichier généré le {formatDate(fichierCharge.dateGeneration)}
          </p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        <button
          onClick={annuler}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Changer de fichier
        </button>
        <button
          onClick={confirmerChargement}
          className="flex-1 px-6 py-3 bg-[#ED1C24] text-white rounded-lg font-medium hover:bg-[#8B1538] transition-colors"
        >
          Confirmer
        </button>
      </div>
    </div>
  );
}

/**
 * Hook pour charger le fichier depuis localStorage
 */
export function useFichierMagasin() {
  const chargerDepuisStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Erreur chargement fichier magasin:', err);
    }
    return null;
  };

  const effacerFichier = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    chargerDepuisStorage,
    effacerFichier
  };
}
