/**
 * Test T5 — `normaliserLibelle` couvre 35+ cas connus.
 *
 * Verrou anti-régression pour la règle extraite en SB-3. Le code provient
 * tel quel de `services/nettoyageGamme.js` V5 (lignes 45-77) : les cas
 * documentent le COMPORTEMENT RÉEL, pas l'intention. Plusieurs quirks V5
 * sont volontairement figés (cf. cas marqués « quirk V5 ») — leur correction
 * éventuelle relèvera d'un changement métier explicite, pas de SB-3.
 *
 * Catégories couvertes :
 *   - Casse + étoile promo
 *   - Fractions (1/2, 1/3, 1/4)
 *   - Slash + ponctuation
 *   - Mots techniques (P&C, PAC, CRU, PRE/PREC/PRECUIT)
 *   - Méthodes cuisson (PREP, PREPOUSSE, CUI, CUIT, CUITS, PC)
 *   - DECONGELE / OFF / AOP / STICK / STI
 *   - Poids (G, KG, GR) + nombres seuls
 *   - Packs N+M (préservés)
 *   - Conditionnements X\d+ et diamètres D\d+
 *   - S.A / SA (quirk V5)
 *   - Espaces multiples + trim
 *   - Combinaisons réelles
 *   - Entrées vides / null / undefined
 */

import { describe, test, expect } from 'vitest';
import { normaliserLibelle } from '../../src/domain/rules/normaliserLibelle.js';

interface Cas {
  readonly entree: string | null | undefined;
  readonly attendu: string;
  /** Étiquette optionnelle pour les quirks V5 documentés. */
  readonly note?: string;
}

