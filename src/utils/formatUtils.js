/**
 * Fonctions de formatage centralisées
 */

/** Formater un montant en euros (ex: "1 234 €") */
export const formatEuro = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Formater une date JS pour un input type="date" (YYYY-MM-DD) */
export const formatDateInput = (date) => {
  return date.toISOString().split('T')[0];
};

/** Formater une date ISO en affichage court FR (ex: "lun. 3 janv.") */
export const formatDateCourt = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};
