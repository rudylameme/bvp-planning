// Fonctions utilitaires pour les dates (periode promo Mousquetaires : mercredi -> mardi)
export const getProchainMercredi = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + daysUntilWednesday);
  return nextWednesday.toISOString().split('T')[0];
};

export const getMardiSuivant = (mercrediDate) => {
  const mercredi = new Date(mercrediDate);
  const mardi = new Date(mercredi);
  mardi.setDate(mercredi.getDate() + 6);
  return mardi.toISOString().split('T')[0];
};

export const formatDateFR = (dateISO) => {
  if (!dateISO) return '';
  const date = new Date(dateISO);
  const options = { weekday: 'short', day: 'numeric', month: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

// Format compact pour le tableau : JJ/MM->JJ/MM
export const formatPeriodeCompacte = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return '-';
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const debutStr = `${debut.getDate().toString().padStart(2, '0')}/${(debut.getMonth() + 1).toString().padStart(2, '0')}`;
  const finStr = `${fin.getDate().toString().padStart(2, '0')}/${(fin.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${debutStr}->${finStr}`;
};

// Calculer le nombre de jours d'une periode promo (inclusif)
export const calculerNbJoursPromo = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return 7; // Par defaut 7 jours
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const diffTime = fin.getTime() - debut.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 car inclusif
  return Math.max(1, diffDays); // Minimum 1 jour
};

// Couleur selon l'avantage client (seuils : >20% vert, 10-20% orange, <10% rouge)
export const getAvantageColor = (avantage) => {
  if (avantage >= 20) return 'text-emerald-600';
  if (avantage >= 10) return 'text-amber-600';
  return 'text-red-600';
};

// Badge colore pour l'avantage client dans le tableau
export const getAvantageBadge = (avantage) => {
  if (avantage >= 20) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  if (avantage >= 10) return 'bg-amber-100 text-amber-700 border-amber-300';
  return 'bg-red-100 text-red-700 border-red-300';
};
