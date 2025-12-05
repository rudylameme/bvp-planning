import { useState } from 'react';
import { ProfilProvider } from './contexts/ProfilContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';

// Composants Responsable
import ImportDonnees from './components/responsable/ImportDonnees';
import ConfigurationProduits from './components/responsable/ConfigurationProduits';
import ConfigJours, { initialiserJoursOuverture } from './components/responsable/ConfigJours';
import FichierMagasin from './components/responsable/FichierMagasin';

// Services
import {
  calculerIndicateursProduit,
  calculerPoidsJours
} from './services/potentielCalculator';
import { calculerCAHebdo, calculerCAProduit } from './services/caCalculator';
import { detecterRayon, detecterTempsPlaquage, detecterUnitesParPlaque } from './services/productClassifier';

// Placeholder pour les autres composants (à créer dans les phases suivantes)
// Charte Mousquetaires appliquée
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 text-center text-[#58595B]/70">
    <h2 className="text-xl font-semibold mb-2 text-[#58595B]">{title}</h2>
    <p>Ce module sera développé dans une prochaine phase.</p>
  </div>
);

export default function AppV2() {
  const [activeTab, setActiveTab] = useState('import');
  const [donneesMagasin, setDonneesMagasin] = useState(null);
  const [produits, setProduits] = useState([]);
  const [joursOuverture, setJoursOuverture] = useState(initialiserJoursOuverture());

  // Quand l'import est terminé, traiter les données
  const handleImportComplete = (donneesImportees) => {
    const { ventes, frequentation, nombreSemaines, caTotalRayon } = donneesImportees;

    // Calculer les poids des jours
    const poidsJours = frequentation?.parJour
      ? calculerPoidsJours(frequentation.parJour)
      : calculerPoidsJours({});

    // Transformer les produits
    const produitsTransformes = Object.entries(ventes.parProduit).map(([cle, data], index) => {
      const indicateurs = calculerIndicateursProduit(data.ventes, poidsJours, nombreSemaines);
      const { caTotal, prixMoyenUnitaire } = calculerCAProduit(data.ventes);
      const caHebdo = calculerCAHebdo(data.ventes, nombreSemaines);

      return {
        id: index + 1,
        itm8: data.itm8,
        ean: data.ean,
        libelle: data.libelle,
        libellePersonnalise: data.libelle,

        // Classification auto
        rayon: detecterRayon(data.libelle),
        programme: '',
        plu: '',
        unitesParPlaque: detecterUnitesParPlaque(data.libelle),
        tempsPlaquage: detecterTempsPlaquage(data.libelle),

        // Indicateurs calculés
        ...indicateurs,

        // CA
        prixMoyenUnitaire,
        caHebdoActuel: caHebdo,
        caHebdoObjectif: caHebdo, // Sera mis à jour avec la progression
        gainPotentiel: 0,

        // État
        actif: true // Par défaut tous actifs
      };
    });

    setProduits(produitsTransformes);
    setDonneesMagasin({
      ...donneesImportees,
      magasin: { nom: '', code: '' },
      caTotalRayonHebdo: caTotalRayon / nombreSemaines
    });

    // Passer à l'étape suivante
    setActiveTab('config');
  };

  // Quand un fichier magasin est chargé
  const handleChargerFichier = (fichier) => {
    setDonneesMagasin(fichier);
    setProduits(fichier.produits || []);
    setJoursOuverture(fichier.joursOuverture || joursOuverture);
    // Rester sur l'onglet fichier après import pour voir le résumé
    // L'utilisateur peut ensuite naviguer vers config ou planning
    setActiveTab('fichier');
  };

  // Préparer les données pour le fichier magasin
  const getDonneesPourExport = () => {
    return {
      ...donneesMagasin,
      joursOuverture,
      produits,
      pilotageCA: {
        caTotalRayonHebdo: donneesMagasin?.caTotalRayonHebdo || 0,
        caMonitoreActuel: produits.filter(p => p.actif).reduce((sum, p) => sum + (p.caHebdoActuel || 0), 0),
        objectifProgression: 0,
        afficherCAEquipes: false
      }
    };
  };

  const renderContent = () => {
    switch (activeTab) {
      // Modules Responsable
      case 'import':
        return <ImportDonnees onImportComplete={handleImportComplete} />;

      case 'config':
        return (
          <div className="space-y-6">
            <ConfigJours
              joursOuverture={joursOuverture}
              onChange={setJoursOuverture}
            />
            <ConfigurationProduits
              produits={produits}
              onUpdate={setProduits}
            />
          </div>
        );

      case 'ca':
        return <PlaceholderComponent title="Pilotage CA" />;

      case 'fichier':
        return (
          <FichierMagasin
            donneesMagasin={getDonneesPourExport()}
            onCharger={handleChargerFichier}
          />
        );

      // Modules Employé
      case 'casse':
        return <PlaceholderComponent title="Saisie Casse" />;
      case 'planning':
        return <PlaceholderComponent title="Planning du Jour" />;
      case 'plaquage':
        return <PlaceholderComponent title="Plaquage Demain" />;
      case 'commande':
        return <PlaceholderComponent title="Aide à la Commande" />;

      default:
        return <PlaceholderComponent title="Module inconnu" />;
    }
  };

  return (
    <ProfilProvider>
      <div className="min-h-screen bg-[#E8E1D5]/30">
        <Header
          magasinNom={donneesMagasin?.magasin?.nom}
          magasinCode={donneesMagasin?.magasin?.code}
        />
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main>
          {renderContent()}
        </main>
      </div>
    </ProfilProvider>
  );
}
