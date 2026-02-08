/**
 * Logique de sauvegarde des programmes (renommages et persistance)
 * Extraite de PlanningJour.jsx - aucune modification de logique
 */
import { PRODUITS_MODIFIES_KEY, PROGRAMMES_KEY } from './constants';

/**
 * Gère le renommage des programmes et la persistance.
 * Retourne { newModifs, nouveauxProgrammes } pour que l'appelant puisse mettre à jour l'état.
 */
export function processSaveProgrammes(
  nouveauxProgrammes,
  programmesActuels,
  produitsModifies,
  produitsOriginaux,
) {
  const renommages = {};

  // Détecter les renommages (même index, nom différent)
  programmesActuels.forEach((ancien, index) => {
    const nouveau = nouveauxProgrammes[index];
    if (nouveau && ancien !== nouveau) {
      renommages[ancien] = nouveau;
    }
  });

  let newModifs = produitsModifies;

  // Mettre à jour les produits modifiés avec les nouveaux noms de programmes
  if (Object.keys(renommages).length > 0) {
    newModifs = { ...produitsModifies };

    // Mettre à jour les produits déjà modifiés
    Object.keys(newModifs).forEach(produitId => {
      const modif = newModifs[produitId];
      if (modif.programme && renommages[modif.programme]) {
        newModifs[produitId] = {
          ...modif,
          programme: renommages[modif.programme]
        };
      }
    });

    // Mettre à jour les produits originaux qui utilisent les anciens noms
    produitsOriginaux.forEach(produit => {
      if (produit.programme && renommages[produit.programme] && !newModifs[produit.id]) {
        newModifs[produit.id] = {
          libelle: produit.libellePersonnalise || produit.libelle,
          famille: produit.famille,
          programme: renommages[produit.programme],
          plu: produit.plu || '',
          unitesParPlaque: produit.unitesParPlaque || 0,
        };
      }
    });
  }

  // Persister
  if (newModifs !== produitsModifies) {
    localStorage.setItem(PRODUITS_MODIFIES_KEY, JSON.stringify(newModifs));
  }
  localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(nouveauxProgrammes));

  return { newModifs, hasRenommages: newModifs !== produitsModifies };
}
