import React from 'react';
import { X } from 'lucide-react';

const ORDRE_FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];

/**
 * FicheInventaire — Fiche imprimable pour inventaire en chambre froide
 * Ouvre une nouvelle fenêtre avec le contenu HTML pur pour impression fiable
 */
export default function FicheInventaire({ produits, managerData, dateLivraison, dateLivraisonIdx, onClose }) {
  const magasinNom = managerData?.magasin?.nom || managerData?.magasin?.codePDV || '';
  const commandes = managerData?.commandes || {};

  // Filtrer produits avec préco > 0 pour cette livraison
  const produitsAvecPreco = (produits || []).filter(p => {
    const cmd = commandes[p.itm8];
    if (!cmd) return false;
    const preco = cmd[`liv${dateLivraisonIdx + 1}`] ?? cmd.total ?? 0;
    return preco > 0;
  });

  // Grouper par famille
  const parFamille = {};
  produitsAvecPreco.forEach(p => {
    const fam = p.famille || p.rayon || 'AUTRE';
    if (!parFamille[fam]) parFamille[fam] = [];
    parFamille[fam].push(p);
  });

  // Trier familles
  const famillesTriees = Object.keys(parFamille).sort((a, b) => {
    const ia = ORDRE_FAMILLES.indexOf(a);
    const ib = ORDRE_FAMILLES.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const livraisonLabel = dateLivraison?.label || `Livraison ${dateLivraisonIdx + 1}`;

  // Escape HTML
  const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Générer le HTML des familles en 2 colonnes
  const genererFamillesHTML = () => {
    return famillesTriees.map(famille => {
      const items = parFamille[famille];
      const mid = Math.ceil(items.length / 2);
      const col1 = items.slice(0, mid);
      const col2 = items.slice(mid);

      const renderCol = (colItems) => colItems.map(p =>
        `<tr><td class="produit">${esc(p.libelle)}</td><td class="stock"><div class="stock-box"></div></td></tr>`
      ).join('');

      return `
        <div class="famille">
          <div class="famille-titre">${esc(famille)} (${items.length})</div>
          <div class="deux-colonnes">
            <div class="colonne colonne-gauche">
              <table>
                <thead><tr><th class="th-produit">Produit</th><th class="th-stock">Stock</th></tr></thead>
                <tbody>${renderCol(col1)}</tbody>
              </table>
            </div>
            <div class="colonne">
              <table>
                <thead><tr><th class="th-produit">Produit</th><th class="th-stock">Stock</th></tr></thead>
                <tbody>${renderCol(col2)}${col2.length < col1.length ? '<tr><td colspan="2">&nbsp;</td></tr>' : ''}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  };

  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Inventaire - ${esc(magasinNom)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 15px; color: #222; }
    h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
    .entete { border: 2px solid #000; padding: 12px 16px; margin-bottom: 16px; }
    .entete p { margin-top: 6px; font-size: 14px; }
    .entete .champs { margin-top: 10px; font-size: 13px; display: flex; gap: 40px; }
    .famille { margin-bottom: 14px; page-break-inside: auto; }
    .famille-titre {
      background: #333; color: #fff; padding: 6px 10px;
      font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .deux-colonnes { display: flex; border-left: 2px solid #000; border-right: 2px solid #000; border-bottom: 2px solid #000; }
    .colonne { flex: 1; }
    .colonne-gauche { border-right: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 3px 6px; font-size: 10px; text-transform: uppercase; color: #666; border-bottom: 1px solid #999; }
    .th-stock { text-align: center; width: 55px; }
    td.produit { padding: 5px 6px; font-size: 12px; font-weight: 500; line-height: 1.3; border-bottom: 1px solid #ddd; }
    td.stock { text-align: center; padding: 5px 4px; border-bottom: 1px solid #ddd; }
    .stock-box { width: 40px; height: 24px; border: 2px solid #888; border-radius: 3px; margin: 0 auto; background: #fff; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 12px; border-top: 1px solid #ddd; padding-top: 6px; }
    @page { margin: 10mm; size: A4 portrait; }
    @media print {
      .famille { page-break-inside: auto; }
      .famille-titre { page-break-after: avoid; break-after: avoid; }
      tr { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="entete">
    <h1>INVENTAIRE — ${esc(magasinNom)}</h1>
    <p>${esc(livraisonLabel)}</p>
    <div class="champs">
      <span>Date : ____/____/________</span>
      <span>Fait par : ________________________________</span>
    </div>
  </div>
  ${genererFamillesHTML()}
  <div class="footer">BVP Planning — ${produitsAvecPreco.length} produits à inventorier</div>
</body>
</html>`;

    const fenetre = window.open('', '_blank');
    if (!fenetre) {
      alert('Le navigateur a bloqué la fenêtre popup. Autorisez les popups pour ce site.');
      return;
    }
    fenetre.document.write(html);
    fenetre.document.close();
    // Attendre le rendu avant d'imprimer
    fenetre.onload = () => {
      fenetre.print();
    };
    // Fallback si onload ne se déclenche pas
    setTimeout(() => {
      try { fenetre.print(); } catch {}
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-gray-800">Fiche inventaire</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{produitsAvecPreco.length} produits</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ED1C24] text-white rounded-lg font-medium hover:bg-[#8B1538] transition-colors"
          >
            Imprimer
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Aperçu */}
      <div className="max-w-4xl mx-auto bg-white p-6 my-4 rounded-xl shadow-lg">
        {/* En-tête */}
        <div className="border-2 border-black p-4 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            INVENTAIRE — {magasinNom}
          </h1>
          <p className="text-base font-medium mt-1">{livraisonLabel}</p>
          <div className="flex gap-8 mt-3 text-sm">
            <span>Date : ____/____/________</span>
            <span>Fait par : ________________________________</span>
          </div>
        </div>

        {/* Familles */}
        {famillesTriees.map(famille => {
          const items = parFamille[famille];
          const mid = Math.ceil(items.length / 2);
          const col1 = items.slice(0, mid);
          const col2 = items.slice(mid);

          return (
            <div key={famille} className="mb-4">
              <h2 className="text-base font-bold bg-gray-800 text-white px-3 py-1.5 uppercase tracking-wide">
                {famille} ({items.length})
              </h2>
              <div className="grid grid-cols-2 gap-0 border-l-2 border-r-2 border-b-2 border-black">
                <div className="border-r border-black">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-400">
                        <th className="text-left px-2 py-1 text-xs font-semibold text-gray-600 uppercase">Produit</th>
                        <th className="text-center px-1 py-1 text-xs font-semibold text-gray-600 uppercase w-16">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col1.map(p => (
                        <tr key={p.itm8} className="border-b border-gray-200">
                          <td className="px-2 py-1.5 text-sm font-medium leading-tight">{p.libelle}</td>
                          <td className="px-1 py-1.5 text-center">
                            <div className="w-12 h-7 border-2 border-gray-400 rounded mx-auto bg-white" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-400">
                        <th className="text-left px-2 py-1 text-xs font-semibold text-gray-600 uppercase">Produit</th>
                        <th className="text-center px-1 py-1 text-xs font-semibold text-gray-600 uppercase w-16">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col2.map(p => (
                        <tr key={p.itm8} className="border-b border-gray-200">
                          <td className="px-2 py-1.5 text-sm font-medium leading-tight">{p.libelle}</td>
                          <td className="px-1 py-1.5 text-center">
                            <div className="w-12 h-7 border-2 border-gray-400 rounded mx-auto bg-white" />
                          </td>
                        </tr>
                      ))}
                      {col2.length < col1.length && (
                        <tr><td colSpan={2} className="py-1.5">&nbsp;</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        <div className="text-xs text-gray-400 text-center mt-4 border-t pt-2">
          BVP Planning — {produitsAvecPreco.length} produits à inventorier
        </div>
      </div>
    </div>
  );
}
