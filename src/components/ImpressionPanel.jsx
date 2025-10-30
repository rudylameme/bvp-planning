import React from 'react';
import { Printer, X } from 'lucide-react';
import { convertirEnPlaques } from '../utils/conversionUtils';
import { getNextWeekDates } from '../utils/dateUtils';

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
    return total;
  } else {
    return total.toFixed(1);
  }
};

export default function ImpressionPanel({
  isVisible,
  onClose,
  selectedJour,
  planningData,
  pdvInfo
}) {
  if (!isVisible) return null;

  const handlePrint = () => {
    globalThis.print();
  };

  const handleDownloadPDF = () => {
    const content = document.querySelector('.print-content')?.innerHTML || '';
    const title = selectedJour ? `Planning_${selectedJour}` : 'Planning_Hebdomadaire';
    const nextWeek = getNextWeekDates();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; margin: 0; background: white; font-size: 9px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 9px; }
          th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
          th { background-color: #e5e5e5; font-weight: bold; }
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #333; margin-bottom: 15px; padding-bottom: 10px;">
          <h1>Planning de Production Optimisé ${selectedJour ? `- ${selectedJour}` : ''}</h1>
          <p>${pdvInfo ? `PDV ${pdvInfo.numero} - ${pdvInfo.nom} | ` : ''}Date: ${new Date().toLocaleDateString('fr-FR')} | Semaine du ${nextWeek.start} au ${nextWeek.end}</p>
          ${planningData?.stats?.ponderationType ? `<p style="color: #666;">Pondération: ${planningData.stats.ponderationType}</p>` : ''}
        </div>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const pdfWindow = globalThis.open(url, '_blank');

    if (pdfWindow) {
      setTimeout(() => {
        alert('Fenêtre PDF ouverte ! Utilisez Cmd+P / Ctrl+P puis "Enregistrer au format PDF".');
        URL.revokeObjectURL(url);
      }, 500);
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const nextWeek = getNextWeekDates();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="absolute inset-4 bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-300 p-4 rounded-t-lg z-10 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Aperçu avant impression - {selectedJour ? `Planning du ${selectedJour}` : 'Planning Hebdomadaire'}
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
              >
                📄 PDF
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded border">
                <span className="font-medium">💡 Astuce :</span>
                <span>
                  {(navigator.userAgentData?.platform || navigator.userAgent).includes('Mac') ? 'Cmd+P' : 'Ctrl+P'} pour imprimer
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 shadow-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Fermer
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto p-6 bg-gray-50">
            <div className="bg-white rounded shadow-sm p-6 print-content">
              {/* Header du document */}
              <div className="border-b-2 border-gray-800 mb-6 pb-4">
                <h1 className="text-xl font-bold mb-2">
                  Planning de Production Optimisé
                  {selectedJour && ` - ${selectedJour}`}
                </h1>
                <div className="text-sm text-gray-600">
                  {pdvInfo && `PDV ${pdvInfo.numero} - ${pdvInfo.nom} | `}
                  Date d'impression : {new Date().toLocaleDateString('fr-FR')} |
                  Semaine du {nextWeek.start} au {nextWeek.end}
                  {planningData?.stats?.ponderationType && (
                    <span className="ml-2">| Pondération : {planningData.stats.ponderationType}</span>
                  )}
                </div>
              </div>

              {selectedJour ? (
                <PlanningJour selectedJour={selectedJour} planningData={planningData} />
              ) : (
                <PlanningHebdo planningData={planningData} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant pour le planning d'un jour (format compact A4 paysage)
function PlanningJour({ selectedJour, planningData }) {
  // Préparer les données pour affichage en tableau unique compact
  const rayonsData = [];

  if (planningData?.jours[selectedJour]) {
    Object.entries(planningData.jours[selectedJour]).forEach(([rayon, programmes]) => {
      Object.entries(programmes).forEach(([programme, data]) => {
        if (data.produits && data.produits.size > 0) {
          rayonsData.push({
            rayon,
            programme,
            produits: Array.from(data.produits),
            data
          });
        }
      });
    });
  }

  return (
    <div className="text-xs">
      {/* Header très compact */}
      <div className="text-center mb-1">
        <h2 className="text-sm font-bold inline-block border border-black px-3 py-0.5">
          Plans de cuisson 2.0 - {selectedJour}
        </h2>
      </div>

      {/* Note discrète sur fond jaune pâle */}
      <div className="text-[9px] bg-yellow-50 border-l-2 border-yellow-400 px-2 py-0.5 mb-2 italic text-gray-600">
        Soir : Quantité à ajuster selon stock rayon. Ex: Soir 4 proposés, Stock 2 → À cuire: 2
      </div>

      {/* Tableau unique compact */}
      <table className="w-full border-collapse border border-black" style={{ fontSize: '9px' }}>
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-1 py-0.5 w-8 text-center">Rayon</th>
            <th className="border border-black px-1 py-0.5 w-8 text-center">Prog</th>
            <th className="border border-black px-1 py-0.5 w-12 text-center">ITM8</th>
            <th className="border border-black px-1 py-0.5 text-left">Article</th>
            <th className="border border-black px-1 py-0.5 w-16 text-center">Remarque</th>
            <th className="border border-black px-1 py-0.5 w-10 text-center bg-blue-50">Matin<br/>9h-12h</th>
            <th className="border border-black px-1 py-0.5 w-10 text-center bg-emerald-50">Midi<br/>12h-16h</th>
            <th className="border border-black px-1 py-0.5 w-10 text-center bg-yellow-50">Soir<br/>16h-23h</th>
            <th className="border border-black px-1 py-0.5 w-16 text-center">Stock rayon</th>
            <th className="border border-black px-1 py-0.5 w-16 text-center">A cuire</th>
            <th className="border border-black px-1 py-0.5 text-left" style={{ width: '120px' }}>Pertes du jour</th>
          </tr>
        </thead>
        <tbody>
          {rayonsData.map(({ rayon, programme, produits, data }, rayonIndex) => {
            const programmeNumero = rayonIndex + 1;

            return (
              <React.Fragment key={`${rayon}-${programme}`}>
                {/* Lignes des produits */}
                {produits.map(([produit, creneaux], prodIndex) => (
                  <tr key={produit} className={prodIndex === 0 ? 'border-t-2 border-black' : ''}>
                    {prodIndex === 0 && (
                      <>
                        <td className="border border-black px-0.5 py-0.5 text-center font-bold bg-gray-100 text-[8px]" rowSpan={produits.length + 1} style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                          {rayon}
                        </td>
                        <td className="border border-black px-0.5 py-0.5 text-center font-bold bg-gray-100 text-[7px]" rowSpan={produits.length + 1} style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                          {programme}
                        </td>
                      </>
                    )}
                    <td className="border border-black px-1 py-0.5 text-center text-gray-600 text-[8px]">{creneaux.itm8 || ''}</td>
                    <td className="border border-black px-1 py-0.5">{produit}</td>
                    <td className="border border-black px-1 py-0.5"></td>
                    <td className="border border-black px-1 py-0.5 text-center font-bold bg-blue-50">
                      {convertirEnPlaques(creneaux.matin, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-center font-bold bg-emerald-50">
                      {convertirEnPlaques(creneaux.midi, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-center font-bold bg-yellow-50">
                      {convertirEnPlaques(creneaux.soir, creneaux.unitesParVente, creneaux.unitesParPlaque)}
                    </td>
                    <td className="border border-black px-1 py-0.5 text-right pr-1">Pl</td>
                    <td className="border border-black px-1 py-0.5 text-right pr-1">Pl</td>
                    <td className="border border-black px-1 py-0.5"></td>
                  </tr>
                ))}

                {/* Ligne de capacité */}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black px-1 py-0.5 text-center">Capacité</td>
                  <td colSpan="2" className="border border-black px-1 py-0.5"></td>
                  <td className="border border-black px-1 py-0.5 text-center bg-blue-100">
                    {(() => {
                      const val = calculerTotalPlaques(data.produits, 'matin');
                      if (val === 'NC') return '-';
                      const formatted = val % 1 === 0 ? val : val.toFixed(1);
                      return `${formatted} Pl.`;
                    })()}
                  </td>
                  <td className="border border-black px-1 py-0.5 text-center bg-emerald-100">
                    {(() => {
                      const val = calculerTotalPlaques(data.produits, 'midi');
                      if (val === 'NC') return '-';
                      const formatted = val % 1 === 0 ? val : val.toFixed(1);
                      return `${formatted} Pl.`;
                    })()}
                  </td>
                  <td className="border border-black px-1 py-0.5 text-center bg-yellow-100">
                    {(() => {
                      const val = calculerTotalPlaques(data.produits, 'soir');
                      if (val === 'NC') return '-';
                      const formatted = val % 1 === 0 ? val : val.toFixed(1);
                      return `${formatted} Pl.`;
                    })()}
                  </td>
                  <td colSpan="2" className="border border-black px-1 py-0.5 text-center bg-blue-100">
                    {(() => {
                      const val = calculerTotalJournalier(data.produits);
                      return val === 'NC' ? '-' : `${val} Pl.`;
                    })()}
                  </td>
                  <td className="border border-black px-1 py-0.5"></td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Calculer le total d'articles pour un jour donné
function calculerTotalJour(planningData, jour) {
  let total = 0;
  if (planningData?.jours[jour]) {
    // Nouvelle structure: rayon -> programme -> {produits, capacite}
    for (const rayon of Object.values(planningData.jours[jour])) {
      for (const programme of Object.values(rayon)) {
        if (programme.capacite) {
          total += programme.capacite.total;
        }
      }
    }
  }
  return total;
}

// Récupérer tous les produits uniques pour un rayon et programme donnés
function recupererProduitsParRayonProgramme(planningData, rayon, programme) {
  const produitsSet = new Set();
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  for (const jour of jours) {
    if (planningData?.jours[jour]?.[rayon]?.[programme]?.produits) {
      for (const [produit] of planningData.jours[jour][rayon][programme].produits) {
        produitsSet.add(produit);
      }
    }
  }
  return Array.from(produitsSet);
}

// Calculer les quantités par jour pour un produit
function calculerQuantitesParJour(planningData, rayon, programme, produit) {
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  let totalSemaine = 0;
  const joursData = jours.map(jour => {
    const qte = planningData?.jours[jour]?.[rayon]?.[programme]?.produits?.get(produit)?.total || 0;
    totalSemaine += qte;
    return { jour, qte };
  });
  return { joursData, totalSemaine };
}

// Composant pour le planning hebdomadaire
function PlanningHebdo({ planningData }) {
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Récupérer tous les rayons et programmes
  const rayonsPrograms = {};
  if (planningData?.programmesParRayon) {
    Object.entries(planningData.programmesParRayon).forEach(([rayon, programmes]) => {
      rayonsPrograms[rayon] = Object.keys(programmes);
    });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-center bg-gray-200 p-2 mb-4 border-2 border-gray-800">
        RÉSUMÉ HEBDOMADAIRE
      </h2>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {jours.map(jour => {
          const total = calculerTotalJour(planningData, jour);
          return (
            <div key={jour} className="border border-gray-800 p-2 text-center bg-gray-50">
              <div className="font-bold text-xs mb-1">{jour}</div>
              <div className="text-lg font-bold text-blue-600">{total}</div>
              <div className="text-xs text-gray-600">articles</div>
            </div>
          );
        })}
      </div>

      {Object.entries(rayonsPrograms).map(([rayon, programmes]) => (
        <div key={rayon} className="mb-6">
          <h2 className="text-md font-bold text-center bg-blue-200 p-2 mb-2 border-2 border-gray-800">
            {rayon}
          </h2>

          {programmes.map(programme => {
            const produits = recupererProduitsParRayonProgramme(planningData, rayon, programme);
            if (produits.length === 0) return null;

            return (
              <div key={programme} className="mb-4">
                <h3 className="text-sm font-semibold text-center bg-gray-100 p-1 border border-gray-800">
                  {programme}
                </h3>

                <table className="w-full border-collapse border-2 border-gray-800 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-800 p-1 text-left">Produit</th>
                      <th className="border border-gray-800 p-1">Lun</th>
                      <th className="border border-gray-800 p-1">Mar</th>
                      <th className="border border-gray-800 p-1">Mer</th>
                      <th className="border border-gray-800 p-1">Jeu</th>
                      <th className="border border-gray-800 p-1">Ven</th>
                      <th className="border border-gray-800 p-1">Sam</th>
                      <th className="border border-gray-800 p-1">Dim</th>
                      <th className="border border-gray-800 p-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produits.map(produit => {
                      const { joursData, totalSemaine } = calculerQuantitesParJour(planningData, rayon, programme, produit);
                      return (
                        <tr key={produit}>
                          <td className="border border-gray-800 p-1 text-xs font-medium">{produit}</td>
                          {joursData.map(({ jour, qte }) => (
                            <td key={`${produit}-${jour}`} className="border border-gray-800 p-1 text-center">{qte || 0}</td>
                          ))}
                          <td className="border border-gray-800 p-1 text-center font-bold">{totalSemaine}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
