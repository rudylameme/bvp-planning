/**
 * OngletPlaquage — Pourcentage de plaquage par programme de cuisson
 *
 * Lit les programmes depuis le fichier EQUIPE le plus récent (dossier BVP partagé)
 * et depuis les produits actifs de la gamme.
 * Le manager définit un % par programme (0-100%, défaut 100%).
 * Permet de sélectionner 3-4 produits exemples par programme pour visualiser l'impact.
 *
 * Formule plaquage : Math.ceil(qté_1ère_tranche × %_programme / 100 / unitésParPlaque)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Star, Plus, X, Percent } from 'lucide-react';
import { useMagasin } from '../../../contexts/MagasinContext';
import { trouverDernierFichierEquipe } from '../../../services/dossierEquipeService';

const OngletPlaquage = ({ produits }) => {
  const { dossierBVP, semainePlanning, plaquageProgrammes, setPlaquageProgrammes } = useMagasin();

  const [programmesEquipe, setProgrammesEquipe] = useState([]);
  const [persosEquipe, setPersosEquipe] = useState({}); // { id: { programme, libelle, ... } }
  const [chargement, setChargement] = useState(false);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [exemplesParProgramme, setExemplesParProgramme] = useState({}); // { "Viennoiserie": [id1, id2, ...] }
  const [selectorOuvert, setSelectorOuvert] = useState(null); // programme ouvert pour sélectionner

  // Résoudre le programme effectif d'un produit (personnalisation EQUIPE > programme d'origine)
  const getProgrammeEffectif = useCallback((p) => {
    // Les personnalisations EQUIPE sont indexées par id (numérique en string)
    const idStr = String(p.id);
    if (persosEquipe[idStr]?.programme) {
      return persosEquipe[idStr].programme;
    }
    return p.programme;
  }, [persosEquipe]);

  // Programmes issus des produits actifs de la gamme (avec personnalisations EQUIPE)
  const programmesGamme = useMemo(() => {
    const set = new Set();
    (produits || []).forEach(p => {
      if (p.actif !== false) {
        const prog = getProgrammeEffectif(p);
        if (prog) set.add(prog);
      }
    });
    return [...set].sort();
  }, [produits, getProgrammeEffectif]);

  // Charger les programmes depuis le fichier EQUIPE
  const chargerProgrammesEquipe = useCallback(async () => {
    if (!dossierBVP) return;
    setChargement(true);
    try {
      const sem = semainePlanning || { semaine: 1, annee: 2026 };
      const result = await trouverDernierFichierEquipe(dossierBVP, sem.semaine, sem.annee);
      if (result?.data) {
        // Programmes personnalisés
        if (result.data.programmesPersonnalises) {
          const progs = result.data.programmesPersonnalises;
          const noms = Array.isArray(progs) ? progs.map(p => p.nom || p) : Object.keys(progs);
          setProgrammesEquipe(noms);
        }
        // Personnalisations produits (itm8 → { programmeFour, ... })
        if (result.data.personnalisations) {
          setPersosEquipe(result.data.personnalisations);
        }
        setSourceInfo(`${result.filename} (S${result.semaine || '?'})`);
      } else {
        setSourceInfo('Aucun fichier EQUIPE trouvé');
      }
    } catch (err) {
      console.warn('Erreur chargement programmes EQUIPE:', err);
      setSourceInfo('Erreur de lecture');
    } finally {
      setChargement(false);
    }
  }, [dossierBVP, semainePlanning]);

  // Charger au montage
  useEffect(() => {
    chargerProgrammesEquipe();
  }, [chargerProgrammesEquipe]);

  // Liste fusionnée des programmes (EQUIPE + Gamme, dédoublonnée)
  const programmesFusionnes = useMemo(() => {
    const set = new Set([...programmesEquipe, ...programmesGamme]);
    return [...set].sort();
  }, [programmesEquipe, programmesGamme]);

  // Produits actifs par programme (avec personnalisations EQUIPE)
  const produitsParProgramme = useMemo(() => {
    const map = {};
    (produits || []).forEach(p => {
      if (p.actif !== false) {
        const prog = getProgrammeEffectif(p);
        if (prog) {
          if (!map[prog]) map[prog] = [];
          map[prog].push(p);
        }
      }
    });
    return map;
  }, [produits, getProgrammeEffectif]);

  // Handler changement pourcentage
  const handleChangePourcentage = useCallback((programme, valeur) => {
    const v = Math.max(0, Math.min(100, parseInt(valeur) || 0));
    setPlaquageProgrammes(prev => ({ ...prev, [programme]: v }));
  }, [setPlaquageProgrammes]);

  // Ajouter un produit exemple
  const ajouterExemple = useCallback((programme, produitId) => {
    setExemplesParProgramme(prev => {
      const current = prev[programme] || [];
      if (current.length >= 4 || current.includes(produitId)) return prev;
      return { ...prev, [programme]: [...current, produitId] };
    });
    setSelectorOuvert(null);
  }, []);

  // Retirer un produit exemple
  const retirerExemple = useCallback((programme, produitId) => {
    setExemplesParProgramme(prev => {
      const current = (prev[programme] || []).filter(id => id !== produitId);
      return { ...prev, [programme]: current };
    });
  }, []);

  if (programmesFusionnes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Percent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucun programme de cuisson détecté.</p>
        <p className="text-sm text-gray-400 mt-1">Les programmes apparaissent quand des produits actifs ont un programme assigné.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec bouton actualiser */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Plaquage par programme</h3>
          <p className="text-sm text-gray-500">
            Définissez le pourcentage de plaquage la veille pour chaque programme de cuisson
          </p>
        </div>
        <button
          onClick={chargerProgrammesEquipe}
          disabled={chargement || !dossierBVP}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${chargement ? 'animate-spin' : ''}`} />
          Actualiser les programmes
        </button>
      </div>

      {/* Source info */}
      {sourceInfo && (
        <p className="text-xs text-gray-400 italic">Source EQUIPE : {sourceInfo}</p>
      )}

      {/* Tableau des programmes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Programme</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 w-24">Produits</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 w-48">% Plaquage</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 w-16">Exemples</th>
            </tr>
          </thead>
          <tbody>
            {programmesFusionnes.map(programme => {
              const nbProduits = (produitsParProgramme[programme] || []).length;
              const pourcentage = plaquageProgrammes[programme] ?? 100;
              const exemples = exemplesParProgramme[programme] || [];
              const produitsDisponibles = (produitsParProgramme[programme] || [])
                .filter(p => !exemples.includes(p.id));

              return (
                <React.Fragment key={programme}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{programme}</span>
                      {programmesEquipe.includes(programme) && !programmesGamme.includes(programme) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">EQUIPE</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3 text-gray-600">{nbProduits}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={pourcentage}
                          onChange={(e) => handleChangePourcentage(programme, e.target.value)}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B1538]"
                        />
                        <div className="flex items-center w-20">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pourcentage}
                            onChange={(e) => handleChangePourcentage(programme, e.target.value)}
                            className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-sm font-semibold"
                          />
                          <span className="text-sm text-gray-500 ml-1">%</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      {nbProduits > 0 && exemples.length < 4 && (
                        <button
                          onClick={() => setSelectorOuvert(selectorOuvert === programme ? null : programme)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Ajouter un produit exemple"
                        >
                          <Plus className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Sélecteur de produit */}
                  {selectorOuvert === programme && produitsDisponibles.length > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 bg-gray-50">
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {produitsDisponibles.slice(0, 20).map(p => (
                            <button
                              key={p.id}
                              onClick={() => ajouterExemple(programme, p.id)}
                              className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-[#8B1538] hover:text-white transition-colors"
                            >
                              {p.libellePersonnalise || p.libelle}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Produits exemples */}
                  {exemples.length > 0 && exemples.map(produitId => {
                    const p = (produitsParProgramme[programme] || []).find(pr => pr.id === produitId);
                    if (!p) return null;

                    const upp = p.unitesParPlaque || 0;
                    // Quantité matin approximative
                    const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
                    const qteMatin = Math.ceil(qteHebdo * 0.2);
                    // Plaquage en UNITÉS (pas en plaques)
                    const plaquageUnites = Math.round(qteMatin * pourcentage / 100);

                    return (
                      <tr key={`ex-${programme}-${produitId}`} className="bg-amber-50/50 border-b border-gray-100">
                        <td className="px-4 py-1.5 pl-8">
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-sm text-gray-700">{p.libellePersonnalise || p.libelle}</span>
                            <button
                              onClick={() => retirerExemple(programme, produitId)}
                              className="p-0.5 hover:bg-red-100 rounded ml-auto"
                            >
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </td>
                        <td className="text-center px-4 py-1.5 text-xs text-gray-500">
                          {qteMatin}u matin
                        </td>
                        <td className="text-center px-4 py-1.5 text-xs text-gray-500">
                          {upp > 0 ? `${upp} u/pl` : '-'}
                        </td>
                        <td className="text-center px-4 py-1.5">
                          <span className="font-bold text-[#8B1538]">{plaquageUnites} u</span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total plaques si exemples existent */}
                  {exemples.length > 0 && (() => {
                    let totalUnites = 0;
                    let totalUpp = 0;
                    let hasUpp = false;
                    exemples.forEach(produitId => {
                      const p = (produitsParProgramme[programme] || []).find(pr => pr.id === produitId);
                      if (!p) return;
                      const upp = p.unitesParPlaque || 0;
                      const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
                      const qteMatin = Math.ceil(qteHebdo * 0.2);
                      const plaqUnites = Math.round(qteMatin * pourcentage / 100);
                      totalUnites += plaqUnites;
                      if (upp > 0) {
                        totalUpp += plaqUnites / upp;
                        hasUpp = true;
                      }
                    });
                    return totalUnites > 0 ? (
                      <tr className="bg-amber-100/50 border-b-2 border-amber-200">
                        <td colSpan={3} className="px-4 py-1.5 text-right text-sm font-semibold text-amber-800">
                          Total exemples {programme} :
                        </td>
                        <td className="text-center px-4 py-1.5 font-bold text-[#8B1538]">
                          {hasUpp ? `${totalUpp.toFixed(1)} pl.` : `${totalUnites} u`}
                        </td>
                      </tr>
                    ) : null;
                  })()}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info formule */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <strong>Formule :</strong> Plaquage = <code className="bg-blue-100 px-1 rounded">Math.ceil(qté_1ère_tranche &times; %_programme / 100 / unitésParPlaque)</code>
        <br />
        <span className="text-xs text-blue-600">
          Ces pourcentages sont utilisés sur la feuille de production imprimable (colonne Plaquage) et exportés dans le fichier MANAGER .bvp.json.
        </span>
      </div>
    </div>
  );
};

export default OngletPlaquage;
