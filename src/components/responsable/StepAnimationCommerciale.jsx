import { useState, useEffect, useMemo } from 'react';
import { Tag, Calendar } from 'lucide-react';
import { getProchainMercredi, getMardiSuivant } from './animation/utils';
import EditeurPromotion from './animation/EditeurPromotion';
import ListePromotions from './animation/ListePromotions';
import ProduitsExceptionnels from './animation/ProduitsExceptionnels';
import ImpactPrevisionnel from './animation/ImpactPrevisionnel';

/**
 * StepAnimationCommerciale - Étape 4 du Wizard Responsable
 * Gère les promotions de la semaine avec calcul automatique de l'élasticité
 *
 * FORMULE MARGE MOUSQUETAIRES :
 * Marge % = (PV HT - PA HT) / PV TTC
 * Donc : PA HT = PV HT - (Marge% × PV TTC)
 * Marge unitaire € = Marge% × PV TTC
 *
 * Exemple : PV TTC = 1,79€, TVA = 5,5%, Marge = 42,3%
 * - PV HT = 1,79 / 1,055 = 1,70€
 * - PA HT = 1,70 - (0,423 × 1,79) = 1,70 - 0,76 = 0,94€
 * - Marge € = 0,423 × 1,79 = 0,76€
 * - Vérif : (1,70 - 0,94) / 1,79 = 0,76 / 1,79 = 42,5% ✓
 */

