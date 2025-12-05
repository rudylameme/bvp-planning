import { useState, useMemo } from 'react';
import { Check, X, Search, Filter, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

export default function ConfigurationProduits({ produits, onUpdate }) {
  const [recherche, setRecherche] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('tous');
  const [tri, setTri] = useState({ colonne: 'moyenneHebdo', ordre: 'desc' }); // Par défaut : quantité décroissante

  // Extraire les rayons uniques
  const rayons = useMemo(() => {
    const set = new Set(produits.map(p => p.rayon).filter(Boolean));
    return ['tous', ...Array.from(set)];
  }, [produits]);

  // Gérer le clic sur une colonne pour trier
  const handleTriColonne = (colonne) => {
    setTri(prev => ({
      colonne,
      ordre: prev.colonne === colonne && prev.ordre === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Filtrer et trier les produits
  const produitsFiltres = useMemo(() => {
    // D'abord filtrer
    let resultats = produits.filter(p => {
      const matchRecherche = p.libelle.toLowerCase().includes(recherche.toLowerCase()) ||
                            p.itm8?.includes(recherche);
      const matchRayon = filtreRayon === 'tous' || p.rayon === filtreRayon;
      return matchRecherche && matchRayon;
    });

    // Puis trier
    resultats.sort((a, b) => {
      let valA, valB;

      switch (tri.colonne) {
        case 'libelle':
          valA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          valB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'moyenneHebdo':
          valA = a.moyenneHebdo || 0;
          valB = b.moyenneHebdo || 0;
          break;
        case 'potentielHebdo':
          valA = a.potentielHebdo || 0;
          valB = b.potentielHebdo || 0;
          break;
        case 'caHebdoActuel':
          valA = a.caHebdoActuel || 0;
          valB = b.caHebdoActuel || 0;
          break;
        case 'fiabilite':
          valA = a.fiabilite || 0;
          valB = b.fiabilite || 0;
          break;
        default:
          valA = a.moyenneHebdo || 0;
          valB = b.moyenneHebdo || 0;
      }

      // Comparaison selon le type
      if (typeof valA === 'string') {
        return tri.ordre === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return tri.ordre === 'asc' ? valA - valB : valB - valA;
      }
    });

    return resultats;
  }, [produits, recherche, filtreRayon, tri]);

  // Toggle actif/inactif
  const toggleActif = (produitId) => {
    const updated = produits.map(p =>
      p.id === produitId ? { ...p, actif: !p.actif } : p
    );
    onUpdate(updated);
  };

  // Tout activer / Tout désactiver
  const toggleTous = (actif) => {
    const updated = produits.map(p => ({ ...p, actif }));
    onUpdate(updated);
  };

  // Icône tendance - Charte Mousquetaires : emerald pour croissance, red pour déclin
  const TendanceIcon = ({ tendance }) => {
    if (tendance === 'croissance') return <TrendingUp className="text-emerald-500" size={16} />;
    if (tendance === 'declin') return <TrendingDown className="text-red-500" size={16} />;
    return <Minus className="text-gray-400" size={16} />;
  };

  // Composant pour l'en-tête de colonne triable
  const SortableHeader = ({ colonne, label, align = 'left' }) => {
    const isActive = tri.colonne === colonne;
    return (
      <th
        className={`px-4 py-3 text-${align} text-sm font-semibold text-[#58595B] cursor-pointer hover:bg-[#E8E1D5]/50 select-none`}
        onClick={() => handleTriColonne(colonne)}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <span className={`transition-opacity ${isActive ? 'opacity-100 text-[#ED1C24]' : 'opacity-30'}`}>
            {isActive && tri.ordre === 'asc' ? (
              <ArrowUp size={14} />
            ) : (
              <ArrowDown size={14} />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Stats
  const nbActifs = produits.filter(p => p.actif).length;
  const nbTotal = produits.length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#58595B]">Sélection des Produits</h2>
          <p className="text-[#58595B]/70">
            {nbActifs} produits actifs sur {nbTotal}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleTous(true)}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
          >
            Tout activer
          </button>
          <button
            onClick={() => toggleTous(false)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Tout désactiver
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58595B]/50" size={20} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#D1D3D4] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Filtre rayon */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#58595B]/50" size={20} />
          <select
            value={filtreRayon}
            onChange={(e) => setFiltreRayon(e.target.value)}
            className="pl-10 pr-8 py-2 border border-[#D1D3D4] rounded-lg focus:ring-2 focus:ring-amber-500 appearance-none bg-white"
          >
            {rayons.map(r => (
              <option key={r} value={r}>
                {r === 'tous' ? 'Tous les rayons' : r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des produits */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D1D3D4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#E8E1D5]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#58595B]">Actif</th>
              <SortableHeader colonne="libelle" label="Produit" align="left" />
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#58595B]">Rayon</th>
              <SortableHeader colonne="moyenneHebdo" label="Moy. Hebdo" align="right" />
              <SortableHeader colonne="potentielHebdo" label="Potentiel" align="right" />
              <SortableHeader colonne="caHebdoActuel" label="CA Hebdo" align="right" />
              <th className="px-4 py-3 text-center text-sm font-semibold text-[#58595B]">Tendance</th>
              <SortableHeader colonne="fiabilite" label="Fiabilité" align="center" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D1D3D4]">
            {produitsFiltres.map(produit => (
              <tr
                key={produit.id}
                className={`hover:bg-[#E8E1D5]/30 ${!produit.actif ? 'opacity-50' : ''}`}
              >
                {/* Toggle Actif */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActif(produit.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      produit.actif
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {produit.actif ? <Check size={16} /> : <X size={16} />}
                  </button>
                </td>

                {/* Produit */}
                <td className="px-4 py-3">
                  <div className="font-medium text-[#58595B]">{produit.libellePersonnalise || produit.libelle}</div>
                  {produit.itm8 && (
                    <div className="text-xs text-[#58595B]/60">ITM8: {produit.itm8}</div>
                  )}
                </td>

                {/* Rayon - Charte Mousquetaires par famille */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    produit.rayon === 'BOULANGERIE' ? 'bg-stone-100 text-stone-800 border border-stone-300' :
                    produit.rayon === 'VIENNOISERIE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    produit.rayon === 'PATISSERIE' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    produit.rayon === 'SNACKING' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    'bg-slate-100 text-slate-800 border border-slate-300'
                  }`}>
                    {produit.rayon || '-'}
                  </span>
                </td>

                {/* Moyenne Hebdo */}
                <td className="px-4 py-3 text-right font-mono text-[#58595B]">
                  {produit.moyenneHebdo || 0}
                </td>

                {/* Potentiel */}
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#58595B]">
                  {produit.potentielHebdo || 0}
                </td>

                {/* CA Hebdo */}
                <td className="px-4 py-3 text-right font-mono text-[#58595B]">
                  {(produit.caHebdoActuel || 0).toFixed(2)} €
                </td>

                {/* Tendance */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TendanceIcon tendance={produit.tendance} />
                    <span className={`text-xs ${
                      produit.tendance === 'croissance' ? 'text-emerald-600' :
                      produit.tendance === 'declin' ? 'text-red-600' :
                      'text-[#58595B]/60'
                    }`}>
                      {produit.tendancePourcent > 0 ? '+' : ''}{produit.tendancePourcent || 0}%
                    </span>
                  </div>
                </td>

                {/* Fiabilité */}
                <td className="px-4 py-3 text-center">
                  <div className="w-full bg-[#D1D3D4] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        produit.fiabilite >= 70 ? 'bg-emerald-500' :
                        produit.fiabilite >= 40 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${produit.fiabilite || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#58595B]/60">{produit.fiabilite || 0}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
