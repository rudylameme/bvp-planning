import { Printer, X } from 'lucide-react';

export default function ImpressionPanel({
  isVisible,
  onClose,
  selectedJour,
  planningData,
  pdvInfo
}) {
  if (!isVisible) return null;

  const getNextWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilNextMonday);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    return {
      start: nextMonday.toLocaleDateString('fr-FR'),
      end: nextSunday.toLocaleDateString('fr-FR')
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const content = document.querySelector('.print-content')?.innerHTML || '';
    const title = selectedJour ? `Planning_${selectedJour}` : 'Planning_Hebdomadaire';
    const nextWeek = getNextWeekDates();

    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; background: white; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #333; padding: 8px 4px; text-align: center; font-size: 11px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .product-name { text-align: left; font-weight: 500; max-width: 200px; font-size: 10px; }
            .family-header { background-color: #e9e9e9; font-weight: bold; font-size: 14px; padding: 8px; margin: 15px 0 5px 0; border: 2px solid #333; text-align: center; }
            @media print { @page { size: A4; margin: 15mm; } body { -webkit-print-color-adjust: exact; } }
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
      `);
      pdfWindow.document.close();

      setTimeout(() => {
        alert('Fenêtre PDF ouverte ! Utilisez Cmd+P / Ctrl+P puis "Enregistrer au format PDF".');
      }, 500);
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
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 shadow-sm"
              >
                📄 PDF
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded border">
                <span className="font-medium">💡 Astuce :</span>
                <span>
                  {navigator.platform.includes('Mac') ? 'Cmd+P' : 'Ctrl+P'} pour imprimer
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

// Composant pour le planning d'un jour
function PlanningJour({ selectedJour, planningData }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-center bg-gray-200 p-2 mb-4 border-2 border-gray-800">
        PLANNING DU {selectedJour.toUpperCase()}
      </h2>

      <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
        <h4 className="font-semibold text-yellow-800 mb-2">💡 Principe d'ajustement :</h4>
        <p className="text-sm text-yellow-700">
          <strong>Soir :</strong> Quantité proposée à ajuster selon le stock rayon.<br/>
          <strong>Exemple :</strong> Pain aux céréales → Soir: 4 proposés, Stock rayon: 2 → À cuire: 4-2 = 2
        </p>
      </div>

      {['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE'].map(famille => {
        const produits = planningData?.jours[selectedJour][famille];
        if (!produits || produits.size === 0) return null;

        return (
          <div key={famille} className="mb-6">
            <h3 className="text-md font-bold text-center bg-gray-100 p-2 mb-2 border-2 border-gray-800">
              {famille}
            </h3>

            <table className="w-full border-collapse border-2 border-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-2 text-left">Produit</th>
                  <th className="border border-gray-800 p-2 text-center">
                    Matin<br/>
                    <span className="text-xs text-gray-600">9h-12h</span>
                  </th>
                  <th className="border border-gray-800 p-2 text-center">
                    Midi<br/>
                    <span className="text-xs text-gray-600">12h-16h</span>
                  </th>
                  <th className="border border-gray-800 p-2 text-center bg-yellow-100">
                    Soir (à ajuster)<br/>
                    <span className="text-xs text-gray-600">16h-23h</span>
                  </th>
                  <th className="border border-gray-800 p-2 text-center bg-orange-100">
                    Ajustement<br/>
                    <span className="text-xs text-gray-600">Stock rayon</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from(produits || []).map(([produit, creneaux]) => (
                  <tr key={produit}>
                    <td className="border border-gray-800 p-2 text-xs font-medium">{produit}</td>
                    <td className="border border-gray-800 p-2 text-center font-bold">{creneaux.matin}</td>
                    <td className="border border-gray-800 p-2 text-center font-bold">{creneaux.midi}</td>
                    <td className="border border-gray-800 p-2 text-center font-bold bg-yellow-50">{creneaux.soir}</td>
                    <td className="border border-gray-800 p-2 text-center bg-orange-50">
                      Stock: ___ À cuire: ___
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// Composant pour le planning hebdomadaire
function PlanningHebdo({ planningData }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-center bg-gray-200 p-2 mb-4 border-2 border-gray-800">
        RÉSUMÉ HEBDOMADAIRE
      </h2>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => {
          let total = 0;
          if (planningData?.jours[jour]) {
            Object.values(planningData.jours[jour]).forEach(famille => {
              famille.forEach(creneaux => {
                total += creneaux.total;
              });
            });
          }

          return (
            <div key={jour} className="border border-gray-800 p-2 text-center bg-gray-50">
              <div className="font-bold text-xs mb-1">{jour}</div>
              <div className="text-lg font-bold text-blue-600">{total}</div>
              <div className="text-xs text-gray-600">articles</div>
            </div>
          );
        })}
      </div>

      {['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE'].map(famille => {
        const hasProducts = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].some(jour =>
          planningData?.jours[jour]?.[famille]?.size > 0
        );

        if (!hasProducts) return null;

        return (
          <div key={famille} className="mb-6">
            <h2 className="text-md font-bold text-center bg-gray-100 p-2 mb-2 border-2 border-gray-800">
              {famille}
            </h2>

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
                {(() => {
                  const produitsSet = new Set();
                  ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].forEach(jour => {
                    if (planningData?.jours[jour]?.[famille]) {
                      planningData.jours[jour][famille].forEach((_, produit) => {
                        produitsSet.add(produit);
                      });
                    }
                  });

                  return Array.from(produitsSet).map(produit => {
                    let totalSemaine = 0;
                    const quantitesJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => {
                      const qte = planningData?.jours[jour]?.[famille]?.get(produit)?.total || 0;
                      totalSemaine += qte;
                      return qte;
                    });

                    return (
                      <tr key={produit}>
                        <td className="border border-gray-800 p-1 text-xs font-medium">{produit}</td>
                        {quantitesJours.map((qte, index) => (
                          <td key={index} className="border border-gray-800 p-1 text-center">{qte || 0}</td>
                        ))}
                        <td className="border border-gray-800 p-1 text-center font-bold">{totalSemaine}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
