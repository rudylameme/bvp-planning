import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Tag, AlertTriangle, TrendingUp, Info, Edit2, Calendar } from 'lucide-react';

/**
 * StepAnimationCommerciale - Étape 4 du Wizard Responsable
 * Gère les promotions de la semaine avec calcul automatique de l'élasticité
 *
 * FORMULE MARGE MOUSQUETAIRES :
 * Marge % = (PV HT - PA HT) / PV TTC
 * Donc : PA HT = PV HT - (Marge% × PV TTC)
 * Marge unitaire € = Marge% × PV TTC
 *
 * Exemple : PV TTC = 1,79€, TVA = 5,5%, Marge = 42,3%
 * - PV HT = 1,79 / 1,055 = 1,70€
 * - PA HT = 1,70 - (0,423 × 1,79) = 1,70 - 0,76 = 0,94€
 * - Marge € = 0,423 × 1,79 = 0,76€
 * - Vérif : (1,70 - 0,94) / 1,79 = 0,76 / 1,79 = 42,5% ✓
 */

// Fonctions utilitaires pour les dates (période promo Mousquetaires : mercredi → mardi)
const getProchainMercredi = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + daysUntilWednesday);
  return nextWednesday.toISOString().split('T')[0];
};

const getMardiSuivant = (mercrediDate) => {
  const mercredi = new Date(mercrediDate);
  const mardi = new Date(mercredi);
  mardi.setDate(mercredi.getDate() + 6);
  return mardi.toISOString().split('T')[0];
};

const formatDateFR = (dateISO) => {
  if (!dateISO) return '';
  const date = new Date(dateISO);
  const options = { weekday: 'short', day: 'numeric', month: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

// Format compact pour le tableau : JJ/MM→JJ/MM
const formatPeriodeCompacte = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return '-';
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const debutStr = `${debut.getDate().toString().padStart(2, '0')}/${(debut.getMonth() + 1).toString().padStart(2, '0')}`;
  const finStr = `${fin.getDate().toString().padStart(2, '0')}/${(fin.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${debutStr}→${finStr}`;
};

// Calculer le nombre de jours d'une période promo (inclusif)
const calculerNbJoursPromo = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return 7; // Par défaut 7 jours
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const diffTime = fin.getTime() - debut.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 car inclusif
  return Math.max(1, diffDays); // Minimum 1 jour
};

