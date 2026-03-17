import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Upload, Download, Package, AlertTriangle, Search, User,
  ChevronDown, ChevronRight, Check, Calendar, Printer
} from 'lucide-react';
import {
  lireFichierJSON,
  validerFichierManager,
  creerFichierEquipe,
  genererNomFichierEquipe,
  telechargerJSON,
  enregistrerEchange
} from '../../services/fichierEchangeService';
import { sauvegarderFichierEquipe, trouverDernierFichierEquipe } from '../../services/dossierEquipeService';
import FicheInventaire from './FicheInventaire';

/**
 * CommandeEquipe — Écran unique simplifié
 *
 * Colonnes : Produit | CDT | Stock réel | Ventes prévues | Besoin | Cartons
 * - Date livraison sélectionnable
 * - Ventes prévues = somme repartitionJours de aujourd'hui jusqu'à livraison incluse
 * - Besoin = max(0, ventes prévues - stock réel)
 * - Cartons = ceil(besoin / CDT)
 * - Alerte rouge si stock < ventes prévues
 * - Entrée = ligne suivante (saisie rapide)
 */

const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Déterminer le jour de la semaine en français (0=dimanche → 'dimanche')
function getJourFr(date) {
  const map = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return map[date.getDay()];
}

// Générer les dates de livraison possibles (les jours actifs de la semaine du planning)
function genererDatesLivraison(configuration, semaine) {
  const joursActifs = configuration?.joursActifs || [];
  if (joursActifs.length === 0) return [];

  // Trouver le lundi de la semaine planning
  const dateDebut = configuration?.dateDebut || semaine?.dateDebut;
  let lundi;
  if (dateDebut) {
    lundi = new Date(dateDebut);
  } else {
    // Calculer depuis numéro semaine
    const numSemaine = configuration?.semaine || semaine?.numero;
    const annee = configuration?.annee || semaine?.annee || new Date().getFullYear();
    lundi = new Date(annee, 0, 1 + (numSemaine - 1) * 7);
    // Ajuster au lundi
    const day = lundi.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    lundi.setDate(lundi.getDate() + diff);
  }

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    const jour = getJourFr(d);
    if (joursActifs.includes(jour)) {
      dates.push({
        date: d,
        jour,
        label: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        iso: d.toISOString().slice(0, 10),
      });
    }
  }
  return dates;
}

// Calculer les ventes prévues = somme repartitionJours de aujourd'hui jusqu'à dateLivraison incluse
function calculerVentesPrevues(produit, dateLivraison, joursActifs) {
  if (!produit.repartitionJours || !dateLivraison) return 0;

  const aujourdHui = getJourFr(new Date());
  const jourLiv = dateLivraison.jour;

  const idxAujourdHui = JOURS_SEMAINE.indexOf(aujourdHui);
  const idxLiv = JOURS_SEMAINE.indexOf(jourLiv);

  let total = 0;
  for (let i = idxAujourdHui; i <= idxLiv; i++) {
    const jour = JOURS_SEMAINE[i];
    if (joursActifs.includes(jour)) {
      total += produit.repartitionJours[jour] || 0;
    }
  }

  // Si la livraison est avant aujourd'hui (cas rare), prendre toute la semaine restante
  if (idxLiv < idxAujourdHui) {
    for (let i = idxAujourdHui; i < 7; i++) {
      const jour = JOURS_SEMAINE[i];
      if (joursActifs.includes(jour)) {
        total += produit.repartitionJours[jour] || 0;
      }
    }
    for (let i = 0; i <= idxLiv; i++) {
      const jour = JOURS_SEMAINE[i];
      if (joursActifs.includes(jour)) {
        total += produit.repartitionJours[jour] || 0;
      }
    }
  }

  return total;
}

