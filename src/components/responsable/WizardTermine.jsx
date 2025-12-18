import { useEffect, useState } from 'react';
import { CheckCircle, Download, RefreshCw, ArrowLeft, FileJson, Copy, Check } from 'lucide-react';

// Liste des jours de la semaine
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/**
 * Construit la structure de fréquentation pour le fichier .bvp.json
 * Regroupe les tranches horaires en 4 créneaux: avant12h, 12h-14h, 14h-16h, apres16h
 */
const construireFrequentation = (frequentationData, baseCalcul) => {
  if (!frequentationData) {
    return null;
  }

  const parJour = {};
  let totalSemaine = 0;

  JOURS.forEach(jour => {
    // Récupérer les données du jour selon la base de calcul (BVP ou PDV)
    const jourDetailBvp = frequentationData.detailParJourHoraire?.[jour];
    const jourTotalBvp = frequentationData.parJourDetail?.[jour]?.bvp || 0;
    const jourTotalPdv = frequentationData.parJourDetail?.[jour]?.pdv || 0;

    // Choisir la base selon le paramètre
    const totalJour = baseCalcul === 'BVP' ? jourTotalBvp : jourTotalPdv;

    // Construire les tranches regroupées (les données source ont: matin, midi, apresMidi)
    // On les transforme en: avant12h, 12h-14h, 14h-16h, apres16h
    const tranches = {
      'avant12h': { qte: 0, poids: 0 },
      '12h-14h': { qte: 0, poids: 0 },
      '14h-16h': { qte: 0, poids: 0 },
      'apres16h': { qte: 0, poids: 0 }
    };

    if (jourDetailBvp) {
      const dataSource = baseCalcul === 'BVP' ? 'bvp' : 'pdv';

      // matin (09h_12h) -> avant12h
      tranches['avant12h'].qte = Math.round(jourDetailBvp.matin?.[dataSource] || 0);

      // midi (12h_14h + 14h_16h) -> on sépare en 12h-14h et 14h-16h
      // Comme on n'a pas le détail, on répartit 50/50 le midi
      const midiTotal = jourDetailBvp.midi?.[dataSource] || 0;
      tranches['12h-14h'].qte = Math.round(midiTotal * 0.5);
      tranches['14h-16h'].qte = Math.round(midiTotal * 0.5);

      // apresMidi (16h_19h + 19h_23h) -> apres16h
      tranches['apres16h'].qte = Math.round(jourDetailBvp.apresMidi?.[dataSource] || 0);
    }

    // Calculer le total du jour
    const totalJourCalc = Object.values(tranches).reduce((sum, t) => sum + t.qte, 0);

    // Calculer les poids par tranche
    Object.keys(tranches).forEach(tranche => {
      tranches[tranche].poids = totalJourCalc > 0
        ? Math.round((tranches[tranche].qte / totalJourCalc) * 100) / 100
        : 0;
    });

    parJour[jour] = {
      total: Math.round(totalJour) || totalJourCalc,
      poids: 0, // Sera calculé après
      tranches
    };

    totalSemaine += parJour[jour].total;
  });

  // Calculer les poids par jour
  JOURS.forEach(jour => {
    parJour[jour].poids = totalSemaine > 0
      ? Math.round((parJour[jour].total / totalSemaine) * 100) / 100
      : 0;
  });

  return {
    base: baseCalcul,
    parJour,
    totalSemaine: Math.round(totalSemaine)
  };
};

