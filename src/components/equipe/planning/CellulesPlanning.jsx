/**
 * Composants cellules et utilitaires pour le planning
 * Extraits de PlanningJour.jsx - aucune modification de logique
 */

/**
 * Convertir une valeur en plaques si nécessaire (retourne le nombre)
 */
export const convertirEnPlaques = (valeur, unitesParPlaque, affichage) => {
  if (affichage === 'plaques' && unitesParPlaque > 0) {
    return Math.ceil(valeur / unitesParPlaque);
  }
  return valeur;
};

/**
 * Calculer l'écart en pourcentage
 */
export const calculerEcart = (preco, histo) => {
  if (!histo || histo === 0) return null;
  return Math.round(((preco - histo) / histo) * 100);
};

/**
 * Obtenir la couleur de l'écart selon les seuils
 */
export const getEcartColor = (ecart) => {
  if (ecart === null) return 'text-gray-400';
  if (ecart > 20) return 'text-green-600 bg-green-50';
  if (ecart > 10) return 'text-blue-600 bg-blue-50';
  if (ecart >= -10) return 'text-gray-600 bg-gray-50';
  return 'text-orange-600 bg-orange-50';
};

/**
 * Formater l'écart avec signe
 */
export const formatEcart = (ecart) => {
  if (ecart === null) return '-';
  const signe = ecart > 0 ? '+' : '';
  return `${signe}${ecart}%`;
};

/**
 * Composant pour afficher une cellule simple (valeur uniquement)
 */
export function CelluleSimple({ valeur, variant = 'preco', isPlaque = false }) {
  const bgClasses = {
    preco: 'bg-blue-50 text-blue-700',
    histo: 'bg-gray-100 text-gray-600',
    ecart: '' // La couleur est gérée dynamiquement
  };

  // Afficher "Pl." si c'est une valeur en plaques
  const displayValue = isPlaque && valeur !== '-' && valeur !== null
    ? `${valeur} Pl.`
    : valeur;

  return (
    <span className={`inline-block px-2 py-0.5 rounded font-medium text-sm min-w-[32px] ${bgClasses[variant]}`}>
      {displayValue}
    </span>
  );
}

/**
 * Composant pour afficher une cellule d'écart avec couleur
 */
export function CelluleEcart({ ecart }) {
  const colorClass = getEcartColor(ecart);
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-medium text-sm min-w-[32px] ${colorClass}`}>
      {formatEcart(ecart)}
    </span>
  );
}

/**
 * Composant pour afficher une cellule de quantité compacte (mode BVP - 1 ligne)
 */
export function CelluleQuantite({ preco, unitesParPlaque, affichage, variant = 'tranches', isActif = false }) {
  const isPlaque = affichage === 'plaques';

  // En mode plaques, vérifier si le produit a des unités par plaque
  if (isPlaque && (!unitesParPlaque || unitesParPlaque === 0)) {
    return (
      <div className="text-center">
        <span className="inline-block bg-gray-100 text-gray-400 px-3 py-1 rounded font-semibold min-w-[40px]">
          -
        </span>
      </div>
    );
  }

  const valeur = convertirEnPlaques(preco, unitesParPlaque, affichage);
  const displayValue = isPlaque ? `${valeur} Pl.` : valeur;

  // Couleurs selon le variant et si c'est le créneau actif
  let bgClass;
  if (isActif) {
    bgClass = 'bg-[#8B1538] text-white';
  } else if (variant === 'journalier') {
    bgClass = 'bg-green-50 text-green-700';
  } else {
    bgClass = 'bg-blue-50 text-blue-700';
  }

  return (
    <div className="text-center">
      <span className={`inline-block ${bgClass} px-3 py-1 rounded font-semibold min-w-[40px]`}>
        {displayValue}
      </span>
    </div>
  );
}