export default function CommandeEquipe({ fichierManager = null, dossierEquipeHandle = null, donneesEquipe = null }) {
  const [managerData, setManagerData] = useState(fichierManager);
  const [nomOperateur, setNomOperateur] = useState(() => donneesEquipe?.operateur || '');
  const [message, setMessage] = useState(null);
  // Initialiser les inventaires depuis le fichier EQUIPE existant
  const [inventaires, setInventaires] = useState(() => donneesEquipe?.inventaires || {});
  const [recherche, setRecherche] = useState('');
  const [sectionsOuvertes, setSectionsOuvertes] = useState({});
  const [dateLivraisonIdx, setDateLivraisonIdx] = useState(0);
  const [showFicheInventaire, setShowFicheInventaire] = useState(false);

  const inputFileRef = useRef(null);
  const stockInputRefs = useRef({});

  // ═══════════════════════════════════════════
  // SAUVEGARDE FICHIER EQUIPE (debounced)
  // ═══════════════════════════════════════════
  const saveTimerRef = useRef(null);

  const executerSauvegardeInventaire = useCallback(async (invData) => {
    if (!dossierEquipeHandle || !managerData) return;

    const semaine = managerData.semaine?.numero || managerData.planning?.semaine || managerData.configuration?.semaine;
    const annee = managerData.semaine?.annee || managerData.planning?.annee || managerData.configuration?.annee;
    if (!semaine || !annee) return;

    // Charger les données EQUIPE existantes pour ne pas écraser les personnalisations PlanningJour
    let equipeExistant = null;
    try {
      const result = await trouverDernierFichierEquipe(dossierEquipeHandle, semaine, annee);
      if (result) equipeExistant = result.data;
    } catch { /* pas de fichier existant */ }

    await sauvegarderFichierEquipe(dossierEquipeHandle, {
      magasin: managerData.magasin || {},
      semaine,
      annee,
      // Préserver les données PlanningJour si elles existent
      personnalisations: equipeExistant?.personnalisations || donneesEquipe?.personnalisations || {},
      programmesPersonnalises: equipeExistant?.programmesPersonnalises || donneesEquipe?.programmesPersonnalises || [],
      preferencesAffichage: equipeExistant?.preferencesAffichage || donneesEquipe?.preferencesAffichage || {},
      // Données de CommandeEquipe
      inventaires: invData,
      plaquageJ1: equipeExistant?.plaquageJ1 || donneesEquipe?.plaquageJ1 || {},
      operateur: nomOperateur || equipeExistant?.operateur || '',
    });
  }, [dossierEquipeHandle, managerData, donneesEquipe, nomOperateur]);

  const planifierSauvegardeInventaire = useCallback((invData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      executerSauvegardeInventaire(invData);
    }, 2000);
  }, [executerSauvegardeInventaire]);

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Mettre à jour managerData si le fichier est passé en prop
  useEffect(() => {
    if (fichierManager && !managerData) {
      setManagerData(fichierManager);
      const sections = {};
      fichierManager.produits?.forEach(p => {
        const key = p.famille || p.rayon || 'AUTRE';
        sections[key] = true;
      });
      setSectionsOuvertes(sections);
    }
  }, [fichierManager]);

  // Dates de livraison : depuis config manager si disponibles, sinon générées
  const datesLivraison = useMemo(() => {
    if (!managerData) return [];

    const livraisonsConfig = managerData.configuration?.livraisons;
    if (livraisonsConfig && livraisonsConfig.length > 0) {
      return livraisonsConfig.map(l => {
        const d = l.dateReception ? new Date(l.dateReception) : null;
        const jour = d ? getJourFr(d) : '';
        return {
          date: d,
          jour,
          label: d
            ? `${l.label || 'Livraison'} — ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
            : l.label || `Livraison ${l.id}`,
          iso: l.dateReception || '',
          dateCommande: l.dateCommande || null,
        };
      });
    }

    return genererDatesLivraison(managerData.configuration, managerData.semaine);
  }, [managerData]);

  const dateLivraison = datesLivraison[dateLivraisonIdx] || null;
  const joursActifs = managerData?.configuration?.joursActifs || [];

  // Import fichier manager
  const handleImporterManager = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await lireFichierJSON(file);
      const validation = validerFichierManager(data);
      if (!validation.valide) {
        setMessage({ type: 'error', text: validation.erreur });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
      setManagerData(data);
      const sections = {};
      data.produits?.forEach(p => {
        const key = p.famille || p.rayon || 'AUTRE';
        sections[key] = true;
      });
      setSectionsOuvertes(sections);
      enregistrerEchange({
        type: 'import_manager',
        codePDV: data.magasin?.codePDV || data.magasin?.code,
        magasin: data.magasin?.nom,
        semaine: data.semaine?.numero || data.configuration?.semaine,
        annee: data.semaine?.annee || data.configuration?.annee,
        nbProduits: data.produits?.length
      });
      setMessage({ type: 'success', text: `Fichier chargé: ${data.produits?.length || 0} produits` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: `Erreur: ${err.message}` });
      setTimeout(() => setMessage(null), 5000);
    }
    e.target.value = '';
  };

  // Saisie stock
  const handleStockChange = useCallback((itm8, value) => {
    const numValue = value === '' ? null : Math.max(0, parseInt(value) || 0);
    let newInventaires;
    if (numValue === null) {
      setInventaires(prev => {
        const next = { ...prev };
        delete next[itm8];
        newInventaires = next;
        return next;
      });
    } else {
      setInventaires(prev => {
        newInventaires = {
          ...prev,
          [itm8]: {
            stockReel: numValue,
            dateSaisie: new Date().toISOString(),
            operateur: nomOperateur || 'Équipe'
          }
        };
        return newInventaires;
      });
    }
    // Sauvegarde automatique dans le fichier EQUIPE (debounced)
    // Note: on planifie avec un léger délai pour laisser le setState se propager
    setTimeout(() => {
      setInventaires(current => {
        planifierSauvegardeInventaire(current);
        return current;
      });
    }, 0);
  }, [nomOperateur, planifierSauvegardeInventaire]);

  // Entrée = ligne suivante
  const handleKeyDown = useCallback((e, itm8, produitsOrdre) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = produitsOrdre.indexOf(itm8);
      if (idx >= 0 && idx < produitsOrdre.length - 1) {
        const nextItm8 = produitsOrdre[idx + 1];
        stockInputRefs.current[nextItm8]?.focus();
      }
    }
  }, []);

  // Export — sauvegarde dans le dossier partagé ET téléchargement
  const handleExporter = async () => {
    if (!managerData) return;
    if (!nomOperateur.trim()) {
      setMessage({ type: 'error', text: 'Veuillez saisir votre nom avant d\'exporter' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const semaine = managerData.semaine?.numero || managerData.planning?.semaine || managerData.configuration?.semaine;
    const annee = managerData.semaine?.annee || managerData.planning?.annee || managerData.configuration?.annee;

    // Récupérer les personnalisations depuis le fichier EQUIPE existant ou fallback localStorage
    let personnalisations = {};

    // D'abord essayer le fichier EQUIPE (architecture zéro-localStorage)
    if (dossierEquipeHandle) {
      try {
        const result = await trouverDernierFichierEquipe(dossierEquipeHandle, semaine, annee);
        if (result?.data?.personnalisations) {
          personnalisations = result.data.personnalisations;
        }
      } catch { /* pas de fichier */ }
    }

    // Fallback localStorage si pas de personnalisations dans le fichier
    if (Object.keys(personnalisations).length === 0) {
      try {
        const modifsSaved = localStorage.getItem('bvp_produits_modifies');
        if (modifsSaved) {
          const modifs = JSON.parse(modifsSaved);
          const produitsIndex = {};
          (managerData.produits || []).forEach(p => {
            produitsIndex[p.id] = p;
          });
          Object.entries(modifs).forEach(([prodId, modif]) => {
            const prod = produitsIndex[prodId];
            const itm8 = prod?.itm8 || prodId;
            personnalisations[itm8] = {
              nomPersonnalise: modif.libelle || null,
              programmeFour: modif.programme || null,
              unitesParPlaque: modif.unitesParPlaque || 0,
              unitesParLot: modif.unitesParLot || 0,
              plu: modif.plu || null,
              famille: modif.famille || null,
            };
          });
        }
      } catch { /* ignorer erreurs localStorage */ }
    }

    // Sauvegarde dans le dossier partagé (prioritaire)
    if (dossierEquipeHandle) {
      const result = await sauvegarderFichierEquipe(dossierEquipeHandle, {
        magasin: managerData.magasin,
        semaine,
        annee,
        personnalisations,
        inventaires,
        plaquageJ1: donneesEquipe?.plaquageJ1 || { produits: [], familles: [] },
        programmesPersonnalises: donneesEquipe?.programmesPersonnalises || [],
        preferencesAffichage: donneesEquipe?.preferencesAffichage || {},
        operateur: nomOperateur.trim(),
      });

      if (result.success) {
        setMessage({ type: 'success', text: `Fichier "${result.filename}" sauvegardé dans le dossier partagé !` });
      } else {
        setMessage({ type: 'error', text: `Erreur sauvegarde: ${result.error}` });
      }
    } else {
      // Fallback : téléchargement classique si pas de dossier partagé
      const fichier = creerFichierEquipe({
        magasin: managerData.magasin,
        semaine,
        annee,
        personnalisations,
        inventaires,
        plaquageJ1: { produits: [], familles: [] },
        operateur: nomOperateur.trim()
      });

      const nomFichier = genererNomFichierEquipe(
        managerData.magasin?.codePDV || managerData.magasin?.code,
        semaine,
        annee
      );
      telechargerJSON(fichier, nomFichier);
      setMessage({ type: 'success', text: `Fichier "${nomFichier}" exporté !` });
    }

    enregistrerEchange({
      type: 'export_equipe',
      codePDV: managerData.magasin?.codePDV || managerData.magasin?.code,
      magasin: managerData.magasin?.nom,
      semaine,
      annee,
      operateur: nomOperateur.trim(),
      nbInventaires: Object.keys(inventaires).length
    });
  };

  // Produits groupés par famille
  const produits = managerData?.produits || [];

  const produitsParFamille = useMemo(() => {
    return produits.reduce((acc, p) => {
      const key = p.famille || p.rayon || 'AUTRE';
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [produits]);

  // Ordre plat des itm8 pour navigation Enter
  const produitsOrdre = useMemo(() => {
    const ordre = [];
    Object.keys(produitsParFamille).sort().forEach(famille => {
      produitsParFamille[famille].forEach(p => {
        if (!recherche.trim() ||
          (p.libelle || '').toLowerCase().includes(recherche.toLowerCase()) ||
          (p.itm8 || '').includes(recherche)
        ) {
          ordre.push(p.itm8);
        }
      });
    });
    return ordre;
  }, [produitsParFamille, recherche]);

  const filtrerProduits = (liste) => {
    if (!recherche.trim()) return liste;
    const s = recherche.toLowerCase();
    return liste.filter(p =>
      (p.libelle || '').toLowerCase().includes(s) ||
      (p.itm8 || '').includes(recherche)
    );
  };

  const toggleSection = (key) => {
    setSectionsOuvertes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Stats
  const nbInventaires = Object.keys(inventaires).length;
  const nbAlertesRupture = useMemo(() => {
    let count = 0;
    produits.forEach(p => {
      const inv = inventaires[p.itm8];
      if (inv && dateLivraison) {
        const cdt = p.cdt || 12;
        const ventesUnites = calculerVentesPrevues(p, dateLivraison, joursActifs);
        const ventesCartons = cdt > 0 ? Math.ceil(ventesUnites / cdt) : 0;
        if (inv.stockReel < ventesCartons) count++;
      }
    });
    return count;
  }, [produits, inventaires, dateLivraison, joursActifs]);

  // ── Écran d'accueil (pas de fichier) ──
  if (!managerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#E8E1D5]/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-[#58595B] mb-2">Commande</h1>
          <p className="text-gray-600 mb-8">
            Importez le fichier planning pour saisir l'inventaire et préparer la commande.
          </p>
          <button
            onClick={() => inputFileRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white text-lg font-medium rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Upload className="w-6 h-6" />
            Importer le fichier Manager
          </button>
          <input
            ref={inputFileRef}
            type="file"
            accept=".json"
            onChange={handleImporterManager}
            className="hidden"
          />
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Écran principal ──
  const semaine = managerData.semaine?.numero || managerData.configuration?.semaine;
  const annee = managerData.semaine?.annee || managerData.configuration?.annee;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#58595B]">
                {managerData.magasin?.nom}
              </h1>
              <p className="text-sm text-gray-500">
                Semaine {semaine} / {annee}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-1 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">Inventaire</p>
                <p className="font-bold text-blue-700">{nbInventaires}/{produits.length}</p>
              </div>
              {nbAlertesRupture > 0 && (
                <div className="text-center px-3 py-1 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Ruptures</p>
                  <p className="font-bold text-red-700">{nbAlertesRupture}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sélecteur date livraison + recherche */}
        <div className="max-w-5xl mx-auto px-4 py-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Calendar className="w-5 h-5 text-emerald-700" />
              <label className="text-sm font-medium text-gray-700">Livraison :</label>
              <select
                value={dateLivraisonIdx}
                onChange={(e) => setDateLivraisonIdx(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              >
                {datesLivraison.map((d, i) => (
                  <option key={d.iso} value={i}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-5xl mx-auto px-4 mt-3">
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Tableau par famille */}
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {Object.keys(produitsParFamille).sort().map(famille => {
          const produitsRayon = produitsParFamille[famille];
          const produitsFiltres = filtrerProduits(produitsRayon);
          if (produitsFiltres.length === 0) return null;

          const isOuvert = sectionsOuvertes[famille];
          const nbInvFamille = produitsRayon.filter(p => inventaires[p.itm8]).length;

          return (
            <div key={famille}>
              {/* En-tête famille */}
              <button
                onClick={() => toggleSection(famille)}
                className="w-full flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-200 mb-2"
              >
                <div className="flex items-center gap-2">
                  {isOuvert
                    ? <ChevronDown className="w-5 h-5 text-gray-400" />
                    : <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                  <span className="font-semibold text-[#58595B]">{famille}</span>
                  <span className="text-sm text-gray-500">({produitsFiltres.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${nbInvFamille === produitsRayon.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                    {nbInvFamille}/{produitsRayon.length}
                  </span>
                  {nbInvFamille === produitsRayon.length && <Check className="w-5 h-5 text-green-500" />}
                </div>
              </button>

              {/* Tableau */}
              {isOuvert && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Produit</th>
                        <th className="text-center px-2 py-2 font-medium text-gray-600 w-16">CDT</th>
                        <th className="text-center px-2 py-2 font-medium text-gray-600 w-20">Ventes</th>
                        <th className="text-center px-2 py-2 font-medium text-gray-600 w-24">Stock</th>
                        <th className="text-center px-2 py-2 font-medium text-gray-600 w-20">Besoin</th>
                        <th className="text-center px-2 py-2 font-medium text-emerald-700 w-20 bg-[#E8E1D5]/30">Préco</th>
                        <th className="text-center px-2 py-2 font-medium text-emerald-700 w-20 bg-emerald-600/5">À cmd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produitsFiltres.map((produit, idx) => {
                        const inv = inventaires[produit.itm8];
                        const stockCartons = inv?.stockReel ?? null; // saisi en cartons pleins
                        const cdt = produit.cdt || 12;

                        // Ventes prévues en unités → convertir en cartons
                        const ventesUnites = dateLivraison
                          ? calculerVentesPrevues(produit, dateLivraison, joursActifs)
                          : 0;
                        const ventesCartons = cdt > 0 ? Math.ceil(ventesUnites / cdt) : 0;

                        // Besoin brut en cartons (ventes - stock)
                        const besoinCartons = stockCartons !== null ? Math.max(0, ventesCartons - stockCartons) : 0;

                        // Préco manager par livraison
                        const commandes = managerData?.commandes || {};
                        const cmdProduit = commandes[produit.itm8];
                        const precoManager = cmdProduit
                          ? (cmdProduit[`liv${dateLivraisonIdx + 1}`] ?? cmdProduit.total ?? null)
                          : null;

                        // À commander :
                        // Si surplus (stock >= ventes) : Préco - surplus
                        // Si rupture (stock < ventes) : Préco (on ne rattrape pas)
                        let aCommander;
                        if (stockCartons !== null && precoManager !== null) {
                          const surplus = stockCartons - ventesCartons;
                          aCommander = surplus >= 0
                            ? Math.max(0, precoManager - surplus)
                            : precoManager;
                        } else if (stockCartons !== null) {
                          // Pas de préco : besoin brut
                          aCommander = Math.max(0, ventesCartons - stockCartons);
                        } else {
                          aCommander = precoManager ?? ventesCartons;
                        }

                        // Alerte rupture : stock < ventes prévues (en cartons)
                        const enRupture = stockCartons !== null && stockCartons < ventesCartons;

                        return (
                          <tr
                            key={`${produit.itm8}-${idx}`}
                            className={`border-b border-gray-100 ${enRupture ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                          >
                            {/* Produit */}
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800 truncate max-w-[200px]">
                                {produit.libelle}
                              </div>
                              {enRupture && (
                                <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  Risque de rupture
                                </div>
                              )}
                            </td>

                            {/* CDT */}
                            <td className="text-center px-2 py-2 text-gray-500 text-xs">
                              {cdt}
                            </td>

                            {/* Ventes prévues (cartons) */}
                            <td className="text-center px-2 py-2 font-medium text-gray-700">
                              {ventesCartons}
                            </td>

                            {/* Stock (cartons pleins) */}
                            <td className="text-center px-2 py-2">
                              <input
                                ref={(el) => { stockInputRefs.current[produit.itm8] = el; }}
                                type="number"
                                min="0"
                                value={stockCartons ?? ''}
                                onChange={(e) => handleStockChange(produit.itm8, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, produit.itm8, produitsOrdre)}
                                placeholder="?"
                                className={`w-20 px-2 py-1.5 text-center font-bold border-2 rounded-lg focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 ${
                                  enRupture
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : stockCartons !== null
                                      ? 'border-green-400 bg-green-50 text-green-700'
                                      : 'border-gray-300 bg-white text-gray-800'
                                }`}
                              />
                            </td>

                            {/* Besoin (cartons) */}
                            <td className={`text-center px-2 py-2 font-medium ${besoinCartons > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              {stockCartons !== null ? besoinCartons : '-'}
                            </td>

                            {/* Préco Manager (cartons par livraison) */}
                            <td className="text-center px-2 py-2 bg-[#E8E1D5]/20">
                              {precoManager !== null ? (
                                <span className="font-semibold text-emerald-700">{precoManager}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* À commander (cartons) */}
                            <td className={`text-center px-2 py-2 font-bold bg-emerald-600/5 ${aCommander > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                              {stockCartons !== null ? aCommander : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={nomOperateur}
                onChange={(e) => setNomOperateur(e.target.value)}
                placeholder="Votre nom..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFicheInventaire(true)}
              className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Imprimer inventaire
            </button>
            <button
              onClick={handleExporter}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Fiche inventaire imprimable */}
      {showFicheInventaire && (
        <FicheInventaire
          produits={produits}
          managerData={managerData}
          dateLivraison={dateLivraison}
          dateLivraisonIdx={dateLivraisonIdx}
          onClose={() => setShowFicheInventaire(false)}
        />
      )}
    </div>
  );
}