export default function WizardTermine({
  donneesMagasin,
  produits,
  semaine,
  annee,
  horaires,
  promosActives = [],
  periodePromo = null,
  onModifier,
  onNouvelleSemaine
}) {
  const [fichierGenere, setFichierGenere] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Générer le fichier automatiquement à l'arrivée sur cet écran
  useEffect(() => {
    const genererFichier = () => {
      const produitsActifs = produits.filter(p => p.actif);
      const caPrevi = produitsActifs.reduce(
        (sum, p) => sum + (p.potentielHebdo || 0) * (p.prixMoyenUnitaire || 0),
        0
      );
      const caHisto = produitsActifs.reduce(
        (sum, p) => sum + (p.caHebdoActuel || 0),
        0
      );

      // Construire les données de fréquentation
      const baseCalcul = donneesMagasin?.baseCalcul || 'PDV';
      const frequentationData = donneesMagasin?.importDonnees?.frequentation;
      const frequentation = construireFrequentation(frequentationData, baseCalcul);

      const fichier = {
        schemaVersion: '2.0',
        createdAt: new Date().toISOString(),
        createdBy: 'BVP Planning V2.0',
        magasin: {
          nom: donneesMagasin?.magasin?.nom || 'Mon Magasin',
          code: donneesMagasin?.magasin?.code || ''
        },
        configuration: {
          semaine,
          annee,
          dateDebut: getDateOfISOWeek(semaine, annee).toISOString().split('T')[0],
          dateFin: getEndOfWeek(semaine, annee).toISOString().split('T')[0],
          horaires,
          // Paramètres de calcul
          baseCalcul,
          limitesProgression: donneesMagasin?.limitesProgression || {},
          repartitionParFamille: donneesMagasin?.repartitionParFamille || {}
        },
        // Données de fréquentation par jour et par tranche horaire
        frequentation,
        objectifs: {
          caPrevi,
          caHisto,
          progression: caHisto > 0 ? ((caPrevi - caHisto) / caHisto) * 100 : 0,
          afficherCAEquipe: false
        },
        // Animation commerciale (promos de la semaine)
        animationCommerciale: promosActives.length > 0 ? {
          // Période par défaut (pour référence)
          periodeDefautDebut: periodePromo?.debut || null,
          periodeDefautFin: periodePromo?.fin || null,
          promos: promosActives.map(promo => ({
            plu: promo.plu,
            itm8: promo.itm8,
            libelle: promo.libelle,
            prixNormalTTC: promo.prixNormalTTC,
            prixPromoTTC: promo.prixPromoTTC,
            avantageClient: promo.avantageClient,
            tauxMargePromo: promo.tauxMargePromo,
            elasticite: promo.elasticite,
            // Quantités selon durée promo
            qteNormaleHebdo: promo.qteNormaleHebdo,
            qteNormalePeriode: promo.qteNormalePeriode,
            nbJoursPromo: promo.nbJoursPromo,
            qteObjectif: promo.qteObjectif,
            qteSupplementaire: promo.qteSupplementaire,
            // Dates spécifiques au produit
            dateDebut: promo.dateDebut,
            dateFin: promo.dateFin
          }))
        } : null,
        produits: produitsActifs.map(p => ({
          id: p.id,
          libelle: p.libelle,
          libellePersonnalise: p.libellePersonnalise,
          itm8: p.itm8,
          actif: true,
          potentiel: p.potentielHebdo,
          // Historique des ventes hebdo (arrondi à l'entier)
          historiqueHebdo: p.moyenneHebdo ? Math.round(p.moyenneHebdo) : null,
          famille: p.rayon,
          programme: p.programme,
          plu: p.plu,
          unitesParPlaque: p.unitesParPlaque,
          unitesParVente: p.unitesParVente || 1,
          prixUnitaire: p.prixMoyenUnitaire
        }))
      };

      setFichierGenere(fichier);
    };

    genererFichier();
  }, [donneesMagasin, produits, semaine, annee, horaires]);

  // Utilitaires dates
  const getDateOfISOWeek = (week, year) => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  };

  const getEndOfWeek = (week, year) => {
    const start = getDateOfISOWeek(week, year);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };

  // Générer le nom du fichier
  const getNomFichier = () => {
    const nomMagasin = fichierGenere?.magasin?.nom?.replace(/[^a-zA-Z0-9]/g, '-') || 'Magasin';
    return `${nomMagasin}-S${semaine}-${annee}.bvp.json`;
  };

  // Télécharger le fichier avec choix de l'emplacement
  const handleDownload = async () => {
    if (!fichierGenere) return;

    const contenu = JSON.stringify(fichierGenere, null, 2);
    const nomFichier = getNomFichier();

    // Essayer d'utiliser l'API File System Access (choix d'emplacement)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: nomFichier,
          types: [{
            description: 'Fichier BVP Planning',
            accept: { 'application/json': ['.json'] }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(contenu);
        await writable.close();

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
        return;
      } catch (err) {
        // L'utilisateur a annulé ou erreur - fallback au téléchargement classique
        if (err.name === 'AbortError') return;
        console.warn('File System API non disponible, fallback au téléchargement classique');
      }
    }

    // Fallback: téléchargement classique (navigateurs sans showSaveFilePicker)
    const blob = new Blob([contenu], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomFichier;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Copier dans le presse-papier (pour partage)
  const handleCopy = async () => {
    if (!fichierGenere) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(fichierGenere, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!fichierGenere) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ED1C24]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* En-tête succès */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#58595B] mb-2">
          Fichier prêt pour l'équipe !
        </h2>
        <p className="text-gray-500">
          Transmettez ce fichier à votre équipe pour générer le planning
        </p>
      </div>

      {/* Carte fichier */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-[#E8E1D5]/50 rounded-lg">
            <FileJson className="w-8 h-8 text-[#8B1538]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#58595B]">{getNomFichier()}</p>
            <p className="text-sm text-gray-500">
              {fichierGenere.produits.length} produits • Semaine {semaine}/{annee}
            </p>
          </div>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-1">Magasin</p>
            <p className="font-medium text-[#58595B]">{fichierGenere.magasin.nom}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">CA Prévisionnel</p>
            <p className="font-medium text-[#8B1538]">{formatEuro(fichierGenere.objectifs.caPrevi)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Produits actifs</p>
            <p className="font-medium text-[#58595B]">{fichierGenere.produits.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Progression</p>
            <p className={`font-medium ${
              fichierGenere.objectifs.progression > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {fichierGenere.objectifs.progression > 0 ? '+' : ''}
              {fichierGenere.objectifs.progression.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              downloadSuccess
                ? 'bg-green-500 text-white'
                : 'bg-[#ED1C24] text-white hover:bg-[#8B1538]'
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-5 h-5" />
                Enregistré !
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Enregistrer sous...
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border transition-all ${
              copied
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copié
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copier
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-800 mb-2">Comment utiliser ce fichier ?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Copiez le fichier sur une clé USB ou envoyez-le par email</li>
          <li>• L'équipe peut le charger sur la tablette du rayon</li>
          <li>• Le planning sera généré automatiquement</li>
        </ul>
      </div>

      {/* Actions secondaires */}
      <div className="flex gap-3 border-t border-gray-200 pt-6">
        <button
          onClick={onModifier}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Modifier la configuration
        </button>

        <button
          onClick={onNouvelleSemaine}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium bg-[#E8E1D5] text-[#8B1538] hover:bg-[#D1D3D4] transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Nouvelle semaine
        </button>
      </div>
    </div>
  );
}
