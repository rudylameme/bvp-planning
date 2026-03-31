/**
 * SectorManagerDashboard
 *
 * Tableau de bord du responsable secteur :
 * - 3 cartes KPI (pénétration, potentiel, PDV sous la moyenne)
 * - Tableau classement avec données actionnables par PDV :
 *   pénétration, CA BVP, meilleure/pire tranche, clients à récupérer, potentiel CA
 * - Clic sur un PDV → drill-down vers benchmark détaillé
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Search,
  Clock,
  Zap,
} from 'lucide-react';

// Formatage montant €
const fmt = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

// Formatage pourcentage
const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${(val * 100).toFixed(1)}%`;
};

// Badge médaille top 3
const MedailleBadge = ({ rang }) => {
  if (rang === 1) return <span className="text-lg" title="1er">🥇</span>;
  if (rang === 2) return <span className="text-lg" title="2e">🥈</span>;
  if (rang === 3) return <span className="text-lg" title="3e">🥉</span>;
  return <span className="text-sm font-bold text-gray-500">{rang}</span>;
};

// Barre de progression pénétration
const BarrePenetration = ({ valeur, max }) => {
  const pct = max > 0 ? (valeur / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            backgroundColor: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444',
          }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-12 text-right">{fmtPct(valeur)}</span>
    </div>
  );
};

// Badge tranche horaire avec couleur
const BadgeTranche = ({ label, type }) => {
  if (!label || label === '—') return <span className="text-xs text-gray-400">—</span>;
  const colors = type === 'best'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${colors}`}>
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
};

const SectorManagerDashboard = ({ donnees, typePeriode, onClickPdv, chargementPdv, onRetour }) => {
  const { secteur, moyenne, kpis, pdvs, metadata } = donnees;

  const [recherche, setRecherche] = useState('');
  const [triColonne, setTriColonne] = useState('rang');
  const [triDirection, setTriDirection] = useState('asc');

  const periodLabel = typePeriode === 'mois' ? 'mois' : 'semaine';
  const multiplier = metadata?.multiplier || (typePeriode === 'mois' ? 12 : 52);

  // Filtrage par recherche
  const pdvsFiltres = useMemo(() => {
    if (!recherche.trim()) return pdvs;
    const q = recherche.toLowerCase();
    return pdvs.filter(p =>
      p.code.includes(q) ||
      p.ville.toLowerCase().includes(q) ||
      p.enseigne.toLowerCase().includes(q) ||
      (p.modele && p.modele.toLowerCase().includes(q))
    );
  }, [pdvs, recherche]);

  // Tri
  const pdvsTries = useMemo(() => {
    const sorted = [...pdvsFiltres];
    sorted.sort((a, b) => {
      let va, vb;
      switch (triColonne) {
        case 'rang': va = a.rang; vb = b.rang; break;
        case 'ville': va = a.ville; vb = b.ville; break;
        case 'penetration': va = a.penetration; vb = b.penetration; break;
        case 'caBVP': va = a.caBVP; vb = b.caBVP; break;
        case 'pvMoyen': va = a.qteBVP > 0 ? a.caBVP / a.qteBVP : 0; vb = b.qteBVP > 0 ? b.caBVP / b.qteBVP : 0; break;
        case 'ticketMoyen': va = a.ticketMoyen || (a.ticketsBVP > 0 ? a.caBVP / a.ticketsBVP : 0); vb = b.ticketMoyen || (b.ticketsBVP > 0 ? b.caBVP / b.ticketsBVP : 0); break;
        case 'potentielCA': va = a.potentielCA; vb = b.potentielCA; break;
        case 'clientsARecuperer': va = a.opportunite?.clientsARecuperer || 0; vb = b.opportunite?.clientsARecuperer || 0; break;
        default: va = a.rang; vb = b.rang;
      }
      if (typeof va === 'string') {
        return triDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return triDirection === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  }, [pdvsFiltres, triColonne, triDirection]);

  const toggleTri = (col) => {
    if (triColonne === col) {
      setTriDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTriColonne(col);
      setTriDirection(col === 'penetration' || col === 'caBVP' || col === 'pvMoyen' || col === 'ticketMoyen' || col === 'potentielCA' || col === 'clientsARecuperer' ? 'desc' : 'asc');
    }
  };

  const TriIcon = ({ col }) => {
    if (triColonne !== col) return null;
    return triDirection === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div className="space-y-6">
      {/* En-tête secteur */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{secteur.libelle}</h2>
                <p className="text-indigo-200 text-sm">Code secteur {secteur.code}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{secteur.nbPdv}</p>
            <p className="text-indigo-200 text-sm">PDV dans le secteur</p>
            <p className="text-indigo-300 text-xs mt-1">
              Données {typePeriode === 'mois' ? 'mensuelles' : 'hebdomadaires'} — {metadata?.fichierSource}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pénétration moyenne */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-indigo-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pénétration moyenne</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{fmtPct(kpis.penetrationMoyenne)}</p>
          <p className="text-xs text-gray-500 mt-1">Max secteur : {fmtPct(kpis.penetrationMax)}</p>
        </div>

        {/* Potentiel total */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Potentiel annuel secteur</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{fmt(kpis.potentielTotal)}</p>
          <p className="text-xs text-gray-500 mt-1">Si tous au niveau du meilleur ({fmtPct(kpis.penetrationMax)})</p>
        </div>

        {/* PDV sous la moyenne */}
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sous la moyenne</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{kpis.nbSousLaMoyenne} <span className="text-lg font-normal text-gray-500">/ {secteur.nbPdv}</span></p>
          <p className="text-xs text-gray-500 mt-1">PDV sous la pénétration moyenne secteur</p>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par code, ville, enseigne ou modèle..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {recherche && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {pdvsFiltres.length} résultat{pdvsFiltres.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tableau classement */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 w-10" onClick={() => toggleTri('rang')}>
                  # <TriIcon col="rang" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('ville')}>
                  PDV <TriIcon col="ville" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100 w-40" onClick={() => toggleTri('penetration')}>
                  Pénétration <TriIcon col="penetration" />
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('caBVP')}>
                  CA BVP/{periodLabel} <TriIcon col="caBVP" />
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('pvMoyen')}>
                  PV moyen <TriIcon col="pvMoyen" />
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('ticketMoyen')}>
                  Ticket moyen <TriIcon col="ticketMoyen" />
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Meilleure tranche
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tranche à travailler
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('clientsARecuperer')}>
                  Clients à récupérer <TriIcon col="clientsARecuperer" />
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => toggleTri('potentielCA')}>
                  Potentiel/an <TriIcon col="potentielCA" />
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-12">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pdvsTries.map(pdv => {
                const sousLaMoyenne = pdv.penetration < kpis.penetrationMoyenne;
                const opp = pdv.opportunite;
                return (
                  <tr
                    key={pdv.code}
                    className={`hover:bg-indigo-50/50 transition-colors cursor-pointer ${sousLaMoyenne ? 'bg-amber-50/30' : ''}`}
                    onClick={() => onClickPdv(pdv.code)}
                  >
                    {/* Rang */}
                    <td className="px-3 py-3">
                      <MedailleBadge rang={pdv.rang} />
                    </td>

                    {/* PDV info */}
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{pdv.ville}</p>
                        <p className="text-xs text-gray-500">{pdv.code} • {pdv.enseigne} • <span className={`font-semibold ${pdv.modele === 'NC' ? 'text-gray-400' : 'text-indigo-600'}`}>{pdv.modele}</span></p>
                      </div>
                    </td>

                    {/* Pénétration */}
                    <td className="px-3 py-3">
                      <BarrePenetration valeur={pdv.penetration} max={kpis.penetrationMax} />
                    </td>

                    {/* CA BVP */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-800">{fmt(pdv.caBVP)}</span>
                    </td>

                    {/* PV Moyen */}
                    <td className="px-3 py-3 text-right">
                      {pdv.qteBVP > 0 ? (() => {
                        const pv = pdv.caBVP / pdv.qteBVP;
                        const moyPv = moyenne?.prixMoyenArticle;
                        const couleur = moyPv && pv >= moyPv ? 'text-emerald-600' : moyPv ? 'text-amber-600' : 'text-gray-800';
                        return <span className={`text-sm font-semibold ${couleur}`}>{pv.toFixed(2)} €</span>;
                      })() : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Ticket Moyen */}
                    <td className="px-3 py-3 text-right">
                      {(() => {
                        const tm = pdv.ticketMoyen || (pdv.ticketsBVP > 0 ? pdv.caBVP / pdv.ticketsBVP : 0);
                        if (!tm || tm <= 0) return <span className="text-xs text-gray-400">—</span>;
                        const moyTm = moyenne?.ticketMoyen;
                        const couleur = moyTm && tm >= moyTm ? 'text-emerald-600' : moyTm ? 'text-amber-600' : 'text-gray-800';
                        return <span className={`text-sm font-semibold ${couleur}`}>{tm.toFixed(2)} €</span>;
                      })()}
                    </td>

                    {/* Meilleure tranche */}
                    <td className="px-3 py-3 text-center">
                      {opp ? (
                        <div>
                          <BadgeTranche label={opp.meilleureTrancheLabel} type="best" />
                          <p className="text-xs text-gray-400 mt-0.5">{fmtPct(opp.penetrationMeilleure)}</p>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Tranche à travailler */}
                    <td className="px-3 py-3 text-center">
                      {opp ? (
                        <div>
                          <BadgeTranche label={opp.pireTrancheLabel} type="worst" />
                          <p className="text-xs text-gray-400 mt-0.5">{fmtPct(opp.penetrationPire)}</p>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Clients à récupérer */}
                    <td className="px-3 py-3 text-right">
                      {opp && opp.clientsARecuperer > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm font-semibold text-amber-700">+{opp.clientsARecuperer}</span>
                          <span className="text-xs text-gray-400">/{periodLabel}</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Potentiel CA annuel */}
                    <td className="px-3 py-3 text-right">
                      {pdv.potentielCA > 0 ? (
                        <span className="text-sm font-bold text-emerald-600">+{fmt(pdv.potentielCA)}</span>
                      ) : pdv.rang === 1 ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Référence</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Drill-down */}
                    <td className="px-3 py-3 text-center">
                      <button
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Voir le benchmark détaillé"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClickPdv(pdv.code);
                        }}
                      >
                        <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer tableau */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>{pdvsTries.length} PDV affichés{recherche ? ` sur ${pdvs.length}` : ''}</span>
          <span>
            CA BVP total secteur : <strong className="text-gray-700">{fmt(kpis.caTotalSecteur)}</strong> / {periodLabel}
          </span>
          <span>
            Extraction en {metadata?.tempsExtraction || '?'} ms
          </span>
        </div>
      </div>
    </div>
  );
};

export default SectorManagerDashboard;
