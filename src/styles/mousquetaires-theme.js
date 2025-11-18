/**
 * Charte graphique Groupement des Mousquetaires
 * Extraite du document officiel de présentation
 */

export const mousquetairesColors = {
  // Couleurs principales
  primary: {
    red: '#ED1C24',        // Rouge principal Mousquetaires
    redDark: '#8B1538',    // Rouge bordeaux pour accents
    redLight: '#FF4D4D',   // Rouge clair pour survol
  },

  // Couleurs secondaires
  secondary: {
    beige: '#E8E1D5',      // Beige/crème pour fonds
    beigeLight: '#F5F2ED', // Beige très clair
    gray: '#D1D3D4',       // Gris pour zones secondaires
    grayDark: '#58595B',   // Gris foncé pour textes secondaires
  },

  // Couleurs de texte
  text: {
    primary: '#000000',    // Noir pour textes principaux
    secondary: '#58595B',  // Gris foncé pour textes secondaires
    white: '#FFFFFF',      // Blanc pour textes sur fonds sombres
    light: '#A8A9AD',      // Gris clair pour textes légers
  },

  // Couleurs fonctionnelles (adaptées à la charte)
  functional: {
    success: '#28A745',    // Vert pour succès
    warning: '#FFC107',    // Jaune pour avertissements
    error: '#ED1C24',      // Rouge Mousquetaires pour erreurs
    info: '#8B1538',       // Rouge bordeaux pour infos
  },

  // Couleurs pour les rayons (adaptées à la charte)
  rayons: {
    boulangerie: '#FF8C42', // Orange (adapté)
    viennoiserie: '#4A90E2', // Bleu (adapté)
    patisserie: '#9B59B6',   // Violet (adapté)
    snacking: '#27AE60',     // Vert (adapté)
    autre: '#95A5A6',        // Gris (adapté)
  }
};

// Classe CSS utilitaires pour Tailwind (à ajouter dans tailwind.config.js)
export const mousquetairesTailwindConfig = {
  theme: {
    extend: {
      colors: {
        'mousq-red': '#ED1C24',
        'mousq-red-dark': '#8B1538',
        'mousq-red-light': '#FF4D4D',
        'mousq-beige': '#E8E1D5',
        'mousq-beige-light': '#F5F2ED',
        'mousq-gray': '#D1D3D4',
        'mousq-gray-dark': '#58595B',
      },
      fontFamily: {
        'mousq': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
};

// Styles CSS-in-JS prêts à l'emploi
export const mousquetairesStyles = {
  // Bouton principal
  buttonPrimary: {
    backgroundColor: mousquetairesColors.primary.red,
    color: mousquetairesColors.text.white,
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: mousquetairesColors.primary.redDark,
    },
  },

  // Bouton secondaire
  buttonSecondary: {
    backgroundColor: mousquetairesColors.secondary.beige,
    color: mousquetairesColors.primary.redDark,
    border: `2px solid ${mousquetairesColors.primary.red}`,
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: mousquetairesColors.primary.red,
      color: mousquetairesColors.text.white,
    },
  },

  // Séparateur horizontal (comme dans la charte)
  separator: {
    width: '100%',
    height: '1px',
    backgroundColor: mousquetairesColors.secondary.gray,
    margin: '1rem 0',
  },

  // Conteneur avec fond beige
  containerBeige: {
    backgroundColor: mousquetairesColors.secondary.beige,
    padding: '1.5rem',
    borderRadius: '0.5rem',
  },
};

export default mousquetairesColors;
