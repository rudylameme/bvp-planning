# INSTRUCTIONS CLAUDE CODE - BVP PLANNING V2.0

## PHASE 1 : FONDATIONS

### 📋 CONTEXTE

Nous développons la version 2.0 de l'application BVP Planning.
La V1 reste en production sur Vercel, on travaille sur une V2 propre.

**Philosophie V2 :**
- Zéro compétence informatique requise
- 5 minutes maximum pour toute tâche
- Tout est pré-rempli, l'utilisateur valide

**Document de référence :** CAHIER_DES_CHARGES_V2.md (dans le projet)

---

### 🎯 OBJECTIFS PHASE 1

1. Créer la structure de dossiers V2
2. Mettre en place les 2 profils (Responsable/Employé)
3. Créer la navigation principale
4. Implémenter le Fichier Magasin (export/import .bvp.json)

---

### 📁 TÂCHE 1 : STRUCTURE DES DOSSIERS

Réorganiser/créer la structure suivante :

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx              # Header avec nom magasin + switch profil
│   │   ├── Navigation.jsx          # Navigation principale (tabs)
│   │   ├── ModeSwitch.jsx          # Toggle Tablette/Desktop
│   │   └── ProfilSwitch.jsx        # Toggle Responsable/Employé
│   │
│   ├── responsable/
│   │   ├── ImportDonnees.jsx       # Upload fréquentation + ventes
│   │   ├── SelectionProduits.jsx   # Activer/désactiver produits
│   │   ├── ConfigJours.jsx         # Jours d'ouverture
│   │   ├── PilotageCA.jsx          # Tableau de bord CA (Phase 4)
│   │   ├── FichierMagasin.jsx      # Export/Import .bvp.json
│   │   └── ConfigCommande.jsx      # Jours commande/livraison (Phase 4)
│   │
│   ├── employe/
│   │   ├── Casse.jsx               # Saisie invendus (Phase 3)
│   │   ├── PlanningJour.jsx        # Planning avec Plaqué/Cuit (Phase 3)
│   │   ├── PlaquageDemain.jsx      # Produits à plaquer (Phase 3)
│   │   └── AideCommande.jsx        # Aide commande (Phase 4)
│   │
│   └── shared/
│       ├── ProductCard.jsx         # Carte produit réutilisable
│       ├── ProductionState.jsx     # Boutons Plaqué/Cuit
│       ├── TrancheHoraire.jsx      # Section Matin/Midi/Après-midi
│       ├── EditProduct.jsx         # Modal édition produit
│       └── PrintLayout.jsx         # Layout impression
│
├── services/
│   ├── fichierMagasin.js           # NOUVEAU - Export/Import .bvp.json
│   ├── planningCalculator.js       # Récupérer de V1 + adapter
│   ├── caCalculator.js             # NOUVEAU - Calcul CA
│   ├── commandeCalculator.js       # NOUVEAU - Calcul commandes
│   ├── casseService.js             # NOUVEAU - Gestion casse
│   ├── productionState.js          # NOUVEAU - États Plaqué/Cuit
│   └── potentielCalculator.js      # Récupérer de V1 + corriger
│
├── contexts/
│   ├── ProfilContext.jsx           # NOUVEAU - Gestion profil Responsable/Employé
│   └── MagasinContext.jsx          # NOUVEAU - Données magasin globales
│
├── utils/
│   ├── parsers.js                  # Récupérer de V1
│   ├── dateUtils.js                # Récupérer de V1
│   └── storage.js                  # localStorage helpers
│
├── App.jsx
└── main.jsx
```

---

### 👥 TÂCHE 2 : SYSTÈME DE PROFILS

#### 2.1 Créer ProfilContext.jsx

```jsx
// src/contexts/ProfilContext.jsx
import { createContext, useContext, useState } from 'react';

const ProfilContext = createContext();

export const PROFILS = {
  RESPONSABLE: 'responsable',
  EMPLOYE: 'employe'
};

export function ProfilProvider({ children }) {
  const [profil, setProfil] = useState(PROFILS.EMPLOYE); // Par défaut : Employé
  
  const isResponsable = profil === PROFILS.RESPONSABLE;
  const isEmploye = profil === PROFILS.EMPLOYE;
  
  const toggleProfil = () => {
    setProfil(prev => 
      prev === PROFILS.RESPONSABLE ? PROFILS.EMPLOYE : PROFILS.RESPONSABLE
    );
  };

  return (
    <ProfilContext.Provider value={{ 
      profil, 
      setProfil, 
      toggleProfil,
      isResponsable, 
      isEmploye 
    }}>
      {children}
    </ProfilContext.Provider>
  );
}

