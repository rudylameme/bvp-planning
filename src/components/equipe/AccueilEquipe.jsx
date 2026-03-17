/**
 * Accueil Équipe V5.3
 *
 * Donne accès aux 2 modules pour les équipiers :
 * - Planning du jour
 * - Commande (inventaire + personnalisation + plaquage J+1)
 *
 * Architecture zéro-localStorage :
 * - Scanne le dossier partagé pour trouver le fichier MANAGER
 * - Charge les personnalisations depuis le fichier EQUIPE existant
 * - Passe le dirHandle aux enfants pour écriture
 */

import React, { useState, useEffect } from 'react';
import { Home, Calendar, Package, ArrowLeft, CheckCircle, Store, AlertCircle, Loader2, FolderOpen, RefreshCw } from 'lucide-react';

// Import des composants existants
import PlanningJour from './PlanningJour';
import CommandeEquipe from './CommandeEquipe';

// Service dossier partagé
import { chargerDonneesDepuisDossier } from '../../services/dossierEquipeService';

const AccueilEquipe = ({ onRetourAccueil, dossierEquipeHandle }) => {
  const [fichierCharge, setFichierCharge] = useState(null);    // Données MANAGER chargées
  const [donneesEquipe, setDonneesEquipe] = useState(null);    // Données EQUIPE existantes
  const [moduleActif, setModuleActif] = useState(null);        // 'planning', 'commande'
  const [chargementEnCours, setChargementEnCours] = useState(false);
  const [erreurChargement, setErreurChargement] = useState(null);

  // Scanner le dossier partagé au montage
  useEffect(() => {
    if (!dossierEquipeHandle) return;
    let cancelled = false;

    (async () => {
      setChargementEnCours(true);
      setErreurChargement(null);

      const result = await chargerDonneesDepuisDossier(dossierEquipeHandle);

      if (cancelled) return;

      if (result.error && !result.manager) {
        setErreurChargement(result.error);
        setChargementEnCours(false);
        return;
      }

      if (result.manager) {
        setFichierCharge(result.manager.data);
        // nomFichierManager disponible dans result.manager.filename si besoin
      }
      if (result.equipe) {
        setDonneesEquipe(result.equipe.data);
      }
      setChargementEnCours(false);
    })();

    return () => { cancelled = true; };
  }, [dossierEquipeHandle]);

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

  // Recharger le dossier (ex: après un nouveau dépôt manager)
  const handleRecharger = async () => {
    if (!dossierEquipeHandle) return;
    setChargementEnCours(true);
    setErreurChargement(null);
    const result = await chargerDonneesDepuisDossier(dossierEquipeHandle);
    if (result.manager) {
      setFichierCharge(result.manager.data);
    }
    if (result.equipe) {
      setDonneesEquipe(result.equipe.data);
    }
    if (result.error && !result.manager) {
      setErreurChargement(result.error);
    }
    setChargementEnCours(false);
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

  // Si chargement en cours ou pas de fichier trouvé
  if (chargementEnCours || !fichierCharge) {
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

        {/* Zone de chargement ou erreur */}
        <div className="max-w-xl mx-auto p-6 mt-10">
          {chargementEnCours ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Recherche en cours...</h2>
              <p className="text-gray-500">Scan du dossier partagé pour trouver le fichier Manager</p>
            </div>
          ) : erreurChargement ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                <FolderOpen className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun fichier Manager trouvé</h2>
              <p className="text-gray-500 mb-6">{erreurChargement}</p>
              <p className="text-sm text-gray-400 mb-6">
                Vérifiez que votre responsable a bien déposé le fichier planning dans le dossier partagé.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onRetourAccueil}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleRecharger}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rescanner le dossier
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
            <PlanningJour
              donneesMagasin={donneesMagasin}
              dossierEquipeHandle={dossierEquipeHandle}
              donneesEquipe={donneesEquipe}
              infoSemaine={{
                magasin: fichierCharge.magasin || {},
                semaine: fichierCharge.planning?.semaine || fichierCharge.semaine?.numero || fichierCharge.configuration?.semaine,
                annee: fichierCharge.planning?.annee || fichierCharge.semaine?.annee || fichierCharge.configuration?.annee,
              }}
            />
          )}

          {moduleActif === 'commande' && (
            <CommandeEquipe
              fichierManager={fichierCharge}
              dossierEquipeHandle={dossierEquipeHandle}
              donneesEquipe={donneesEquipe}
            />
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
              Semaine {(fichierCharge.planning?.semaine || fichierCharge.semaine?.numero || fichierCharge.configuration?.semaine)} / {(fichierCharge.planning?.annee || fichierCharge.semaine?.annee || fichierCharge.configuration?.annee)} • {fichierCharge.produits?.length || 0} produits
              {donneesEquipe && <span className="ml-2 text-emerald-600 font-medium">• Personnalisations chargées</span>}
            </p>
          </div>
          <button
            onClick={handleRecharger}
            className="px-4 py-2 text-sm text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
            title="Rescanner le dossier pour un fichier plus récent"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recharger
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
