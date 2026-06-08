/**
 * Vue Niveau 3 — Secteur (wrapper autour de SectorManagerDashboard existant).
 *
 * Phase 1 : SectorManagerDashboard reste identique. Le wrapper lui fournit les
 * données via sectorManagerService.chargerDonneesSecteur() et délègue le clic
 * PDV au parent (pour naviguer au Niveau 4 Magasin).
 *
 * Phase 2 ajoutera : grille 9 KPIs en tête + colonne Statut DEC dans le tableau
 * + renommage libellés « CA potentiel/an » / « CA potentiel annuel secteur ».
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import SectorManagerDashboard from '../secteur/SectorManagerDashboard';

export default function VueSecteurWrapper({ donnees, chargement, chargementPdv, onSelectionnerPdv, onRetour }) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Chargement du secteur…</span>
      </div>
    );
  }

  if (!donnees) return null;

  return (
    <SectorManagerDashboard
      donnees={donnees}
      typePeriode="mois"
      onClickPdv={onSelectionnerPdv}
      chargementPdv={chargementPdv}
      onRetour={onRetour}
    />
  );
}
