import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Save, X } from 'lucide-react';
import {
  getListeProgrammes,
  chargerProgrammesPersonnalises,
  renommerProgramme,
  ajouterProgrammeCustom,
  supprimerProgrammeCustom,
  getNomProgrammeAffiche
} from '../services/referentielITM8';

/**
 * Interface de gestion des programmes de cuisson
 * Permet de:
 * - Renommer les programmes existants
 * - Créer de nouveaux programmes personnalisés
 * - Supprimer les programmes personnalisés
 */
export default function GestionProgrammes({ onClose }) {
  const [programmesRef, setProgrammesRef] = useState([]);
  const [personnalisations, setPersonnalisations] = useState({ renommages: new Map(), custom: [] });
  const [modeEdition, setModeEdition] = useState(null); // { type: 'rename'|'add', programme?: string }
  const [nouveauNom, setNouveauNom] = useState('');

  useEffect(() => {
    // Charger les programmes du référentiel
    setProgrammesRef(getListeProgrammes());

    // Charger les personnalisations
    setPersonnalisations(chargerProgrammesPersonnalises());
  }, []);

  const handleRenommer = (programmeOriginal) => {
    setModeEdition({ type: 'rename', programme: programmeOriginal });
    setNouveauNom(getNomProgrammeAffiche(programmeOriginal));
  };

  const handleSauvegarderRenommage = () => {
    if (nouveauNom.trim() && modeEdition?.programme) {
      renommerProgramme(modeEdition.programme, nouveauNom.trim());
      setPersonnalisations(chargerProgrammesPersonnalises());
      setModeEdition(null);
      setNouveauNom('');
    }
  };

  const handleAjouterProgramme = () => {
    if (nouveauNom.trim()) {
      ajouterProgrammeCustom(nouveauNom.trim());
      setPersonnalisations(chargerProgrammesPersonnalises());
      setModeEdition(null);
      setNouveauNom('');
    }
  };

  const handleSupprimerCustom = (programme) => {
    if (confirm(`Supprimer le programme personnalisé "${programme}" ?`)) {
      supprimerProgrammeCustom(programme);
      setPersonnalisations(chargerProgrammesPersonnalises());
    }
  };

  const handleAnnuler = () => {
    setModeEdition(null);
    setNouveauNom('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold">Gestion des Programmes de Cuisson</h2>
          <p className="text-sm opacity-90 mt-1">
            Personnalisez les noms des programmes ou créez-en de nouveaux
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Section: Programmes du référentiel */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Programmes du Référentiel
            </h3>
            <div className="space-y-2">
              {programmesRef.map((prog) => {
                const nomAffiche = getNomProgrammeAffiche(prog);
                const estEnEdition = modeEdition?.type === 'rename' && modeEdition?.programme === prog;

                return (
                  <div
                    key={prog}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {estEnEdition ? (
                      <>
                        <input
                          type="text"
                          value={nouveauNom}
                          onChange={(e) => setNouveauNom(e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-blue-500 rounded-lg focus:outline-none"
                          placeholder="Nouveau nom..."
                          autoFocus
                        />
                        <button
                          onClick={handleSauvegarderRenommage}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title="Sauvegarder"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleAnnuler}
                          className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                          title="Annuler"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{nomAffiche}</div>
                          {prog !== nomAffiche && (
                            <div className="text-xs text-gray-500 italic">Original: {prog}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRenommer(prog)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Renommer"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Programmes personnalisés */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Programmes Personnalisés
            </h3>

            {/* Liste des programmes custom */}
            {personnalisations.custom.length > 0 && (
              <div className="space-y-2 mb-4">
                {personnalisations.custom.map((prog) => (
                  <div
                    key={prog}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-2 border-green-300"
                  >
                    <div className="flex-1 font-semibold text-gray-900">{prog}</div>
                    <button
                      onClick={() => handleSupprimerCustom(prog)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire d'ajout */}
            {modeEdition?.type === 'add' ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-400">
                <input
                  type="text"
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-green-500 rounded-lg focus:outline-none"
                  placeholder="Nom du nouveau programme..."
                  autoFocus
                />
                <button
                  onClick={handleAjouterProgramme}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Ajouter"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleAnnuler}
                  className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  title="Annuler"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModeEdition({ type: 'add' })}
                className="w-full p-4 bg-white border-2 border-dashed border-green-400 rounded-lg text-green-600 font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un nouveau programme
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
