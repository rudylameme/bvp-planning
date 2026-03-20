/**
 * OngletPatisserie — Couverture multi-jours pour les produits pâtisserie
 *
 * Les produits pâtisserie (sous atmosphère, DLC 7j) ne sont pas planifiés
 * jour par jour : le manager définit un nombre de jours de couverture (1-7)
 * et un jour de mise en rayon. Le total = somme des préconisations des jours couverts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Cake, Star, Plus, X } from 'lucide-react';
import { useMagasin } from '../../../contexts/MagasinContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = { lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };

const isPatisserie = (p) => {
  const r = (p.rayon || p.famille || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return r.includes('patisserie');
};

const OngletPatisserie = ({ produits }) => {
  const { couverturePatisserie, setCouverturePatisserie, joursOuverture, frequentationData } = useMagasin();

  const nbJours = couverturePatisserie?.jours ?? 2;
  const jourDepart = couverturePatisserie?.jourDepart ?? 'lundi';
  const [exemplesIds, setExemplesIds] = useState(couverturePatisserie?.exemplesIds || []);
  const [selectorOuvert, setSelectorOuvert] = useState(false);

  // Produits pâtisserie actifs
  const produitsPat = useMemo(() =>
    (produits || []).filter(p => p.actif !== false && isPatisserie(p)),
    [produits]
  );

  // Jours ouverts (pour le dropdown)
  const joursOuverts = useMemo(() => {
    if (!joursOuverture?.creneaux) return JOURS;
    return JOURS.filter(j => {
      const creneaux = joursOuverture.creneaux[j];
      return creneaux && Object.values(creneaux).some(s => s === 'ouvert');
    });
  }, [joursOuverture]);

  // Jours couverts à partir du jour de départ
  const joursCouverts = useMemo(() => {
    const startIdx = JOURS.indexOf(jourDepart);
    const result = [];
    for (let i = 0; i < nbJours; i++) {
      result.push(JOURS[(startIdx + i) % 7]);
    }
    return result;
  }, [jourDepart, nbJours]);

  // Calculer la préconisation journalière d'un produit
  const getPrecoJour = useCallback((produit, jour) => {
    const rj = produit.repartitionJours;
    if (rj && rj[jour] != null) {
      return Math.ceil(rj[jour]);
    }
    const potentielHebdo = produit.planifieManager || produit.potentielAlgo || produit.potentiel || produit.moyHebdo || 0;
    const poids = frequentationData?.poidsJours?.[jour] || (1 / 7);
    return Math.ceil(potentielHebdo * poids);
  }, [frequentationData]);

  // Handlers
  const handleChangeJours = useCallback((val) => {
    const v = Math.max(1, Math.min(7, parseInt(val) || 2));
    setCouverturePatisserie(prev => ({ ...prev, jours: v, jourDepart: prev?.jourDepart || 'lundi', exemplesIds: exemplesIds }));
  }, [setCouverturePatisserie, exemplesIds]);

  const handleChangeJourDepart = useCallback((val) => {
    setCouverturePatisserie(prev => ({ ...prev, jours: prev?.jours || 2, jourDepart: val, exemplesIds: exemplesIds }));
  }, [setCouverturePatisserie, exemplesIds]);

  const ajouterExemple = useCallback((id) => {
    setExemplesIds(prev => {
      if (prev.length >= 3 || prev.includes(id)) return prev;
      const next = [...prev, id];
      setCouverturePatisserie(p => ({ ...p, exemplesIds: next }));
      return next;
    });
    setSelectorOuvert(false);
  }, [setCouverturePatisserie]);

  const retirerExemple = useCallback((id) => {
    setExemplesIds(prev => {
      const next = prev.filter(x => x !== id);
      setCouverturePatisserie(p => ({ ...p, exemplesIds: next }));
      return next;
    });
  }, [setCouverturePatisserie]);

  if (produitsPat.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Cake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucun produit pâtisserie actif dans la gamme.</p>
      </div>
    );
  }

  const produitsDisponibles = produitsPat.filter(p => !exemplesIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h3 className="text-lg font-bold text-gray-800">Pâtisserie — Couverture multi-jours</h3>
        <p className="text-sm text-gray-500">
          {produitsPat.length} produit{produitsPat.length > 1 ? 's' : ''} pâtisserie actif{produitsPat.length > 1 ? 's' : ''} — DLC longue, mise en rayon pour plusieurs jours
        </p>
      </div>

      {/* Réglages */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-6">
        {/* Jours de couverture */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Jours de couverture :</label>
          <input
            type="range"
            min="1"
            max="7"
            value={nbJours}
            onChange={(e) => handleChangeJours(e.target.value)}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#9B59B6]"
          />
          <input
            type="number"
            min="1"
            max="7"
            value={nbJours}
            onChange={(e) => handleChangeJours(e.target.value)}
            className="w-14 text-center border border-gray-300 rounded px-1 py-0.5 text-sm font-semibold"
          />
          <span className="text-sm text-gray-500">jour{nbJours > 1 ? 's' : ''}</span>
        </div>

        {/* Jour de départ */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Jour de mise en rayon :</label>
          <select
            value={jourDepart}
            onChange={(e) => handleChangeJourDepart(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {joursOuverts.map(j => (
              <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Résumé */}
        <div className="text-sm text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">
          Couverture : {joursCouverts.map(j => JOURS_LABELS[j]).join(' → ')}
        </div>
      </div>

      {/* Produits exemples */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Produits exemples ({exemplesIds.length}/3)
          </span>
          {exemplesIds.length < 3 && (
            <button
              onClick={() => setSelectorOuvert(!selectorOuvert)}
              className="flex items-center gap-1 text-sm text-[#9B59B6] hover:text-[#7D3C98]"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          )}
        </div>

        {/* Sélecteur */}
        {selectorOuvert && produitsDisponibles.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {produitsDisponibles.slice(0, 20).map(p => (
                <button
                  key={p.id}
                  onClick={() => ajouterExemple(p.id)}
                  className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-[#9B59B6] hover:text-white transition-colors"
                >
                  {p.libellePersonnalise || p.libelle}
                </button>
              ))}
            </div>
          </div>
        )}

        {exemplesIds.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 text-sm font-semibold text-gray-700">Produit</th>
                {joursCouverts.map(j => (
                  <th key={j} className="text-center px-3 py-2 text-sm font-semibold text-purple-700 w-16">
                    {JOURS_LABELS[j]}
                  </th>
                ))}
                <th className="text-center px-3 py-2 text-sm font-bold text-gray-800 w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {exemplesIds.map(id => {
                const p = produitsPat.find(pr => pr.id === id);
                if (!p) return null;

                const qtes = joursCouverts.map(j => getPrecoJour(p, j));
                const total = qtes.reduce((s, q) => s + q, 0);

                return (
                  <tr key={id} className="border-b border-gray-100 hover:bg-purple-50/30">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-purple-500 fill-purple-500" />
                        <span className="text-sm text-gray-700">{p.libellePersonnalise || p.libelle}</span>
                        <button
                          onClick={() => retirerExemple(id)}
                          className="p-0.5 hover:bg-red-100 rounded ml-auto"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </td>
                    {qtes.map((q, i) => (
                      <td key={joursCouverts[i]} className="text-center px-3 py-2 text-sm font-medium text-gray-700">
                        {q}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 font-bold text-[#9B59B6]">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-sm text-gray-400">
            Sélectionnez des produits pour voir l'impact de la couverture multi-jours
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
        <strong>Principe :</strong> Total à mettre en rayon = somme des préconisations journalières sur {nbJours} jour{nbJours > 1 ? 's' : ''}.
        <br />
        <span className="text-xs text-purple-600">
          Sur la feuille de production, les produits pâtisserie affichent les colonnes jour au lieu des tranches horaires.
        </span>
      </div>
    </div>
  );
};

export default OngletPatisserie;