export const useProfil = () => useContext(ProfilContext);
```

#### 2.2 Créer ProfilSwitch.jsx

```jsx
// src/components/layout/ProfilSwitch.jsx
import { useProfil, PROFILS } from '../../contexts/ProfilContext';
import { User, Settings } from 'lucide-react';

export default function ProfilSwitch() {
  const { profil, toggleProfil } = useProfil();
  
  return (
    <button
      onClick={toggleProfil}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        profil === PROFILS.RESPONSABLE 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      {profil === PROFILS.RESPONSABLE ? (
        <>
          <Settings size={20} />
          <span>Responsable</span>
        </>
      ) : (
        <>
          <User size={20} />
          <span>Équipier</span>
        </>
      )}
    </button>
  );
}
```

---

### 🧭 TÂCHE 3 : NAVIGATION PRINCIPALE

#### 3.1 Créer Navigation.jsx

La navigation change selon le profil :

**Mode Employé :**
- 🗑️ Casse
- 📋 Planning Jour
- ❄️ Plaquage Demain
- 📦 Commande

**Mode Responsable :**
- 📥 Import
- ⚙️ Configuration
- 💰 Pilotage CA
- 📤 Fichier Magasin
- (+ accès aux modules Employé)

```jsx
// src/components/layout/Navigation.jsx
import { useProfil } from '../../contexts/ProfilContext';
import { 
  Trash2, ClipboardList, Snowflake, Package,
  Download, Settings, TrendingUp, Upload
} from 'lucide-react';

const TABS_EMPLOYE = [
  { id: 'casse', label: 'Casse', icon: Trash2 },
  { id: 'planning', label: 'Planning Jour', icon: ClipboardList },
  { id: 'plaquage', label: 'Plaquage Demain', icon: Snowflake },
  { id: 'commande', label: 'Commande', icon: Package },
];

const TABS_RESPONSABLE = [
  { id: 'import', label: 'Import', icon: Download },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'ca', label: 'Pilotage CA', icon: TrendingUp },
  { id: 'fichier', label: 'Fichier Magasin', icon: Upload },
];

