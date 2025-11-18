import { useState } from 'react';
import AccordeonRayon from './AccordeonRayon';
import TouchButton from './TouchButton';
import ModeProductionEnCours from './ModeProductionEnCours';
import ModeSuiviTempsReel from './ModeSuiviTempsReel';
import ModeCasseGlobal from './ModeCasseGlobal';
import { ChevronLeft, ChevronRight, List, PlayCircle, Activity, Trash2 } from 'lucide-react';
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

  // Mode d'affichage tablette
  const [modeTablette, setModeTablette] = useState('planning'); // 'planning', 'production', 'suivi'

  // État global pour la tranche horaire sélectionnée (partagé entre tous les rayons)
  const [trancheGlobale, setTrancheGlobale] = useState('matin');

  // Déterminer la tranche horaire actuelle
  const getTrancheActuelle = () => {
    const heure = new Date().getHours();
    if (heure >= 9 && heure < 12) return 'matin';
    if (heure >= 12 && heure < 16) return 'midi';
    return 'soir';
  };

  return (
    <div className="pb-6">
      {/* Sélecteur de mode tablette */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <TouchButton
          variant={modeTablette === 'planning' ? 'primary' : 'ghost'}
          size="md"
          onClick={() => setModeTablette('planning')}
          icon={<List className="w-5 h-5" />}
          className={modeTablette !== 'planning' ? 'border-2 border-gray-300' : ''}
        >
          Planning
        </TouchButton>
        <TouchButton
          variant={modeTablette === 'production' ? 'primary' : 'ghost'}
          size="md"
          onClick={() => setModeTablette('production')}
          icon={<PlayCircle className="w-5 h-5" />}
          className={modeTablette !== 'production' ? 'border-2 border-gray-300' : ''}
        >
          Production
        </TouchButton>
        <TouchButton
          variant={modeTablette === 'suivi' ? 'primary' : 'ghost'}
          size="md"
          onClick={() => setModeTablette('suivi')}
          icon={<Activity className="w-5 h-5" />}
          className={modeTablette !== 'suivi' ? 'border-2 border-gray-300' : ''}
        >
          Suivi temps réel
        </TouchButton>
      </div>

      {/* Navigation entre jours (tactile optimisée) */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg mb-4 -mx-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
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

        {/* Sélecteur de tranche horaire - uniquement en mode Production */}
        {modeTablette === 'production' && (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setTrancheGlobale('matin')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                trancheGlobale === 'matin'
                  ? 'bg-sky-500 text-white border-4 border-white shadow-lg scale-105'
                  : 'bg-sky-400 text-white border-2 border-sky-500 hover:bg-sky-500'
              }`}
            >
              Matin
            </button>
            <button
              onClick={() => setTrancheGlobale('midi')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                trancheGlobale === 'midi'
                  ? 'bg-yellow-500 text-gray-900 border-4 border-white shadow-lg scale-105'
                  : 'bg-yellow-400 text-gray-900 border-2 border-yellow-500 hover:bg-yellow-500'
              }`}
            >
              Midi
            </button>
            <button
              onClick={() => setTrancheGlobale('apres-midi')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                trancheGlobale === 'apres-midi'
                  ? 'bg-orange-600 text-white border-4 border-white shadow-lg scale-105'
                  : 'bg-orange-500 text-white border-2 border-orange-600 hover:bg-orange-600'
              }`}
            >
              Après-midi
            </button>
            <button
              onClick={() => setTrancheGlobale('casse')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1 ${
                trancheGlobale === 'casse'
                  ? 'bg-red-700 text-white border-4 border-white shadow-lg scale-105'
                  : 'bg-red-600 text-white border-2 border-red-700 hover:bg-red-700'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Casse
            </button>
          </div>
        )}
      </div>

      {/* Mode Planning : Accordéons par rayon */}
      {modeTablette === 'planning' && rayonsData.map(({ rayon, programme, data }) => {
        const produitsArray = Array.from(data.produits);
        // Calculer le total des capacités sur toute la journée
        const totalPlaquesJour = (data.capacite?.matin || 0) + (data.capacite?.midi || 0) + (data.capacite?.soir || 0);
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

      {/* Mode Production en cours */}
      {modeTablette === 'production' && (
        <>
          {trancheGlobale === 'casse' ? (
            // Mode Casse : Vue globale de tous les produits
            <ModeCasseGlobal
              rayonsData={rayonsData}
              jour={selectedJour}
              modeAffichage={modeAffichage}
              formaterQuantite={formaterQuantite}
            />
          ) : (
            // Mode Production normal : Par rayon/programme
            rayonsData.map(({ rayon, programme, data }) => {
              const produitsArray = Array.from(data.produits);

              // Transformer les produits pour le mode production
              // Afficher uniquement les quantités de la tranche sélectionnée
              const produitsProduction = produitsArray.map(([libelle, creneaux]) => {
                // Mapper apres-midi vers soir car dans le planning c'est "soir"
                const trancheData = trancheGlobale === 'apres-midi' ? 'soir' : trancheGlobale;
                const quantiteTranche = creneaux[trancheData] || 0;
                return {
                  libelle,
                  quantite: formaterQuantite(
                    quantiteTranche,
                    creneaux.unitesParVente,
                    creneaux.unitesParPlaque
                  )
                };
              });

              return (
                <div key={`${rayon}-${programme}`} className="mb-4">
                  <ModeProductionEnCours
                    rayon={rayon}
                    programme={programme}
                    produits={produitsProduction}
                    jour={selectedJour}
                    modeAffichage={modeAffichage}
                    trancheActive={trancheGlobale}
                    onProduitCoche={(libelle, estCoche) => {
                      console.log(`${libelle} ${estCoche ? 'coché' : 'décoché'}`);
                    }}
                    onDemarrer={() => {
                      console.log(`Production démarrée pour ${rayon} - ${programme}`);
                    }}
                  />
                </div>
              );
            })
          )}
        </>
      )}

      {/* Mode Suivi temps réel */}
      {modeTablette === 'suivi' && (() => {
        // Agréger les données par rayon pour le suivi
        const rayonsSuivi = rayonsData.reduce((acc, { rayon, data }) => {
          if (!acc[rayon]) {
            acc[rayon] = { rayon, totalProduits: 0, progression: 0, retard: 0 };
          }
          acc[rayon].totalProduits += data.produits.size;
          // Pour la démo, simuler une progression aléatoire
          // Dans une vraie app, cela viendrait du tracking production
          acc[rayon].progression = Math.floor(Math.random() * 100);
          acc[rayon].retard = Math.floor(Math.random() * 10) - 3; // Entre -3 et +6
          return acc;
        }, {});

        return (
          <ModeSuiviTempsReel
            rayonsData={Object.values(rayonsSuivi)}
            trancheActuelle={getTrancheActuelle()}
            onVoirDetails={() => setModeTablette('planning')}
            onAjusterPlanning={() => {
              setModeTablette('planning');
              // TODO: ouvrir modal d'ajustement
            }}
          />
        );
      })()}
    </div>
  );
}
