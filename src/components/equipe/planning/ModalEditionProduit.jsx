/**
 * Modal d'édition de produit
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { useState } from 'react';
import { X, Edit3, Save } from 'lucide-react';

// Liste des familles disponibles (ordre métier BVP)
const FAMILLES_LISTE = ['BOULANGERIE', 'VIENNOISERIE', 'SNACKING', 'PATISSERIE', 'AUTRE'];

export default function ModalEditionProduit({ produit, programmes, onSave, onClose }) {
  const [formData, setFormData] = useState({
    libelle: produit.libellePersonnalise || produit.libelle || '',
    famille: produit.famille || 'AUTRE',
    programme: produit.programme || '',
    plu: produit.plu || '',
    unitesParPlaque: produit.unitesParPlaque || 0,
    unitesParLot: produit.unitesParLot || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      unitesParPlaque: parseInt(formData.unitesParPlaque, 10) || 0,
      unitesParLot: parseInt(formData.unitesParLot, 10) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-emerald-700 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Modifier le produit</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom du produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du produit
            </label>
            <input
              type="text"
              value={formData.libelle}
              onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              placeholder="Ex: BAG CONSTANCE PAC 250G"
              required
            />
          </div>

          {/* Famille */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Famille / Rayon
            </label>
            <select
              value={formData.famille}
              onChange={(e) => setFormData({ ...formData, famille: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            >
              {FAMILLES_LISTE.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Programme de cuisson */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Programme de cuisson
            </label>
            <select
              value={formData.programme}
              onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            >
              <option value="">-- Sans programme --</option>
              {programmes.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* PLU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code PLU <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="text"
              value={formData.plu}
              onChange={(e) => setFormData({ ...formData, plu: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              placeholder="Ex: 10159"
            />
          </div>

          {/* Unités par plaque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unités par plaque
            </label>
            <input
              type="number"
              min="0"
              value={formData.unitesParPlaque}
              onChange={(e) => setFormData({ ...formData, unitesParPlaque: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre de produits qui tiennent sur une plaque de four
            </p>
          </div>

          {/* Unités par lot (conditionnement de vente) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unités par lot <span className="text-gray-400">(conditionnement)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.unitesParLot}
              onChange={(e) => setFormData({ ...formData, unitesParLot: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ex : 12 pour un lot de 12 chouquettes. La fiche de production affichera les quantités en boîtes (arrondi supérieur).
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
