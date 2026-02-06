import { useState, useEffect } from 'react';
import { Upload, ChevronRight, Download, FileUp, Monitor, Tablet, Calendar } from 'lucide-react';
import EtapeUpload from './components/EtapeUpload';
import EtapePersonnalisation from './components/EtapePersonnalisation';
import EtapeConfigurationSemaine from './components/EtapeConfigurationSemaine';
import EtapePlanning from './components/EtapePlanning';
import { parseVentesExcel, parseFrequentationExcel } from './utils/parsers';
import { classerProduit } from './utils/classification';
import { calculerPlanning } from './services/planningCalculator';
import { chargerReferentielITM8, rechercherParITM8, mapRayonVersFamille, isReferentielCharge, reinitialiserProgrammes } from './services/referentielITM8';
import { trouverVenteMax, calculerPotentielDepuisVenteMax, calculerStatsVentes } from './services/potentielCalculator';
import { mousquetairesColors } from './styles/mousquetaires-theme';

function App() {
  // État principal
  const [etape, setEtape] = useState('upload'); // 'upload', 'personnalisation', 'configsemaine', 'planning'
  const [frequentationData, setFrequentationData] = useState(null);
  const [ventesData, setVentesData] = useState(null);
  const [produits, setProduits] = useState([]);
  const [planning, setPlanning] = useState(null);
  const [sortType, setSortType] = useState('rayon-volume'); // 'nom', 'volume', 'rayon-volume', 'rayon-programme'
  const [pdvInfo, setPdvInfo] = useState(null);
  const [ponderationType, setPonderationType] = useState('standard'); // 'standard', 'saisonnier', 'fortePromo'
  const [frequentationFile, setFrequentationFile] = useState(null);
  const [referentielCharge, setReferentielCharge] = useState(false);
  const [forcedViewMode, setForcedViewMode] = useState(null); // null = auto, 'desktop' = forcé desktop, 'tablet' = forcé tablette

  // Configuration de la semaine (nouvelle étape)
  const [configSemaine, setConfigSemaine] = useState({
    numeroSemaine: null,
    annee: null,
    fermetureHebdo: '', // 'lundi', 'mardi', etc. ou ''
    fermeturesExceptionnelles: {}, // { jour: { active, date, reports: { jourReport: pourcentage } } }
    etatsJours: {} // { lundi: 'OUVERT', ... }
  });

  // Charger le référentiel ITM8 au démarrage
  useEffect(() => {
    const chargerReferentiel = async () => {
      console.log('🔄 Chargement du référentiel ITM8...');
      const result = await chargerReferentielITM8('/Data/liste des produits BVP treville.xlsx');
      if (result) {
        setReferentielCharge(true);
        console.log('✅ Référentiel ITM8 chargé avec succès');
      } else {
        console.warn('⚠️ Référentiel ITM8 non disponible, classification par mots-clés utilisée');
      }
    };
    chargerReferentiel();
  }, []);

  // Handler pour l'upload de fréquentation avec choix de pondération
  const handleFrequentationUpload = (e, newPonderationType = null, newSource = null) => {
    const newFile = e?.target?.files?.[0];
    const file = newFile || frequentationFile;
    if (!file) return;

    // Sauvegarder le fichier pour un éventuel recalcul
    if (newFile) {
      setFrequentationFile(newFile);
    }

    const typePonderation = newPonderationType || ponderationType;
    // Si newSource est fourni, on l'utilise, sinon on garde l'existant (ou 'BVP' par défaut)
    const source = newSource || (frequentationData?.source || 'BVP');

    const loadFile = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseFrequentationExcel(arrayBuffer, typePonderation, source);
        if (parsed) {
          setFrequentationData(parsed);
          setPonderationType(typePonderation);
        }
        return parsed;
      } catch (error) {
        console.error('Erreur lors du parsing:', error);
        alert('Erreur lors de la lecture du fichier. Vérifiez le format.');
        return null;
      }
    };
    return loadFile();
  };

  // Changer le type de pondération et recalculer
  const changerPonderation = (newType, newSource = null) => {
    if (frequentationFile) {
      const resultat = handleFrequentationUpload(null, newType, newSource);
      if (resultat?.then) {
        resultat.then((parsedFrequentation) => {
          if (parsedFrequentation && planning && produits.length > 0) {
            const nouveauPlanning = calculerPlanning(parsedFrequentation, produits, configSemaine);
            if (nouveauPlanning) {
              setPlanning(nouveauPlanning);
            }
          }
        });
      }
    }
  };

  // Note: trouverVenteMax et calculerPotentielDepuisVenteMax sont maintenant importés depuis potentielCalculator

  // Créer un produit à partir des données de ventes
  const creerProduitDepuisVentes = (libelle, ventesParJour, itm8, idCounter) => {
    let rayon = null;
    let programme = null;
    let famille = null;
    let reconnu = false;
    let unitesParVente = 1;
    let unitesParPlaque = 0;

    // Tentative de reconnaissance par ITM8
    let codePLU = '';
    if (itm8 && isReferentielCharge()) {
      const infosProduit = rechercherParITM8(itm8);
      if (infosProduit) {
        rayon = infosProduit.rayon;
        programme = infosProduit.programme;
        famille = mapRayonVersFamille(rayon);
        unitesParVente = infosProduit.unitesParVente || 1;
        unitesParPlaque = infosProduit.unitesParPlaque || 0;
        codePLU = infosProduit.codePLU || '';
        reconnu = true;
        console.log(`✅ Produit reconnu par ITM8 ${itm8}: ${libelle} → ${rayon} / ${programme} (${unitesParVente} unités/vente, ${unitesParPlaque} unités/plaque, PLU: ${codePLU})`);
      }
    }

    // Fallback: classification par mots-clés
    if (!reconnu) {
      famille = classerProduit(libelle);
      rayon = famille; // Utiliser la famille comme rayon par défaut
      console.log(`⚠️ Produit non reconnu par ITM8: ${libelle} → Classification: ${famille} (rayon auto-assigné)`);
    }

    const totalVentes = Object.values(ventesParJour).reduce((sum, val) => sum + val, 0);
    const { venteMax, dateVenteMax } = trouverVenteMax(ventesParJour);
    const potentielCalcule = calculerPotentielDepuisVenteMax(venteMax, dateVenteMax, frequentationData, libelle);

    // Calcul des statistiques multi-semaines
    const stats = calculerStatsVentes(ventesParJour);

    return {
      id: idCounter,
      libelle,
      libellePersonnalise: libelle,
      itm8,
      codePLU,
      rayon,
      programme,
      famille,
      unitesParVente,
      unitesParPlaque,
      ventesParJour,
      totalVentes,
      potentielHebdo: potentielCalcule,
      stats, // Statistiques multi-semaines
      actif: true,
      custom: false,
      reconnu
    };
  };

  // Handler pour l'upload de ventes
  const handleVentesUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que la fréquentation a été uploadée
    if (!frequentationData) {
      alert('⚠️ Veuillez d\'abord importer le fichier de FRÉQUENTATION avant les ventes.');
      e.target.value = '';
      return;
    }

    const loadFile = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = parseVentesExcel(arrayBuffer);
        if (!parsed) return;

        console.log('📊 Calcul des potentiels avec la fréquentation...');

        const nouveauxProduits = [];
        let idCounter = 0;

        for (const [libelle, produitData] of parsed.produits) {
          nouveauxProduits.push(creerProduitDepuisVentes(
            libelle,
            produitData.ventesParJour,
            produitData.itm8,
            idCounter++
          ));
        }

        // Trier les produits par défaut (rayon puis volume)
        const produitsTries = nouveauxProduits.sort((a, b) => {
          const ordreRayons = {
            'BOULANGERIE': 1,
            'VIENNOISERIE': 2,
            'PATISSERIE': 3,
            'SNACKING': 4,
            'AUTRE': 5
          };
          const rayonA = a.rayon || 'AUTRE';
          const rayonB = b.rayon || 'AUTRE';
          const ordreA = ordreRayons[rayonA] || 99;
          const ordreB = ordreRayons[rayonB] || 99;
          if (ordreA !== ordreB) return ordreA - ordreB;
          return b.totalVentes - a.totalVentes;
        });

        setProduits(produitsTries);
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
    loadFile();
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

  // Changer le rayon d'un produit
  const changerRayon = (id, nouveauRayon) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, rayon: nouveauRayon } : p
    ));
  };

  // Changer le programme de cuisson d'un produit
  const changerProgramme = (id, nouveauProgramme) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, programme: nouveauProgramme } : p
    ));
  };

  // Changer le nombre d'unités par plaque d'un produit
  const changerUnitesParPlaque = (id, nouvelleValeur) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, unitesParPlaque: Number.parseInt(nouvelleValeur) || 0 } : p
    ));
  };

  // Changer le code PLU d'un produit
  const changerCodePLU = (id, nouveauCodePLU) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, codePLU: nouveauCodePLU } : p
    ));
  };

  // Changer les unités par vente (lot de vente)
  const changerUnitesParVente = (id, nouvelleValeur) => {
    setProduits(prev => prev.map(p =>
      p.id === id ? { ...p, unitesParVente: Number.parseInt(nouvelleValeur) || 1 } : p
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
      p.id === id ? { ...p, potentielHebdo: Number.parseFloat(nouveauPotentiel) || 0 } : p
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
      rayon: null,
      programme: null,
      codePLU: '',
      unitesParPlaque: 0,
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
      } else if (type === 'rayon-volume') {
        // Tri par : rayon → volume décroissant (TRI PAR DÉFAUT)
        // Ordre des rayons : BOULANGERIE, VIENNOISERIE, PATISSERIE, SNACKING, AUTRE
        const ordreRayons = {
          'BOULANGERIE': 1,
          'VIENNOISERIE': 2,
          'PATISSERIE': 3,
          'SNACKING': 4,
          'AUTRE': 5
        };

        copie.sort((a, b) => {
          // D'abord par rayon (ordre logique)
          const rayonA = a.rayon || 'AUTRE';
          const rayonB = b.rayon || 'AUTRE';
          const ordreA = ordreRayons[rayonA] || 99;
          const ordreB = ordreRayons[rayonB] || 99;

          if (ordreA !== ordreB) return ordreA - ordreB;

          // Ensuite par volume décroissant
          return b.totalVentes - a.totalVentes;
        });
      } else if (type === 'rayon-programme') {
        // Tri par : rayon → programme → volume décroissant
        copie.sort((a, b) => {
          // D'abord par rayon
          const rayonA = a.rayon || 'ZZZ'; // Les produits sans rayon à la fin
          const rayonB = b.rayon || 'ZZZ';
          const compareRayon = rayonA.localeCompare(rayonB);
          if (compareRayon !== 0) return compareRayon;

          // Ensuite par programme
          const progA = a.programme || 'ZZZ';
          const progB = b.programme || 'ZZZ';
          const compareProg = progA.localeCompare(progB);
          if (compareProg !== 0) return compareProg;

          // Enfin par volume décroissant
          return b.totalVentes - a.totalVentes;
        });
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

    const nouveauPlanning = calculerPlanning(frequentationData, produits, configSemaine);

    console.log('📋 Résultat de calculerPlanning:', nouveauPlanning);
    console.log('  - Configuration semaine:', configSemaine);

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
    // Réinitialiser les programmes personnalisés
    reinitialiserProgrammes();
  };

  return (
    <div className="min-h-screen p-8 print:p-0 print:bg-white" style={{ backgroundColor: mousquetairesColors.secondary.beigeLight }}>
      <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg mb-6 print:hidden" style={{ borderTop: `4px solid ${mousquetairesColors.primary.red}` }}>
          {/* Bandeau supérieur avec logo */}
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${mousquetairesColors.secondary.gray}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/Data/GROUPEMENT_MOUSQUETAIRES_H_HD.png"
                  alt="Groupement des Mousquetaires"
                  className="h-12"
                />
                <div style={{ width: '2px', height: '48px', backgroundColor: mousquetairesColors.secondary.gray }}></div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: mousquetairesColors.primary.redDark }}>Planning BVP</h1>
                  <p className="text-sm" style={{ color: mousquetairesColors.text.secondary }}>Boulangerie - Viennoiserie - Pâtisserie</p>
                  {pdvInfo && (
                    <p className="text-3xl font-bold mt-1" style={{ color: mousquetairesColors.primary.redDark }}>
                      {pdvInfo.numero} - {pdvInfo.nom}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setEtape('upload')}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: etape === 'upload' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
                  color: etape === 'upload' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
                  border: etape === 'upload' ? 'none' : `1px solid ${mousquetairesColors.secondary.gray}`
                }}
              >
                <Upload size={20} />
                <span>1. Chargement</span>
              </button>
              <ChevronRight style={{ color: mousquetairesColors.secondary.gray }} />
              <button
                onClick={() => {
                  if (frequentationData && ventesData) {
                    setEtape('personnalisation');
                  }
                }}
                disabled={!frequentationData || !ventesData}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: etape === 'personnalisation' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
                  color: etape === 'personnalisation' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
                  border: etape === 'personnalisation' ? 'none' : `1px solid ${mousquetairesColors.secondary.gray}`,
                  opacity: (!frequentationData || !ventesData) ? 0.5 : 1,
                  cursor: (!frequentationData || !ventesData) ? 'not-allowed' : 'pointer'
                }}
              >
                <FileUp size={20} />
                <span>2. Personnalisation</span>
              </button>
              <ChevronRight style={{ color: mousquetairesColors.secondary.gray }} />
              <button
                onClick={() => {
                  if (frequentationData && ventesData) {
                    setEtape('configsemaine');
                  }
                }}
                disabled={!frequentationData || !ventesData}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: etape === 'configsemaine' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
                  color: etape === 'configsemaine' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
                  border: etape === 'configsemaine' ? 'none' : `1px solid ${mousquetairesColors.secondary.gray}`,
                  opacity: (!frequentationData || !ventesData) ? 0.5 : 1,
                  cursor: (!frequentationData || !ventesData) ? 'not-allowed' : 'pointer'
                }}
              >
                <Calendar size={20} />
                <span>3. Semaine</span>
              </button>
              <ChevronRight style={{ color: mousquetairesColors.secondary.gray }} />
              <div
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: etape === 'planning' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
                  color: etape === 'planning' ? mousquetairesColors.text.white : mousquetairesColors.text.secondary,
                  border: etape === 'planning' ? 'none' : `1px solid ${mousquetairesColors.secondary.gray}`,
                  opacity: !planning ? 0.5 : 1
                }}
              >
                <Download size={20} />
                <span>4. Planning</span>
              </div>
            </div>

            {/* Bouton toggle Desktop / Tablette - Visible seulement sur la page Planning */}
            {etape === 'planning' && (
              <button
                onClick={() => setForcedViewMode(forcedViewMode === 'tablet' ? 'desktop' : 'tablet')}
                className="px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: forcedViewMode === 'tablet' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.beige,
                  color: forcedViewMode === 'tablet' ? mousquetairesColors.text.white : mousquetairesColors.primary.redDark,
                  border: `2px solid ${forcedViewMode === 'tablet' ? mousquetairesColors.primary.red : mousquetairesColors.secondary.gray}`
                }}
                title={forcedViewMode === 'tablet' ? "Basculer en mode Desktop" : "Basculer en mode Tablette"}
              >
                {forcedViewMode === 'tablet' ? (
                  <>
                    <Tablet className="w-5 h-5" />
                    Tablette
                  </>
                ) : (
                  <>
                    <Monitor className="w-5 h-5" />
                    Desktop
                  </>
                )}
              </button>
            )}
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
            onChangerRayon={changerRayon}
            onChangerProgramme={changerProgramme}
            onChangerUnitesParPlaque={changerUnitesParPlaque}
            onChangerCodePLU={changerCodePLU}
            onChangerUnitesParVente={changerUnitesParVente}
            onChangerLibelle={changerLibelle}
            onChangerPotentiel={changerPotentiel}
            onToggleActif={toggleActif}
            onSupprimerProduit={supprimerProduit}
            onAjouterProduitCustom={ajouterProduitCustom}
            onTrier={trierProduits}
            onRetour={() => setEtape('upload')}
            onSuivant={() => setEtape('configsemaine')}
            setProduits={setProduits}
            frequentationData={frequentationData}
          />
        )}

        {etape === 'configsemaine' && (
          <EtapeConfigurationSemaine
            onSuivant={handleCalculerPlanning}
            onPrecedent={() => setEtape('personnalisation')}
            configSemaine={configSemaine}
            setConfigSemaine={setConfigSemaine}
          />
        )}

        {etape === 'planning' && (
          <EtapePlanning
            planning={planning}
            pdvInfo={pdvInfo}
            produits={produits}
            frequentationData={frequentationData}
            configSemaine={configSemaine}
            onRetour={() => setEtape('configsemaine')}
            onPersonnaliser={() => setEtape('personnalisation')}
            onPlanningChange={setPlanning}
            forcedViewMode={forcedViewMode}
          />
        )}
      </div>
    </div>
  );
}

export default App;
