import AccordeonRayon from './AccordeonRayon';
import TouchButton from './TouchButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { convertirEnPlaques } from '../utils/conversionUtils';

/**
 * Vue Planning optimisée pour tablette
 * - Accordéons pour chaque rayon
 * - Boutons tactiles optimisés
 * - Navigation swipe entre jours
 */
export default function PlanningVueTablet({
  selectedJour,
  planningLocal,
  modeAffichage,
  formaterQuantite,
  handleModificationManuelle,
  variantesParRayonEtJour,
  handleChangeVariante,
  onNaviguerJour
}) {
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const indexJourActuel = jours.indexOf(selectedJour);

  const jourPrecedent = indexJourActuel > 0 ? jours[indexJourActuel - 1] : null;
  const jourSuivant = indexJourActuel < jours.length - 1 ? jours[indexJourActuel + 1] : null;

  if (!planningLocal?.jours[selectedJour]) return null;

  const rayonsData = [];
  for (const [rayon, programmes] of Object.entries(planningLocal.jours[selectedJour])) {
    for (const [programme, data] of Object.entries(programmes)) {
      if (data.produits && data.produits.size > 0) {
        rayonsData.push({ rayon, programme, data });
      }
    }
  }

  // Couleurs par rayon
  const couleurRayon = {
    'BOULANGERIE': 'orange',
    'VIENNOISERIE': 'blue',
    'PATISSERIE': 'purple',
    'SNACKING': 'green',
    'AUTRE': 'gray'
  };

  return (
    <div className="pb-6">
      {/* Navigation entre jours (tactile optimisée) */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg mb-4 -mx-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Jour précédent */}
          {jourPrecedent ? (
            <TouchButton
              variant="ghost"
              size="md"
              onClick={() => onNaviguerJour(jourPrecedent)}
              icon={<ChevronLeft className="w-5 h-5" />}
              className="bg-white bg-opacity-20 text-white border-white flex-shrink-0"
            >
              {jourPrecedent.slice(0, 3)}
            </TouchButton>
          ) : (
            <div className="w-24" />
          )}

          {/* Jour actuel */}
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-white">{selectedJour}</div>
            <div className="text-sm text-white opacity-90">
              {rayonsData.length} programme{rayonsData.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Jour suivant */}
          {jourSuivant ? (
            <TouchButton
              variant="ghost"
              size="md"
              onClick={() => onNaviguerJour(jourSuivant)}
              icon={<ChevronRight className="w-5 h-5" />}
              className="bg-white bg-opacity-20 text-white border-white flex-shrink-0"
            >
              {jourSuivant.slice(0, 3)}
            </TouchButton>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </div>

      {/* Accordéons par rayon */}
      {rayonsData.map(({ rayon, programme, data }) => {
        const produitsArray = Array.from(data.produits);
        const totalPlaquesJour = data.capacite?.total || 0;
        const varianteJour = variantesParRayonEtJour[rayon]?.[selectedJour.toLowerCase()] || 'sans';

        return (
          <AccordeonRayon
            key={`${rayon}-${programme}`}
            title={rayon}
            subtitle={`${programme} - ${produitsArray.length} produit${produitsArray.length > 1 ? 's' : ''}`}
            badge={totalPlaquesJour > 0 ? `${totalPlaquesJour} Pl.` : null}
            color={couleurRayon[rayon] || 'gray'}
            defaultOpen={true}
          >
            {/* Sélecteur de variante pour ce rayon/jour */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Variante pour {rayon} - {selectedJour}
              </label>
              <select
                value={varianteJour}
                onChange={(e) => handleChangeVariante(rayon, selectedJour.toLowerCase(), e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[48px]"
              >
                <option value="sans">Sans limite (potentiel mathématique)</option>
                <option value="forte">Forte (+20% max)</option>
                <option value="faible">Faible (+10% max)</option>
              </select>
            </div>

            {/* Tableau des produits optimisé tactile */}
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-3 py-3 text-left font-semibold">Produit</th>
                    <th className="px-2 py-3 text-center font-semibold">Matin<br/><span className="text-xs font-normal">9h-12h</span></th>
                    <th className="px-2 py-3 text-center font-semibold">Midi<br/><span className="text-xs font-normal">12h-16h</span></th>
                    <th className="px-2 py-3 text-center font-semibold">Soir<br/><span className="text-xs font-normal">16h-23h</span></th>
                  </tr>
                </thead>
                <tbody>
                  {produitsArray.map(([produit, creneaux]) => (
                    <tr key={produit} className="border-b border-gray-200">
                      <td className="px-3 py-4 font-medium">{produit}</td>
                      <td className="px-2 py-4 text-center text-lg font-bold text-blue-600">
                        {formaterQuantite(creneaux.matin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                      </td>
                      <td className="px-2 py-4 text-center text-lg font-bold text-blue-600">
                        {formaterQuantite(creneaux.midi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                      </td>
                      <td className="px-2 py-4 text-center text-lg font-bold text-blue-600">
                        {formaterQuantite(creneaux.soir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                      </td>
                    </tr>
                  ))}
                  {/* Ligne capacité */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-3 py-3">CAPACITÉ</td>
                    <td className="px-2 py-3 text-center text-blue-700">
                      {modeAffichage === 'plaques' && data.capacite.matin > 0 ? `${data.capacite.matin} Pl.` : data.capacite.matin}
                    </td>
                    <td className="px-2 py-3 text-center text-blue-700">
                      {modeAffichage === 'plaques' && data.capacite.midi > 0 ? `${data.capacite.midi} Pl.` : data.capacite.midi}
                    </td>
                    <td className="px-2 py-3 text-center text-blue-700">
                      {modeAffichage === 'plaques' && data.capacite.soir > 0 ? `${data.capacite.soir} Pl.` : data.capacite.soir}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AccordeonRayon>
        );
      })}
    </div>
  );
}
