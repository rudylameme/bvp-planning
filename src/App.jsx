import { useState } from 'react';
import { Upload, ChevronRight, Download, FileUp, RotateCcw } from 'lucide-react';
import EtapeUpload from './components/EtapeUpload';
import EtapePersonnalisation from './components/EtapePersonnalisation';
import EtapePlanning from './components/EtapePlanning';
import { parseVentesExcel, parseFrequentationExcel } from './utils/parsers';
import { classerProduit } from './utils/classification';
import { calculerPlanning } from './services/planningCalculator';

function App() {
  // État principal
  const [etape, setEtape] = useState('upload'); // 'upload', 'personnalisation', 'planning'
  const [frequentationData, setFrequentationData] = useState(null);
  const [ventesData, setVentesData] = useState(null);
  const [produits, setProduits] = useState([]);
  const [planning, setPlanning] = useState(null);
  const [sortType, setSortType] = useState('nom'); // 'nom' ou 'volume'
  const [pdvInfo, setPdvInfo] = useState(null);
  const [ponderationType, setPonderationType] = useState('standard'); // 'standard', 'saisonnier', 'fortePromo'
  const [frequentationFile, setFrequentationFile] = useState(null);

  // Handler pour l'upload de fréquentation avec choix de pondération
  const handleFrequentationUpload = (e, newPonderationType = null) => {
    const file = e.target?.files?.[0] || frequentationFile;
    if (!file) return;

    // Sauvegarder le fichier pour un éventuel recalcul
    if (e.target?.files?.[0]) {
      setFrequentationFile(e.target.files[0]);
    }

    const typePonderation = newPonderationType || ponderationType;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseFrequentationExcel(event.target.result, typePonderation);
        if (parsed) {
          setFrequentationData(parsed);
          setPonderationType(typePonderation);
        }
      } catch (error) {
        console.error('Erreur lors du parsing:', error);
        alert('Erreur lors de la lecture du fichier. Vérifiez le format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Changer le type de pondération et recalculer
  const changerPonderation = (newType) => {
    if (frequentationFile) {
      handleFrequentationUpload(null, newType);
      // Recalculer le planning si déjà généré
      if (planning && produits.length > 0) {
        setTimeout(() => {
          const nouveauPlanning = calculerPlanning(frequentationData, produits);
          if (nouveauPlanning) {
            setPlanning(nouveauPlanning);
          }
        }, 100);
      }
    }
  };

  // Handler pour l'upload de ventes
  const handleVentesUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que la fréquentation a été uploadée
    if (!frequentationData) {
      alert('⚠️ Veuillez d\'abord importer le fichier de FRÉQUENTATION avant les ventes.');
      e.target.value = ''; // Reset le input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseVentesExcel(event.target.result);
        if (!parsed) return;

        console.log('📊 Calcul des potentiels avec la fréquentation...');

        // Créer la liste des produits avec calcul immédiat des potentiels
        const nouveauxProduits = [];
        let idCounter = 0;

        parsed.produits.forEach((ventesParJour, libelle) => {
          const famille = classerProduit(libelle);

          // Calculer le total des ventes pour le tri
          const totalVentes = Object.values(ventesParJour).reduce((sum, val) => sum + val, 0);

          // 🎯 CALCUL IMMÉDIAT DU POTENTIEL avec la fréquentation
          let venteMax = 0;
          let dateVenteMax = null;

          Object.entries(ventesParJour).forEach(([date, quantite]) => {
            if (quantite > venteMax) {
              venteMax = quantite;
              dateVenteMax = date;
            }
          });

          let potentielCalcule = 0;

          if (venteMax > 0) {
            const jourVenteMax = getJourSemaine(dateVenteMax);
            let poidsJour = 0.14;

            if (jourVenteMax && frequentationData.poidsJours[jourVenteMax]) {
              poidsJour = frequentationData.poidsJours[jourVenteMax];
            } else {
              poidsJour = Math.max(...Object.values(frequentationData.poidsJours));
            }

            potentielCalcule = Math.ceil(venteMax / poidsJour);

            console.log(`  ${libelle}: Vente max=${venteMax} (${jourVenteMax || '?'}) ÷ ${(poidsJour * 100).toFixed(1)}% → Potentiel=${potentielCalcule}`);
          }

          nouveauxProduits.push({
            id: idCounter++,
            libelle,
            libellePersonnalise: libelle,
            famille,
            ventesParJour,
            totalVentes,
            potentielHebdo: potentielCalcule, // ✅ Calculé immédiatement avec la bonne formule
            actif: true,
            custom: false
          });
        });

        setProduits(nouveauxProduits);
        setVentesData(parsed);
        if (parsed.pdvInfo) {
          setPdvInfo(parsed.pdvInfo);
        }

        console.log('✅ Potentiels calculés avec la formule précise dès l\'import !');
      } catch (error) {
        console.error('Erreur lors du parsing:', error);
        alert('Erreur lors de la lecture du fichier. Vérifiez le format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Déterminer le jour de la semaine depuis une date
  const getJourSemaine = (dateStr) => {
    // Essayer de parser la date (formats possibles: "DD/MM/YYYY", "YYYY-MM-DD", nombre Excel, etc.)
    let date;

    // Si c'est un nombre (format Excel)
    if (!isNaN(dateStr)) {
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + dateStr * 86400000);
    } else {
      // Essayer de parser comme string
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      return null; // Date invalide
    }

    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return jours[date.getDay()];
  };

  // Passer à l'étape de personnalisation
  const allerAPersonnalisation = () => {
    if (frequentationData && ventesData) {
      // Plus besoin de recalculer, c'est déjà fait lors de l'upload des ventes !
      setEtape('personnalisation');
    }
  };

  // Changer la famille d'un produit
  const changerFamille = (id, nouvelleFamille) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, famille: nouvelleFamille } : p
    ));
  };

  // Changer le libellé personnalisé
  const changerLibelle = (id, nouveauLibelle) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, libellePersonnalise: nouveauLibelle } : p
    ));
  };

  // Changer le potentiel hebdomadaire
  const changerPotentiel = (id, nouveauPotentiel) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, potentielHebdo: parseFloat(nouveauPotentiel) || 0 } : p
    ));
  };

  // Activer/désactiver un produit
  const toggleActif = (id) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, actif: !p.actif } : p
    ));
  };

  // Ajouter un produit custom
  const ajouterProduitCustom = () => {
    const nouveauId = Math.max(...produits.map(p => p.id), -1) + 1;
    const nouveauProduit = {
      id: nouveauId,
      libelle: 'Nouveau produit',
      libellePersonnalise: 'Nouveau produit',
      famille: 'AUTRE',
      ventesParJour: {},
      totalVentes: 0,
      potentielHebdo: 0,
      actif: true,
      custom: true
    };
    setProduits(prev => [...prev, nouveauProduit]);
  };

  // Supprimer un produit custom
  const supprimerProduit = (id) => {
    setProduits(prev => prev.filter(p => p.id !== id));
  };

  // Trier les produits
  const trierProduits = (type) => {
    setSortType(type);
    setProduits(prev => {
      const copie = [...prev];
      if (type === 'nom') {
        copie.sort((a, b) => a.libellePersonnalise.localeCompare(b.libellePersonnalise));
      } else if (type === 'volume') {
        copie.sort((a, b) => b.totalVentes - a.totalVentes);
      }
      return copie;
    });
  };

  // Calculer et afficher le planning
  const handleCalculerPlanning = () => {
    console.log('🔍 === DIAGNOSTIC CALCUL PLANNING ===');

    // Vérifier les produits actifs
    const produitsActifs = produits.filter(p => p.actif);
    console.log(`📦 Produits actifs : ${produitsActifs.length} / ${produits.length}`);

    // Vérifier les potentiels hebdo
    const produitsAvecPotentiel = produitsActifs.filter(p => p.potentielHebdo > 0);
    console.log(`📊 Produits avec potentiel > 0 : ${produitsAvecPotentiel.length}`);

    if (produitsActifs.length === 0) {
      alert('❌ Aucun produit actif. Veuillez activer au moins un produit.');
      return;
    }

    if (produitsAvecPotentiel.length === 0) {
      alert('⚠️ ATTENTION : Tous les potentiels hebdomadaires sont à 0.\n\nVeuillez utiliser le bouton "🤖 Auto-Potentiels" dans la page de personnalisation pour calculer les potentiels automatiquement, ou saisissez-les manuellement.');
      return;
    }

    console.log('📈 Produits avec potentiel :', produitsAvecPotentiel.map(p => `${p.libellePersonnalise}: ${p.potentielHebdo}`));

    console.log('🔄 Appel de calculerPlanning...');
    console.log('  - frequentationData:', frequentationData ? '✅ Présent' : '❌ Manquant');
    console.log('  - produits:', produits.length, 'produits');

    const nouveauPlanning = calculerPlanning(frequentationData, produits);

    console.log('📋 Résultat de calculerPlanning:', nouveauPlanning);

    if (nouveauPlanning) {
      console.log('✅ Planning calculé avec succès');
      console.log('  - Jours:', Object.keys(nouveauPlanning.jours || {}));
      console.log('  - Semaine:', nouveauPlanning.semaine);
      setPlanning(nouveauPlanning);
      setEtape('planning');
      console.log('✅ Navigation vers l\'étape planning');
    } else {
      console.error('❌ Échec du calcul du planning - calculerPlanning a retourné null/undefined');
      alert('Erreur lors du calcul du planning. Vérifiez la console (F12) pour plus de détails.');
    }
  };

  // Recommencer
  const recommencer = () => {
    setEtape('upload');
    setFrequentationData(null);
    setVentesData(null);
    setProduits([]);
    setPlanning(null);
    setSortType('nom');
    setPdvInfo(null);
    setPonderationType('standard');
    setFrequentationFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Planning BVP</h1>
              <p className="text-gray-600 mt-1">Boulangerie - Viennoiserie - Pâtisserie</p>
              {pdvInfo && (
                <p className="text-sm text-indigo-600 mt-1">
                  PDV: {pdvInfo.numero} - {pdvInfo.nom}
                </p>
              )}
            </div>
            <button
              onClick={recommencer}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <RotateCcw size={20} />
              Nouveau
            </button>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-center mt-6 gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${etape === 'upload' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <Upload size={20} />
              <span>1. Upload</span>
            </div>
            <ChevronRight className="text-gray-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${etape === 'personnalisation' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <FileUp size={20} />
              <span>2. Personnalisation</span>
            </div>
            <ChevronRight className="text-gray-400" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${etape === 'planning' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <Download size={20} />
              <span>3. Planning</span>
            </div>
          </div>
        </div>

        {/* Contenu selon l'étape */}
        {etape === 'upload' && (
          <EtapeUpload
            frequentationData={frequentationData}
            ventesData={ventesData}
            ponderationType={ponderationType}
            onFrequentationUpload={handleFrequentationUpload}
            onVentesUpload={handleVentesUpload}
            onChangerPonderation={changerPonderation}
            onSuivant={allerAPersonnalisation}
          />
        )}

        {etape === 'personnalisation' && (
          <EtapePersonnalisation
            produits={produits}
            sortType={sortType}
            onChangerFamille={changerFamille}
            onChangerLibelle={changerLibelle}
            onChangerPotentiel={changerPotentiel}
            onToggleActif={toggleActif}
            onSupprimerProduit={supprimerProduit}
            onAjouterProduitCustom={ajouterProduitCustom}
            onTrier={trierProduits}
            onRetour={() => setEtape('upload')}
            onCalculerPlanning={handleCalculerPlanning}
            setProduits={setProduits}
            frequentationData={frequentationData}
          />
        )}

        {etape === 'planning' && (
          <EtapePlanning
            planning={planning}
            pdvInfo={pdvInfo}
            onRetour={() => setEtape('personnalisation')}
            onPersonnaliser={() => setEtape('personnalisation')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
