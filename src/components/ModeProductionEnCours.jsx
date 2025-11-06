import { useState } from 'react';
import { CheckCircle, Circle, Play, Clock } from 'lucide-react';
import TouchButton from './TouchButton';

/**
 * Mode "Production en cours"
 * Checklist interactive pour suivre l'avancement de la production
 *
 * Props:
 * - rayon: string (BOULANGERIE, VIENNOISERIE, etc.)
 * - programme: string (Cuisson Baguette, etc.)
 * - produits: Array<{libelle, quantite}>
 * - tranche: 'matin' | 'midi' | 'soir'
 * - onProduitCoche: fonction callback
 * - onDemarrer: fonction callback
 */
export default function ModeProductionEnCours({
  rayon,
  programme,
  produits,
  tranche = 'matin',
  onProduitCoche,
  onDemarrer
}) {
  const [produitsFaits, setProduitsFaits] = useState(new Set());
  const [enCours, setEnCours] = useState(false);
  const [heureDebut, setHeureDebut] = useState(null);

  const trancheLabels = {
    matin: '9h-12h',
    midi: '12h-16h',
    soir: '16h-23h'
  };

  const handleToggleProduit = (libelle) => {
    const newSet = new Set(produitsFaits);
    if (newSet.has(libelle)) {
      newSet.delete(libelle);
    } else {
      newSet.add(libelle);
    }
    setProduitsFaits(newSet);

    if (onProduitCoche) {
      onProduitCoche(libelle, !produitsFaits.has(libelle));
    }
  };

  const handleDemarrer = () => {
    setEnCours(true);
    setHeureDebut(new Date());
    if (onDemarrer) {
      onDemarrer();
    }
  };

  const progression = produits.length > 0
    ? Math.round((produitsFaits.size / produits.length) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">{rayon}</h3>
          {enCours && heureDebut && (
            <div className="flex items-center gap-2 bg-white bg-opacity-20 px-3 py-1 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Démarré à {heureDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
        <div className="text-lg font-semibold">{programme}</div>
        <div className="text-sm opacity-90">
          {tranche.charAt(0).toUpperCase() + tranche.slice(1)} {trancheLabels[tranche]}
        </div>
      </div>

      {/* Checklist des produits */}
      <div className="space-y-3 mb-4">
        {produits.map((produit) => {
          const estFait = produitsFaits.has(produit.libelle);

          return (
            <button
              key={produit.libelle}
              onClick={() => handleToggleProduit(produit.libelle)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all
                ${estFait
                  ? 'bg-green-50 border-green-500'
                  : 'bg-white border-gray-300 hover:border-blue-400'
                }
                min-h-[60px]
              `}
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
                  {produit.quantite}
                </div>
              </div>

              {/* Badge "Fait" */}
              {estFait && (
                <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Fait
                </div>
              )}
            </button>
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
          {produitsFaits.size} / {produits.length} programmes
        </div>
      </div>

      {/* Bouton d'action */}
      {!enCours ? (
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
            Durée : {heureDebut ? Math.round((new Date() - heureDebut) / 60000) : 0} minutes
          </div>
        </div>
      ) : (
        <div className="bg-blue-100 border-2 border-blue-600 rounded-lg p-4 text-center">
          <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-pulse" />
          <div className="text-sm font-semibold text-blue-800">Production en cours...</div>
        </div>
      )}
    </div>
  );
}