export default function StepAnimationCommerciale({
  produits = [],
  promosActives = [],
  setPromosActives,
  periodePromo,
  setPeriodePromo
}) {
  // State du formulaire
  const [pluInput, setPluInput] = useState('');
  const [prixPromoInput, setPrixPromoInput] = useState('');
  const [produitTrouve, setProduitTrouve] = useState(null);
  const [calculsPromo, setCalculsPromo] = useState(null);
  const [erreur, setErreur] = useState(null);

  // Champs éditables (initialisés depuis le produit trouvé)
  const [prixVenteEditable, setPrixVenteEditable] = useState('');
  const [margeEditable, setMargeEditable] = useState('');
  const [qteMoyenneEditable, setQteMoyenneEditable] = useState('');

  // Dates spécifiques au produit en cours d'ajout
  const [dateDebutPromo, setDateDebutPromo] = useState('');
  const [dateFinPromo, setDateFinPromo] = useState('');

  // Initialiser la période promo si non définie
  useEffect(() => {
    if (!periodePromo || !periodePromo.debut) {
      const debut = getProchainMercredi();
      setPeriodePromo({
        debut,
        fin: getMardiSuivant(debut)
      });
    }
  }, [periodePromo, setPeriodePromo]);

  // Rechercher un produit par PLU ou ITM8
  const rechercherProduit = () => {
    setErreur(null);
    setCalculsPromo(null);
    setPrixPromoInput('');

    if (!pluInput.trim()) {
      setErreur('Veuillez saisir un code PLU');
      return;
    }

    const pluClean = pluInput.trim();
    const produit = produits.find(p =>
      String(p.plu) === pluClean ||
      String(p.itm8) === pluClean ||
      String(p.ean) === pluClean
    );

    if (produit) {
      // Vérifier si le produit a les données nécessaires
      if (!produit.prixMoyenUnitaire || produit.prixMoyenUnitaire <= 0) {
        setErreur(`Le produit "${produit.libelle}" n'a pas de prix de vente défini`);
        setProduitTrouve(null);
        return;
      }
      setProduitTrouve(produit);

      // Initialiser les champs éditables avec les valeurs du produit
      setPrixVenteEditable(produit.prixMoyenUnitaire?.toFixed(2) || '');
      // Marge par défaut : utiliser tauxMarge du produit ou 42% (moyenne BVP)
      setMargeEditable(produit.tauxMarge?.toString() || '42');
      setQteMoyenneEditable(produit.moyenneHebdo?.toString() || '0');

      // Initialiser les dates avec la période par défaut (Mousquetaires)
      setDateDebutPromo(periodePromo?.debut || getProchainMercredi());
      setDateFinPromo(periodePromo?.fin || getMardiSuivant(periodePromo?.debut || getProchainMercredi()));
    } else {
      setProduitTrouve(null);
      setErreur(`Aucun produit trouvé avec le code ${pluClean}`);
    }
  };

  // Gérer la touche Entrée dans le champ PLU
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      rechercherProduit();
    }
  };

  // Calculer automatiquement les données de la promo
  // Utilise useCallback pour éviter les recalculs inutiles
  const calculerPromo = useCallback(() => {
    const prixNormalTTC = parseFloat(prixVenteEditable);
    const margePct = parseFloat(margeEditable);
    const qteNormale = parseFloat(qteMoyenneEditable) || 0;
    const prixPromoNum = parseFloat(prixPromoInput);

    // Vérifications de base
    if (!prixNormalTTC || prixNormalTTC <= 0) {
      setCalculsPromo(null);
      return;
    }

    if (!margePct || margePct <= 0 || margePct >= 100) {
      setCalculsPromo(null);
      return;
    }

    if (!prixPromoNum || prixPromoNum <= 0) {
      setCalculsPromo(null);
      return;
    }

    // Validation : le prix promo doit être inférieur au prix normal
    if (prixPromoNum >= prixNormalTTC) {
      setCalculsPromo({ erreur: 'Le prix promo doit être inférieur au prix normal' });
      return;
    }

    // ============================================
    // FORMULE MARGE MOUSQUETAIRES
    // Marge % = (PV HT - PA HT) / PV TTC
    // Donc : PA HT = PV HT - (Marge% × PV TTC)
    // Et : Marge € = Marge% × PV TTC
    // ============================================
    const tauxTVA = 0.055; // TVA alimentaire 5,5%
    const prixNormalHT = prixNormalTTC / (1 + tauxTVA);

    // Marge unitaire en € sur prix normal (formule Mousquetaires)
    const margeNormaleEuros = (margePct / 100) * prixNormalTTC;

    // Prix d'achat HT calculé
    const prixAchatHT = prixNormalHT - margeNormaleEuros;

    // Marge unitaire en € sur prix promo
    // On garde le même PA HT, donc la marge promo = PV Promo HT - PA HT
    const prixPromoHT = prixPromoNum / (1 + tauxTVA);
    const margePromoEuros = prixPromoHT - prixAchatHT;

    // Protection : marge promo doit être positive
    if (margePromoEuros <= 0) {
      setCalculsPromo({ erreur: 'Le prix promo est trop bas (marge négative)' });
      return;
    }

    // Avantage client (réduction en %)
    const avantageClient = ((prixNormalTTC - prixPromoNum) / prixNormalTTC) * 100;

    // Taux de marge promo selon formule Mousquetaires
    // Marge % promo = (PV Promo HT - PA HT) / PV Promo TTC
    const tauxMargePromoMousquetaires = (margePromoEuros / prixPromoNum) * 100;

    // ============================================
    // ÉLASTICITÉ (formule Mousquetaires)
    // elasticite = (margeNormale / margePromo) - 1
    // PLAFOND = 2.0 (CDC V2 ligne 1169)
    // ============================================
    const elasticiteCalculee = (margeNormaleEuros / margePromoEuros) - 1;
    const PLAFOND_ELASTICITE = 2.0;
    const elasticite = Math.min(elasticiteCalculee, PLAFOND_ELASTICITE);

    // ============================================
    // CALCUL QTÉ OBJECTIF SELON DURÉE PROMO
    // ============================================
    const nbJoursPromo = calculerNbJoursPromo(dateDebutPromo, dateFinPromo);

    // Quantité moyenne par jour (base hebdomadaire)
    const qteMoyenneParJour = qteNormale / 7;

    // Quantité normale sur la période promo (sans promo)
    const qteNormalePeriode = qteMoyenneParJour * nbJoursPromo;

    // Quantité objectif avec élasticité
    const qteObjectif = Math.ceil(qteNormalePeriode * (1 + elasticite));

    // Quantité supplémentaire (par rapport à la période)
    const qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);

    // Augmentation en %
    const augmentationPct = qteNormalePeriode > 0 ? ((qteObjectif - qteNormalePeriode) / qteNormalePeriode) * 100 : 0;

    setCalculsPromo({
      prixPromoTTC: prixPromoNum,
      prixPromoHT,
      prixNormalTTC,
      prixNormalHT,
      prixAchatHT,
      margePct,
      margeNormaleEuros,
      margePromoEuros,
      avantageClient,
      tauxMargePromoMousquetaires,
      elasticite,
      qteNormaleHebdo: qteNormale,       // Qté moyenne hebdo (référence)
      qteNormalePeriode,                  // Qté normale sur la période promo
      nbJoursPromo,                       // Nombre de jours de promo
      qteObjectif,
      qteSupplementaire,
      augmentationPct,
      warning: elasticiteCalculee > PLAFOND_ELASTICITE
        ? `Élasticité plafonnée à ${PLAFOND_ELASTICITE} (calculée: ${elasticiteCalculee.toFixed(2)})`
        : null,
      elasticitePlafonnee: elasticiteCalculee > PLAFOND_ELASTICITE
    });
  }, [prixVenteEditable, margeEditable, qteMoyenneEditable, prixPromoInput, dateDebutPromo, dateFinPromo]);

  // Effet pour recalculer quand les inputs changent (y compris les dates)
  useEffect(() => {
    if (produitTrouve && prixPromoInput) {
      calculerPromo();
    }
  }, [produitTrouve, prixPromoInput, prixVenteEditable, margeEditable, qteMoyenneEditable, dateDebutPromo, dateFinPromo, calculerPromo]);

  // Ajouter une promo à la liste
  const ajouterPromo = () => {
    if (!produitTrouve || !calculsPromo || calculsPromo.erreur) return;

    // Vérifier si le produit n'est pas déjà dans la liste
    const pluProduit = produitTrouve.plu || produitTrouve.itm8;
    if (promosActives.find(p => p.plu === pluProduit || p.itm8 === produitTrouve.itm8)) {
      setErreur('Ce produit est déjà dans la liste des promos');
      return;
    }

    const nouvellePromo = {
      plu: produitTrouve.plu || '',
      itm8: produitTrouve.itm8 || '',
      libelle: produitTrouve.libellePersonnalise || produitTrouve.libelle,
      prixNormalTTC: calculsPromo.prixNormalTTC,
      prixPromoTTC: calculsPromo.prixPromoTTC,
      prixAchatHT: calculsPromo.prixAchatHT,
      margePct: calculsPromo.margePct,
      avantageClient: calculsPromo.avantageClient,
      margeNormaleEuros: calculsPromo.margeNormaleEuros,
      margePromoEuros: calculsPromo.margePromoEuros,
      tauxMargePromo: calculsPromo.tauxMargePromoMousquetaires,
      elasticite: calculsPromo.elasticite,
      // Quantités selon durée promo
      qteNormaleHebdo: calculsPromo.qteNormaleHebdo,     // Qté moyenne hebdo
      qteNormalePeriode: calculsPromo.qteNormalePeriode, // Qté normale sur la période
      nbJoursPromo: calculsPromo.nbJoursPromo,           // Nombre de jours
      qteObjectif: calculsPromo.qteObjectif,
      qteSupplementaire: calculsPromo.qteSupplementaire,
      // Dates spécifiques au produit
      dateDebut: dateDebutPromo,
      dateFin: dateFinPromo
    };

    setPromosActives([...promosActives, nouvellePromo]);

    // Reset formulaire
    setPluInput('');
    setProduitTrouve(null);
    setCalculsPromo(null);
    setPrixPromoInput('');
    setPrixVenteEditable('');
    setMargeEditable('');
    setQteMoyenneEditable('');
    setDateDebutPromo('');
    setDateFinPromo('');
    setErreur(null);
  };

  // Supprimer une promo
  const supprimerPromo = (index) => {
    setPromosActives(promosActives.filter((_, i) => i !== index));
  };

  // Modifier les dates d'une promo existante (recalcule les quantités)
  const modifierDatePromo = (index, type, value) => {
    const promosModifiees = [...promosActives];
    const promo = promosModifiees[index];

    if (type === 'debut') {
      promo.dateDebut = value;
    } else {
      promo.dateFin = value;
    }

    // Recalculer les quantités selon la nouvelle durée
    const nbJours = calculerNbJoursPromo(promo.dateDebut, promo.dateFin);
    const qteMoyenneParJour = promo.qteNormaleHebdo / 7;
    const qteNormalePeriode = qteMoyenneParJour * nbJours;
    const qteObjectif = Math.ceil(qteNormalePeriode * (1 + promo.elasticite));

    promo.nbJoursPromo = nbJours;
    promo.qteNormalePeriode = qteNormalePeriode;
    promo.qteObjectif = qteObjectif;
    promo.qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);

    setPromosActives(promosModifiees);
  };

  // Calcul de l'impact global (utilise les quantités recalculées selon durée)
  const impactGlobal = useMemo(() => {
    let caSupplementaire = 0;
    let diffMargeTotale = 0;
    let qteSupplementaire = 0;

    promosActives.forEach(promo => {
      // Quantité supplémentaire (déjà calculée selon la durée)
      const qteSupp = promo.qteSupplementaire || (promo.qteObjectif - Math.ceil(promo.qteNormalePeriode || 0));
      qteSupplementaire += qteSupp;

      // CA supplémentaire = quantités en plus × prix promo
      caSupplementaire += qteSupp * promo.prixPromoTTC;

      // Différence de marge (sur la période promo)
      const qteNormalePeriode = promo.qteNormalePeriode || (promo.qteNormaleHebdo / 7 * (promo.nbJoursPromo || 7));
      const margeTotaleNormale = promo.margeNormaleEuros * qteNormalePeriode;
      const margeTotalePromo = promo.margePromoEuros * promo.qteObjectif;
      diffMargeTotale += margeTotalePromo - margeTotaleNormale;
    });

    return {
      caSupplementaire: caSupplementaire.toFixed(2),
      diffMargeTotale: diffMargeTotale.toFixed(2),
      qteSupplementaire: Math.round(qteSupplementaire)
    };
  }, [promosActives]);

  // Couleur selon l'avantage client (seuils demandés : >20% vert, 10-20% orange, <10% rouge)
  const getAvantageColor = (avantage) => {
    if (avantage >= 20) return 'text-emerald-600';
    if (avantage >= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  // Badge coloré pour l'avantage client dans le tableau
  const getAvantageBadge = (avantage) => {
    if (avantage >= 20) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (avantage >= 10) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  // Handler pour modifier la période promo
  const handlePeriodeChange = (type, value) => {
    if (type === 'debut') {
      // Quand on change le début, recalculer la fin (+6 jours)
      const nouvelleFin = getMardiSuivant(value);
      setPeriodePromo({ debut: value, fin: nouvelleFin });
    } else {
      setPeriodePromo({ ...periodePromo, fin: value });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#58595B] flex items-center gap-2">
          <Tag className="w-6 h-6 text-[#ED1C24]" />
          Animation Commerciale
        </h2>
        <p className="text-gray-600 mt-1">
          Gérez les promotions de la semaine et calculez automatiquement les quantités objectif
        </p>
      </div>

      {/* Période par défaut (valeurs utilisées pour les nouveaux produits) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 text-amber-800">
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Période par défaut :</span>

          {/* Date de début */}
          <div className="flex items-center gap-1">
            <span className="text-sm">Du</span>
            <input
              type="date"
              value={periodePromo?.debut || ''}
              onChange={(e) => handlePeriodeChange('debut', e.target.value)}
              className="px-2 py-1 border border-amber-300 rounded-md bg-white text-amber-800 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Date de fin */}
          <div className="flex items-center gap-1">
            <span className="text-sm">au</span>
            <input
              type="date"
              value={periodePromo?.fin || ''}
              onChange={(e) => handlePeriodeChange('fin', e.target.value)}
              min={periodePromo?.debut}
              className="px-2 py-1 border border-amber-300 rounded-md bg-white text-amber-800 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Indication */}
          <span className="text-xs text-amber-600 ml-2">
            (Dates pré-remplies pour les nouveaux produits, modifiables individuellement)
          </span>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#58595B] mb-4">
          Ajouter un produit en promo
        </h3>

        {/* Recherche par PLU */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code PLU / ITM8 / EAN
            </label>
            <input
              type="text"
              value={pluInput}
              onChange={(e) => setPluInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: 9784"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={rechercherProduit}
              className="px-4 py-2 bg-[#58595B] text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Rechercher
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {erreur}
          </div>
        )}

        {/* Produit trouvé */}
        {produitTrouve && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-emerald-800 text-lg">
                  {produitTrouve.libellePersonnalise || produitTrouve.libelle}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  PLU: {produitTrouve.plu || '-'} | ITM8: {produitTrouve.itm8 || '-'}
                </p>
              </div>
              {produitTrouve.rayon && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  produitTrouve.rayon === 'BOULANGERIE' ? 'bg-stone-200 text-stone-700' :
                  produitTrouve.rayon === 'VIENNOISERIE' ? 'bg-amber-200 text-amber-700' :
                  produitTrouve.rayon === 'PATISSERIE' ? 'bg-rose-200 text-rose-700' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {produitTrouve.rayon}
                </span>
              )}
            </div>

            {/* Champs éditables */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Prix vente actuel */}
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1 flex items-center gap-1">
                  Prix vente actuel (€ TTC)
                  <Edit2 className="w-3 h-3 text-emerald-500" />
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prixVenteEditable}
                  onChange={(e) => setPrixVenteEditable(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>

              {/* Marge % (formule Mousquetaires) */}
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1 flex items-center gap-1">
                  Marge % (PA/PV)
                  <Edit2 className="w-3 h-3 text-emerald-500" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={margeEditable}
                    onChange={(e) => setMargeEditable(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">%</span>
                </div>
              </div>

              {/* Quantité moyenne */}
              <div>
                <label className="block text-sm font-medium text-emerald-800 mb-1 flex items-center gap-1">
                  Qté moyenne/sem
                  <Edit2 className="w-3 h-3 text-emerald-500" />
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={qteMoyenneEditable}
                  onChange={(e) => setQteMoyenneEditable(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* Prix d'achat calculé (non éditable) - Formule Mousquetaires */}
            {prixVenteEditable && margeEditable && (
              <div className="bg-emerald-100 rounded-lg p-3 mb-4">
                {(() => {
                  const pvTTC = parseFloat(prixVenteEditable);
                  const marge = parseFloat(margeEditable);
                  const tauxTVA = 0.055;
                  const pvHT = pvTTC / (1 + tauxTVA);
                  const margeEuros = (marge / 100) * pvTTC;
                  const paHT = pvHT - margeEuros;
                  return (
                    <>
                      <p className="text-sm text-emerald-700">
                        <span className="font-medium">Prix d'achat HT calculé :</span>{' '}
                        <span className="font-bold">{paHT.toFixed(2)} €</span>
                        <span className="text-emerald-600 ml-2">
                          (PV HT - Marge€ = {pvHT.toFixed(2)} - {margeEuros.toFixed(2)})
                        </span>
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Marge unitaire : <span className="font-bold">{margeEuros.toFixed(2)} €</span> ({marge}% × {pvTTC} € TTC)
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Saisie du prix promo et des dates */}
            <div className="pt-4 border-t border-emerald-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prix Promo */}
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Prix Promo TTC (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prixPromoInput}
                    onChange={(e) => setPrixPromoInput(e.target.value)}
                    placeholder="Ex: 1.49"
                    className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Date début */}
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Du
                  </label>
                  <input
                    type="date"
                    value={dateDebutPromo}
                    onChange={(e) => setDateDebutPromo(e.target.value)}
                    className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Date fin */}
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-1">
                    Au
                  </label>
                  <input
                    type="date"
                    value={dateFinPromo}
                    onChange={(e) => setDateFinPromo(e.target.value)}
                    min={dateDebutPromo}
                    className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculs automatiques */}
            {calculsPromo && !calculsPromo.erreur && (
              <div className="mt-4 pt-4 border-t border-emerald-200 bg-white rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Calculs automatiques
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Promo sur {calculsPromo.nbJoursPromo} jour{calculsPromo.nbJoursPromo > 1 ? 's' : ''}
                  </span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Avantage client</p>
                    <p className={`text-lg font-bold ${getAvantageColor(calculsPromo.avantageClient)}`}>
                      -{calculsPromo.avantageClient.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nouvelle marge</p>
                    <p className="text-lg font-bold text-gray-700">
                      {calculsPromo.margePromoEuros.toFixed(2)} €
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        ({calculsPromo.tauxMargePromoMousquetaires.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Élasticité</p>
                    <p className={`text-lg font-bold ${calculsPromo.elasticite > 5 ? 'text-red-600' : 'text-gray-700'}`}>
                      {calculsPromo.elasticite.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Qté normale ({calculsPromo.nbJoursPromo}j)</p>
                    <p className="text-lg font-bold text-gray-600">
                      {Math.ceil(calculsPromo.qteNormalePeriode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Qté objectif</p>
                    <p className="text-lg font-bold text-[#ED1C24]">
                      {calculsPromo.qteObjectif}
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        (+{calculsPromo.qteSupplementaire})
                      </span>
                    </p>
                  </div>
                </div>

                {calculsPromo.warning && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {calculsPromo.warning}
                  </div>
                )}

                {/* Bouton Ajouter */}
                <button
                  onClick={ajouterPromo}
                  className="mt-4 w-full px-4 py-2 bg-[#ED1C24] text-white rounded-lg hover:bg-[#8B1538] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter à la liste
                </button>
              </div>
            )}

            {/* Erreur de calcul */}
            {calculsPromo?.erreur && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {calculsPromo.erreur}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liste des promos */}
      {promosActives.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#58595B] mb-4">
            Produits en promo cette semaine ({promosActives.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-500">PLU</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-500">Produit</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Prix</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">Avantage</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">Période</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">Durée</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Qté Obj.</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {promosActives.map((promo, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-mono text-gray-600">{promo.plu || promo.itm8}</td>
                    <td className="py-2 px-2 max-w-[150px] truncate" title={promo.libelle}>
                      {promo.libelle}
                    </td>
                    {/* Prix avec ancien prix barré */}
                    <td className="py-2 px-2 text-right">
                      <span className="line-through text-gray-400 text-xs mr-2">
                        {promo.prixNormalTTC.toFixed(2)} €
                      </span>
                      <span className="font-bold text-[#ED1C24]">
                        {promo.prixPromoTTC.toFixed(2)} €
                      </span>
                    </td>
                    {/* Avantage client avec badge coloré */}
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getAvantageBadge(promo.avantageClient)}`}>
                        -{promo.avantageClient.toFixed(0)}%
                      </span>
                    </td>
                    {/* Période modifiable */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="date"
                          value={promo.dateDebut || ''}
                          onChange={(e) => modifierDatePromo(index, 'debut', e.target.value)}
                          className="w-28 px-1 py-0.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                          type="date"
                          value={promo.dateFin || ''}
                          onChange={(e) => modifierDatePromo(index, 'fin', e.target.value)}
                          min={promo.dateDebut}
                          className="w-28 px-1 py-0.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </td>
                    {/* Durée en jours */}
                    <td className="py-2 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                        {promo.nbJoursPromo || calculerNbJoursPromo(promo.dateDebut, promo.dateFin)}j
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-gray-800">
                      {promo.qteObjectif}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => supprimerPromo(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Impact prévisionnel */}
      {promosActives.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#58595B] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Impact prévisionnel
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">CA Supplémentaire</p>
              <p className={`text-2xl font-bold ${parseFloat(impactGlobal.caSupplementaire) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(impactGlobal.caSupplementaire) >= 0 ? '+' : ''}{impactGlobal.caSupplementaire} €
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Impact Marge</p>
              <p className={`text-2xl font-bold ${parseFloat(impactGlobal.diffMargeTotale) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(impactGlobal.diffMargeTotale) >= 0 ? '+' : ''}{impactGlobal.diffMargeTotale} €
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Qté Supplémentaire</p>
              <p className="text-2xl font-bold text-[#ED1C24]">
                +{impactGlobal.qteSupplementaire}
              </p>
            </div>
          </div>

          <p className="text-sm text-amber-700 mt-4 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Les quantités objectif seront intégrées au planning de production.
          </p>
        </div>
      )}

      {/* Message si aucune promo */}
      {promosActives.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            Aucune promotion cette semaine.
            <br />
            <span className="text-sm">Vous pouvez passer à l'étape suivante ou ajouter des produits en promo.</span>
          </p>
        </div>
      )}
    </div>
  );
}
