import { useState, useMemo } from 'react';
import { Printer, Grid3X3 } from 'lucide-react';

// Jours de la semaine
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Tranches horaires
const TRANCHES = ['avant12h', '12h-14h', '14h-16h', 'apres16h'];
const TRANCHES_LABELS = ['Avant 12h', '12h-14h', '14h-16h', 'Après 16h'];

// Icônes et couleurs par famille
const FAMILLES_CONFIG = {
  BOULANGERIE: { icon: '🥖', bg: 'bg-stone-700', headerBg: 'bg-stone-800' },
  VIENNOISERIE: { icon: '🥐', bg: 'bg-amber-600', headerBg: 'bg-amber-700' },
  PATISSERIE: { icon: '🍰', bg: 'bg-rose-600', headerBg: 'bg-rose-700' },
  SNACKING: { icon: '🥪', bg: 'bg-emerald-600', headerBg: 'bg-emerald-700' },
  NEGOCE: { icon: '📦', bg: 'bg-cyan-600', headerBg: 'bg-cyan-700' },
  AUTRE: { icon: '📋', bg: 'bg-slate-600', headerBg: 'bg-slate-700' }
};

// Obtenir le jour actuel (index 0-6)
const getJourActuel = () => {
  const dayIndex = new Date().getDay();
  // En JS, dimanche = 0, on convertit pour que lundi = 0
  return dayIndex === 0 ? 6 : dayIndex - 1;
};

/**
 * Convertir une valeur en plaques si nécessaire (retourne le nombre)
 */
const convertirEnPlaques = (valeur, unitesParPlaque, affichage) => {
  if (affichage === 'plaques' && unitesParPlaque > 0) {
    return Math.ceil(valeur / unitesParPlaque);
  }
  return valeur;
};

/**
 * Formater une quantité avec "Pl." si en mode plaques
 */
const formatQuantiteAvecUnite = (valeur, unitesParPlaque, affichage) => {
  if (affichage === 'plaques') {
    if (!unitesParPlaque || unitesParPlaque === 0) return '-';
    const nbPlaques = Math.ceil(valeur / unitesParPlaque);
    return `${nbPlaques} Pl.`;
  }
  return valeur;
};

/**
 * Formater un nombre de plaques déjà calculé avec "Pl."
 */
const formatPlaques = (nbPlaques, affichage) => {
  if (affichage === 'plaques') {
    return `${nbPlaques} Pl.`;
  }
  return nbPlaques;
};

/**
 * Calculer l'écart en pourcentage
 */
const calculerEcart = (preco, histo) => {
  if (!histo || histo === 0) return null;
  return Math.round(((preco - histo) / histo) * 100);
};

/**
 * Obtenir la couleur de l'écart selon les seuils
 */
const getEcartColor = (ecart) => {
  if (ecart === null) return 'text-gray-400';
  if (ecart > 20) return 'text-green-600 bg-green-50';
  if (ecart > 10) return 'text-blue-600 bg-blue-50';
  if (ecart >= -10) return 'text-gray-600 bg-gray-50';
  return 'text-orange-600 bg-orange-50';
};

/**
 * Formater l'écart avec signe
 */
const formatEcart = (ecart) => {
  if (ecart === null) return '-';
  const signe = ecart > 0 ? '+' : '';
  return `${signe}${ecart}%`;
};

/**
 * Composant pour afficher une cellule simple (valeur uniquement)
 */
