/**
 * Onglet Suivi - Comparaison Planifié vs Réalisé
 */
import React, { useState, useMemo } from 'react';
import { Search, BarChart2 } from 'lucide-react';

const getStatusSuivi = (pct, seuilBas = 90, seuilHaut = 110) => {
  if (pct >= seuilBas && pct <= seuilHaut) return { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' };
  if (pct < seuilBas) return { icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { icon: '🔴', color: 'text-red-600', bg: 'bg-red-50' };
};

const OngletSuivi = ({ produits, planifieManager, promosPrecedentes }) => {
  const [tri, setTri] = useState({ colonne: 'pctAppli', ordre: 'desc' });
  const [rechercheSuivi, setRechercheSuivi] = useState('');
  const [filtreFamilleSuivi, setFiltreFamilleSuivi] = useState('tous');
  const [seuilBas, setSeuilBas] = useState(90);
  const [seuilHaut, setSeuilHaut] = useState(110);

  // Construire la map planifié S-1 (archive) par itm8/plu
  const planifieS1Map = useMemo(() => {
    const map = new Map();
    (promosPrecedentes || []).forEach(p => {
      if (p.itm8) map.set(p.itm8, p.qteValidee || 0);
      if (p.plu) map.set(p.plu, p.qteValidee || 0);
    });
    return map;
  }, [promosPrecedentes]);

  // Données de suivi par produit
  const suiviProduits = useMemo(() => {
    return produits.filter(p => p.actif).map(p => {
      // Planifié = planifieManager (quantité définie par le manager) ou potentiel
      const planifie = planifieManager?.[p.id] ?? p.potentiel ?? p.moyHebdo ?? 0;
      const ventes = p.moyHebdo || p.ventesQteSemaine || 0;

      // Calcul de la casse en quantité - plusieurs sources possibles:
      // 1. casseQteSemaine directement disponible
      // 2. Moyenne depuis historiqueParSemaine (contient casseQte par semaine)
      // 3. Fallback: estimer depuis cassePAHTSemaine / prixMoyen (approximation)
      let casse = 0;
      if (p.casseQteSemaine && p.casseQteSemaine > 0) {
        casse = p.casseQteSemaine;
      } else if (p.historiqueParSemaine && p.historiqueParSemaine.length > 0) {
        // Moyenne de la casse en quantité sur l'historique des semaines
        const totalCasseQte = p.historiqueParSemaine.reduce((sum, s) => sum + (s.casseQte || 0), 0);
        casse = totalCasseQte / p.historiqueParSemaine.length;
      } else if (p.cassePAHTSemaine && p.prixMoyenUnitaire && p.prixMoyenUnitaire > 0) {
        // Approximation: PA HT casse ÷ prix moyen (pas parfait mais mieux que 0)
        casse = p.cassePAHTSemaine / p.prixMoyenUnitaire;
      }

      const total = ventes + casse;
      const pctAppli = planifie > 0 ? (total / planifie) * 100 : 0;
      return {
        id: p.id,
        libelle: p.libelle,
        famille: p.rayon || p.famille || 'AUTRE',
        planifie,
        ventes,
        casse,
        total,
        pctAppli,
      };
    }).filter(p => p.planifie > 0);
  }, [produits, planifieManager]);

  // Synthèse globale
  const synthese = useMemo(() => {
    const totalPlanifie = suiviProduits.reduce((s, p) => s + p.planifie, 0);
    const totalVentes = suiviProduits.reduce((s, p) => s + p.ventes, 0);
    const totalCasse = suiviProduits.reduce((s, p) => s + p.casse, 0);
    const totalRealise = totalVentes + totalCasse;
    const pctGlobal = totalPlanifie > 0 ? (totalRealise / totalPlanifie) * 100 : 0;
    return { totalPlanifie, totalVentes, totalCasse, totalRealise, pctGlobal };
  }, [suiviProduits]);

  // Synthèse par famille
  const syntheseFamilles = useMemo(() => {
    const map = {};
    suiviProduits.forEach(p => {
      if (!map[p.famille]) map[p.famille] = { planifie: 0, realise: 0 };
      map[p.famille].planifie += p.planifie;
      map[p.famille].realise += p.total;
    });
    return Object.entries(map).map(([famille, d]) => ({
      famille,
      planifie: d.planifie,
      realise: d.realise,
      pct: d.planifie > 0 ? (d.realise / d.planifie) * 100 : 0,
    })).sort((a, b) => b.planifie - a.planifie);
  }, [suiviProduits]);

  // Rayons disponibles pour le filtre
  const rayonsSuivi = useMemo(() => {
    return [...new Set(suiviProduits.map(p => p.famille))].sort();
  }, [suiviProduits]);

  // Filtrage recherche + famille
  const produitsFiltresSuivi = useMemo(() => {
    return suiviProduits
      .filter(p => !rechercheSuivi || p.libelle.toLowerCase().includes(rechercheSuivi.toLowerCase()))
      .filter(p => filtreFamilleSuivi === 'tous' || p.famille === filtreFamilleSuivi);
  }, [suiviProduits, rechercheSuivi, filtreFamilleSuivi]);

  // Tri du tableau détaillé
  const handleTri = (colonne) => {
    setTri(prev => ({
      colonne,
      ordre: prev.colonne === colonne && prev.ordre === 'asc' ? 'desc' : 'asc',
    }));
  };

  const produitsTries = useMemo(() => {
    const sorted = [...produitsFiltresSuivi];
    sorted.sort((a, b) => {
      let va = a[tri.colonne];
      let vb = b[tri.colonne];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return tri.ordre === 'asc' ? -1 : 1;
      if (va > vb) return tri.ordre === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [produitsFiltresSuivi, tri]);

  const TriIcon = ({ colonne }) => {
    if (tri.colonne !== colonne) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#8B1538] ml-1">{tri.ordre === 'asc' ? '↑' : '↓'}</span>;
  };

  if (suiviProduits.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <BarChart2 className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Suivi Planning</h3>
        <p className="text-gray-500">Aucune donnée planifiée disponible. Définissez des quantités dans l'onglet Gamme.</p>
      </div>
    );
  }

  const statusGlobal = getStatusSuivi(synthese.pctGlobal, seuilBas, seuilHaut);

  return (
    <div className="space-y-4">
      {/* Synthèse globale */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Planifié total</p>
          <p className="text-xl font-bold text-gray-800">{Math.round(synthese.totalPlanifie).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Ventes total</p>
          <p className="text-xl font-bold text-blue-700">{Math.round(synthese.totalVentes).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Casse total</p>
          <p className="text-xl font-bold text-red-600">{Math.round(synthese.totalCasse).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className={`rounded-xl border border-gray-200 p-4 text-center ${statusGlobal.bg}`}>
          <p className="text-xs text-gray-500 mb-1">% Application</p>
          <p className={`text-xl font-bold ${statusGlobal.color}`}>
            {Math.round(synthese.pctGlobal)}% {statusGlobal.icon}
          </p>
          <p className="text-[10px] text-gray-400">(ventes+casse)/planifié</p>
        </div>
      </div>

      {/* Seuils d'alerte personnalisables */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-6 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Seuils d'alerte :</span>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          ⚠️ Seuil bas
          <input
            type="number"
            value={seuilBas}
            onChange={(e) => setSeuilBas(Number(e.target.value) || 0)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-mono"
          />
          %
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          🔴 Seuil haut
          <input
            type="number"
            value={seuilHaut}
            onChange={(e) => setSeuilHaut(Number(e.target.value) || 0)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-mono"
          />
          %
        </label>
        <span className="text-xs text-gray-400">✅ entre {seuilBas}% et {seuilHaut}%</span>
      </div>

      {/* Synthèse par famille */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 text-sm">Synthèse par famille</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs">
              <th className="px-4 py-2 text-left font-medium">Famille</th>
              <th className="px-4 py-2 text-right font-medium">Planifié</th>
              <th className="px-4 py-2 text-right font-medium">Réalisé</th>
              <th className="px-4 py-2 text-right font-medium">% Application</th>
            </tr>
          </thead>
          <tbody>
            {syntheseFamilles.map(f => {
              const st = getStatusSuivi(f.pct, seuilBas, seuilHaut);
              return (
                <tr key={f.famille} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{f.famille}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">{Math.round(f.planifie).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">{Math.round(f.realise).toLocaleString('fr-FR')}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${st.color}`}>
                    {Math.round(f.pct)}% {st.icon}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tableau détaillé par produit */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-gray-700 text-sm flex-shrink-0">Détail par produit</h3>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={rechercheSuivi}
              onChange={(e) => setRechercheSuivi(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
            />
          </div>
          <select
            value={filtreFamilleSuivi}
            onChange={(e) => setFiltreFamilleSuivi(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none bg-white"
          >
            <option value="tous">Toutes les familles</option>
            {rayonsSuivi.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{produitsFiltresSuivi.length} produit{produitsFiltresSuivi.length > 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('libelle')}>
                  Produit<TriIcon colonne="libelle" />
                </th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('famille')}>
                  Famille<TriIcon colonne="famille" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('planifie')}>
                  Planifié<TriIcon colonne="planifie" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('ventes')}>
                  Ventes<TriIcon colonne="ventes" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('casse')}>
                  Casse<TriIcon colonne="casse" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('total')}>
                  Total<TriIcon colonne="total" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('pctAppli')}>
                  % Appli<TriIcon colonne="pctAppli" />
                </th>
              </tr>
            </thead>
            <tbody>
              {produitsTries.map(p => {
                const st = getStatusSuivi(p.pctAppli, seuilBas, seuilHaut);
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">{p.libelle}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{p.famille}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">{Math.round(p.planifie)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700">{Math.round(p.ventes)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{Math.round(p.casse)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{Math.round(p.total)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${st.color}`}>
                      {Math.round(p.pctAppli)}% {st.icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OngletSuivi;
