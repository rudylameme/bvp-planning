/**
 * Modal de gestion des programmes de cuisson
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { useState } from 'react';
import { X, Plus, Trash2, Edit3, Save, AlertTriangle, Settings } from 'lucide-react';

export default function ModalGestionProgrammes({ programmes, produitsParProgramme, onSave, onClose }) {
  const [programmesList, setProgrammesList] = useState([...programmes]);
  const [nouveauProgramme, setNouveauProgramme] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [erreur, setErreur] = useState('');

  // Ajouter un nouveau programme
  const handleAjouter = () => {
    if (!nouveauProgramme.trim()) return;

    if (programmesList.includes(nouveauProgramme.trim().toUpperCase())) {
      setErreur('Ce programme existe déjà');
      return;
    }

    setProgrammesList([...programmesList, nouveauProgramme.trim().toUpperCase()]);
    setNouveauProgramme('');
    setErreur('');
  };

  // Commencer l'édition
  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(programmesList[index]);
    setErreur('');
  };

  // Confirmer l'édition
  const handleConfirmEdit = (index) => {
    if (!editingValue.trim()) return;

    const newList = [...programmesList];
    newList[index] = editingValue.trim().toUpperCase();
    setProgrammesList(newList);
    setEditingIndex(null);
    setEditingValue('');
  };

  // Supprimer un programme
  const handleSupprimer = (index) => {
    const programme = programmesList[index];
    const nbProduits = produitsParProgramme[programme] || 0;

    if (nbProduits > 0) {
      setErreur(`Impossible de supprimer : ${nbProduits} produit(s) utilisent ce programme`);
      return;
    }

    const newList = programmesList.filter((_, i) => i !== index);
    setProgrammesList(newList);
    setErreur('');
  };

  // Enregistrer les modifications
  const handleSave = () => {
    onSave(programmesList);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#8B1538] text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Gérer les programmes de cuisson</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* Ajouter un nouveau programme */}
          <div className="flex gap-2">
            <input
              type="text"
              value={nouveauProgramme}
              onChange={(e) => setNouveauProgramme(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAjouter()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
              placeholder="Nouveau programme..."
            />
            <button
              onClick={handleAjouter}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {/* Liste des programmes */}
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
            {programmesList.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Aucun programme défini
              </div>
            ) : (
              programmesList.map((programme, index) => {
                const nbProduits = produitsParProgramme[programme] || 0;
                const isEditing = editingIndex === index;

                return (
                  <div key={index} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-3 py-1 border border-[#8B1538] rounded focus:ring-2 focus:ring-[#8B1538]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleConfirmEdit(index)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Confirmer"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-gray-800">{programme}</span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {nbProduits} produit{nbProduits > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Renommer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSupprimer(index)}
                          className={`p-2 rounded-lg ${
                            nbProduits > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={nbProduits > 0 ? 'Produits associés' : 'Supprimer'}
                          disabled={nbProduits > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-xs text-gray-500">
            Renommer un programme mettra automatiquement à jour tous les produits associés.
          </p>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
