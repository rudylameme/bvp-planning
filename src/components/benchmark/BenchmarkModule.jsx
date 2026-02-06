/**
 * Module Benchmark - Composant principal
 *
 * Gère le flux complet du benchmark :
 * 1. Accueil (sélection magasin/semaine)
 * 2. Dashboard (affichage des résultats)
 * 3. Navigation vers le planning
 */

import React, { useState, useCallback } from 'react';
import AccueilBenchmark from './AccueilBenchmark';
import DashboardBenchmark from './DashboardBenchmark';

const BenchmarkModule = ({ onNaviguerPlanning, onRetourAccueilGlobal }) => {
  // États
  const [ecran, setEcran] = useState('accueil'); // 'accueil' ou 'dashboard'
  const [donneesBenchmark, setDonneesBenchmark] = useState(null);

  // Handler quand les données sont chargées
  const handleDonneesChargees = useCallback((donnees) => {
    console.log('📊 Données benchmark chargées:', donnees);
    setDonneesBenchmark(donnees);
    setEcran('dashboard');
  }, []);

  // Retour à l'accueil benchmark
  const handleRetour = useCallback(() => {
    setEcran('accueil');
  }, []);

  // Navigation vers le planning avec les données
  const handleNaviguerPlanning = useCallback(() => {
    if (onNaviguerPlanning && donneesBenchmark) {
      onNaviguerPlanning(donneesBenchmark);
    }
  }, [onNaviguerPlanning, donneesBenchmark]);

  // Rendu selon l'écran
  if (ecran === 'accueil') {
    return (
      <AccueilBenchmark
        onDonneesChargees={handleDonneesChargees}
        onRetourAccueil={onRetourAccueilGlobal}
      />
    );
  }

  if (ecran === 'dashboard') {
    return (
      <DashboardBenchmark
        donnees={donneesBenchmark}
        onRetour={handleRetour}
        onNaviguerPlanning={handleNaviguerPlanning}
        onRetourAccueil={onRetourAccueilGlobal}
      />
    );
  }

  return null;
};

export default BenchmarkModule;
