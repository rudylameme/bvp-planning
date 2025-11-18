import { Trash2 } from 'lucide-react';

/**
 * Mode Casse Global
 * Affiche TOUS les produits de tous les rayons en ordre alphabétique
 * pour faciliter la saisie rapide des invendus
 *
 * Props:
 * - rayonsData: Array des données de rayons
 * - jour: string (Lundi, Mardi, etc.)
 * - modeAffichage: 'plaques' | 'unites'
 * - formaterQuantite: fonction pour formater les quantités
 */
export default function ModeCasseGlobal({
  rayonsData,
  jour,
  modeAffichage = 'plaques',
  formaterQuantite
}) {
  // Collecter tous les produits de tous les rayons
  const tousLesProduits = [];

  rayonsData.forEach(({ rayon, programme, data }) => {
    const produitsArray = Array.from(data.produits);
    produitsArray.forEach(([libelle, creneaux]) => {
      tousLesProduits.push({
        libelle,
        rayon,
        programme,
        quantiteTotale: formaterQuantite(
          creneaux.matin + creneaux.midi + creneaux.soir,
          creneaux.unitesParVente,
          creneaux.unitesParPlaque
        )
      });
    });
  });

  // Trier par ordre alphabétique
  tousLesProduits.sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));

  const unite = modeAffichage === 'plaques' ? 'Pl.' : 'u.';

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-red-500 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-8 h-8" />
          <div>
            <h3 className="text-2xl font-bold">Casse - Invendus</h3>
            <p className="text-sm opacity-90">Saisie des produits non vendus</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-600 rounded">
        <p className="text-sm text-red-800 font-semibold">
          📝 Enregistrez les quantités d'invendus du jour précédent
        </p>
        <p className="text-xs text-red-700 mt-1">
          Liste complète de tous les produits - triée par ordre alphabétique
        </p>
      </div>

      {/* Liste des produits */}
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {tousLesProduits.map((produit) => (
          <div
            key={`${produit.rayon}-${produit.programme}-${produit.libelle}`}
            className="bg-white border-2 border-gray-300 rounded-lg p-3 hover:border-red-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Nom du produit */}
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900">
                  {produit.libelle}
                </div>
                <div className="text-xs text-gray-600">
                  {produit.rayon} - {produit.programme}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  Prévision initiale: <span className="font-semibold">{produit.quantiteTotale}</span>
                </div>
              </div>

              {/* Input pour saisir la casse */}
              <div className="w-32">
                <label className="text-xs text-red-700 font-semibold block mb-1">
                  Invendus
                </label>
                <input
                  type="number"
                  inputMode={modeAffichage === 'plaques' ? 'decimal' : 'numeric'}
                  step={modeAffichage === 'plaques' ? '0.5' : '1'}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 text-2xl font-bold text-red-600 border-2 border-red-400 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-200 outline-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-center">{unite}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nombre total de produits */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center">
        <span className="text-sm text-gray-600">
          <span className="font-bold text-lg text-gray-900">{tousLesProduits.length}</span> produits au total
        </span>
      </div>
    </div>
  );
}
