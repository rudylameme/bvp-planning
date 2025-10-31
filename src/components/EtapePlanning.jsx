import { ChevronLeft, Printer, TrendingUp, Settings } from 'lucide-react';
import { useState } from 'react';
import StatistiquesPanel from './StatistiquesPanel';
import ImpressionPanel from './ImpressionPanel';
import { convertirEnPlaques } from '../utils/conversionUtils';

export default function EtapePlanning({ planning, pdvInfo, onRetour, onPersonnaliser }) {
  const [selectedJour, setSelectedJour] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [modeAffichage, setModeAffichage] = useState('plaques'); // 'unites' ou 'plaques'

  if (!planning) return null;

  /**
   * Formate l'affichage des quantités selon le mode sélectionné
   */
  const formaterQuantite = (ventes, unitesParVente, unitesParPlaque) => {
    if (modeAffichage === 'unites') {
      // Mode unités : afficher les unités brutes (même si pas de plaque)
      const unitesProduction = ventes * (unitesParVente || 1);
      return `${unitesProduction}`;
    } else {
      // Mode plaques : utiliser la fonction de conversion existante (affiche "NC" si pas de plaque)
      return convertirEnPlaques(ventes, unitesParVente, unitesParPlaque);
    }
  };

  /**
   * Calcule le total de plaques pour un programme de cuisson (par créneau)
   * Additionne les plaques ARRONDIES de chaque produit (ce que l'opérateur va cuire réellement)
   * EXCLUT les produits sans plaque (unitesParPlaque = 0) car ils ne passent pas en cuisson
   * Retourne 'NC' si TOUS les produits n'ont pas de plaques (programme sans cuisson)
   */
  const calculerTotalPlaques = (produits, creneau) => {
    let totalPlaques = 0;
    let aucunProduitAvecPlaques = true;

    for (const [_, creneaux] of produits) {
      const unitesParVente = creneaux.unitesParVente || 1;
      const unitesParPlaque = creneaux.unitesParPlaque || 0;
      const ventes = creneaux[creneau];

      if (unitesParPlaque > 0) {
        aucunProduitAvecPlaques = false; // Au moins un produit a des plaques
        // Calculer les plaques pour ce produit ET l'arrondir au 0.5
        const unitesProduction = ventes * unitesParVente;
        const nombrePlaquesBrut = unitesProduction / unitesParPlaque;
        const nombrePlaquesArrondies = Math.ceil(nombrePlaquesBrut * 2) / 2; // Arrondi 0.5
        totalPlaques += nombrePlaquesArrondies;
      }
      // Si unitesParPlaque = 0, on ne compte pas (produit ne passe pas en cuisson)
    }

    // Si aucun produit n'a de plaques, c'est un programme sans cuisson
    if (aucunProduitAvecPlaques) {
      return 'NC';
    }

    return totalPlaques;
  };

  /**
   * Calcule le total journalier (matin + midi + soir) en plaques
   */
  const calculerTotalJournalier = (produits) => {
    const matin = calculerTotalPlaques(produits, 'matin');
    const midi = calculerTotalPlaques(produits, 'midi');
    const soir = calculerTotalPlaques(produits, 'soir');

    // Si tous les créneaux sont NC, retourner NC
    if (matin === 'NC' && midi === 'NC' && soir === 'NC') {
      return 'NC';
    }

    // Sinon calculer le total (en ignorant les NC)
    const matinNum = matin === 'NC' ? 0 : matin;
    const midiNum = midi === 'NC' ? 0 : midi;
    const soirNum = soir === 'NC' ? 0 : soir;
    const total = matinNum + midiNum + soirNum;

    if (total % 1 === 0) {
      return `${total} Pl.`;
    } else {
      return `${total.toFixed(1)} Pl.`;
    }
  };

  /**
   * Formate l'affichage d'un total de plaques
   */
  const formaterPlaques = (nombre) => {
    if (nombre === 'NC') {
      return 'NC';
    }
    if (nombre % 1 === 0) {
      return `${nombre} Pl.`;
    } else {
      return `${nombre.toFixed(1)} Pl.`;
    }
  };

  return (
    <>
      {/* Panel d'impression */}
      <ImpressionPanel
        isVisible={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        selectedJour={selectedJour}
        planningData={planning}
        pdvInfo={pdvInfo}
      />

      <div className="min-h-screen bg-gray-50 print:hidden">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Planning de Production Optimisé
                </h1>
                {pdvInfo && (
                  <p className="text-sm text-gray-600">
                    PDV {pdvInfo.numero} - {pdvInfo.nom}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPersonnaliser}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Personnaliser
                </button>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Stats
                </button>
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Statistiques */}
          <StatistiquesPanel planning={planning} isVisible={showStats} />

          {/* Vue hebdomadaire */}
          {!selectedJour && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Planning Hebdomadaire</h2>

              {/* Sélection des jours */}
              <div className="grid grid-cols-7 gap-4 mb-6">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => {
                  let total = 0;
                  if (planning.jours[jour]) {
                    // Nouvelle structure: rayon -> programme -> produits
                    for (const rayon of Object.values(planning.jours[jour])) {
                      for (const programme of Object.values(rayon)) {
                        if (programme.capacite) {
                          total += programme.capacite.total;
                        }
                      }
                    }
                  }

                  const poids = planning.stats.poidsJours[jour] || 0;

                  return (
                    <button
                      key={jour}
                      onClick={() => setSelectedJour(jour)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedJour(jour);
                        }
                      }}
                      className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-blue-50 transition relative focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="button"
                      aria-label={`Voir le planning du ${jour}`}
                    >
                      <div className="absolute top-2 right-2 text-xs text-gray-500">
                        {(poids * 100).toFixed(0)}%
                      </div>
                      <h3 className="font-semibold text-center mb-2">{jour}</h3>
                      <p className="text-2xl font-bold text-center text-blue-600">
                        {total}
                      </p>
                      <p className="text-xs text-center text-gray-500">articles</p>
                    </button>
                  );
                })}
              </div>

              {/* Résumé par rayon */}
              <div className="grid grid-cols-2 gap-4">
                {planning.programmesParRayon && Object.entries(planning.programmesParRayon).map(([rayon, programmes]) => {
                  let total = 0;
                  let nbProduits = 0;

                  // Calculer le total pour ce rayon sur la semaine
                  Object.values(planning.jours).forEach(joursData => {
                    if (joursData[rayon]) {
                      Object.values(joursData[rayon]).forEach(programme => {
                        if (programme.capacite) {
                          total += programme.capacite.total;
                        }
                        nbProduits += programme.produits.size;
                      });
                    }
                  });

                  return (
                    <div key={rayon} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">{rayon}</h3>
                      <p className="text-xl font-bold">{total} unités/semaine</p>
                      <p className="text-sm text-gray-500">
                        {Object.keys(programmes).length} programme(s) de cuisson
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vue d'un jour spécifique */}
          {selectedJour && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  Planning du {selectedJour}
                </h2>
                <div className="flex items-center gap-4">
                  {/* Bouton toggle Unités / Plaques */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setModeAffichage('unites')}
                      className={`px-4 py-2 rounded-lg transition ${
                        modeAffichage === 'unites'
                          ? 'bg-white text-blue-600 font-semibold shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Unités
                    </button>
                    <button
                      onClick={() => setModeAffichage('plaques')}
                      className={`px-4 py-2 rounded-lg transition ${
                        modeAffichage === 'plaques'
                          ? 'bg-white text-blue-600 font-semibold shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Plaques
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedJour(null)}
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Retour semaine
                  </button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Principe d'ajustement :</h4>
                <p className="text-sm text-yellow-700">
                  <strong>Soir :</strong> Quantité proposée à ajuster selon le stock rayon.<br/>
                  <strong>Exemple :</strong> Pain aux céréales → Soir: 4 proposés, Stock rayon: 2 → À cuire: 4-2 = 2
                </p>
              </div>

              {planning.jours[selectedJour] && Object.entries(planning.jours[selectedJour]).map(([rayon, programmes]) => (
                <div key={rayon} className="mb-8">
                  {/* Titre du rayon */}
                  <h3 className="text-xl font-bold text-white bg-blue-600 p-3 mb-0 rounded-t">
                    {rayon}
                  </h3>

                  {/* Pour chaque programme de cuisson dans ce rayon */}
                  {Object.entries(programmes).map(([programme, data]) => {
                    if (!data.produits || data.produits.size === 0) return null;

                    return (
                      <div key={programme} className="mb-6 bg-white rounded border">
                        {/* Titre du programme */}
                        <h4 className="text-md font-semibold text-center bg-gray-200 p-2 border-b-2 border-gray-800">
                          {programme}
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm min-w-full">
                            <thead className="sticky top-0 bg-gray-100 z-10">
                              <tr>
                                <th className="border border-gray-800 p-3 text-left bg-gray-100 min-w-[250px] max-w-[300px]">
                                  Produit
                                </th>
                                <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[80px]">
                                  Matin<br/>
                                  <span className="text-xs text-gray-600">9h-12h</span>
                                </th>
                                <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[80px]">
                                  Midi<br/>
                                  <span className="text-xs text-gray-600">12h-16h</span>
                                </th>
                                <th className="border border-gray-800 p-3 text-center bg-yellow-100 min-w-[100px]">
                                  Soir (à ajuster)<br/>
                                  <span className="text-xs text-gray-600">16h-23h</span>
                                </th>
                                <th className="border border-gray-800 p-3 text-center bg-amber-100 min-w-[120px]">
                                  Ajustement<br/>
                                  <span className="text-xs text-gray-600">Stock rayon</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Produits triés par volume */}
                              {Array.from(data.produits || []).map(([produit, creneaux]) => (
                                <tr key={produit} className="hover:bg-gray-50">
                                  <td className="border border-gray-800 p-3 text-sm font-medium text-left max-w-[300px] truncate" title={produit}>
                                    {produit}
                                  </td>
                                  <td className="border border-gray-800 p-3 text-center font-bold text-green-700">
                                    {formaterQuantite(creneaux.matin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                  </td>
                                  <td className="border border-gray-800 p-3 text-center font-bold text-yellow-700">
                                    {formaterQuantite(creneaux.midi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                  </td>
                                  <td className="border border-gray-800 p-3 text-center font-bold text-orange-700 bg-yellow-50">
                                    {formaterQuantite(creneaux.soir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                  </td>
                                  <td className="border border-gray-800 p-3 text-center bg-amber-50">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="text-xs text-gray-600">Stock rayon:</div>
                                      <div className="w-12 h-6 border border-gray-400 bg-white"></div>
                                      <div className="text-xs text-gray-600">À cuire:</div>
                                      <div className="w-12 h-6 border border-gray-400 bg-white"></div>
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {/* Ligne de capacité totale pour ce programme */}
                              <tr className="bg-blue-50 font-bold border-t-4 border-blue-600">
                                <td className="border border-gray-800 p-3 text-sm text-right">
                                  CAPACITÉ {programme}
                                </td>
                                <td className="border border-gray-800 p-3 text-center text-blue-700">
                                  {formaterPlaques(calculerTotalPlaques(data.produits, 'matin'))}
                                </td>
                                <td className="border border-gray-800 p-3 text-center text-blue-700">
                                  {formaterPlaques(calculerTotalPlaques(data.produits, 'midi'))}
                                </td>
                                <td className="border border-gray-800 p-3 text-center text-blue-700 bg-blue-100">
                                  {formaterPlaques(calculerTotalPlaques(data.produits, 'soir'))}
                                </td>
                                <td className="border border-gray-800 p-3 text-center text-blue-700 bg-blue-100">
                                  Total: {calculerTotalJournalier(data.produits)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Bouton retour */}
          <div className="mt-6 flex justify-start">
            <button
              onClick={onRetour}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <ChevronLeft size={20} />
              Retour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
