import { useState, useEffect } from 'react';

/**
 * Hook pour gérer la persistance des données de production
 * Stocke les données dans localStorage par jour et par rayon/programme
 */
export const useProductionStorage = (jour, rayon, programme) => {
  const storageKey = `production_${jour}_${rayon}_${programme}`;

  // Charger les données depuis localStorage
  const loadData = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erreur chargement localStorage:', error);
    }
    return {
      trancheActive: 'matin',
      // Cases cochées par tranche horaire (historique complet)
      produitsCoches: {
        matin: [],
        midi: [],
        'apres-midi': []
      },
      stocksRayon: {},
      casse: {},
      heureDebut: null,
      enCours: false
    };
  };

  const [data, setData] = useState(loadData);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde localStorage:', error);
    }
  }, [data, storageKey]);

  // Fonctions helper pour modifier les données
  const updateData = (updates) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const toggleProduit = (libelle, tranche) => {
    setData(prev => {
      const tranchesCoches = { ...prev.produitsCoches };
      const listeProduits = tranchesCoches[tranche] || [];

      tranchesCoches[tranche] = listeProduits.includes(libelle)
        ? listeProduits.filter(p => p !== libelle)
        : [...listeProduits, libelle];

      return { ...prev, produitsCoches: tranchesCoches };
    });
  };

  const setStockRayon = (libelle, valeur) => {
    setData(prev => ({
      ...prev,
      stocksRayon: { ...prev.stocksRayon, [libelle]: valeur }
    }));
  };

  const setCasse = (libelle, valeur) => {
    setData(prev => ({
      ...prev,
      casse: { ...prev.casse, [libelle]: valeur }
    }));
  };

  const setTrancheActive = (tranche) => {
    updateData({ trancheActive: tranche });
  };

  const demarrerProduction = () => {
    updateData({
      enCours: true,
      heureDebut: new Date().toISOString()
    });
  };

  return {
    data,
    toggleProduit,
    setStockRayon,
    setCasse,
    setTrancheActive,
    demarrerProduction,
    updateData
  };
};
