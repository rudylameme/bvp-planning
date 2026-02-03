/**
 * Étape 5 : Communication — Export Archive Planning
 *
 * Permet au Manager d'exporter un fichier .bvp.json contenant
 * toutes les données du planning pour l'équipe.
 */

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  FolderOpen,
  Download,
  Check,
  AlertTriangle,
  Package,
  Target,
  Calendar,
  Users,
  FileJson,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';

// ============================================================================
// Helpers
// ============================================================================

/** Retourne la date ISO du lundi de la semaine ISO donnée */
const getDateDebutSemaine = (semaine, annee) => {
  // Algorithme ISO : le 4 janvier est toujours en semaine 1
  const jan4 = new Date(annee, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // 1=lundi...7=dimanche
  const lundi1 = new Date(jan4);
  lundi1.setDate(jan4.getDate() - dayOfWeek + 1);
  const result = new Date(lundi1);
  result.setDate(lundi1.getDate() + (semaine - 1) * 7);
  return result.toISOString().split('T')[0];
};

const getDateFinSemaine = (semaine, annee) => {
  const debut = new Date(getDateDebutSemaine(semaine, annee));
  debut.setDate(debut.getDate() + 6);
  return debut.toISOString().split('T')[0];
};

const padSemaine = (s) => String(s).padStart(2, '0');

// ============================================================================
// Construction de l'archive
// ============================================================================

const construireArchive = ({
  donneesMagasin,
  infoPDV,
  semainePlanning,
  objectifCA,
  objectifPourcent,
  produitsGamme,
  planifieManager,
  joursOuverture,
  promosActives,
  commandeConfig,
}) => {
  const sem = semainePlanning || { semaine: 1, annee: 2026 };
  const code = infoPDV?.code || donneesMagasin?.magasin?.code || 'XXXXX';
  const nom = infoPDV?.nom || donneesMagasin?.magasin?.nom || 'MAGASIN';

  // Jours actifs (créneaux au moins partiellement ouverts)
  const joursActifs = [];
  if (joursOuverture?.creneaux) {
    Object.entries(joursOuverture.creneaux).forEach(([jour, creneaux]) => {
      const auMoinsUnOuvert = Object.values(creneaux).some(e => e === 'ouvert');
      if (auMoinsUnOuvert) joursActifs.push(jour);
    });
  } else {
    joursActifs.push('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi');
  }

  // CA historique (somme des CA des produits actifs)
  const caHistorique = (produitsGamme || [])
    .filter(p => p.actif !== false)
    .reduce((sum, p) => sum + (p.caSemaine || 0), 0);

  // Produits
  const produits = (produitsGamme || []).map(p => {
    const planifie = planifieManager?.[p.id] ?? p.potentiel ?? p.moyHebdo ?? 0;
    const nbJours = joursActifs.length || 6;

    // Répartition proportionnelle simple sur les jours actifs
    const repartitionJours = {};
    joursActifs.forEach(jour => {
      repartitionJours[jour] = Math.round(planifie / nbJours);
    });

    return {
      plu: p.itm8 || p.plu || '',
      itm8: p.itm8 || '',
      libelle: p.libelle || '',
      famille: p.famille || p.rayon || 'AUTRE',
      rayon: p.rayon || 'BVP',
      actif: p.actif !== false,
      moyenneHebdo: p.moyHebdo || 0,
      potentielAlgo: p.potentiel || 0,
      planifieManager: planifie,
      cdt: p.cdt || p.cdtAchat || 0,
      repartitionJours,
    };
  });

  // Promotions — sauvegarder tous les champs pour rechargement complet
  const promotions = (promosActives || []).map(promo => ({
    plu: promo.plu || promo.itm8 || '',
    itm8: promo.itm8 || '',
    libelle: promo.libelle || '',
    type: promo.type || 'promo',
    dateDebut: promo.dateDebut || '',
    dateFin: promo.dateFin || '',
    prixNormalTTC: promo.prixNormalTTC ?? 0,
    prixPromoTTC: promo.prixPromoTTC ?? 0,
    prixAchatHT: promo.prixAchatHT ?? 0,
    margePct: promo.margePct ?? 0,
    avantageClient: promo.avantageClient ?? 0,
    margeNormaleEuros: promo.margeNormaleEuros ?? 0,
    margePromoEuros: promo.margePromoEuros ?? 0,
    tauxMargePromo: promo.tauxMargePromo ?? 0,
    elasticite: promo.elasticite ?? 0,
    qteNormaleHebdo: promo.qteNormaleHebdo ?? 0,
    qteNormalePeriode: promo.qteNormalePeriode ?? 0,
    nbJoursPromo: promo.nbJoursPromo ?? 7,
    qteObjectif: promo.qteObjectif ?? 0,
    qteValidee: promo.qteValidee ?? promo.qteObjectif ?? 0,
    qteSupplementaire: promo.qteSupplementaire ?? 0,
  }));

  // Référentiel
  const familles = [...new Set(produits.map(p => p.famille).filter(Boolean))];
  if (familles.length === 0) familles.push('PAIN', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING');

  const archive = {
    schemaVersion: '3.0',
    type: 'planning-archive',
    exportDate: new Date().toISOString(),

    magasin: {
      code: String(code),
      nom: String(nom),
    },

    semaine: {
      numero: sem.semaine,
      annee: sem.annee,
      dateDebut: getDateDebutSemaine(sem.semaine, sem.annee),
      dateFin: getDateFinSemaine(sem.semaine, sem.annee),
    },

    configuration: {
      joursActifs,
      creneaux: joursOuverture?.creneaux || null,
      regroupements: joursOuverture?.regroupements || null,
      livraisons: (commandeConfig?.livraisons || []).map(l => ({
        id: l.id,
        dateCommande: l.dateCommande,
        dateReception: l.dateReception,
        label: l.label || `Livraison ${l.id}`,
      })),
      operationsSpeciales: [],
      // Politique de cuisson par famille (V4)
      repartitionParFamille: {
        BOULANGERIE: 'tranches',
        VIENNOISERIE: 'tranches',
        PATISSERIE: 'journalier',
        SNACKING: 'journalier',
        AUTRE: 'journalier',
      },
    },

    promotions,

    objectifs: {
      caHistorique: Math.round(caHistorique),
      objectifPourcent: objectifPourcent || 0,
      caPrevision: objectifCA || Math.round(caHistorique),
    },

    produits,

    // Quantités commande par livraison (depuis OngletCommande)
    commandes: commandeConfig?.qtesFinales || {},

    // Personnalisation produit (programme cuisson, unités/plaque)
    personnalisationProduits: commandeConfig?.personnalisationProduits || {},

    referentiel: {
      version: 'ITM8-2026',
      inclus: true,
      familles,
      source: 'liste des produits BVP treville.xlsx',
    },
  };

  return archive;
};

// ============================================================================
// Composant principal
// ============================================================================

const Etape5Communication = () => {
  const {
    donneesMagasin,
    infoPDV,
    semainePlanning,
    objectifCA,
    objectifPourcent,
    produitsGamme,
    planifieManager,
    joursOuverture,
    promosActives,
    commandeConfig,
    dossierArchives,
    setDossierArchives,
  } = useMagasin();

  const [exporting, setExporting] = useState(false);
  const [exportOk, setExportOk] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [nomFichierExporte, setNomFichierExporte] = useState(null);

  // Construire l'archive en preview
  const archive = useMemo(() => construireArchive({
    donneesMagasin,
    infoPDV,
    semainePlanning,
    objectifCA,
    objectifPourcent,
    produitsGamme,
    planifieManager,
    joursOuverture,
    commandeConfig,
    promosActives,
  }), [donneesMagasin, infoPDV, semainePlanning, objectifCA, objectifPourcent, produitsGamme, planifieManager, joursOuverture, promosActives, commandeConfig]);

  const nomFichier = useMemo(() => {
    const code = archive.magasin.code;
    const sem = padSemaine(archive.semaine.numero);
    const annee = archive.semaine.annee;
    return `MANAGER-${code}-S${sem}-${annee}.bvp.json`;
  }, [archive]);

  // Stats pour le résumé
  const nbProduits = archive.produits.length;
  const nbProduitsActifs = archive.produits.filter(p => p.actif).length;
  const nbPromos = archive.promotions.length;
  const nbJours = archive.configuration.joursActifs.length;

  // Choisir le dossier d'archives
  const handleChoisirDossier = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setDossierArchives(handle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErreur(`Erreur lors du choix du dossier : ${err.message}`);
      }
    }
  };

  // Vérifier/demander la permission sur le dossier existant
  const verifierPermission = async (handle) => {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    const req = await handle.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  };

  // Export dans le dossier d'archives
  const handleExport = async () => {
    setExporting(true);
    setErreur(null);
    setExportOk(false);

    try {
      let dirToUse = dossierArchives;

      // Si pas de dossier configuré, en demander un
      if (!dirToUse) {
        try {
          dirToUse = await window.showDirectoryPicker({ mode: 'readwrite' });
          setDossierArchives(dirToUse);
        } catch (err) {
          if (err.name === 'AbortError') return;
          throw err;
        }
      }

      // Vérifier la permission
      const ok = await verifierPermission(dirToUse);
      if (!ok) {
        setErreur('Permission refusée sur le dossier d\'archives.');
        return;
      }

      // Écrire le fichier dans le dossier
      const fileHandle = await dirToUse.getFileHandle(nomFichier, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(archive, null, 2));
      await writable.close();

      setExportOk(true);
      setNomFichierExporte(nomFichier);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Erreur export:', err);
      setErreur(`Erreur lors de l'export : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Vérifications pré-export
  const avertissements = [];
  if (!semainePlanning) avertissements.push('Aucune semaine planning définie');
  if (nbProduitsActifs === 0) avertissements.push('Aucun produit actif dans la gamme');
  if (!objectifCA && !objectifPourcent) avertissements.push('Objectif CA non défini');

  const peutExporter = semainePlanning && nbProduitsActifs > 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#8B1538]" />
          Communication Équipe
        </h2>
        <p className="text-gray-600 mt-1">
          Exportez le planning pour le partager avec votre équipe
        </p>
      </div>

      {/* Résumé du planning */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Résumé du planning</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Magasin */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Users className="w-4 h-4" />
              Magasin
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {archive.magasin.nom}
            </p>
            <p className="text-xs text-gray-500">Code : {archive.magasin.code}</p>
          </div>

          {/* Semaine */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Semaine
            </div>
            <p className="font-bold text-gray-800 text-lg">
              S{padSemaine(archive.semaine.numero)} / {archive.semaine.annee}
            </p>
            <p className="text-xs text-gray-500">{nbJours} jours d'ouverture</p>
          </div>

          {/* Produits */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Package className="w-4 h-4" />
              Produits
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {nbProduitsActifs}
            </p>
            <p className="text-xs text-gray-500">sur {nbProduits} au total</p>
          </div>

          {/* Objectif */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Target className="w-4 h-4" />
              Objectif
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {archive.objectifs.caPrevision.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-gray-500">
              {objectifPourcent ? `+${objectifPourcent}% vs historique` : 'Non défini'}
            </p>
          </div>
        </div>

        {/* Promos */}
        {nbPromos > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            {nbPromos} promotion{nbPromos > 1 ? 's' : ''} active{nbPromos > 1 ? 's' : ''} incluse{nbPromos > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Avertissements */}
      {avertissements.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Attention</span>
          </div>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {avertissements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Dossier d'archives */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Dossier d'archives</h3>
        {dossierArchives ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">{dossierArchives.name}</p>
                <p className="text-xs text-green-600">Dossier configuré — les archives seront sauvegardées ici</p>
              </div>
            </div>
            <button
              onClick={handleChoisirDossier}
              className="px-4 py-2 text-sm bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Aucun dossier configuré</p>
                <p className="text-xs text-amber-600">Choisissez un dossier pour sauvegarder les archives</p>
              </div>
            </div>
            <button
              onClick={handleChoisirDossier}
              className="px-4 py-2 text-sm bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] transition-colors font-semibold"
            >
              Choisir le dossier
            </button>
          </div>
        )}
      </div>

      {/* Fichier d'export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Fichier d'export</h3>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mb-4">
          <FileJson className="w-8 h-8 text-[#8B1538]" />
          <div>
            <p className="font-mono font-semibold text-gray-800">{nomFichier}</p>
            <p className="text-xs text-gray-500">Archive Planning BVP — schemaVersion 3.0</p>
          </div>
        </div>

        {/* Bouton export */}
        {!exportOk ? (
          <button
            onClick={handleExport}
            disabled={!peutExporter || exporting}
            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors ${
              peutExporter && !exporting
                ? 'bg-[#8B1538] text-white hover:bg-[#6d1029]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {exporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Valider et exporter le planning
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-4 rounded-xl bg-green-100 border-2 border-green-400 text-green-800 font-semibold text-lg flex items-center justify-center gap-3">
            <Check className="w-6 h-6" />
            Planning exporté : {nomFichierExporte}
          </div>
        )}

        {/* Erreur */}
        {erreur && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {erreur}
          </div>
        )}
      </div>
    </div>
  );
};

export default Etape5Communication;
