/**
 * Accueil Équipe V5
 *
 * Donne accès aux 2 modules pour les équipiers :
 * - Planning du jour
 * - Commande (inventaire + personnalisation + plaquage J+1)
 */

import React, { useState, useEffect } from 'react';
import { Home, Calendar, Package, ArrowLeft, CheckCircle, Store, AlertCircle } from 'lucide-react';

// Import des composants existants
import ImportFichierEquipe, { useFichierMagasin } from './ImportFichierEquipe';
import PlanningJour from './PlanningJour';
import CommandeEquipe from './CommandeEquipe';

const AccueilEquipe = ({ onRetourAccueil }) => {
  const [fichierCharge, setFichierCharge] = useState(null);
  const [moduleActif, setModuleActif] = useState(null); // 'planning', 'commande'

  const { chargerDepuisStorage, effacerFichier } = useFichierMagasin();

  // Charger le fichier depuis localStorage au démarrage
  useEffect(() => {
    const fichierSauvegarde = chargerDepuisStorage();
    if (fichierSauvegarde) {
      setFichierCharge(fichierSauvegarde);
    }
  }, []);

  const MODULES = [
    {
      id: 'planning',
      label: 'Planning du jour',
      icon: Calendar,
      description: 'Quantités à produire par créneau — à imprimer chaque matin',
      color: 'bg-blue-500',
      colorHover: 'hover:bg-blue-600',
    },
    {
      id: 'commande',
      label: 'Commande',
      icon: Package,
      description: 'Inventaire, personnalisation et préparation commande',
      color: 'bg-green-500',
      colorHover: 'hover:bg-green-600',
    },
  ];

  // Gérer le chargement du fichier
  const handleFichierCharge = (data) => {
    setFichierCharge(data);
  };

  // Changer de fichier
  const handleChangerFichier = () => {
    effacerFichier();
    setFichierCharge(null);
    setModuleActif(null);
  };

  // Retour aux modules
  const handleRetourModules = () => {
    setModuleActif(null);
  };

  // Préparer les données pour PlanningJour (compatible V5 schéma 3.0 et V4)
  const donneesMagasin = fichierCharge ? {
    configuration: fichierCharge.configuration
      ? {
          ...fichierCharge.configuration,
          semaine: fichierCharge.semaine?.numero || fichierCharge.configuration.semaine,
          annee: fichierCharge.semaine?.annee || fichierCharge.configuration.annee,
          dateDebut: fichierCharge.semaine?.dateDebut || fichierCharge.configuration?.dateDebut || '',
          // Métadonnées pour l'impression (format V2)
          codePDV: fichierCharge.magasin?.code || '',
          nomPDV: fichierCharge.magasin?.nom || '',
          typePonderation: fichierCharge.frequentation?.typePonderation || '',
        }
      : {
          joursActifs: [],
          semaine: fichierCharge.semaine?.numero,
          annee: fichierCharge.semaine?.annee,
          dateDebut: fichierCharge.semaine?.dateDebut || '',
          codePDV: fichierCharge.magasin?.code || '',
          nomPDV: fichierCharge.magasin?.nom || '',
          typePonderation: fichierCharge.frequentation?.typePonderation || '',
        },
    frequentation: fichierCharge.frequentation || {},
    // Garantir que chaque produit a un id unique (filet de sécurité pour anciens fichiers)
    produits: (fichierCharge.produits || []).map((p, i) => ({
      ...p,
      id: p.id || p.itm8 || `prod_${i + 1}`,
    })),
    commandes: fichierCharge.commandes || {},
    personnalisationProduits: fichierCharge.personnalisationProduits || {},
  } : null;

  // Si pas de fichier chargé, afficher l'import
  if (!fichierCharge) {
    return (
      <div className="min-h-screen bg-[#F5F2ED]">
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onRetourAccueil}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Retour à l'accueil"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="text-xl font-bold">Espace Équipe</h1>
                <p className="text-sm text-white/70">Production quotidienne</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              V5.3
            </span>
          </div>
        </div>

        {/* Zone d'import */}
        <ImportFichierEquipe onFichierCharge={handleFichierCharge} />
      </div>
    );
  }

  // Si un module est actif, l'afficher en plein écran
  if (moduleActif) {
    return (
      <div className="min-h-screen bg-[#F5F2ED]">
        {/* Header avec bouton retour */}
        <div className="bg-emerald-600 text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleRetourModules}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                title="Retour aux modules"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Retour</span>
              </button>
              <div className="h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="text-xl font-bold">
                  {MODULES.find(m => m.id === moduleActif)?.label}
                </h1>
                <p className="text-sm text-white/70">
                  {fichierCharge.magasin?.nom} • S{(fichierCharge.semaine?.numero || fichierCharge.configuration?.semaine)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu du module */}
        <div className="flex-1">
          {moduleActif === 'planning' && donneesMagasin && (
            <PlanningJour donneesMagasin={donneesMagasin} />
          )}

          {moduleActif === 'commande' && (
            <CommandeEquipe fichierManager={fichierCharge} />
          )}
        </div>
      </div>
    );
  }

  // Afficher la sélection des modules
  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      {/* Header */}
      <div className="bg-emerald-600 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onRetourAccueil}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Retour à l'accueil"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/30"></div>
            <div>
              <h1 className="text-xl font-bold">Espace Équipe</h1>
              <p className="text-sm text-white/70">Production quotidienne</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
            V5.3
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Fichier chargé - Info */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gray-400" />
              <p className="font-semibold text-gray-800 truncate">
                {fichierCharge.magasin?.nom}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Semaine {(fichierCharge.semaine?.numero || fichierCharge.configuration?.semaine)} / {(fichierCharge.semaine?.annee || fichierCharge.configuration?.annee)} • {fichierCharge.produits?.length || 0} produits
            </p>
          </div>
          <button
            onClick={handleChangerFichier}
            className="px-4 py-2 text-sm text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            Changer
          </button>
        </div>

        {/* Grille des modules */}
        <div className="grid md:grid-cols-2 gap-6">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setModuleActif(module.id)}
                className="bg-white rounded-2xl shadow-lg p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 border-2 border-transparent hover:border-emerald-500/20"
              >
                <div className={`w-14 h-14 ${module.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{module.label}</h3>
                <p className="text-sm text-gray-500 mb-4">{module.description}</p>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <span>Accéder</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Info sur les données */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Comment ça marche ?</p>
              <ul className="space-y-1 text-blue-600">
                <li>• <strong>Planning</strong> : Quantités à produire par créneau — à imprimer chaque matin</li>
                <li>• <strong>Commande</strong> : Inventaire, personnalisation produits et plaquage J+1</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccueilEquipe;