export default function StepAnimationCommerciale({
  produits = [],
  promosActives = [],
  setPromosActives,
  produitsExceptionnels = [],
  setProduitsExceptionnels,
  periodePromo,
  setPeriodePromo
}) {
  // State partagé
  const [erreur, setErreur] = useState(null);

  // === VALIDATION DES QUANTITES ===
  const [quantitesValidees, setQuantitesValidees] = useState(false);

  // Réinitialiser la validation quand les quantités changent
  useEffect(() => {
    setQuantitesValidees(false);
  }, [promosActives, produitsExceptionnels]);

  // Initialiser la période promo si non définie
  useEffect(() => {
    if (!periodePromo || !periodePromo.debut) {
      const debut = getProchainMercredi();
      setPeriodePromo({
        debut,
        fin: getMardiSuivant(debut)
      });
    }
  }, [periodePromo, setPeriodePromo]);

  // Handler pour modifier la période promo
  const handlePeriodeChange = (type, value) => {
    if (type === 'debut') {
      // Quand on change le début, recalculer la fin (+6 jours)
      const nouvelleFin = getMardiSuivant(value);
      setPeriodePromo({ debut: value, fin: nouvelleFin });
    } else {
      setPeriodePromo({ ...periodePromo, fin: value });
    }
  };

  // Calcul de l'impact global (utilise qteValidee si modifiée, sinon qteObjectif)
  const impactGlobal = useMemo(() => {
    let caSupplementaire = 0;
    let diffMargeTotale = 0;
    let qteSupplementaire = 0;
    let nbQteAjustee = 0;

    promosActives.forEach(promo => {
      // Utiliser la qté validée par l'opérateur (fallback sur objectif)
      const qteValidee = promo.qteValidee ?? promo.qteObjectif;
      const qteNormalePeriode = promo.qteNormalePeriode || (promo.qteNormaleHebdo / 7 * (promo.nbJoursPromo || 7));

      // Quantité supplémentaire basée sur la qté validée
      const qteSupp = qteValidee - Math.ceil(qteNormalePeriode);
      qteSupplementaire += qteSupp;

      // CA supplémentaire = quantités en plus × prix promo
      caSupplementaire += qteSupp * promo.prixPromoTTC;

      // Différence de marge basée sur la qté validée
      const margeTotaleNormale = promo.margeNormaleEuros * qteNormalePeriode;
      const margeTotalePromo = promo.margePromoEuros * qteValidee;
      diffMargeTotale += margeTotalePromo - margeTotaleNormale;

      // Compter les produits avec qté validée différente de l'objectif
      if (qteValidee !== promo.qteObjectif) {
        nbQteAjustee++;
      }
    });

    // Impact des produits exceptionnels
    let caExceptionnels = 0;
    let qteExceptionnels = 0;
    let margeExceptionnels = 0;
    produitsExceptionnels.forEach(prod => {
      const qteVal = prod.qteValidee ?? prod.qteTotale;
      caExceptionnels += qteVal * prod.prix;
      qteExceptionnels += qteVal;
      const margeU = prod.margeEuros || (prod.margePct || 40) / 100 * prod.prix;
      margeExceptionnels += margeU * qteVal;
    });

    diffMargeTotale += margeExceptionnels;

    return {
      caSupplementaire: caSupplementaire.toFixed(2),
      caExceptionnels: caExceptionnels.toFixed(2),
      diffMargeTotale: diffMargeTotale.toFixed(2),
      qteSupplementaire: Math.round(qteSupplementaire),
      qteExceptionnels: Math.round(qteExceptionnels),
      nbQteAjustee,
      nbExceptionnels: produitsExceptionnels.length
    };
  }, [promosActives, produitsExceptionnels]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#58595B] flex items-center gap-2">
          <Tag className="w-6 h-6 text-[#ED1C24]" />
          Animation Commerciale
        </h2>
        <p className="text-gray-600 mt-1">
          Gérez les promotions de la semaine et calculez automatiquement les quantités objectif
        </p>
      </div>

      {/* Période par défaut (valeurs utilisées pour les nouveaux produits) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 text-amber-800">
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Période par défaut :</span>

          {/* Date de début */}
          <div className="flex items-center gap-1">
            <span className="text-sm">Du</span>
            <input
              type="date"
              value={periodePromo?.debut || ''}
              onChange={(e) => handlePeriodeChange('debut', e.target.value)}
              className="px-2 py-1 border border-amber-300 rounded-md bg-white text-amber-800 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Date de fin */}
          <div className="flex items-center gap-1">
            <span className="text-sm">au</span>
            <input
              type="date"
              value={periodePromo?.fin || ''}
              onChange={(e) => handlePeriodeChange('fin', e.target.value)}
              min={periodePromo?.debut}
              className="px-2 py-1 border border-amber-300 rounded-md bg-white text-amber-800 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Indication */}
          <span className="text-xs text-amber-600 ml-2">
            (Dates pré-remplies pour les nouveaux produits, modifiables individuellement)
          </span>
        </div>
      </div>

      {/* Formulaire d'ajout de promo */}
      <EditeurPromotion
        produits={produits}
        promosActives={promosActives}
        setPromosActives={setPromosActives}
        periodePromo={periodePromo}
        erreur={erreur}
        setErreur={setErreur}
      />

      {/* Liste des promos actives */}
      <ListePromotions
        promosActives={promosActives}
        setPromosActives={setPromosActives}
        quantitesValidees={quantitesValidees}
      />

      {/* Produits exceptionnels */}
      <ProduitsExceptionnels
        produitsExceptionnels={produitsExceptionnels}
        setProduitsExceptionnels={setProduitsExceptionnels}
        erreur={erreur}
        setErreur={setErreur}
      />

      {/* Impact prévisionnel + Bouton Valider */}
      <ImpactPrevisionnel
        promosActives={promosActives}
        produitsExceptionnels={produitsExceptionnels}
        impactGlobal={impactGlobal}
        quantitesValidees={quantitesValidees}
        setQuantitesValidees={setQuantitesValidees}
      />

      {/* Message si aucune promo */}
      {promosActives.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            Aucune promotion cette semaine.
            <br />
            <span className="text-sm">Vous pouvez passer à l'étape suivante ou ajouter des produits en promo.</span>
          </p>
        </div>
      )}
    </div>
  );
}