const CAS: readonly Cas[] = [
  // ── 1. Casse + étoile promo ─────────────────────────────────────────────
  { entree: 'baguette', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE TRADITION', attendu: 'BAGUETTE TRADITION' },
  { entree: '*BAGUETTE PROMO', attendu: 'BAGUETTE PROMO' },

  // ── 2. Fractions ────────────────────────────────────────────────────────
  { entree: '1/2 PAIN', attendu: 'DEMI PAIN' },
  { entree: '1/3 BAGUETTE', attendu: 'TIERS BAGUETTE' },
  { entree: '1/4 TARTE', attendu: 'QUART TARTE' },

  // ── 3. Slash + ponctuation ──────────────────────────────────────────────
  { entree: 'PAIN/COMPLET', attendu: 'PAIN COMPLET' },
  { entree: 'CHOCO.VANILLE', attendu: 'CHOCO VANILLE' },
  { entree: 'NAT.PC', attendu: 'NAT', note: 'PC retiré après punct → "NAT PC" → "NAT"' },
  { entree: 'PAIN,COMPLET', attendu: 'PAIN COMPLET' },

  // ── 4. Mots techniques ──────────────────────────────────────────────────
  { entree: 'BAGUETTE P&C', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE PAC', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE CRU', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE PRE', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE PREC', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE PRECUIT', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE PRECUITES', attendu: 'BAGUETTE' },

  // ── 5. Méthodes cuisson ─────────────────────────────────────────────────
  { entree: 'PAIN PREP', attendu: 'PAIN' },
  { entree: 'PAIN PREPOUSSE', attendu: 'PAIN' },
  { entree: 'BAGUETTE CUI', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE CUIT', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTES CUITS', attendu: 'BAGUETTES', note: 'BAGUETTES pluriel non touché' },
  { entree: 'NAT PC', attendu: 'NAT' },

  // ── 6. DECONGELE / OFF / AOP / STICK ────────────────────────────────────
  { entree: 'CROISSANT DECONGELE', attendu: 'CROISSANT' },
  { entree: 'TARTE DECONGELEE', attendu: 'TARTE' },
  { entree: 'BAGUETTE DECONGELES', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE OFF', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE AOP', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE STICK', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE STICKER', attendu: 'BAGUETTE' },
  { entree: 'BAGUETTE STI', attendu: 'BAGUETTE' },

  // ── 7. Poids + nombres seuls ────────────────────────────────────────────
  { entree: 'BAGUETTE 250G', attendu: 'BAGUETTE' },
  { entree: 'PAIN 1KG', attendu: 'PAIN' },
  { entree: 'BAGUETTE 235GR', attendu: 'BAGUETTE' },
  { entree: 'PAIN 250', attendu: 'PAIN' },
  { entree: 'PAIN 12345', attendu: 'PAIN 12345', note: 'quirk V5 — nombre ≥ 5 chiffres non retiré' },

  // ── 8. Packs N+M préservés ──────────────────────────────────────────────
  { entree: 'BAGUETTE 3+1', attendu: 'BAGUETTE 3+1' },
  { entree: 'PAIN 10+2', attendu: 'PAIN 10+2' },

  // ── 9. Conditionnements X\d+ et diamètres D\d+ ──────────────────────────
  { entree: 'BAGUETTE X1', attendu: 'BAGUETTE' },
  {
    entree: 'BAGUETTE X8',
    attendu: 'BAGUETTE',
    note: String.raw`quirk V5 — la docstring d'en-tête de nettoyageGamme.js dit "X8 GARDÉ", mais le code retire tous les X\d+. Comportement réel figé.`,
  },
  { entree: 'BAGUETTE X20', attendu: 'BAGUETTE' },
  { entree: 'GALETTE D22', attendu: 'GALETTE' },
  { entree: 'GALETTE D28', attendu: 'GALETTE' },

  // ── 10. S.A / SA (quirk V5 documenté) ───────────────────────────────────
  { entree: 'BAGUETTE SA', attendu: 'BAGUETTE' },
  {
    entree: 'BAGUETTE S.A',
    attendu: 'BAGUETTE S A',
    note: String.raw`quirk V5 — la ponctuation est retirée AVANT \bS\.?A\.?\b, "S.A" devient "S A" et la regex finale ne matche plus.`,
  },

  // ── 11. Espaces multiples + trim ────────────────────────────────────────
  { entree: '   BAGUETTE   TRADITION   ', attendu: 'BAGUETTE TRADITION' },
  { entree: 'PAIN  COMPLET', attendu: 'PAIN COMPLET' },

  // ── 12. Combinaisons réelles ────────────────────────────────────────────
  { entree: '*BAGUETTE TRADITION P&C 250G', attendu: 'BAGUETTE TRADITION' },
  { entree: '1/2 BAGUETTE COMPLETE PAC X1', attendu: 'DEMI BAGUETTE COMPLETE' },
  { entree: '*PAIN AUX CEREALES 400G', attendu: 'PAIN AUX CEREALES' },
  { entree: 'CROISSANT BEURRE PRECUIT 50G X12', attendu: 'CROISSANT BEURRE' },
  {
    entree: 'TARTE POMME 4P D22 STICKER',
    attendu: 'TARTE POMME 4P',
    note: String.raw`quirk V5 — "4P" reste tel quel : le "4" est collé à "P", \b\d{1,4}\b ne trouve pas de frontière entre eux. Seuls "D22" et "STICKER" sont retirés.`,
  },

  // ── 13. Entrées vides ───────────────────────────────────────────────────
  { entree: '', attendu: '' },
  { entree: null, attendu: '' },
  { entree: undefined, attendu: '' },
  { entree: '   ', attendu: '' },
];

describe('T5 — normaliserLibelle (SB-3, extraction iso-comportement)', () => {
  test.each(CAS)(
    'normaliserLibelle($entree) → $attendu',
    ({ entree, attendu }) => {
      expect(normaliserLibelle(entree)).toBe(attendu);
    },
  );

  test('au moins 35 cas dans la table (verrou couverture)', () => {
    expect(CAS.length).toBeGreaterThanOrEqual(35);
  });
});
