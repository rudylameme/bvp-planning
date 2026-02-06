import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Tag, AlertTriangle, TrendingUp, Info, Edit2, Calendar, Package, ChevronDown, ChevronUp, CheckCircle, ShoppingCart } from 'lucide-react';

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
  produitsExceptionnels = [],
  setProduitsExceptionnels,
  periodePromo,
  setPeriodePromo
}) {
  // State du formulaire
  const [pluInput, setPluInput] = useState('');
  const [prixPromoInput, setPrixPromoInput] = useState('');
  const [produitTrouve, setProduitTrouve] = useState(null);
  const [calculsPromo, setCalculsPromo] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [resultatsRecherche, setResultatsRecherche] = useState([]);

  // Champs éditables (initialisés depuis le produit trouvé)
  const [prixVenteEditable, setPrixVenteEditable] = useState('');
  const [margeEditable, setMargeEditable] = useState('');
  const [qteMoyenneEditable, setQteMoyenneEditable] = useState('');

  // Dates spécifiques au produit en cours d'ajout
  const [dateDebutPromo, setDateDebutPromo] = useState('');
  const [dateFinPromo, setDateFinPromo] = useState('');

  // === VALIDATION DES QUANTITES ===
  const [quantitesValidees, setQuantitesValidees] = useState(false);

  // Réinitialiser la validation quand les quantités changent
  useEffect(() => {
    setQuantitesValidees(false);
  }, [promosActives, produitsExceptionnels]);

  // === PRODUITS EXCEPTIONNELS ===
  const [showFormExceptionnel, setShowFormExceptionnel] = useState(false);
  const [exceptionnelForm, setExceptionnelForm] = useState({
    nom: '',
    qteParJour: '',
    prix: '',
    marge: '40',
    famille: 'PATISSERIE',
    programme: '',
    jours: { lundi: false, mardi: false, mercredi: false, jeudi: false, vendredi: true, samedi: true, dimanche: true }
  });
  const FAMILLES = ['PATISSERIE', 'BOULANGERIE', 'VIENNOISERIE', 'SNACKING'];
  const PROGRAMMES = ['', 'Aucun (négoce)', 'Pâtisserie', 'Viennoiserie', 'Baguettes', 'Pains spéciaux'];

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

  // Rechercher un produit par PLU, ITM8, EAN ou libellé
  const rechercherProduit = () => {
    setErreur(null);
    setCalculsPromo(null);
    setPrixPromoInput('');
    setResultatsRecherche([]);

    if (!pluInput.trim()) {
      setErreur('Veuillez saisir un code PLU ou un nom de produit');
      return;
    }

    const recherche = pluInput.trim();
    const rechercheLower = recherche.toLowerCase();

    // 1. Chercher d'abord par code exact (PLU/ITM8/EAN13)
    let produit = produits.find(p =>
      String(p.plu) === recherche ||
      String(p.itm8) === recherche ||
      String(p.codeEAN) === recherche ||
      (p.ean13 && p.ean13.split(';').some(e => e.trim() === recherche))
    );

    // 2. Si pas trouvé par code, chercher par libellé (contient)
    if (!produit) {
      const produitsParNom = produits.filter(p =>
        (p.libelle && p.libelle.toLowerCase().includes(rechercheLower)) ||
        (p.libellePersonnalise && p.libellePersonnalise.toLowerCase().includes(rechercheLower))
      );

      if (produitsParNom.length === 1) {
        // Un seul résultat → sélectionner directement
        produit = produitsParNom[0];
      } else if (produitsParNom.length > 1) {
        // Plusieurs résultats → afficher la liste pour sélection
        setResultatsRecherche(produitsParNom.slice(0, 10)); // Max 10 résultats
        setErreur(`${produitsParNom.length} produits trouvés pour "${recherche}". Cliquez sur un produit pour le sélectionner.`);
        return;
      }
    }

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
      setErreur(`Aucun produit trouvé pour "${recherche}". Vérifiez le code PLU/ITM8/EAN ou le nom du produit.`);
    }
  };

  // Gérer la touche Entrée dans le champ PLU
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      rechercherProduit();
    }
  };

  // Sélectionner un produit depuis la liste de résultats
  const selectionnerProduit = (produit) => {
    setResultatsRecherche([]);
    setErreur(null);

    if (!produit.prixMoyenUnitaire || produit.prixMoyenUnitaire <= 0) {
      setErreur(`Le produit "${produit.libelle}" n'a pas de prix de vente défini`);
      setProduitTrouve(null);
      return;
    }

    setProduitTrouve(produit);
    setPluInput(produit.plu || produit.itm8 || '');

    // Initialiser les champs éditables avec les valeurs du produit
    setPrixVenteEditable(produit.prixMoyenUnitaire?.toFixed(2) || '');
    setMargeEditable(produit.tauxMarge?.toString() || '42');
    setQteMoyenneEditable(produit.moyenneHebdo?.toString() || '0');

    // Initialiser les dates avec la période par défaut
    setDateDebutPromo(periodePromo?.debut || getProchainMercredi());
    setDateFinPromo(periodePromo?.fin || getMardiSuivant(periodePromo?.debut || getProchainMercredi()));
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
      ean13: produitTrouve.ean13 || produitTrouve.codeEAN || '',
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
      qteValidee: calculsPromo.qteObjectif,              // Initialisée = objectif, modifiable par l'opérateur
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
    promo.qteValidee = qteObjectif; // Réinitialiser la qté validée au nouvel objectif
    promo.qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);

    setPromosActives(promosModifiees);
  };

  // Modifier la quantité validée d'une promo (saisie opérateur)
  const modifierQteValidee = (index, value) => {
    const promosModifiees = [...promosActives];
    const promo = promosModifiees[index];
    const newQte = Math.max(0, parseInt(value, 10) || 0);
    promo.qteValidee = newQte;
    setPromosActives(promosModifiees);
  };

  // === FONCTIONS PRODUITS EXCEPTIONNELS ===
  const resetFormExceptionnel = () => {
    setExceptionnelForm({
      nom: '', qteParJour: '', prix: '', marge: '40', famille: 'PATISSERIE', programme: '',
      jours: { lundi: false, mardi: false, mercredi: false, jeudi: false, vendredi: true, samedi: true, dimanche: true }
    });
    setShowFormExceptionnel(false);
  };

  const toggleJourExceptionnel = (jour) => {
    setExceptionnelForm(prev => ({ ...prev, jours: { ...prev.jours, [jour]: !prev.jours[jour] } }));
  };

  const ajouterProduitExceptionnel = () => {
    if (!exceptionnelForm.nom.trim()) { setErreur('Veuillez saisir un nom de produit'); return; }
    const qte = parseInt(exceptionnelForm.qteParJour, 10);
    if (!qte || qte <= 0) { setErreur('Veuillez saisir une quantité par jour valide'); return; }
    const prix = parseFloat(exceptionnelForm.prix);
    if (!prix || prix <= 0) { setErreur('Veuillez saisir un prix unitaire valide'); return; }
    const margePct = parseFloat(exceptionnelForm.marge) || 40;
    if (margePct < 0 || margePct >= 100) { setErreur('La marge doit être entre 0 et 100%'); return; }

    const joursSelectionnes = Object.entries(exceptionnelForm.jours).filter(([, actif]) => actif).map(([jour]) => jour);
    if (joursSelectionnes.length === 0) { setErreur('Veuillez sélectionner au moins un jour'); return; }

    const nbJours = joursSelectionnes.length;
    const qteTotale = qte * nbJours;
    const caTotale = qteTotale * prix;
    const margeEuros = (margePct / 100) * prix;
    const margeTotale = margeEuros * qteTotale;
    const tauxTVA = 0.055;
    const prixHT = prix / (1 + tauxTVA);
    const prixAchatHT = prixHT - margeEuros;

    const nouveauProduit = {
      id: Date.now(),
      nom: exceptionnelForm.nom.trim(),
      qteParJour: qte, qteTotale, prix, margePct, margeEuros, margeTotale, prixAchatHT,
      famille: exceptionnelForm.famille,
      programme: exceptionnelForm.programme || 'Aucun',
      jours: { ...exceptionnelForm.jours }, joursListe: joursSelectionnes, nbJours, caTotale,
      qteValidee: qteTotale
    };

    if (setProduitsExceptionnels) {
      setProduitsExceptionnels([...produitsExceptionnels, nouveauProduit]);
    }
    resetFormExceptionnel();
    setErreur(null);
  };

  const supprimerProduitExceptionnel = (id) => {
    if (setProduitsExceptionnels) {
      setProduitsExceptionnels(produitsExceptionnels.filter(p => p.id !== id));
    }
  };

  const modifierQteExceptionnel = (id, value) => {
    if (!setProduitsExceptionnels) return;
    const produitsModifies = produitsExceptionnels.map(p => {
      if (p.id === id) {
        return { ...p, qteValidee: Math.max(0, parseInt(value, 10) || 0) };
      }
      return p;
    });
    setProduitsExceptionnels(produitsModifies);
  };

  // Calcul de l'impact global (utilise qteValidee si modifiée, sinon qteObjectif)
  const impactGlobal = useMemo(() => {
    let caSupplementaire = 0;
    let diffMargeTotale = 0;
    let qteSupplementaire = 0;
    let nbQteAjustee = 0;

    promosActives.forEach(promo => {
      // Utiliser la qté validée par l'opérateur (fallback sur objectif)
      const qteValidee = promo.qteValidee ?? promo.qteObjectif;
      const qteNormalePeriode = promo.qteNormalePeriode || (promo.qteNormaleHebdo / 7 * (promo.nbJoursPromo || 7));

      // Quantité supplémentaire basée sur la qté validée
      const qteSupp = qteValidee - Math.ceil(qteNormalePeriode);
      qteSupplementaire += qteSupp;

      // CA supplémentaire = quantités en plus × prix promo
      caSupplementaire += qteSupp * promo.prixPromoTTC;

      // Différence de marge basée sur la qté validée
      const margeTotaleNormale = promo.margeNormaleEuros * qteNormalePeriode;
      const margeTotalePromo = promo.margePromoEuros * qteValidee;
      diffMargeTotale += margeTotalePromo - margeTotaleNormale;

      // Compter les produits avec qté validée différente de l'objectif
      if (qteValidee !== promo.qteObjectif) {
        nbQteAjustee++;
      }
    });

    // Impact des produits exceptionnels
    let caExceptionnels = 0;
    let qteExceptionnels = 0;
    let margeExceptionnels = 0;
    produitsExceptionnels.forEach(prod => {
      const qteVal = prod.qteValidee ?? prod.qteTotale;
      caExceptionnels += qteVal * prod.prix;
      qteExceptionnels += qteVal;
      const margeU = prod.margeEuros || (prod.margePct || 40) / 100 * prod.prix;
      margeExceptionnels += margeU * qteVal;
    });

    diffMargeTotale += margeExceptionnels;

    return {
      caSupplementaire: caSupplementaire.toFixed(2),
      caExceptionnels: caExceptionnels.toFixed(2),
      diffMargeTotale: diffMargeTotale.toFixed(2),
      qteSupplementaire: Math.round(qteSupplementaire),
      qteExceptionnels: Math.round(qteExceptionnels),
      nbQteAjustee,
      nbExceptionnels: produitsExceptionnels.length
    };
  }, [promosActives, produitsExceptionnels]);

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
              Code PLU / ITM8 / EAN ou nom du produit
            </label>
            <input
              type="text"
              value={pluInput}
              onChange={(e) => setPluInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ex: 9784 ou croissant"
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

        {/* Message d'erreur ou info */}
        {erreur && (
          <div className={`${resultatsRecherche.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'} border rounded-lg p-3 mb-4 flex items-center gap-2`}>
            {resultatsRecherche.length > 0 ? <Search className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {erreur}
          </div>
        )}

        {/* Liste des résultats de recherche (plusieurs produits) */}
        {resultatsRecherche.length > 0 && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-800 mb-3">Sélectionnez un produit :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {resultatsRecherche.map((p, index) => (
                <button
                  key={index}
                  onClick={() => selectionnerProduit(p)}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {p.libellePersonnalise || p.libelle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.plu ? `PLU: ${p.plu}` : ''}{p.plu && p.itm8 ? ' | ' : ''}{p.itm8 ? `ITM8: ${p.itm8}` : ''}{!p.plu && !p.itm8 ? `EAN: ${p.codeEAN || p.ean13 || '-'}` : ''}
                    </p>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    p.rayon === 'BOULANGERIE' ? 'bg-stone-200 text-stone-700' :
                    p.rayon === 'VIENNOISERIE' ? 'bg-amber-200 text-amber-700' :
                    p.rayon === 'PATISSERIE' ? 'bg-rose-200 text-rose-700' :
                    p.rayon === 'SNACKING' ? 'bg-emerald-200 text-emerald-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {p.rayon || 'AUTRE'}
                  </span>
                </button>
              ))}
            </div>
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
                  {produitTrouve.plu ? `PLU: ${produitTrouve.plu}` : ''}{produitTrouve.plu && produitTrouve.itm8 ? ' | ' : ''}{produitTrouve.itm8 ? `ITM8: ${produitTrouve.itm8}` : ''}{produitTrouve.codeEAN ? ` | EAN: ${produitTrouve.codeEAN}` : (produitTrouve.ean13 ? ` | EAN: ${produitTrouve.ean13}` : '')}{!produitTrouve.plu && !produitTrouve.itm8 ? `EAN: ${produitTrouve.codeEAN || produitTrouve.ean13 || '-'}` : ''}
                </p>
                {!produitTrouve.reconnu && (
                  <p className="text-xs text-orange-500 mt-0.5">
                    Produit non reconnu dans le référentiel
                  </p>
                )}
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
        <div className={`bg-white rounded-lg shadow-sm border-2 p-6 mb-6 transition-colors ${quantitesValidees ? 'border-emerald-300' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              Produits en promo cette semaine ({promosActives.length})
            </h3>
            {quantitesValidees && (
              <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Quantités validées
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-2 font-medium text-gray-500">Produit</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500">Prix</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500">Avantage</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500">Période</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Quantité vendue en moyenne par semaine sans promo">Qté<br/>Moy/Sem</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Objectif promo calculé par élasticité">Qté<br/>Obj.</th>
                  <th className="text-center py-2.5 px-2 font-medium text-amber-600 font-semibold" title="Quantité validée par l'opérateur">Qté<br/>Validée</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '90px'}}>Ratio</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {promosActives.map((promo, index) => {
                  const qteValidee = promo.qteValidee ?? promo.qteObjectif;
                  const ratioPct = promo.qteObjectif > 0 ? Math.round((qteValidee / promo.qteObjectif) * 100) : 100;
                  const ratioMoyPct = promo.qteNormaleHebdo > 0 ? Math.round((qteValidee / promo.qteNormaleHebdo) * 100) : 100;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <p className="font-medium text-gray-800 truncate max-w-[180px]" title={promo.libelle}>{promo.libelle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{promo.plu || promo.itm8 || promo.ean13 || '-'}</p>
                      </td>
                      {/* Prix avec ancien prix barré */}
                      <td className="py-3 px-2 text-right">
                        <span className="line-through text-gray-400 text-xs block">
                          {promo.prixNormalTTC.toFixed(2)} €
                        </span>
                        <span className="font-bold text-[#ED1C24]">
                          {promo.prixPromoTTC.toFixed(2)} €
                        </span>
                      </td>
                      {/* Avantage client avec badge coloré */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getAvantageBadge(promo.avantageClient)}`}>
                          -{promo.avantageClient.toFixed(0)}%
                        </span>
                      </td>
                      {/* Période modifiable */}
                      <td className="py-3 px-2 text-center">
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
                        <span className="text-xs text-blue-600 mt-0.5 inline-block">
                          {promo.nbJoursPromo || calculerNbJoursPromo(promo.dateDebut, promo.dateFin)} jours
                        </span>
                      </td>
                      {/* Qté Moy/Sem - contexte historique */}
                      <td className="py-3 px-2 text-right">
                        <span className="text-gray-600 font-medium">{Math.round(promo.qteNormaleHebdo || 0)}</span>
                        <span className="text-xs text-gray-400 block">/ sem</span>
                      </td>
                      {/* Qté Objectif calculée */}
                      <td className="py-3 px-2 text-right">
                        <span className="text-gray-500 font-medium">{promo.qteObjectif}</span>
                      </td>
                      {/* Qté Validée — saisie opérateur */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={qteValidee}
                          onChange={(e) => modifierQteValidee(index, e.target.value)}
                          className={`w-20 px-2 py-1 text-center text-sm font-bold rounded-lg border-2 focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                            qteValidee < promo.qteObjectif
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : qteValidee > promo.qteObjectif
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-gray-300 bg-white text-gray-800'
                          }`}
                        />
                      </td>
                      {/* Ratio visuel */}
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${ratioPct >= 100 ? 'text-emerald-600' : ratioPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {ratioPct}%
                          </span>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${ratioPct >= 100 ? 'bg-emerald-500' : ratioPct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(ratioPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">×{(ratioMoyPct / 100).toFixed(1)} vs moy</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => supprimerPromo(index)}
                          className="text-red-400 hover:text-red-600 p-1 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PRODUITS EXCEPTIONNELS ===== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Produits exceptionnels ({produitsExceptionnels.length})
          </h3>
          <button
            onClick={() => setShowFormExceptionnel(!showFormExceptionnel)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            {showFormExceptionnel ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showFormExceptionnel ? 'Fermer' : 'Ajouter un produit'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Produits hors gamme habituelle (commande exceptionnelle, nouveau produit, événement...)
        </p>

        {/* Formulaire d'ajout */}
        {showFormExceptionnel && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du produit *</label>
                <input type="text" value={exceptionnelForm.nom} onChange={(e) => setExceptionnelForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Ex: Galette des Rois" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Famille</label>
                <select value={exceptionnelForm.famille} onChange={(e) => setExceptionnelForm(p => ({ ...p, famille: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                  {FAMILLES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Qté / jour *</label>
                <input type="number" min="1" value={exceptionnelForm.qteParJour} onChange={(e) => setExceptionnelForm(p => ({ ...p, qteParJour: e.target.value }))}
                  placeholder="Ex: 30" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prix TTC *</label>
                <input type="number" step="0.01" min="0" value={exceptionnelForm.prix} onChange={(e) => setExceptionnelForm(p => ({ ...p, prix: e.target.value }))}
                  placeholder="Ex: 12.90" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Marge %</label>
                <input type="number" step="0.1" min="0" max="99" value={exceptionnelForm.marge} onChange={(e) => setExceptionnelForm(p => ({ ...p, marge: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Programme</label>
                <select value={exceptionnelForm.programme} onChange={(e) => setExceptionnelForm(p => ({ ...p, programme: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                  {PROGRAMMES.map(p => <option key={p} value={p}>{p || '-- Choisir --'}</option>)}
                </select>
              </div>
            </div>
            {/* Sélection des jours */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Jours concernés</label>
              <div className="flex gap-2">
                {Object.entries(exceptionnelForm.jours).map(([jour, actif]) => (
                  <button key={jour} onClick={() => toggleJourExceptionnel(jour)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      actif ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-500 border-gray-300 hover:border-purple-400'
                    }`}>
                    {jour.charAt(0).toUpperCase() + jour.slice(1, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetFormExceptionnel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={ajouterProduitExceptionnel} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Tableau des produits exceptionnels */}
        {produitsExceptionnels.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-2 font-medium text-gray-500">Produit</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500">Famille</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500">Jours</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500">Prix</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500">Marge</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Quantité par jour × nombre de jours">Qté/j</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Total estimé (Qté/j × jours)">Qté<br/>Totale</th>
                  <th className="text-center py-2.5 px-2 font-medium text-purple-600 font-semibold" title="Quantité validée par l'opérateur">Qté<br/>Validée</th>
                  <th className="text-right py-2.5 px-2 font-medium text-gray-500">CA</th>
                  <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '40px'}}></th>
                </tr>
              </thead>
              <tbody>
                {produitsExceptionnels.map((prod) => {
                  const qteVal = prod.qteValidee ?? prod.qteTotale;
                  const ratioPct = prod.qteTotale > 0 ? Math.round((qteVal / prod.qteTotale) * 100) : 100;
                  return (
                    <tr key={prod.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <span className="font-medium">{prod.nom}</span>
                        {prod.programme && prod.programme !== 'Aucun' && (
                          <span className="text-xs text-gray-400 ml-1">({prod.programme})</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{prod.famille}</span>
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-gray-500">
                        {prod.joursListe.map(j => j.slice(0,3)).join(', ')}
                        <span className="block text-[10px] text-gray-400">({prod.nbJours} jour{prod.nbJours > 1 ? 's' : ''})</span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{prod.prix.toFixed(2)} €</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-xs">{prod.margePct}%</span>
                        <span className="text-xs text-gray-400 block">({prod.margeEuros.toFixed(2)}€)</span>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-600">
                        {prod.qteParJour}
                        <span className="text-xs text-gray-400 block">/ jour</span>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-500">
                        {prod.qteTotale}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input type="number" min="0" value={qteVal}
                          onChange={(e) => modifierQteExceptionnel(prod.id, e.target.value)}
                          className={`w-20 px-2 py-1 text-center text-sm font-bold rounded-lg border-2 focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                            qteVal !== prod.qteTotale ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-800'
                          }`} />
                        {qteVal !== prod.qteTotale && (
                          <span className={`text-[10px] block mt-0.5 ${ratioPct >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {ratioPct}% du total
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-purple-700">{(qteVal * prod.prix).toFixed(2)} €</td>
                      <td className="py-3 px-2 text-center">
                        <button onClick={() => supprimerProduitExceptionnel(prod.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Impact prévisionnel + Bouton Valider */}
      {(promosActives.length > 0 || produitsExceptionnels.length > 0) && (
        <div className={`border-2 rounded-lg p-6 transition-all ${
          quantitesValidees
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
              <TrendingUp className={`w-5 h-5 ${quantitesValidees ? 'text-emerald-600' : 'text-amber-600'}`} />
              Impact prévisionnel
            </h3>
            {/* Bouton Valider */}
            <button
              onClick={() => setQuantitesValidees(!quantitesValidees)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${
                quantitesValidees
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300'
                  : 'bg-white text-amber-700 border-2 border-amber-400 hover:bg-amber-50 hover:border-amber-500'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              {quantitesValidees ? 'Quantités validées ✓' : 'Valider les quantités'}
            </button>
          </div>

          <div className={`grid ${produitsExceptionnels.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">CA Promos</p>
              <p className={`text-2xl font-bold ${parseFloat(impactGlobal.caSupplementaire) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(impactGlobal.caSupplementaire) >= 0 ? '+' : ''}{impactGlobal.caSupplementaire} €
              </p>
              {promosActives.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{promosActives.length} promo{promosActives.length > 1 ? 's' : ''}</p>
              )}
            </div>
            {produitsExceptionnels.length > 0 && (
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                <p className="text-sm text-gray-500 mb-1">CA Exceptionnels</p>
                <p className="text-2xl font-bold text-purple-600">
                  +{impactGlobal.caExceptionnels} €
                </p>
                <p className="text-xs text-gray-400 mt-1">{impactGlobal.nbExceptionnels} produit{impactGlobal.nbExceptionnels > 1 ? 's' : ''}</p>
              </div>
            )}
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Impact Marge</p>
              <p className={`text-2xl font-bold ${parseFloat(impactGlobal.diffMargeTotale) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(impactGlobal.diffMargeTotale) >= 0 ? '+' : ''}{impactGlobal.diffMargeTotale} €
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Qté Supplémentaire</p>
              <p className="text-2xl font-bold text-[#ED1C24]">
                +{impactGlobal.qteSupplementaire + impactGlobal.qteExceptionnels}
              </p>
            </div>
          </div>

          {/* Résumé de validation */}
          {quantitesValidees ? (
            <div className="mt-4 bg-emerald-100 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Quantités validées pour le planning de production.</p>
                {impactGlobal.nbQteAjustee > 0 && (
                  <p className="text-xs mt-0.5 text-emerald-600">
                    {impactGlobal.nbQteAjustee} produit{impactGlobal.nbQteAjustee > 1 ? 's' : ''} avec quantité ajustée par rapport à l'objectif.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-amber-100 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800">
              <Info className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-sm">Vérifiez les quantités puis cliquez sur <strong>Valider les quantités</strong> pour confirmer.</p>
                {impactGlobal.nbQteAjustee > 0 && (
                  <p className="text-xs mt-0.5 text-amber-600">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {impactGlobal.nbQteAjustee} produit{impactGlobal.nbQteAjustee > 1 ? 's' : ''} avec quantité ajustée par rapport à l'objectif.
                  </p>
                )}
              </div>
            </div>
          )}
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
