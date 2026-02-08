import { useState } from 'react';
import { Plus, Trash2, Package, ChevronUp } from 'lucide-react';

const FAMILLES = ['PATISSERIE', 'BOULANGERIE', 'VIENNOISERIE', 'SNACKING'];
const PROGRAMMES = ['', 'Aucun (négoce)', 'Pâtisserie', 'Viennoiserie', 'Baguettes', 'Pains spéciaux'];

/**
 * ProduitsExceptionnels - Gestion des produits hors gamme habituelle
 * Formulaire d'ajout + tableau avec edition inline des quantites
 */
export default function ProduitsExceptionnels({
  produitsExceptionnels,
  setProduitsExceptionnels,
  erreur,
  setErreur
}) {
  const [showFormExceptionnel, setShowFormExceptionnel] = useState(false);
  const [exceptionnelForm, setExceptionnelForm] = useState({
    nom: '',
    qteParJour: '',
    prix: '',
    marge: '40',
    famille: 'PATISSERIE',
    programme: '',
    jours: { lundi: false, mardi: false, mercredi: false, jeudi: false, vendredi: true, samedi: true, dimanche: true }
  });

  const resetFormExceptionnel = () => {
    setExceptionnelForm({
      nom: '', qteParJour: '', prix: '', marge: '40', famille: 'PATISSERIE', programme: '',
      jours: { lundi: false, mardi: false, mercredi: false, jeudi: false, vendredi: true, samedi: true, dimanche: true }
    });
    setShowFormExceptionnel(false);
  };

  const toggleJourExceptionnel = (jour) => {
    setExceptionnelForm(prev => ({ ...prev, jours: { ...prev.jours, [jour]: !prev.jours[jour] } }));
  };

  const ajouterProduitExceptionnel = () => {
    if (!exceptionnelForm.nom.trim()) { setErreur('Veuillez saisir un nom de produit'); return; }
    const qte = parseInt(exceptionnelForm.qteParJour, 10);
    if (!qte || qte <= 0) { setErreur('Veuillez saisir une quantité par jour valide'); return; }
    const prix = parseFloat(exceptionnelForm.prix);
    if (!prix || prix <= 0) { setErreur('Veuillez saisir un prix unitaire valide'); return; }
    const margePct = parseFloat(exceptionnelForm.marge) || 40;
    if (margePct < 0 || margePct >= 100) { setErreur('La marge doit être entre 0 et 100%'); return; }

    const joursSelectionnes = Object.entries(exceptionnelForm.jours).filter(([, actif]) => actif).map(([jour]) => jour);
    if (joursSelectionnes.length === 0) { setErreur('Veuillez sélectionner au moins un jour'); return; }

    const nbJours = joursSelectionnes.length;
    const qteTotale = qte * nbJours;
    const caTotale = qteTotale * prix;
    const margeEuros = (margePct / 100) * prix;
    const margeTotale = margeEuros * qteTotale;
    const tauxTVA = 0.055;
    const prixHT = prix / (1 + tauxTVA);
    const prixAchatHT = prixHT - margeEuros;

    const nouveauProduit = {
      id: Date.now(),
      nom: exceptionnelForm.nom.trim(),
      qteParJour: qte, qteTotale, prix, margePct, margeEuros, margeTotale, prixAchatHT,
      famille: exceptionnelForm.famille,
      programme: exceptionnelForm.programme || 'Aucun',
      jours: { ...exceptionnelForm.jours }, joursListe: joursSelectionnes, nbJours, caTotale,
      qteValidee: qteTotale
    };

    if (setProduitsExceptionnels) {
      setProduitsExceptionnels([...produitsExceptionnels, nouveauProduit]);
    }
    resetFormExceptionnel();
    setErreur(null);
  };

  const supprimerProduitExceptionnel = (id) => {
    if (setProduitsExceptionnels) {
      setProduitsExceptionnels(produitsExceptionnels.filter(p => p.id !== id));
    }
  };

  const modifierQteExceptionnel = (id, value) => {
    if (!setProduitsExceptionnels) return;
    const produitsModifies = produitsExceptionnels.map(p => {
      if (p.id === id) {
        return { ...p, qteValidee: Math.max(0, parseInt(value, 10) || 0) };
      }
      return p;
    });
    setProduitsExceptionnels(produitsModifies);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          Produits exceptionnels ({produitsExceptionnels.length})
        </h3>
        <button
          onClick={() => setShowFormExceptionnel(!showFormExceptionnel)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          {showFormExceptionnel ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showFormExceptionnel ? 'Fermer' : 'Ajouter un produit'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Produits hors gamme habituelle (commande exceptionnelle, nouveau produit, événement...)
      </p>

      {/* Formulaire d'ajout */}
      {showFormExceptionnel && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du produit *</label>
              <input type="text" value={exceptionnelForm.nom} onChange={(e) => setExceptionnelForm(p => ({ ...p, nom: e.target.value }))}
                placeholder="Ex: Galette des Rois" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Famille</label>
              <select value={exceptionnelForm.famille} onChange={(e) => setExceptionnelForm(p => ({ ...p, famille: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                {FAMILLES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qté / jour *</label>
              <input type="number" min="1" value={exceptionnelForm.qteParJour} onChange={(e) => setExceptionnelForm(p => ({ ...p, qteParJour: e.target.value }))}
                placeholder="Ex: 30" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prix TTC *</label>
              <input type="number" step="0.01" min="0" value={exceptionnelForm.prix} onChange={(e) => setExceptionnelForm(p => ({ ...p, prix: e.target.value }))}
                placeholder="Ex: 12.90" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marge %</label>
              <input type="number" step="0.1" min="0" max="99" value={exceptionnelForm.marge} onChange={(e) => setExceptionnelForm(p => ({ ...p, marge: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Programme</label>
              <select value={exceptionnelForm.programme} onChange={(e) => setExceptionnelForm(p => ({ ...p, programme: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                {PROGRAMMES.map(p => <option key={p} value={p}>{p || '-- Choisir --'}</option>)}
              </select>
            </div>
          </div>
          {/* Selection des jours */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Jours concernés</label>
            <div className="flex gap-2">
              {Object.entries(exceptionnelForm.jours).map(([jour, actif]) => (
                <button key={jour} onClick={() => toggleJourExceptionnel(jour)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    actif ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400'
                  }`}>
                  {jour.charAt(0).toUpperCase() + jour.slice(1, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={resetFormExceptionnel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={ajouterProduitExceptionnel} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Tableau des produits exceptionnels */}
      {produitsExceptionnels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left py-2.5 px-2 font-medium text-gray-500">Produit</th>
                <th className="text-center py-2.5 px-2 font-medium text-gray-500">Famille</th>
                <th className="text-center py-2.5 px-2 font-medium text-gray-500">Jours</th>
                <th className="text-right py-2.5 px-2 font-medium text-gray-500">Prix</th>
                <th className="text-center py-2.5 px-2 font-medium text-gray-500">Marge</th>
                <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Quantité par jour × nombre de jours">Qté/j</th>
                <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Total estimé (Qté/j × jours)">Qté<br/>Totale</th>
                <th className="text-center py-2.5 px-2 font-medium text-purple-600 font-semibold" title="Quantité validée par l'opérateur">Qté<br/>Validée</th>
                <th className="text-right py-2.5 px-2 font-medium text-gray-500">CA</th>
                <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '40px'}}></th>
              </tr>
            </thead>
            <tbody>
              {produitsExceptionnels.map((prod) => {
                const qteVal = prod.qteValidee ?? prod.qteTotale;
                const ratioPct = prod.qteTotale > 0 ? Math.round((qteVal / prod.qteTotale) * 100) : 100;
                return (
                  <tr key={prod.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <span className="font-medium">{prod.nom}</span>
                      {prod.programme && prod.programme !== 'Aucun' && (
                        <span className="text-xs text-gray-400 ml-1">({prod.programme})</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{prod.famille}</span>
                    </td>
                    <td className="py-3 px-2 text-center text-xs text-gray-500">
                      {prod.joursListe.map(j => j.slice(0,3)).join(', ')}
                      <span className="block text-[10px] text-gray-400">({prod.nbJours} jour{prod.nbJours > 1 ? 's' : ''})</span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">{prod.prix.toFixed(2)} €</td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-xs">{prod.margePct}%</span>
                      <span className="text-xs text-gray-400 block">({prod.margeEuros.toFixed(2)}€)</span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {prod.qteParJour}
                      <span className="text-xs text-gray-400 block">/ jour</span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-500">
                      {prod.qteTotale}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" min="0" value={qteVal}
                        onChange={(e) => modifierQteExceptionnel(prod.id, e.target.value)}
                        className={`w-20 px-2 py-1 text-center text-sm font-bold rounded-lg border-2 focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                          qteVal !== prod.qteTotale ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-800'
                        }`} />
                      {qteVal !== prod.qteTotale && (
                        <span className={`text-[10px] block mt-0.5 ${ratioPct >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {ratioPct}% du total
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-purple-700">{(qteVal * prod.prix).toFixed(2)} €</td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={() => supprimerProduitExceptionnel(prod.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