export default function Navigation({ activeTab, setActiveTab }) {
  const { isResponsable } = useProfil();
  
  const tabs = isResponsable 
    ? [...TABS_RESPONSABLE, ...TABS_EMPLOYE]
    : TABS_EMPLOYE;
  
  return (
    <nav className="bg-white border-b">
      <div className="flex overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

#### 3.2 Créer Header.jsx

```jsx
// src/components/layout/Header.jsx
import ProfilSwitch from './ProfilSwitch';
import ModeSwitch from './ModeSwitch';
import { Store } from 'lucide-react';

export default function Header({ magasinNom, magasinCode }) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo + Nom */}
        <div className="flex items-center gap-3">
          <Store size={28} />
          <div>
            <h1 className="text-xl font-bold">BVP Planning</h1>
            {magasinNom && (
              <p className="text-sm text-blue-200">
                {magasinCode} - {magasinNom}
              </p>
            )}
          </div>
        </div>
        
        {/* Switches */}
        <div className="flex items-center gap-3">
          <ModeSwitch />
          <ProfilSwitch />
        </div>
      </div>
    </header>
  );
}
```

#### 3.3 Créer ModeSwitch.jsx

```jsx
// src/components/layout/ModeSwitch.jsx
import { useState } from 'react';
import { Monitor, Tablet } from 'lucide-react';

export default function ModeSwitch() {
  const [mode, setMode] = useState('desktop'); // 'desktop' | 'tablette'
  
  return (
    <button
      onClick={() => setMode(prev => prev === 'desktop' ? 'tablette' : 'desktop')}
      className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
    >
      {mode === 'desktop' ? (
        <>
          <Monitor size={18} />
          <span className="text-sm">Desktop</span>
        </>
      ) : (
        <>
          <Tablet size={18} />
          <span className="text-sm">Tablette</span>
        </>
      )}
    </button>
  );
}
```

---

### 📦 TÂCHE 4 : SERVICE FICHIER MAGASIN

#### 4.1 Créer fichierMagasin.js

```javascript
// src/services/fichierMagasin.js

/**
 * Structure du Fichier Magasin V2.0
 */
const FICHIER_VERSION = '2.0';

/**
 * Génère un fichier magasin à partir des données de l'application
 */
export function genererFichierMagasin(data) {
  const fichier = {
    version: FICHIER_VERSION,
    dateGeneration: new Date().toISOString(),
    
    magasin: {
      nom: data.magasinNom || '',
      code: data.magasinCode || ''
    },
    
    joursOuverture: data.joursOuverture || {
      lundi: false,
      mardi: true,
      mercredi: true,
      jeudi: true,
      vendredi: true,
      samedi: true,
      dimanche: true
    },
    
    frequentation: {
      courbeJournaliere: data.courbeJournaliere || {},
      courbeHoraire: data.courbeHoraire || {
        matin: 0.40,
        midi: 0.35,
        apresMidi: 0.25
      }
    },
    
    commande: {
      joursCommande: data.joursCommande || [],
      joursLivraison: data.joursLivraison || [],
      stockSecurite: data.stockSecurite || 0.10
    },
    
    pilotageCA: {
      caTotalRayonHebdo: data.caTotalRayonHebdo || 0,
      caMonitoreActuel: data.caMonitoreActuel || 0,
      partRayonActuel: data.partRayonActuel || 0,
      objectifProgression: data.objectifProgression || 0,
      afficherCAEquipes: data.afficherCAEquipes || false
    },
    
    produits: data.produits || []
  };
  
  return fichier;
}

/**
 * Exporte le fichier magasin en téléchargement
 */
export function exporterFichierMagasin(data, nomFichier = null) {
  const fichier = genererFichierMagasin(data);
  
  // Générer nom de fichier
  const dateStr = new Date().toISOString().split('T')[0];
  const nom = nomFichier || `${fichier.magasin.code}_${fichier.magasin.nom}_${dateStr}`;
  const nomFichierFinal = `${nom.replace(/[^a-zA-Z0-9]/g, '_')}.bvp.json`;
  
  // Créer le blob et télécharger
  const blob = new Blob([JSON.stringify(fichier, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = nomFichierFinal;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return fichier;
}

/**
 * Charge un fichier magasin depuis un fichier uploadé
 */
export async function chargerFichierMagasin(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const contenu = JSON.parse(e.target.result);
        
        // Validation basique
        if (!contenu.version) {
          throw new Error('Fichier invalide : version manquante');
        }
        
        if (!contenu.version.startsWith('2.')) {
          throw new Error(`Version non supportée : ${contenu.version}. Attendu : 2.x`);
        }
        
        resolve(contenu);
      } catch (error) {
        reject(new Error(`Erreur de lecture : ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}

/**
 * Valide un fichier magasin chargé
 */
export function validerFichierMagasin(fichier) {
  const erreurs = [];
  
  if (!fichier.magasin?.nom) {
    erreurs.push('Nom du magasin manquant');
  }
  
  if (!fichier.produits || fichier.produits.length === 0) {
    erreurs.push('Aucun produit dans le fichier');
  }
  
  if (!fichier.frequentation?.courbeJournaliere) {
    erreurs.push('Courbe de fréquentation manquante');
  }
  
  return {
    valide: erreurs.length === 0,
    erreurs
  };
}

/**
 * Fusionne un fichier magasin avec les données locales
 * (utile pour récupérer les états de production, casse, etc.)
 */
export function fusionnerAvecDonneesLocales(fichierMagasin, donneesLocales) {
  return {
    ...fichierMagasin,
    // Conserver les états de production locaux
    productionState: donneesLocales.productionState || {},
    // Conserver l'historique de casse local
    historiqueCasse: donneesLocales.historiqueCasse || [],
    // Conserver les commandes en cours
    commandesEnCours: donneesLocales.commandesEnCours || []
  };
}
```

#### 4.2 Créer FichierMagasin.jsx (Composant UI)

```jsx
// src/components/responsable/FichierMagasin.jsx
import { useState } from 'react';
import { Upload, Download, FileJson, Check, AlertCircle } from 'lucide-react';
import { 
  exporterFichierMagasin, 
  chargerFichierMagasin, 
  validerFichierMagasin 
} from '../../services/fichierMagasin';

export default function FichierMagasin({ donneesMagasin, onCharger }) {
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');
  
  // Export
  const handleExport = () => {
    try {
      const fichier = exporterFichierMagasin(donneesMagasin);
      setStatus('success');
      setMessage(`Fichier exporté : ${fichier.magasin.nom}`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };
  
  // Import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const fichier = await chargerFichierMagasin(file);
      const validation = validerFichierMagasin(fichier);
      
      if (!validation.valide) {
        throw new Error(validation.erreurs.join(', '));
      }
      
      onCharger(fichier);
      setStatus('success');
      setMessage(`Fichier chargé : ${fichier.magasin.nom} (${fichier.produits.length} produits)`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
    
    // Reset input
    e.target.value = '';
  };
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileJson className="text-blue-600" />
        Fichier Magasin
      </h2>
      
      <p className="text-gray-600 mb-6">
        Le fichier magasin contient toute la configuration de votre point de vente.
        Il peut être copié sur clé USB, envoyé par email, ou archivé.
      </p>
      
      {/* Boutons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-3 p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Download size={24} />
          <div className="text-left">
            <div className="font-semibold">Exporter</div>
            <div className="text-sm text-blue-200">Télécharger le fichier .bvp.json</div>
          </div>
        </button>
        
        {/* Import */}
        <label className="flex items-center justify-center gap-3 p-6 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
          <Upload size={24} />
          <div className="text-left">
            <div className="font-semibold">Importer</div>
            <div className="text-sm text-gray-500">Charger un fichier existant</div>
          </div>
          <input
            type="file"
            accept=".json,.bvp.json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
      
      {/* Status */}
      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{message}</span>
        </div>
      )}
      
      {/* Infos fichier actuel */}
      {donneesMagasin?.magasin?.nom && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Configuration actuelle</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>📍 Magasin : {donneesMagasin.magasin.code} - {donneesMagasin.magasin.nom}</li>
            <li>📦 Produits : {donneesMagasin.produits?.length || 0}</li>
            <li>📅 Générée le : {donneesMagasin.dateGeneration ? new Date(donneesMagasin.dateGeneration).toLocaleDateString('fr-FR') : '-'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

### 🏗️ TÂCHE 5 : ASSEMBLER APP.JSX

```jsx
// src/App.jsx
import { useState } from 'react';
import { ProfilProvider } from './contexts/ProfilContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';

// Composants Responsable
import FichierMagasin from './components/responsable/FichierMagasin';

// Placeholder pour les autres composants (à créer dans les phases suivantes)
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 text-center text-gray-500">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p>Ce module sera développé dans une prochaine phase.</p>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('planning');
  const [donneesMagasin, setDonneesMagasin] = useState(null);
  
  const handleChargerFichier = (fichier) => {
    setDonneesMagasin(fichier);
    setActiveTab('planning'); // Aller au planning après chargement
  };
  
  const renderContent = () => {
    switch (activeTab) {
      // Modules Responsable
      case 'import':
        return <PlaceholderComponent title="Import Données" />;
      case 'config':
        return <PlaceholderComponent title="Configuration" />;
      case 'ca':
        return <PlaceholderComponent title="Pilotage CA" />;
      case 'fichier':
        return (
          <FichierMagasin 
            donneesMagasin={donneesMagasin} 
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
      <div className="min-h-screen bg-gray-100">
        <Header 
          magasinNom={donneesMagasin?.magasin?.nom}
          magasinCode={donneesMagasin?.magasin?.code}
        />
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="p-4">
          {renderContent()}
        </main>
      </div>
    </ProfilProvider>
  );
}
```

---

### ✅ CHECKLIST PHASE 1

À la fin de cette phase, vérifier que :

- [ ] Structure des dossiers créée
- [ ] ProfilContext fonctionne (toggle Responsable/Employé)
- [ ] Header affiche le nom du magasin
- [ ] Navigation change selon le profil
- [ ] ModeSwitch toggle Desktop/Tablette
- [ ] Export Fichier Magasin génère un .bvp.json
- [ ] Import Fichier Magasin charge et valide le fichier
- [ ] App.jsx assemble tout correctement

---

### 🚀 COMMANDES POUR DÉMARRER

```bash
# Si nouveau projet
npm create vite@latest bvp-planning-v2 -- --template react
cd bvp-planning-v2
npm install
npm install lucide-react

# Si projet existant, créer une branche
git checkout -b v2-development
```

---

### 📝 NOTES IMPORTANTES

1. **Ne pas casser la V1** - Travailler sur une branche séparée ou un nouveau dossier
2. **Récupérer le code utile de V1** - parsers.js, dateUtils.js, etc.
3. **Tailwind CSS** - S'assurer qu'il est configuré
4. **Tester au fur et à mesure** - Vérifier chaque composant avant de passer au suivant

---

**Phase suivante (Phase 2) :** Import données + Calculs corrigés
