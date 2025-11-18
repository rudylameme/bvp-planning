import { useState } from 'react';
import { CheckCircle, Circle, Play, Clock, Package, Trash2 } from 'lucide-react';
import TouchButton from './TouchButton';
import { useProductionStorage } from '../hooks/useProductionStorage';

/**
 * Mode "Production en cours"
 * Checklist interactive pour suivre l'avancement de la production
 *
 * Props:
 * - rayon: string (BOULANGERIE, VIENNOISERIE, etc.)
 * - programme: string (Cuisson Baguette, etc.)
 * - produits: Array<{libelle, quantite}>
 * - jour: string (Lundi, Mardi, etc.)
 * - modeAffichage: 'plaques' | 'unites'
 * - onProduitCoche: fonction callback
 * - onDemarrer: fonction callback
 */
export default function ModeProductionEnCours({
  rayon,
  programme,
  produits,
  jour,
  modeAffichage = 'plaques',
  onProduitCoche,
  onDemarrer,
  trancheActive = 'matin' // Tranche horaire contrôlée de l'extérieur
}) {
  // Utilisation du hook de persistance
  const {
    data,
    toggleProduit,
    setStockRayon,
    setCasse,
    demarrerProduction
  } = useProductionStorage(jour, rayon, programme);

  const trancheLabels = {
    matin: '9h-12h',
    midi: '12h-16h',
    'apres-midi': '16h-23h',
    casse: 'Invendus'
  };

  // Déterminer l'unité selon le mode d'affichage
  const unite = modeAffichage === 'plaques' ? 'Pl.' : 'u.';

  const handleToggleProduit = (libelle) => {
    const estCoche = data.produitsCoches[trancheActive]?.includes(libelle) || false;
    toggleProduit(libelle, trancheActive);
    if (onProduitCoche) {
      onProduitCoche(libelle, !estCoche);
    }
  };

  const handleDemarrer = () => {
    demarrerProduction();
    if (onDemarrer) {
      onDemarrer();
    }
  };

  const handleStockChange = (libelle, valeur) => {
    const valeurNumerique = parseFloat(valeur) || 0;
    setStockRayon(libelle, valeurNumerique);
  };

  const handleCasseChange = (libelle, valeur) => {
    const valeurNumerique = parseFloat(valeur) || 0;
    setCasse(libelle, valeurNumerique);
  };

  // DEBUG: Afficher la clé de stockage utilisée
  const storageKey = `production_${jour}_${rayon}_${programme}`;
  const handleDebugLocalStorage = () => {
    console.log('=== DEBUG LOCALSTORAGE ===');
    console.log('Clé:', storageKey);
    console.log('Données:', data);
    console.log('Toutes les clés de production:',
      Object.keys(localStorage).filter(k => k.startsWith('production_'))
    );
  };

  const handleResetProduction = () => {
    if (confirm(`Voulez-vous réinitialiser la production pour ${rayon} - ${programme} - ${jour} ?`)) {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }
  };

  /**
   * Extrait la valeur numérique d'une quantité (ex: "2.5 Pl." → 2.5)
   */
  const extraireQuantiteNumerique = (quantiteTexte) => {
    if (!quantiteTexte) return 0;
    const match = quantiteTexte.toString().match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  /**
   * Calcule la quantité à cuire : Prévision - Stock rayon
   */
  const calculerQuantiteACuire = (produit) => {
    const prevision = extraireQuantiteNumerique(produit.quantite);
    const stock = data.stocksRayon[produit.libelle] || 0;
    const aCuire = Math.max(0, prevision - stock); // Ne peut pas être négatif
    return {
      prevision,
      stock,
      aCuire
    };
  };

  // Calculer la progression pour la tranche active uniquement
  const produitsTrancheActuelle = data.produitsCoches[trancheActive] || [];
  const progression = produits.length > 0
    ? Math.round((produitsTrancheActuelle.length / produits.length) * 100)
    : 0;

  const modeCasse = trancheActive === 'casse';

  // Couleurs du bandeau selon la tranche active
  const couleursHeader = {
    matin: 'bg-gradient-to-r from-sky-400 to-sky-500',
    midi: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    'apres-midi': 'bg-gradient-to-r from-orange-500 to-orange-600',
    casse: 'bg-gradient-to-r from-red-600 to-red-700'
  };

  const texteCouleurHeader = {
    matin: 'text-white',
    midi: 'text-gray-900',
    'apres-midi': 'text-white',
    casse: 'text-white'
  };

  const couleurBordure = {
    matin: 'border-sky-500',
    midi: 'border-yellow-500',
    'apres-midi': 'border-orange-600',
    casse: 'border-red-600'
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${couleurBordure[trancheActive] || 'border-blue-500'} p-4`}>
      {/* Header */}
      <div className={`${couleursHeader[trancheActive] || 'bg-gradient-to-r from-blue-600 to-blue-700'} ${texteCouleurHeader[trancheActive] || 'text-white'} rounded-lg p-4 mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{rayon}</h3>
          {data.enCours && data.heureDebut && (
            <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Démarré à {new Date(data.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
        <div className="text-lg font-semibold">{programme}</div>
      </div>

      {/* Résumé des autres tranches */}
      {!modeCasse && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
          {['matin', 'midi', 'apres-midi'].map((tranche) => {
            const produitsTrancheList = data.produitsCoches[tranche] || [];
            const estTrancheActuelle = tranche === trancheActive;

            return (
              <div
                key={tranche}
                className={`p-2 rounded-lg border-2 ${
                  estTrancheActuelle
                    ? 'bg-blue-100 border-blue-500'
                    : produitsTrancheList.length > 0
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`font-semibold ${estTrancheActuelle ? 'text-blue-800' : 'text-gray-700'}`}>
                  {tranche === 'matin' ? 'Matin' : tranche === 'midi' ? 'Midi' : 'Après-midi'}
                </div>
                <div className={`text-xs ${estTrancheActuelle ? 'text-blue-600' : 'text-gray-600'}`}>
                  {produitsTrancheList.length} / {produits.length} faits
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checklist des produits */}
      <div className="space-y-4 mb-4">
        {produits.map((produit) => {
          const estFait = data.produitsCoches[trancheActive]?.includes(produit.libelle) || false;
          const { prevision, stock, aCuire } = calculerQuantiteACuire(produit);
          const estDerniereCuisson = trancheActive === 'apres-midi';
          const casseValue = data.casse[produit.libelle] || 0;

          return (
            <div
              key={produit.libelle}
              className={`
                rounded-lg border-2 transition-all overflow-hidden
                ${estFait
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-gray-300'
                }
              `}
            >
              {/* Header produit avec checkbox */}
              <button
                onClick={() => handleToggleProduit(produit.libelle)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]"
              >
                {/* Checkbox */}
                {estFait ? (
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-8 h-8 text-gray-400 flex-shrink-0" />
                )}

                {/* Infos produit */}
                <div className="flex-1 text-left">
                  <div className={`text-lg font-semibold ${estFait ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                    {produit.libelle}
                  </div>
                  <div className={`text-sm ${estFait ? 'text-green-600' : 'text-gray-600'}`}>
                    Prévision: {produit.quantite}
                  </div>
                </div>

                {/* Badge "Fait" */}
                {estFait && (
                  <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Fait
                  </div>
                )}
              </button>

              {/* Section stock et calcul (uniquement pour après-midi) */}
              {trancheActive === 'apres-midi' && !estFait && !modeCasse && (
                <div className="px-4 pb-4 pt-2 border-t-2 border-dashed border-gray-200 bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Gestion Stock Rayon</span>
                  </div>

                  {/* Grille de calcul */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Prévision */}
                    <div className="bg-white rounded-lg p-3 border border-gray-300">
                      <div className="text-xs text-gray-600 mb-1">Prévision</div>
                      <div className="text-xl font-bold text-gray-900">{prevision.toFixed(1)} {unite}</div>
                    </div>

                    {/* Stock rayon (saisie agrandie) */}
                    <div className="bg-white rounded-lg p-3 border-2 border-orange-400">
                      <label className="text-xs text-orange-700 font-semibold mb-1 block">Stock rayon</label>
                      <input
                        type="number"
                        inputMode={modeAffichage === 'plaques' ? 'decimal' : 'numeric'}
                        step={modeAffichage === 'plaques' ? '0.5' : '1'}
                        min="0"
                        value={stock || ''}
                        onChange={(e) => handleStockChange(produit.libelle, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-2xl font-bold text-orange-600 bg-transparent border-none outline-none p-0 min-h-[48px]"
                        placeholder="0"
                      />
                    </div>

                    {/* Quantité à cuire */}
                    <div className={`rounded-lg p-3 border-2 ${
                      aCuire > 0 ? 'bg-green-100 border-green-600' : 'bg-gray-100 border-gray-400'
                    }`}>
                      <div className="text-xs text-gray-700 mb-1">À cuire</div>
                      <div className={`text-xl font-bold ${
                        aCuire > 0 ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {aCuire.toFixed(modeAffichage === 'plaques' ? 1 : 0)} {unite}
                      </div>
                    </div>
                  </div>

                  {/* Formule de calcul */}
                  <div className="mt-2 text-center text-xs text-gray-600">
                    {prevision.toFixed(modeAffichage === 'plaques' ? 1 : 0)} - {stock.toFixed(modeAffichage === 'plaques' ? 1 : 0)} = <span className="font-bold text-green-700">{aCuire.toFixed(modeAffichage === 'plaques' ? 1 : 0)} {unite}</span>
                  </div>
                </div>
              )}

              {/* Section casse (mode invendus) */}
              {modeCasse && (
                <div className="px-4 pb-4 pt-2 border-t-2 border-dashed border-gray-200 bg-red-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Invendus de la veille</span>
                  </div>

                  {/* Saisie de casse */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-300">
                      <div className="text-xs text-gray-600 mb-1">Prévision initiale</div>
                      <div className="text-lg font-bold text-gray-900">{produit.quantite}</div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border-2 border-red-400">
                      <label className="text-xs text-red-700 font-semibold mb-1 block">Invendus</label>
                      <input
                        type="number"
                        inputMode={modeAffichage === 'plaques' ? 'decimal' : 'numeric'}
                        step={modeAffichage === 'plaques' ? '0.5' : '1'}
                        min="0"
                        value={casseValue || ''}
                        onChange={(e) => handleCasseChange(produit.libelle, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-2xl font-bold text-red-600 bg-transparent border-none outline-none p-0 min-h-[48px]"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-center text-xs text-red-600">
                    Enregistrez les quantités non vendues du jour précédent
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Progression</span>
          <span className="text-lg font-bold text-blue-600">{progression}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progression}%` }}
          />
        </div>
        <div className="mt-2 text-center text-sm text-gray-600">
          {produitsTrancheActuelle.length} / {produits.length} produits
        </div>
      </div>

      {/* Bouton d'action */}
      {!data.enCours ? (
        <TouchButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleDemarrer}
          icon={<Play className="w-5 h-5" />}
        >
          Démarrer la production
        </TouchButton>
      ) : progression === 100 ? (
        <div className="bg-green-100 border-2 border-green-600 rounded-lg p-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <div className="text-lg font-bold text-green-800">Production terminée !</div>
          <div className="text-sm text-green-700 mt-1">
            Durée : {data.heureDebut ? Math.round((new Date() - new Date(data.heureDebut)) / 60000) : 0} minutes
          </div>
        </div>
      ) : (
        <div className="bg-blue-100 border-2 border-blue-600 rounded-lg p-4 text-center">
          <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-pulse" />
          <div className="text-sm font-semibold text-blue-800">Production en cours...</div>
        </div>
      )}

      {/* Boutons de debug (mode développement) */}
      <div className="mt-4 flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={handleDebugLocalStorage}
          className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
        >
          🔍 Debug Storage
        </button>
        <button
          onClick={handleResetProduction}
          className="flex-1 px-2 py-1 bg-red-200 text-red-700 rounded text-xs hover:bg-red-300"
        >
          🗑️ Reset
        </button>
      </div>
    </div>
  );
}