function CelluleSimple({ valeur, variant = 'preco', isPlaque = false }) {
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
function CelluleEcart({ ecart }) {
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
function CelluleQuantite({ preco, unitesParPlaque, affichage, variant = 'tranches' }) {
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

  const bgClass = variant === 'journalier'
    ? 'bg-green-50 text-green-700'
    : 'bg-blue-50 text-blue-700';

  return (
    <div className="text-center">
      <span className={`inline-block ${bgClass} px-3 py-1 rounded font-semibold min-w-[40px]`}>
        {displayValue}
      </span>
    </div>
  );
}

/**
 * Composant Planning du Jour pour l'équipe
 * Affiche les quantités à produire par tranche horaire selon la fréquentation
 */
export default function PlanningJour({ donneesMagasin }) {
  // Sélectionner le jour actuel par défaut
  const [jourSelectionne, setJourSelectionne] = useState(JOURS[getJourActuel()]);
  const [affichage, setAffichage] = useState('unites'); // 'unites' ou 'plaques'

  const { configuration, frequentation, produits } = donneesMagasin;

  // Déterminer si on affiche l'historique (seulement en mode PDV)
  const baseCalcul = configuration?.baseCalcul || 'PDV';
  const showHisto = baseCalcul === 'PDV';

  // Grouper les produits par famille, puis par programme
  const produitsParFamille = useMemo(() => {
    const groupes = {};

    produits
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const famille = produit.famille || 'AUTRE';
        if (!groupes[famille]) {
          groupes[famille] = {
            parProgramme: {},
            tous: []
          };
        }

        const programme = produit.programme || 'Sans programme';
        if (!groupes[famille].parProgramme[programme]) {
          groupes[famille].parProgramme[programme] = [];
        }

        groupes[famille].parProgramme[programme].push(produit);
        groupes[famille].tous.push(produit);
      });

    // Trier les produits par potentiel décroissant dans chaque groupe
    Object.values(groupes).forEach(groupe => {
      Object.values(groupe.parProgramme).forEach(prods => {
        prods.sort((a, b) => (b.potentiel || 0) - (a.potentiel || 0));
      });
      groupe.tous.sort((a, b) => (b.potentiel || 0) - (a.potentiel || 0));
    });

    return groupes;
  }, [produits]);

  // Calculer les quantités pour un produit avec historique
  const calculerQuantites = (produit, jour) => {
    const poidsJour = frequentation?.parJour?.[jour]?.poids || (1 / 7);
    const potentielJour = Math.ceil((produit.potentiel || 0) * poidsJour);

    // Historique (si disponible)
    const historiqueJour = produit.historiqueHebdo
      ? Math.ceil(produit.historiqueHebdo * poidsJour)
      : null;

    const modeRepartition = configuration?.repartitionParFamille?.[produit.famille] || 'journalier';

    if (modeRepartition === 'tranches' && frequentation?.parJour?.[jour]?.tranches) {
      const tranchesData = frequentation.parJour[jour].tranches;

      return {
        mode: 'tranches',
        tranches: {
          'avant12h': {
            preco: Math.ceil(potentielJour * (tranchesData['avant12h']?.poids || 0.25)),
            histo: historiqueJour ? Math.ceil(historiqueJour * (tranchesData['avant12h']?.poids || 0.25)) : null
          },
          '12h-14h': {
            preco: Math.ceil(potentielJour * (tranchesData['12h-14h']?.poids || 0.15)),
            histo: historiqueJour ? Math.ceil(historiqueJour * (tranchesData['12h-14h']?.poids || 0.15)) : null
          },
          '14h-16h': {
            preco: Math.ceil(potentielJour * (tranchesData['14h-16h']?.poids || 0.15)),
            histo: historiqueJour ? Math.ceil(historiqueJour * (tranchesData['14h-16h']?.poids || 0.15)) : null
          },
          'apres16h': {
            preco: Math.ceil(potentielJour * (tranchesData['apres16h']?.poids || 0.45)),
            histo: historiqueJour ? Math.ceil(historiqueJour * (tranchesData['apres16h']?.poids || 0.45)) : null
          }
        },
        total: { preco: potentielJour, histo: historiqueJour }
      };
    } else {
      return {
        mode: 'journalier',
        journalier: { preco: potentielJour, histo: historiqueJour },
        total: { preco: potentielJour, histo: historiqueJour }
      };
    }
  };

  // Convertir en plaques si nécessaire (pour les totaux)
  const formatQuantite = (qte, unitesParPlaque) => {
    if (affichage === 'plaques') {
      if (!unitesParPlaque || unitesParPlaque === 0) return '-';
      return Math.ceil(qte / unitesParPlaque);
    }
    return qte;
  };

  // Vérifier si le jour est fermé
  const isJourFerme = (jour) => {
    return configuration?.horaires?.[jour]?.ferme === true;
  };

  // Obtenir la date du jour sélectionné
  const getDateJour = (jour) => {
    if (!configuration?.dateDebut) return jour;

    const dateDebut = new Date(configuration.dateDebut);
    const indexJour = JOURS.indexOf(jour);
    const date = new Date(dateDebut);
    date.setDate(date.getDate() + indexJour);

    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculer les totaux par tranche pour une famille
  const calculerTotauxFamille = (produitsFamille, jour, modeRepartition) => {
    if (modeRepartition === 'tranches') {
      const totaux = {
        'avant12h': { preco: 0, histo: 0 },
        '12h-14h': { preco: 0, histo: 0 },
        '14h-16h': { preco: 0, histo: 0 },
        'apres16h': { preco: 0, histo: 0 },
        total: { preco: 0, histo: 0 }
      };

      produitsFamille.forEach(produit => {
        const qtes = calculerQuantites(produit, jour);
        TRANCHES.forEach(t => {
          totaux[t].preco += qtes.tranches[t].preco || 0;
          totaux[t].histo += qtes.tranches[t].histo || 0;
        });
        totaux.total.preco += qtes.total.preco || 0;
        totaux.total.histo += qtes.total.histo || 0;
      });

      return totaux;
    } else {
      let totalPreco = 0;
      let totalHisto = 0;
      produitsFamille.forEach(produit => {
        const qtes = calculerQuantites(produit, jour);
        totalPreco += qtes.total.preco || 0;
        totalHisto += qtes.total.histo || 0;
      });
      return { total: { preco: totalPreco, histo: totalHisto } };
    }
  };

  // Imprimer le planning
  const handlePrint = () => {
    window.print();
  };

  // Ordre des familles pour l'affichage
  const ordreFamilles = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'NEGOCE', 'AUTRE'];
  const famillesPresentes = ordreFamilles.filter(f => produitsParFamille[f]);

  return (
    <div className="p-4 space-y-4 print:p-2">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#58595B] print:text-xl">Planning du Jour</h1>
          <p className="text-gray-600 capitalize">
            📅 {getDateJour(jourSelectionne)} (S{configuration?.semaine})
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          {/* Toggle Unités / Plaques */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAffichage('unites')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                affichage === 'unites'
                  ? 'bg-white shadow text-[#58595B]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
            >
              Unités
            </button>
            <button
              onClick={() => setAffichage('plaques')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                affichage === 'plaques'
                  ? 'bg-white shadow text-[#58595B]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Plaques
            </button>
          </div>

          {/* Bouton imprimer */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#58595B] text-white rounded-lg hover:bg-[#58595B]/80 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Légende format 3 lignes (si base PDV) */}
      {showHisto && !isJourFerme(jourSelectionne) && (
        <div className="text-xs bg-gray-50 px-3 py-2 rounded-lg print:hidden flex flex-wrap gap-4 items-center">
          <span className="font-medium text-gray-600">Format 3 lignes :</span>
          <span className="text-blue-600">Préco = Prévisionnel</span>
          <span className="text-gray-600">Histo = Historique ventes</span>
          <span className="text-gray-600">% = Écart préco/histo</span>
          <span className="border-l border-gray-300 pl-4 flex gap-2">
            <span className="text-green-600">&gt;+20%</span>
            <span className="text-blue-600">+10 à +20%</span>
            <span className="text-gray-500">±10%</span>
            <span className="text-orange-600">&lt;-10%</span>
          </span>
        </div>
      )}

      {/* Sélecteur de jour */}
      <div className="flex gap-2 bg-white p-2 rounded-lg shadow print:hidden">
        {JOURS.map((jour, index) => (
          <button
            key={jour}
            onClick={() => !isJourFerme(jour) && setJourSelectionne(jour)}
            disabled={isJourFerme(jour)}
            className={`flex-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
              jourSelectionne === jour
                ? 'bg-[#ED1C24] text-white'
                : isJourFerme(jour)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 text-[#58595B] hover:bg-gray-100'
            }`}
          >
            {JOURS_LABELS[index]}
          </button>
        ))}
      </div>

      {/* Message si jour fermé */}
      {isJourFerme(jourSelectionne) ? (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">🚫 Magasin fermé ce jour</p>
        </div>
      ) : (
        /* Tableaux par famille */
        <div className="space-y-6 print:space-y-4">
          {famillesPresentes.map(famille => {
            const config = FAMILLES_CONFIG[famille] || FAMILLES_CONFIG.AUTRE;
            const groupe = produitsParFamille[famille];
            const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
            const totaux = calculerTotauxFamille(groupe.tous, jourSelectionne, modeRepartition);

            return (
              <div key={famille} className="bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-300">
                {/* En-tête famille */}
                <div className={`${config.headerBg} text-white px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="font-semibold">{famille}</span>
                    {modeRepartition === 'journalier' && (
                      <span className="text-sm text-white/70 ml-2">(Journalier)</span>
                    )}
                  </div>
                  <span className="text-sm text-white/80">
                    {groupe.tous.length} produit{groupe.tous.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tableau */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[200px]">
                          Produit
                        </th>
                        {/* Colonne Type (Préco/Histo/%) en mode PDV seulement */}
                        {showHisto && (
                          <th className="text-center px-2 py-3 font-medium text-gray-600 w-16">
                            Type
                          </th>
                        )}
                        {modeRepartition === 'tranches' ? (
                          <>
                            {TRANCHES_LABELS.map(label => (
                              <th key={label} className="text-center px-3 py-3 font-medium text-gray-600 min-w-[80px]">
                                {label}
                              </th>
                            ))}
                            <th className="text-center px-3 py-3 font-medium text-gray-800 bg-gray-100 min-w-[80px]">
                              Total
                            </th>
                          </>
                        ) : (
                          <th className="text-center px-4 py-3 font-medium text-gray-600 min-w-[120px]">
                            Quantité Jour
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Grouper par programme */}
                      {Object.entries(groupe.parProgramme).map(([programme, produitsProgramme]) => (
                        <ProgrammeGroup
                          key={programme}
                          programme={programme}
                          produits={produitsProgramme}
                          modeRepartition={modeRepartition}
                          jourSelectionne={jourSelectionne}
                          calculerQuantites={calculerQuantites}
                          affichage={affichage}
                          showHisto={showHisto}
                        />
                      ))}
                    </tbody>
                    {/* Ligne de totaux */}
                    <tfoot className="bg-gray-100 font-semibold">
                      <tr>
                        <td className="px-4 py-3 text-gray-700">
                          TOTAL {famille}
                        </td>
                        {/* Colonne Type vide pour les totaux */}
                        {showHisto && <td></td>}
                        {modeRepartition === 'tranches' ? (
                          <>
                            {TRANCHES.map(tranche => (
                              <td key={tranche} className="text-center px-3 py-3 text-gray-800">
                                {totaux[tranche].preco}
                              </td>
                            ))}
                            <td className="text-center px-3 py-3 bg-gray-200 text-[#8B1538]">
                              {totaux.total.preco}
                            </td>
                          </>
                        ) : (
                          <td className="text-center px-4 py-3 text-[#8B1538]">
                            {totaux.total.preco}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Légende en bas */}
      {!isJourFerme(jourSelectionne) && (
        <div className="text-xs text-gray-500 text-center pt-4 print:pt-2">
          {affichage === 'plaques' ? (
            <p>💡 Quantités affichées en nombre de plaques (arrondi supérieur)</p>
          ) : (
            <p>💡 Quantités affichées en unités de vente</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Composant pour afficher un groupe de produits par programme
 * Mode PDV: 3 lignes par produit (Préco/Histo/%)
 * Mode BVP: 1 ligne par produit
 * + Sous-total par programme en mode Plaques
 */
function ProgrammeGroup({
  programme,
  produits,
  modeRepartition,
  jourSelectionne,
  calculerQuantites,
  affichage,
  showHisto
}) {
  const showProgrammeHeader = produits.length > 0 && programme !== 'Sans programme';
  const isPlaque = affichage === 'plaques';
  const colSpan = modeRepartition === 'tranches'
    ? (showHisto ? 7 : 6)  // +1 pour colonne Type en mode PDV
    : (showHisto ? 3 : 2);

  // Calculer les totaux par programme (en plaques) pour le sous-total
  const totauxProgramme = useMemo(() => {
    if (!isPlaque || modeRepartition !== 'tranches') return null;

    const totaux = {
      'avant12h': 0,
      '12h-14h': 0,
      '14h-16h': 0,
      'apres16h': 0,
      total: 0
    };

    produits.forEach(produit => {
      const qtes = calculerQuantites(produit, jourSelectionne);
      const unitesParPlaque = produit.unitesParPlaque || 0;

      if (unitesParPlaque > 0) {
        TRANCHES.forEach(tranche => {
          totaux[tranche] += Math.ceil((qtes.tranches?.[tranche]?.preco || 0) / unitesParPlaque);
        });
        totaux.total += Math.ceil((qtes.total?.preco || 0) / unitesParPlaque);
      }
    });

    return totaux;
  }, [produits, jourSelectionne, calculerQuantites, isPlaque, modeRepartition]);

  // Formater avec "Pl." pour le mode BVP 1 ligne
  const formatValeurTotal = (val, unitesParPlaque) => {
    if (isPlaque) {
      if (!unitesParPlaque || unitesParPlaque === 0) return '-';
      const nbPlaques = Math.ceil(val / unitesParPlaque);
      return `${nbPlaques} Pl.`;
    }
    return val;
  };

  return (
    <>
      {/* En-tête du programme (si plusieurs produits) */}
      {showProgrammeHeader && (
        <tr className="bg-gray-50/50">
          <td
            colSpan={colSpan}
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {programme}
          </td>
        </tr>
      )}

      {/* Produits */}
      {produits.map(produit => {
        const qtes = calculerQuantites(produit, jourSelectionne);

        // Mode PDV: 3 lignes par produit
        if (showHisto) {
          return (
            <Produit3Lignes
              key={produit.id}
              produit={produit}
              qtes={qtes}
              modeRepartition={modeRepartition}
              affichage={affichage}
            />
          );
        }

        // Mode BVP: 1 ligne par produit
        return (
          <tr key={produit.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
              <div className="font-medium text-[#58595B]">
                {produit.libellePersonnalise || produit.libelle}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                {produit.plu && <span>PLU: {produit.plu}</span>}
                {produit.unitesParPlaque > 0 && (
                  <span className="text-gray-400">• {produit.unitesParPlaque}/plaque</span>
                )}
              </div>
            </td>
            {qtes.mode === 'tranches' ? (
              <>
                {TRANCHES.map(tranche => (
                  <td key={tranche} className="text-center px-3 py-3">
                    <CelluleQuantite
                      preco={qtes.tranches[tranche].preco}
                      unitesParPlaque={produit.unitesParPlaque}
                      affichage={affichage}
                      variant="tranches"
                    />
                  </td>
                ))}
                <td className="text-center px-3 py-3 bg-gray-50">
                  <div className="font-bold text-[#58595B]">
                    {formatValeurTotal(qtes.total.preco, produit.unitesParPlaque)}
                  </div>
                </td>
              </>
            ) : (
              <td className="text-center px-4 py-3">
                <CelluleQuantite
                  preco={qtes.journalier.preco}
                  unitesParPlaque={produit.unitesParPlaque}
                  affichage={affichage}
                  variant="journalier"
                />
              </td>
            )}
          </tr>
        );
      })}

      {/* Sous-total par programme (uniquement en mode Plaques + tranches + programme nommé) */}
      {isPlaque && modeRepartition === 'tranches' && showProgrammeHeader && totauxProgramme && (
        <tr className="bg-amber-50 border-t-2 border-amber-200">
          <td className={`px-4 py-2 font-semibold text-amber-800 text-sm ${showHisto ? '' : ''}`}>
            TOTAL {programme.toUpperCase()}
          </td>
          {showHisto && <td></td>}
          {TRANCHES.map(tranche => (
            <td key={tranche} className="text-center px-3 py-2">
              <span className="font-bold text-amber-700">
                {totauxProgramme[tranche]} Pl.
              </span>
            </td>
          ))}
          <td className="text-center px-3 py-2 bg-amber-100">
            <span className="font-bold text-amber-800">
              {totauxProgramme.total} Pl.
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Composant pour afficher un produit en mode 3 lignes (Préco/Histo/%)
 */
function Produit3Lignes({ produit, qtes, modeRepartition, affichage }) {
  const unitesParPlaque = produit.unitesParPlaque;
  const isPlaque = affichage === 'plaques' && unitesParPlaque > 0;

  // Préparer les données pour chaque ligne
  const lignesData = modeRepartition === 'tranches' ? {
    preco: TRANCHES.map(t => convertirEnPlaques(qtes.tranches[t].preco, unitesParPlaque, affichage)),
    histo: TRANCHES.map(t => qtes.tranches[t].histo ? convertirEnPlaques(qtes.tranches[t].histo, unitesParPlaque, affichage) : null),
    ecart: TRANCHES.map(t => calculerEcart(qtes.tranches[t].preco, qtes.tranches[t].histo)),
    totalPreco: convertirEnPlaques(qtes.total.preco, unitesParPlaque, affichage),
    totalHisto: qtes.total.histo ? convertirEnPlaques(qtes.total.histo, unitesParPlaque, affichage) : null,
    totalEcart: calculerEcart(qtes.total.preco, qtes.total.histo)
  } : {
    preco: [convertirEnPlaques(qtes.journalier.preco, unitesParPlaque, affichage)],
    histo: [qtes.journalier.histo ? convertirEnPlaques(qtes.journalier.histo, unitesParPlaque, affichage) : null],
    ecart: [calculerEcart(qtes.journalier.preco, qtes.journalier.histo)],
    totalPreco: null,
    totalHisto: null,
    totalEcart: null
  };

  // Formater avec "Pl." si nécessaire
  const formatVal = (val) => {
    if (val === null || val === '-') return '-';
    return isPlaque ? `${val} Pl.` : val;
  };

  return (
    <>
      {/* Ligne 1: Préco */}
      <tr className="border-t border-gray-200">
        <td rowSpan={3} className="px-4 py-2 align-top border-r border-gray-100">
          <div className="font-medium text-[#58595B]">
            {produit.libellePersonnalise || produit.libelle}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
            {produit.plu && <span>PLU: {produit.plu}</span>}
            {produit.unitesParPlaque > 0 && (
              <span className="text-gray-400">• {produit.unitesParPlaque}/plaque</span>
            )}
          </div>
        </td>
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Préco
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {lignesData.preco.map((val, idx) => (
              <td key={TRANCHES[idx]} className="text-center px-3 py-1">
                <CelluleSimple valeur={val} variant="preco" isPlaque={isPlaque} />
              </td>
            ))}
            <td className="text-center px-3 py-1 bg-gray-50">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-sm min-w-[32px]">
                {formatVal(lignesData.totalPreco)}
              </span>
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleSimple valeur={lignesData.preco[0]} variant="preco" isPlaque={isPlaque} />
          </td>
        )}
      </tr>

      {/* Ligne 2: Histo */}
      <tr className="bg-gray-50/50">
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Histo
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {lignesData.histo.map((val, idx) => (
              <td key={TRANCHES[idx]} className="text-center px-3 py-1">
                <CelluleSimple valeur={val ?? '-'} variant="histo" isPlaque={isPlaque && val !== null} />
              </td>
            ))}
            <td className="text-center px-3 py-1 bg-gray-100">
              <span className="inline-block bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-medium text-sm min-w-[32px]">
                {formatVal(lignesData.totalHisto)}
              </span>
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleSimple valeur={lignesData.histo[0] ?? '-'} variant="histo" isPlaque={isPlaque && lignesData.histo[0] !== null} />
          </td>
        )}
      </tr>

      {/* Ligne 3: % Écart */}
      <tr className="border-b border-gray-300">
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            %
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {lignesData.ecart.map((val, idx) => (
              <td key={TRANCHES[idx]} className="text-center px-3 py-1">
                <CelluleEcart ecart={val} />
              </td>
            ))}
            <td className="text-center px-3 py-1 bg-gray-100">
              <CelluleEcart ecart={lignesData.totalEcart} />
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleEcart ecart={lignesData.ecart[0]} />
          </td>
        )}
      </tr>
    </>
  );
}
