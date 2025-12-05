import { ChevronLeft, Printer, TrendingUp, Settings } from 'lucide-react';
import React, { useState } from 'react';
import StatistiquesPanel from './StatistiquesPanel';
import ImpressionPanel from './ImpressionPanel';
import PlanningVueTablet from './PlanningVueTablet';
import TouchButton from './TouchButton';
import { convertirEnPlaques } from '../utils/conversionUtils';
import { recalculerPlanningAvecVariantes } from '../services/planningRecalculator';
import { getNomProgrammeAffiche } from '../services/referentielITM8';
import { mousquetairesColors } from '../styles/mousquetaires-theme';

export default function EtapePlanning({ planning, pdvInfo, produits, frequentationData, configSemaine, onRetour, onPersonnaliser, onPlanningChange, forcedViewMode = null }) {
  const [selectedJour, setSelectedJour] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [modeAffichage, setModeAffichage] = useState('plaques'); // 'unites' ou 'plaques'

  // Mode tablette UNIQUEMENT si explicitement demandé via le bouton
  // Plus de détection automatique - le mode desktop est le défaut
  const modeTabletActif = forcedViewMode === 'tablet';

  // Initialiser les variantes par défaut : Forte (lundi-jeudi), Faible (vendredi-dimanche)
  const getVariantesParDefaut = () => {
    if (!planning?.programmesParRayon) return {};

    const variantes = {};
    const rayons = Object.keys(planning.programmesParRayon);

    rayons.forEach(rayon => {
      variantes[rayon] = {
        'lundi': 'forte',
        'mardi': 'forte',
        'mercredi': 'forte',
        'jeudi': 'forte',
        'vendredi': 'faible',
        'samedi': 'faible',
        'dimanche': 'faible'
      };
    });

    return variantes;
  };

  // Nouveau système : variantes par rayon ET par jour
  // Structure: { rayon: { jour: 'sans'|'forte'|'faible' } }
  const [variantesParRayonEtJour, setVariantesParRayonEtJour] = useState(getVariantesParDefaut());

  // Tracking des modifications manuelles (Règle 4)
  // Structure: { rayon: { jour: { libelleProduit: quantite } } }
  const [modificationsManuellesParRayonEtJour, setModificationsManuellesParRayonEtJour] = useState({});

  const [planningLocal, setPlanningLocal] = useState(planning);

  if (!planningLocal) return null;

  // Handler pour passer à la vue journalière
  const handleVoirJour = (jour) => {
    setSelectedJour(jour);
  };

  // Handler pour imprimer toute la semaine
  const handleImprimerSemaine = () => {
    setSelectedJour(null);
    setShowPrintPreview(true);
  };

  // Handler pour changer la variante d'un rayon pour un jour spécifique
  const handleChangeVariante = (rayon, jour, nouvelleVariante) => {
    const nouvellesVariantes = {
      ...variantesParRayonEtJour,
      [rayon]: {
        ...(variantesParRayonEtJour[rayon] || {}),
        [jour]: nouvelleVariante
      }
    };
    setVariantesParRayonEtJour(nouvellesVariantes);

    // IMPORTANT: Effacer les modifications manuelles pour ce rayon/jour
    // Car changer la variante doit recalculer automatiquement
    const nouvellesModifs = { ...modificationsManuellesParRayonEtJour };
    if (nouvellesModifs[rayon]?.[jour]) {
      delete nouvellesModifs[rayon][jour];
      // Si le rayon n'a plus de jours modifiés, supprimer le rayon
      if (Object.keys(nouvellesModifs[rayon]).length === 0) {
        delete nouvellesModifs[rayon];
      }
    }
    setModificationsManuellesParRayonEtJour(nouvellesModifs);

    // Recalculer le planning avec la nouvelle variante (sans les modifs manuelles de ce jour)
    const nouveauPlanning = recalculerPlanningAvecVariantes(
      planningLocal,
      produits,
      nouvellesVariantes,
      frequentationData,
      nouvellesModifs,
      configSemaine
    );

    setPlanningLocal(nouveauPlanning);
    if (onPlanningChange) {
      onPlanningChange(nouveauPlanning);
    }
  };

  // Handler pour modification manuelle d'une quantité (Règle 4)
  const handleModificationManuelle = (rayon, jour, libelleProduit, nouvelleQuantite) => {
    const nouvellesModifs = {
      ...modificationsManuellesParRayonEtJour,
      [rayon]: {
        ...(modificationsManuellesParRayonEtJour[rayon] || {}),
        [jour]: {
          ...(modificationsManuellesParRayonEtJour[rayon]?.[jour] || {}),
          [libelleProduit]: parseInt(nouvelleQuantite, 10) || 0
        }
      }
    };
    setModificationsManuellesParRayonEtJour(nouvellesModifs);

    // Recalculer le planning avec la modification manuelle
    const nouveauPlanning = recalculerPlanningAvecVariantes(
      planningLocal,
      produits,
      variantesParRayonEtJour,
      frequentationData,
      nouvellesModifs,
      configSemaine
    );

    setPlanningLocal(nouveauPlanning);
    if (onPlanningChange) {
      onPlanningChange(nouveauPlanning);
    }
  };

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
   * Affiche une quantité avec le nombre d'articles si c'est un lot (unitesParVente > 1)
   * En mode Plaques: affiche les plaques + (=articles)
   * En mode Unités: affiche les ventes + (=articles)
   */
  const afficherAvecArticles = (qte, unitesParVente, unitesParPlaque = 0) => {
    const unites = unitesParVente || 1;
    const nbArticles = qte * unites;

    if (modeAffichage === 'plaques' && unitesParPlaque > 0) {
      // Mode plaques : afficher en plaques
      const plaques = convertirEnPlaques(qte, unitesParVente, unitesParPlaque);
      if (unites > 1) {
        return (
          <span>
            {plaques}
            <span className="text-[9px] text-gray-500 ml-0.5">(={nbArticles})</span>
          </span>
        );
      }
      return plaques;
    }

    // Mode unités ou pas de plaque : afficher en ventes
    if (unites > 1) {
      return (
        <span>
          {qte}
          <span className="text-[9px] text-gray-500 ml-0.5">(={nbArticles})</span>
        </span>
      );
    }
    return qte;
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
        planningData={planningLocal}
        pdvInfo={pdvInfo}
        modeAffichage={modeAffichage}
        configSemaine={configSemaine}
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
              <div className="flex gap-2 flex-wrap">
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

        {/* Barre de navigation fixe des jours */}
        {!selectedJour && (
          <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((jour) => (
                  <button
                    key={jour}
                    onClick={() => handleVoirJour(jour)}
                    className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 hover:scale-105 transition-all shadow-md"
                    title={`Voir le détail du ${jour}`}
                  >
                    {jour}
                  </button>
                ))}
                <button
                  onClick={handleImprimerSemaine}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 hover:scale-105 transition-all shadow-md flex items-center gap-2"
                  title="Imprimer toute la semaine"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer Semaine
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Statistiques */}
          <div data-stats-panel>
            <StatistiquesPanel planning={planningLocal} isVisible={showStats} />
          </div>

          {/* Vue hebdomadaire - Nouveau tableau */}
          {!selectedJour && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">Planning Hebdomadaire</h2>

                  {/* Toggle Unités / Plaques */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setModeAffichage('unites')}
                      className={`px-4 py-2 rounded-lg transition ${modeAffichage === 'unites'
                        ? 'bg-white text-blue-600 font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      Unités
                    </button>
                    <button
                      onClick={() => setModeAffichage('plaques')}
                      className={`px-4 py-2 rounded-lg transition ${modeAffichage === 'plaques'
                        ? 'bg-white text-blue-600 font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      Plaques
                    </button>
                  </div>
                </div>

                {/* Légendes */}
                <div className="flex items-center justify-between gap-6 text-xs">
                  {/* Légende variantes */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Variantes:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">S</div>
                      <span>Sans limite</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded bg-green-600 text-white flex items-center justify-center font-bold text-[10px]">F</div>
                      <span>Forte (+20%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-[10px]">f</div>
                      <span>Faible (+10%)</span>
                    </div>
                  </div>

                  {/* Légende des couleurs */}
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Écarts vs historique:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-50 border border-gray-300"></div>
                      <span>&gt;+20%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-blue-50 border border-gray-300"></div>
                      <span>+10 à +20%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-white border border-gray-300"></div>
                      <span>-10 à +10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-orange-50 border border-gray-300"></div>
                      <span>0 à -10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-50 border border-gray-300"></div>
                      <span>&lt;-10%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau par rayon */}
              {planningLocal.programmesParRayon && Object.entries(planningLocal.programmesParRayon).map(([rayon, programmes], rayonIndex) => {
                // Collecter tous les produits uniques de ce rayon
                const produitsSet = new Set();
                Object.values(programmes).forEach(produits => {
                  produits.forEach(p => produitsSet.add(p.libelle));
                });
                const produitsArray = Array.from(produitsSet);

                const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

                return (
                  <div key={rayon} className="mb-8">
                    {/* En-tête du rayon */}
                    <div className="flex items-center justify-between bg-blue-600 text-white p-3 rounded-t">
                      <h3 className="text-xl font-bold">{rayon}</h3>
                      <span className="text-sm italic">Sélectionnez la variante par jour dans le tableau</span>
                    </div>

                    {/* Tableau des produits */}
                    <div className="overflow-x-auto border border-gray-300 rounded-b">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="border border-gray-300 p-2 text-left min-w-[200px]">Produit</th>
                            {joursOrdre.map(jour => {
                              const jourLower = jour.toLowerCase();
                              // Déterminer la variante par défaut selon le jour
                              const varianteDefaut = ['lundi', 'mardi', 'mercredi', 'jeudi'].includes(jourLower) ? 'forte' : 'faible';
                              const varianteActuelle = variantesParRayonEtJour[rayon]?.[jourLower] || varianteDefaut;

                              return (
                                <th key={jour} className="border border-gray-300 p-2 text-center min-w-[100px]">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-sm">{jour.substring(0, 3)}</span>
                                    {/* Groupe de 3 icônes compactes */}
                                    <div className="flex gap-0.5 justify-center">
                                      <button
                                        onClick={() => handleChangeVariante(rayon, jourLower, 'sans')}
                                        className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${varianteActuelle === 'sans'
                                          ? 'bg-purple-600 text-white scale-110'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          }`}
                                        title="Sans limite"
                                      >
                                        S
                                      </button>
                                      <button
                                        onClick={() => handleChangeVariante(rayon, jourLower, 'forte')}
                                        className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${varianteActuelle === 'forte'
                                          ? 'bg-green-600 text-white scale-110'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          }`}
                                        title="Forte: +20% max"
                                      >
                                        F
                                      </button>
                                      <button
                                        onClick={() => handleChangeVariante(rayon, jourLower, 'faible')}
                                        className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${varianteActuelle === 'faible'
                                          ? 'bg-orange-600 text-white scale-110'
                                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          }`}
                                        title="Faible: +10% max"
                                      >
                                        f
                                      </button>
                                    </div>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                          <tr>
                            <th className="border border-gray-300 p-2 text-left bg-gray-50"></th>
                            {joursOrdre.map(jour => (
                              <th key={jour} className="border border-gray-300 p-2 text-center bg-gray-50">
                                <span className="text-xs text-gray-500">
                                  {((planningLocal.stats.poidsJours[jour] || 0) * 100).toFixed(0)}%
                                </span>
                              </th>
                            ))}
                            <th className="border border-gray-300 p-2 text-center min-w-[100px]">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {produitsArray.map(produitLibelle => {
                            // Trouver les données de ce produit dans les programmes
                            let produitData = null;
                            for (const programmeProduits of Object.values(programmes)) {
                              const found = programmeProduits.find(p => p.libelle === produitLibelle);
                              if (found) {
                                produitData = found;
                                break;
                              }
                            }

                            if (!produitData) return null;

                            // Calculer les totaux
                            let totalPreco = 0;
                            let totalHistorique = 0;

                            return (
                              <tr key={produitLibelle} className="hover:bg-blue-50">
                                <td className="border border-gray-300 p-2 font-medium">
                                  {produitLibelle}
                                </td>
                                {joursOrdre.map(jour => {
                                  // Récupérer les données pour ce jour
                                  const jourData = planningLocal.jours[jour]?.[rayon];
                                  let qteJour = 0;
                                  let ventesHistoJour = 0;
                                  let unitesParVenteJour = 1;

                                  let unitesParPlaqueJour = 0;
                                  if (jourData) {
                                    for (const programme of Object.values(jourData)) {
                                      const produit = programme.produits.get(produitLibelle);
                                      if (produit) {
                                        qteJour = produit.total;
                                        ventesHistoJour = Math.round(produit.ventesHistoriques || 0);
                                        unitesParVenteJour = produit.unitesParVente || 1;
                                        unitesParPlaqueJour = produit.unitesParPlaque || 0;
                                        break;
                                      }
                                    }
                                  }

                                  totalPreco += qteJour;
                                  totalHistorique += ventesHistoJour;

                                  const ecart = ventesHistoJour > 0 ? ((qteJour - ventesHistoJour) / ventesHistoJour) * 100 : 0;
                                  let bgColor = 'bg-white';
                                  if (ecart > 20) bgColor = 'bg-green-50';
                                  else if (ecart > 10) bgColor = 'bg-blue-50';
                                  else if (ecart < -10) bgColor = 'bg-red-50';
                                  else if (ecart < 0) bgColor = 'bg-orange-50';

                                  return (
                                    <td key={jour} className={`border border-gray-300 px-1 py-0.5 text-center ${bgColor}`}>
                                      <div className="flex flex-col gap-0.5">
                                        {/* Préconisation éditable */}
                                        <div className="flex items-center gap-0.5 justify-center">
                                          <span className="text-[9px] text-gray-500 w-7">Préco</span>
                                          <input
                                            type="number"
                                            value={qteJour}
                                            onChange={(e) => handleModificationManuelle(rayon, jour.toLowerCase(), produitLibelle, e.target.value)}
                                            className={`w-14 text-center border border-blue-300 rounded px-1 py-0.5 text-xs font-semibold text-blue-700 ${bgColor}`}
                                            min="0"
                                          />
                                        </div>
                                        {/* Historique */}
                                        <div className="flex items-center gap-0.5 justify-center">
                                          <span className="text-[9px] text-gray-500 w-7">Histo</span>
                                          <span className="w-14 text-xs text-gray-600">{afficherAvecArticles(ventesHistoJour, unitesParVenteJour, unitesParPlaqueJour)}</span>
                                        </div>
                                        {/* Écart en pourcentage */}
                                        {ventesHistoJour > 0 && (
                                          <div className={`text-[9px] ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {ecart >= 0 ? '+' : ''}{ecart.toFixed(0)}%
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="border border-gray-300 p-2 text-center">
                                  <div className="flex flex-col gap-1">
                                    <div className="font-bold text-blue-700">{totalPreco}</div>
                                    <div className="text-sm text-gray-600">{totalHistorique}</div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vue d'un jour spécifique */}
          {selectedJour && !modeTabletActif && (
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
                      className={`px-4 py-2 rounded-lg transition ${modeAffichage === 'unites'
                        ? 'bg-white text-blue-600 font-semibold shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                      Unités
                    </button>
                    <button
                      onClick={() => setModeAffichage('plaques')}
                      className={`px-4 py-2 rounded-lg transition ${modeAffichage === 'plaques'
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
                  <strong>Soir :</strong> Quantité proposée à ajuster selon le stock rayon.<br />
                  <strong>Exemple :</strong> Pain aux céréales → Soir: 4 proposés, Stock rayon: 2 → À cuire: 4-2 = 2
                </p>
              </div>

              {planningLocal.jours[selectedJour] && Object.entries(planningLocal.jours[selectedJour]).map(([rayon, programmes]) => (
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
                          {getNomProgrammeAffiche(programme)}
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm min-w-full">
                            <thead className="sticky top-0 bg-gray-100 z-10">
                              {/* Mode PDV : En-têtes avec créneaux horaires - format 3 lignes par produit */}
                              {frequentationData?.source === 'PDV' ? (
                                <tr>
                                  <th className="border border-gray-800 p-3 text-left bg-gray-100 min-w-[200px] max-w-[300px]">
                                    Produit
                                  </th>
                                  <th className="border border-gray-800 p-2 text-center bg-gray-100 min-w-[60px]"></th>
                                  <th className="border border-gray-800 p-2 text-center bg-green-100 min-w-[80px]">
                                    Matin<br />
                                    <span className="text-xs text-gray-600">9h-12h</span>
                                  </th>
                                  <th className="border border-gray-800 p-2 text-center bg-yellow-100 min-w-[80px]">
                                    Midi<br />
                                    <span className="text-xs text-gray-600">12h-16h</span>
                                  </th>
                                  <th className="border border-gray-800 p-2 text-center bg-orange-100 min-w-[80px]">
                                    Après-midi<br />
                                    <span className="text-xs text-gray-600">16h-23h</span>
                                  </th>
                                  <th className="border border-gray-800 p-2 text-center bg-blue-100 min-w-[80px]">
                                    Total
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-amber-100 min-w-[100px]">
                                    Ajustement<br />
                                    <span className="text-xs text-gray-600">Stock rayon</span>
                                  </th>
                                </tr>
                              ) : (
                                /* Mode BVP : En-têtes simples sans historique détaillé */
                                <tr>
                                  <th className="border border-gray-800 p-3 text-left bg-gray-100 min-w-[200px] max-w-[250px]">
                                    Produit
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[70px]">
                                    Matin<br />
                                    <span className="text-xs text-gray-600">9h-12h</span>
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[70px]">
                                    Midi<br />
                                    <span className="text-xs text-gray-600">12h-16h</span>
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-yellow-100 min-w-[80px]">
                                    Soir<br />
                                    <span className="text-xs text-gray-600">16h-23h</span>
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-blue-100 min-w-[70px]">
                                    Total<br />
                                    <span className="text-xs text-gray-600">Préco</span>
                                  </th>
                                  <th className="border border-gray-800 p-3 text-center bg-amber-100 min-w-[100px]">
                                    Ajustement<br />
                                    <span className="text-xs text-gray-600">Stock rayon</span>
                                  </th>
                                </tr>
                              )}
                            </thead>
                            <tbody>
                              {/* Produits triés par volume */}
                              {Array.from(data.produits || []).map(([produit, creneaux]) => {
                                const totalPreco = creneaux.total || (creneaux.matin + creneaux.midi + creneaux.soir);
                                const ventesHisto = Math.round(creneaux.ventesHistoriques || 0);
                                const ecart = ventesHisto > 0 ? ((totalPreco - ventesHisto) / ventesHisto) * 100 : 0;

                                // Pour mode PDV : calculer historique par créneau
                                // IMPORTANT: Utiliser les poids BVP pour l'historique (ce que l'équipe fait)
                                // et les poids de la source sélectionnée pour la préconisation (ce que l'outil propose)
                                const jourLower = selectedJour.toLowerCase();
                                // Historique : toujours en poids BVP (distribution actuelle de l'équipe)
                                const poidsTranchesHisto = frequentationData?.poidsTranchesParJour_BVP?.[jourLower] || frequentationData?.poidsTranchesParJour?.[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };
                                const histoMatin = Math.round(ventesHisto * poidsTranchesHisto.matin);
                                const histoMidi = Math.round(ventesHisto * poidsTranchesHisto.midi);
                                const histoSoir = Math.max(0, ventesHisto - histoMatin - histoMidi); // Reste pour éviter erreurs d'arrondi

                                // Calculer progression par créneau
                                const progMatin = histoMatin > 0 ? ((creneaux.matin - histoMatin) / histoMatin) * 100 : 0;
                                const progMidi = histoMidi > 0 ? ((creneaux.midi - histoMidi) / histoMidi) * 100 : 0;
                                const progSoir = histoSoir > 0 ? ((creneaux.soir - histoSoir) / histoSoir) * 100 : 0;

                                // Couleur progression
                                const getProgColor = (prog) => {
                                  if (prog > 20) return 'text-green-700';
                                  if (prog > 0) return 'text-blue-600';
                                  if (prog < -10) return 'text-red-600';
                                  if (prog < 0) return 'text-orange-600';
                                  return 'text-gray-600';
                                };

                                // Couleur de fond selon l'écart total
                                let bgEcart = 'bg-white';
                                if (ecart > 20) bgEcart = 'bg-green-100';
                                else if (ecart > 10) bgEcart = 'bg-blue-50';
                                else if (ecart < -10) bgEcart = 'bg-red-100';
                                else if (ecart < 0) bgEcart = 'bg-orange-50';

                                return frequentationData?.source === 'PDV' ? (
                                  /* Mode PDV : Affichage détaillé avec 3 lignes par produit (Préco/Histo/%) */
                                  <React.Fragment key={produit}>
                                    {/* Ligne 1 : Préco (préconisation) */}
                                    <tr className="hover:bg-gray-50 border-t-2 border-gray-400">
                                      <td rowSpan="3" className="border border-gray-800 p-2 text-sm font-medium text-left max-w-[300px] align-middle" title={produit}>
                                        {produit}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center text-blue-600 font-semibold text-xs bg-blue-50">
                                        Préco
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center font-bold text-blue-700 bg-green-50">
                                        {afficherAvecArticles(creneaux.matin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center font-bold text-blue-700 bg-yellow-50">
                                        {afficherAvecArticles(creneaux.midi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center font-bold text-blue-700 bg-orange-50">
                                        {afficherAvecArticles(creneaux.soir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center font-bold text-blue-700 bg-blue-100">
                                        {afficherAvecArticles(totalPreco, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td rowSpan="3" className="border border-gray-800 p-2 text-center bg-amber-50 align-middle">
                                        <div className="flex flex-col items-center gap-1">
                                          <div className="text-xs text-gray-600">Stock:</div>
                                          <div className="w-10 h-5 border border-gray-400 bg-white"></div>
                                          <div className="text-xs text-gray-600">À cuire:</div>
                                          <div className="w-10 h-5 border border-gray-400 bg-white"></div>
                                        </div>
                                      </td>
                                    </tr>
                                    {/* Ligne 2 : Histo (historique BVP) */}
                                    <tr className="hover:bg-gray-50">
                                      <td className="border border-gray-800 p-1 text-center text-gray-600 text-xs">
                                        Histo
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center text-gray-600 bg-green-50/30">
                                        {afficherAvecArticles(histoMatin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center text-gray-600 bg-yellow-50/30">
                                        {afficherAvecArticles(histoMidi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center text-gray-600 bg-orange-50/30">
                                        {afficherAvecArticles(histoSoir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                      <td className="border border-gray-800 p-1 text-center text-gray-600 bg-blue-50">
                                        {afficherAvecArticles(ventesHisto, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                      </td>
                                    </tr>
                                    {/* Ligne 3 : Progression (%) */}
                                    <tr className="hover:bg-gray-50">
                                      <td className="border border-gray-800 p-1 text-center text-gray-500 text-xs">
                                        %
                                      </td>
                                      <td className={`border border-gray-800 p-1 text-center text-xs font-semibold ${getProgColor(progMatin)}`}>
                                        {histoMatin > 0 ? `${progMatin >= 0 ? '+' : ''}${progMatin.toFixed(0)}%` : '-'}
                                      </td>
                                      <td className={`border border-gray-800 p-1 text-center text-xs font-semibold ${getProgColor(progMidi)}`}>
                                        {histoMidi > 0 ? `${progMidi >= 0 ? '+' : ''}${progMidi.toFixed(0)}%` : '-'}
                                      </td>
                                      <td className={`border border-gray-800 p-1 text-center text-xs font-semibold ${getProgColor(progSoir)}`}>
                                        {histoSoir > 0 ? `${progSoir >= 0 ? '+' : ''}${progSoir.toFixed(0)}%` : '-'}
                                      </td>
                                      <td className={`border border-gray-800 p-1 text-center text-xs font-semibold ${ecart >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {ventesHisto > 0 ? `${ecart >= 0 ? '+' : ''}${ecart.toFixed(0)}%` : '-'}
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                ) : (
                                  /* Mode BVP : Affichage simple sans historique */
                                  <tr key={produit} className="hover:bg-gray-50">
                                    <td className="border border-gray-800 p-2 text-sm font-medium text-left max-w-[250px] truncate" title={produit}>
                                      {produit}
                                    </td>
                                    <td className="border border-gray-800 p-2 text-center font-bold text-green-700">
                                      {formaterQuantite(creneaux.matin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                    </td>
                                    <td className="border border-gray-800 p-2 text-center font-bold text-yellow-700">
                                      {formaterQuantite(creneaux.midi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                    </td>
                                    <td className="border border-gray-800 p-2 text-center font-bold text-orange-700 bg-yellow-50">
                                      {formaterQuantite(creneaux.soir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                                    </td>
                                    <td className="border border-gray-800 p-2 text-center font-bold text-blue-700 bg-blue-50">
                                      {totalPreco}
                                    </td>
                                    <td className="border border-gray-800 p-2 text-center bg-amber-50">
                                      <div className="flex flex-col items-center gap-1">
                                        <div className="text-xs text-gray-600">Stock:</div>
                                        <div className="w-10 h-5 border border-gray-400 bg-white"></div>
                                        <div className="text-xs text-gray-600">À cuire:</div>
                                        <div className="w-10 h-5 border border-gray-400 bg-white"></div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Ligne de capacité totale pour ce programme */}
                              {frequentationData?.source === 'PDV' ? (
                                <tr className="bg-blue-50 font-bold border-t-4 border-blue-600">
                                  <td className="border border-gray-800 p-2 text-sm text-right">
                                    CAPACITÉ {getNomProgrammeAffiche(programme)}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700"></td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'matin'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'midi'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'soir'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    {calculerTotalJournalier(data.produits)}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    Total
                                  </td>
                                </tr>
                              ) : (
                                <tr className="bg-blue-50 font-bold border-t-4 border-blue-600">
                                  <td className="border border-gray-800 p-2 text-sm text-right">
                                    CAPACITÉ {getNomProgrammeAffiche(programme)}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'matin'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'midi'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    {formaterPlaques(calculerTotalPlaques(data.produits, 'soir'))}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    {calculerTotalJournalier(data.produits)}
                                  </td>
                                  <td className="border border-gray-800 p-2 text-center text-blue-700 bg-blue-100">
                                    Total
                                  </td>
                                </tr>
                              )}
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

          {/* Vue Tablette/Mobile optimisée */}
          {selectedJour && modeTabletActif && (
            <div className="bg-white rounded-lg shadow-md p-4">
              {/* Header avec toggle Unités/Plaques adaptatif */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                  <TouchButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedJour(null)}
                    icon={<ChevronLeft className="w-4 h-4" />}
                    className="border-2 border-gray-300"
                  >
                    Semaine
                  </TouchButton>

                  {/* Toggle Unités/Plaques tactile */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setModeAffichage('unites')}
                      className={`px-4 py-2 rounded-lg transition min-h-[44px] ${modeAffichage === 'unites'
                        ? 'bg-white text-blue-600 font-semibold shadow'
                        : 'text-gray-600'
                        }`}
                    >
                      Unités
                    </button>
                    <button
                      onClick={() => setModeAffichage('plaques')}
                      className={`px-4 py-2 rounded-lg transition min-h-[44px] ${modeAffichage === 'plaques'
                        ? 'bg-white text-blue-600 font-semibold shadow'
                        : 'text-gray-600'
                        }`}
                    >
                      Plaques
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenu avec vue tablette */}
              <PlanningVueTablet
                selectedJour={selectedJour}
                planningLocal={planningLocal}
                modeAffichage={modeAffichage}
                formaterQuantite={formaterQuantite}
                handleModificationManuelle={handleModificationManuelle}
                variantesParRayonEtJour={variantesParRayonEtJour}
                handleChangeVariante={handleChangeVariante}
                onNaviguerJour={handleVoirJour}
              />
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
