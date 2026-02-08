import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Edit2 } from 'lucide-react';
import { getProchainMercredi, getMardiSuivant, calculerNbJoursPromo } from './utils';
import CalculElasticite from './CalculElasticite';

/**
 * EditeurPromotion - Formulaire de recherche et d'ajout d'un produit en promo
 * Inclut : recherche PLU/nom, champs editables, calcul elasticite, bouton ajout
 */
export default function EditeurPromotion({
  produits,
  promosActives,
  setPromosActives,
  periodePromo,
  erreur,
  setErreur
}) {
  // State du formulaire
  const [pluInput, setPluInput] = useState('');
  const [prixPromoInput, setPrixPromoInput] = useState('');
  const [produitTrouve, setProduitTrouve] = useState(null);
  const [calculsPromo, setCalculsPromo] = useState(null);
  const [resultatsRecherche, setResultatsRecherche] = useState([]);

  // Champs editables (initialises depuis le produit trouve)
  const [prixVenteEditable, setPrixVenteEditable] = useState('');
  const [margeEditable, setMargeEditable] = useState('');
  const [qteMoyenneEditable, setQteMoyenneEditable] = useState('');

  // Dates specifiques au produit en cours d'ajout
  const [dateDebutPromo, setDateDebutPromo] = useState('');
  const [dateFinPromo, setDateFinPromo] = useState('');

  // Rechercher un produit par PLU, ITM8, EAN ou libelle
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

    // 2. Si pas trouve par code, chercher par libelle (contient)
    if (!produit) {
      const produitsParNom = produits.filter(p =>
        (p.libelle && p.libelle.toLowerCase().includes(rechercheLower)) ||
        (p.libellePersonnalise && p.libellePersonnalise.toLowerCase().includes(rechercheLower))
      );

      if (produitsParNom.length === 1) {
        // Un seul resultat -> selectionner directement
        produit = produitsParNom[0];
      } else if (produitsParNom.length > 1) {
        // Plusieurs resultats -> afficher la liste pour selection
        setResultatsRecherche(produitsParNom.slice(0, 10)); // Max 10 resultats
        setErreur(`${produitsParNom.length} produits trouvés pour "${recherche}". Cliquez sur un produit pour le sélectionner.`);
        return;
      }
    }

    if (produit) {
      // Verifier si le produit a les donnees necessaires
      if (!produit.prixMoyenUnitaire || produit.prixMoyenUnitaire <= 0) {
        setErreur(`Le produit "${produit.libelle}" n'a pas de prix de vente défini`);
        setProduitTrouve(null);
        return;
      }
      setProduitTrouve(produit);

      // Initialiser les champs editables avec les valeurs du produit
      setPrixVenteEditable(produit.prixMoyenUnitaire?.toFixed(2) || '');
      // Marge par defaut : utiliser tauxMarge du produit ou 42% (moyenne BVP)
      setMargeEditable(produit.tauxMarge?.toString() || '42');
      setQteMoyenneEditable(produit.moyenneHebdo?.toString() || '0');

      // Initialiser les dates avec la periode par defaut (Mousquetaires)
      setDateDebutPromo(periodePromo?.debut || getProchainMercredi());
      setDateFinPromo(periodePromo?.fin || getMardiSuivant(periodePromo?.debut || getProchainMercredi()));
    } else {
      setProduitTrouve(null);
      setErreur(`Aucun produit trouvé pour "${recherche}". Vérifiez le code PLU/ITM8/EAN ou le nom du produit.`);
    }
  };

  // Gerer la touche Entree dans le champ PLU
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      rechercherProduit();
    }
  };

  // Selectionner un produit depuis la liste de resultats
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

    // Initialiser les champs editables avec les valeurs du produit
    setPrixVenteEditable(produit.prixMoyenUnitaire?.toFixed(2) || '');
    setMargeEditable(produit.tauxMarge?.toString() || '42');
    setQteMoyenneEditable(produit.moyenneHebdo?.toString() || '0');

    // Initialiser les dates avec la periode par defaut
    setDateDebutPromo(periodePromo?.debut || getProchainMercredi());
    setDateFinPromo(periodePromo?.fin || getMardiSuivant(periodePromo?.debut || getProchainMercredi()));
  };

  // Calculer automatiquement les donnees de la promo (useCallback pour eviter les recalculs)
  const calculerPromo = useCallback(() => {
    const prixNormalTTC = parseFloat(prixVenteEditable);
    const margePct = parseFloat(margeEditable);
    const qteNormale = parseFloat(qteMoyenneEditable) || 0;
    const prixPromoNum = parseFloat(prixPromoInput);
    // Verifications de base
    if (!prixNormalTTC || prixNormalTTC <= 0) { setCalculsPromo(null); return; }
    if (!margePct || margePct <= 0 || margePct >= 100) { setCalculsPromo(null); return; }
    if (!prixPromoNum || prixPromoNum <= 0) { setCalculsPromo(null); return; }
    if (prixPromoNum >= prixNormalTTC) {
      setCalculsPromo({ erreur: 'Le prix promo doit être inférieur au prix normal' });
      return;
    }
    // FORMULE MARGE MOUSQUETAIRES : Marge% = (PV HT - PA HT) / PV TTC
    const tauxTVA = 0.055;
    const prixNormalHT = prixNormalTTC / (1 + tauxTVA);
    const margeNormaleEuros = (margePct / 100) * prixNormalTTC;
    const prixAchatHT = prixNormalHT - margeNormaleEuros;
    const prixPromoHT = prixPromoNum / (1 + tauxTVA);
    const margePromoEuros = prixPromoHT - prixAchatHT;
    if (margePromoEuros <= 0) {
      setCalculsPromo({ erreur: 'Le prix promo est trop bas (marge négative)' });
      return;
    }
    const avantageClient = ((prixNormalTTC - prixPromoNum) / prixNormalTTC) * 100;
    const tauxMargePromoMousquetaires = (margePromoEuros / prixPromoNum) * 100;
    // ELASTICITE : elasticite = (margeNormale / margePromo) - 1, plafond 2.0
    const elasticiteCalculee = (margeNormaleEuros / margePromoEuros) - 1;
    const PLAFOND_ELASTICITE = 2.0;
    const elasticite = Math.min(elasticiteCalculee, PLAFOND_ELASTICITE);
    // QTE OBJECTIF selon duree promo
    const nbJoursPromo = calculerNbJoursPromo(dateDebutPromo, dateFinPromo);
    const qteMoyenneParJour = qteNormale / 7;
    const qteNormalePeriode = qteMoyenneParJour * nbJoursPromo;
    const qteObjectif = Math.ceil(qteNormalePeriode * (1 + elasticite));
    const qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);
    const augmentationPct = qteNormalePeriode > 0 ? ((qteObjectif - qteNormalePeriode) / qteNormalePeriode) * 100 : 0;

    setCalculsPromo({
      prixPromoTTC: prixPromoNum, prixPromoHT, prixNormalTTC, prixNormalHT, prixAchatHT,
      margePct, margeNormaleEuros, margePromoEuros, avantageClient, tauxMargePromoMousquetaires,
      elasticite, qteNormaleHebdo: qteNormale, qteNormalePeriode, nbJoursPromo,
      qteObjectif, qteSupplementaire, augmentationPct,
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

  // Ajouter une promo a la liste
  const ajouterPromo = () => {
    if (!produitTrouve || !calculsPromo || calculsPromo.erreur) return;

    // Verifier si le produit n'est pas deja dans la liste
    const pluProduit = produitTrouve.plu || produitTrouve.itm8;
    if (promosActives.find(p => p.plu === pluProduit || p.itm8 === produitTrouve.itm8)) {
      setErreur('Ce produit est déjà dans la liste des promos');
      return;
    }

    const c = calculsPromo;
    const nouvellePromo = {
      plu: produitTrouve.plu || '', itm8: produitTrouve.itm8 || '',
      ean13: produitTrouve.ean13 || produitTrouve.codeEAN || '',
      libelle: produitTrouve.libellePersonnalise || produitTrouve.libelle,
      prixNormalTTC: c.prixNormalTTC, prixPromoTTC: c.prixPromoTTC, prixAchatHT: c.prixAchatHT,
      margePct: c.margePct, avantageClient: c.avantageClient,
      margeNormaleEuros: c.margeNormaleEuros, margePromoEuros: c.margePromoEuros,
      tauxMargePromo: c.tauxMargePromoMousquetaires, elasticite: c.elasticite,
      qteNormaleHebdo: c.qteNormaleHebdo, qteNormalePeriode: c.qteNormalePeriode,
      nbJoursPromo: c.nbJoursPromo, qteObjectif: c.qteObjectif,
      qteValidee: c.qteObjectif, qteSupplementaire: c.qteSupplementaire,
      dateDebut: dateDebutPromo, dateFin: dateFinPromo
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

  return (
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

      {/* Liste des resultats de recherche (plusieurs produits) */}
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

      {/* Produit trouve */}
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

          {/* Champs editables */}
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

            {/* Quantite moyenne */}
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

          {/* Prix d'achat calcule (non editable) - Formule Mousquetaires */}
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

              {/* Date debut */}
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

          {/* Calculs automatiques + bouton ajouter */}
          <CalculElasticite
            calculsPromo={calculsPromo}
            onAjouterPromo={ajouterPromo}
          />
        </div>
      )}
    </div>
  );
}
