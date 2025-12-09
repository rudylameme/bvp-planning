import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Search, Filter, ToggleLeft, ToggleRight, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

// Couleurs par rayon (charte Mousquetaires)
const COULEURS_RAYON = {
  BOULANGERIE: { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800' },
  VIENNOISERIE: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
  PATISSERIE: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800' },
  SNACKING: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800' },
  AUTRE: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800' },
};

export default function PilotageCA({
  produits,
  onProduitsChange,
  caTotalRayon,
  modeTerrain = false,
  onModeTerrainChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('TOUS');
  const [hideInactifs, setHideInactifs] = useState(false); // false = tous visibles par défaut
  const [sortConfig, setSortConfig] = useState({ key: 'moyenneHebdo', direction: 'desc' }); // Tri par défaut

  // Calculs CA
  const stats = useMemo(() => {
    const produitsActifs = produits.filter(p => p.actif);
    const caPrevi = produitsActifs.reduce((sum, p) => sum + (p.potentielHebdo || 0) * (p.prixMoyenUnitaire || 0), 0);
    const caHisto = produitsActifs.reduce((sum, p) => sum + (p.caHebdoActuel || 0), 0);
    const progression = caHisto > 0 ? ((caPrevi - caHisto) / caHisto) * 100 : 0;
    const pourcentageSelection = caTotalRayon > 0 ? (caHisto / caTotalRayon) * 100 : 0;

    return {
      nbActifs: produitsActifs.length,
      nbTotal: produits.length,
      caPrevi,
      caHisto,
      progression,
      pourcentageSelection
    };
  }, [produits, caTotalRayon]);

  // Rayons disponibles
  const rayonsDisponibles = useMemo(() => {
    const rayons = new Set(produits.map(p => p.rayon || 'AUTRE'));
    return ['TOUS', ...Array.from(rayons)];
  }, [produits]);

  // Fonction de tri
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Produits filtrés et triés
  const produitsFiltres = useMemo(() => {
    let filtered = produits.filter(p => {
      // Filtre recherche
      const matchSearch = searchTerm === '' ||
        p.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.libellePersonnalise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.plu?.includes(searchTerm) ||
        p.itm8?.includes(searchTerm);

      // Filtre rayon
      const matchRayon = filtreRayon === 'TOUS' || p.rayon === filtreRayon;

      // Filtre actifs/inactifs - TOUS VISIBLES par défaut, option pour cacher les inactifs
      const matchActif = !hideInactifs || p.actif;

      return matchSearch && matchRayon && matchActif;
    });

    // Tri
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'libelle':
          aVal = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          bVal = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'moyenneHebdo':
          aVal = a.moyenneHebdo || 0;
          bVal = b.moyenneHebdo || 0;
          break;
        case 'potentielHebdo':
          aVal = a.potentielHebdo || 0;
          bVal = b.potentielHebdo || 0;
          break;
        case 'caHebdoActuel':
          aVal = a.caHebdoActuel || 0;
          bVal = b.caHebdoActuel || 0;
          break;
        default:
          aVal = a.moyenneHebdo || 0;
          bVal = b.moyenneHebdo || 0;
      }

      if (sortConfig.key === 'libelle') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [produits, searchTerm, filtreRayon, hideInactifs, sortConfig]);

  // Composant pour l'en-tête de colonne triable
  const SortableHeader = ({ label, sortKey, align = 'left' }) => (
    <th
      onClick={() => handleSort(sortKey)}
      className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'desc'
            ? <ArrowDown className="w-3 h-3" />
            : <ArrowUp className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  // Toggle actif d'un produit
  const toggleProduit = (id) => {
    const newProduits = produits.map(p =>
      p.id === id ? { ...p, actif: !p.actif } : p
    );
    onProduitsChange(newProduits);
  };

  // Activer/désactiver tous les produits filtrés
  const toggleTous = (actif) => {
    const idsFiltres = new Set(produitsFiltres.map(p => p.id));
    const newProduits = produits.map(p =>
      idsFiltres.has(p.id) ? { ...p, actif } : p
    );
    onProduitsChange(newProduits);
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Dashboard CA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CA Prévisionnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">CA Prévisionnel</span>
            <TrendingUp className="w-5 h-5 text-[#ED1C24]" />
          </div>
          <p className="text-2xl font-bold text-[#58595B]">{formatEuro(stats.caPrevi)}</p>
          <p className="text-xs text-gray-400 mt-1">Basé sur les potentiels</p>
        </div>

        {/* CA Historique */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">CA Historique</span>
            <span className="text-xs text-gray-400">Semaine équivalente</span>
          </div>
          <p className="text-2xl font-bold text-[#58595B]">{formatEuro(stats.caHisto)}</p>
          <p className="text-xs text-gray-400 mt-1">Données importées</p>
        </div>

        {/* Progression */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Progression</span>
            {stats.progression > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : stats.progression < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-500" />
            ) : (
              <Minus className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${
            stats.progression > 0 ? 'text-green-600' : stats.progression < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {stats.progression > 0 ? '+' : ''}{stats.progression.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">vs semaine précédente</p>
        </div>
      </div>

      {/* Sélection Gamme */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#58595B]">Sélection Gamme</h3>
            <p className="text-sm text-gray-500">
              {stats.nbActifs} produits actifs sur {stats.nbTotal}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Part du CA rayon</p>
            <p className="text-lg font-semibold text-[#8B1538]">
              {stats.pourcentageSelection.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-full transition-all"
            style={{ width: `${Math.min(stats.pourcentageSelection, 100)}%` }}
          />
        </div>
      </div>

      {/* Filtres et mode */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtre rayon */}
          <select
            value={filtreRayon}
            onChange={(e) => setFiltreRayon(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]"
          >
            {rayonsDisponibles.map(rayon => (
              <option key={rayon} value={rayon}>
                {rayon === 'TOUS' ? 'Tous les rayons' : rayon}
              </option>
            ))}
          </select>

          {/* Toggle pour cacher les inactifs */}
          <button
            onClick={() => setHideInactifs(!hideInactifs)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              hideInactifs
                ? 'bg-gray-100 border-gray-300 text-gray-500'
                : 'bg-white border-gray-300'
            }`}
            title={hideInactifs ? "Afficher les produits inactifs" : "Cacher les produits inactifs"}
          >
            {hideInactifs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-sm">{hideInactifs ? 'Inactifs masqués' : 'Tout afficher'}</span>
          </button>

          {/* Mode Terrain */}
          <button
            onClick={() => onModeTerrainChange(!modeTerrain)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              modeTerrain
                ? 'bg-[#ED1C24] text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {modeTerrain ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span className="text-sm font-medium">Mode Terrain</span>
          </button>
        </div>

        {/* Actions groupées */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => toggleTous(true)}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Activer tous ({produitsFiltres.length})
          </button>
          <button
            onClick={() => toggleTous(false)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Désactiver tous
          </button>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Actif
                </th>
                <SortableHeader label="Produit" sortKey="libelle" />
                {modeTerrain && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Famille
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PLU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Programme
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      U/Plaque
                    </th>
                  </>
                )}
                <SortableHeader label="Moy.Hebdo" sortKey="moyenneHebdo" align="right" />
                <SortableHeader label="Potentiel" sortKey="potentielHebdo" align="right" />
                <SortableHeader label="CA/sem" sortKey="caHebdoActuel" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {produitsFiltres.map((produit) => {
                const couleurs = COULEURS_RAYON[produit.rayon] || COULEURS_RAYON.AUTRE;
                return (
                  <tr
                    key={produit.id}
                    className={`transition-colors ${
                      produit.actif ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleProduit(produit.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          produit.actif
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {produit.actif && '✓'}
                      </button>
                    </td>

                    {/* Produit */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${couleurs.bg} ${couleurs.text}`}>
                          {produit.rayon?.substring(0, 3)}
                        </span>
                        <span className="font-medium text-[#58595B]">
                          {produit.libellePersonnalise || produit.libelle}
                        </span>
                      </div>
                    </td>

                    {/* Colonnes Mode Terrain */}
                    {modeTerrain && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-600">{produit.rayon}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{produit.plu || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{produit.programme || '-'}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {produit.unitesParPlaque || '-'}
                        </td>
                      </>
                    )}

                    {/* Stats */}
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {produit.moyenneHebdo?.toFixed(0) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#58595B]">
                      {produit.potentielHebdo?.toFixed(0) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#8B1538]">
                      {produit.caHebdoActuel ? formatEuro(produit.caHebdoActuel) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {produitsFiltres.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucun produit ne correspond aux filtres
          </div>
        )}
      </div>
    </div>
  );
}
