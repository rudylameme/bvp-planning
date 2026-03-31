/**
 * Custom hook for drag & drop reordering of familles and programmes
 * Extracted from PlanningJour.jsx - no logic changes
 */
import { useState, useCallback } from 'react';

export default function useDragReorder({
  sectionsOuvertes,
  ordrePersonnalise,
  setOrdrePersonnalise,
  sauvegarderPrefs,
}) {
  // État pour le drag & drop
  const [dragState, setDragState] = useState({
    type: null,      // 'famille' ou 'programme'
    famille: null,   // Pour les programmes, la famille parente
    dragIndex: null,
    hoverIndex: null
  });

  // Handlers pour le drag & drop des familles
  const handleDragStartFamille = useCallback((e, index) => {
    setDragState({ type: 'famille', famille: null, dragIndex: index, hoverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverFamille = useCallback((e, index) => {
    // Ne pas interférer avec le drag des programmes
    if (dragState.type !== 'famille') return;
    e.preventDefault();
    if (dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  }, [dragState.type, dragState.dragIndex]);

  const handleDropFamille = useCallback((e, dropIndex, famillesActuelles) => {
    e.preventDefault();
    const dragIndex = dragState.dragIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
      return;
    }

    // Réordonner les familles
    const newOrder = [...famillesActuelles];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragged);

    setOrdrePersonnalise(prev => {
      const newOrdre = { ...prev, familles: newOrder };
      sauvegarderPrefs(sectionsOuvertes, newOrdre);
      return newOrdre;
    });

    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, [dragState.dragIndex, sectionsOuvertes, sauvegarderPrefs, setOrdrePersonnalise]);

  const handleDragEndFamille = useCallback(() => {
    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, []);

  // Handlers pour le drag & drop des programmes
  const handleDragStartProgramme = useCallback((e, famille, index) => {
    setDragState({ type: 'programme', famille, dragIndex: index, hoverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverProgramme = useCallback((e, famille, index) => {
    e.preventDefault();
    if (dragState.type === 'programme' && dragState.famille === famille && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  }, [dragState.type, dragState.famille, dragState.dragIndex]);

  const handleDropProgramme = useCallback((e, dropIndex, famille, programmesActuels) => {
    e.preventDefault();
    const dragIndex = dragState.dragIndex;

    if (dragIndex === null || dragIndex === dropIndex || dragState.famille !== famille) {
      setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
      return;
    }

    // Réordonner les programmes
    const newOrder = [...programmesActuels];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragged);

    setOrdrePersonnalise(prev => {
      const newOrdre = {
        ...prev,
        programmes: {
          ...prev.programmes,
          [famille]: newOrder
        }
      };
      sauvegarderPrefs(sectionsOuvertes, newOrdre);
      return newOrdre;
    });

    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, [dragState.dragIndex, dragState.famille, sectionsOuvertes, sauvegarderPrefs, setOrdrePersonnalise]);

  const handleDragEndProgramme = useCallback(() => {
    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, []);

  // Handlers pour le drag & drop des produits (au sein d'un programme)
  const handleDragStartProduit = useCallback((e, famille, programme, index) => {
    setDragState({ type: 'produit', famille, programme, dragIndex: index, hoverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverProduit = useCallback((e, famille, programme, index) => {
    e.preventDefault();
    if (dragState.type === 'produit' && dragState.famille === famille && dragState.programme === programme && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  }, [dragState.type, dragState.famille, dragState.programme, dragState.dragIndex]);

  const handleDropProduit = useCallback((e, dropIndex, famille, programme, produitsActuels) => {
    e.preventDefault();
    const dragIndex = dragState.dragIndex;

    if (dragIndex === null || dragIndex === dropIndex || dragState.famille !== famille || dragState.programme !== programme) {
      setDragState({ type: null, famille: null, programme: null, dragIndex: null, hoverIndex: null });
      return;
    }

    // Réordonner les produits → stocker les libellés comme identifiants stables
    const newOrder = [...produitsActuels];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragged);

    // Stocker l'ordre par libellé (identifiant stable entre les semaines)
    const ordreLibelles = newOrder.map(p => p.libelle || p.libellePersonnalise || '');

    setOrdrePersonnalise(prev => {
      const newOrdre = {
        ...prev,
        produits: {
          ...(prev.produits || {}),
          [`${famille}__${programme}`]: ordreLibelles,
        },
      };
      sauvegarderPrefs(sectionsOuvertes, newOrdre);
      return newOrdre;
    });

    setDragState({ type: null, famille: null, programme: null, dragIndex: null, hoverIndex: null });
  }, [dragState.dragIndex, dragState.famille, dragState.programme, sectionsOuvertes, sauvegarderPrefs, setOrdrePersonnalise]);

  const handleDragEndProduit = useCallback(() => {
    setDragState({ type: null, famille: null, programme: null, dragIndex: null, hoverIndex: null });
  }, []);

  return {
    dragState,
    handleDragStartFamille,
    handleDragOverFamille,
    handleDropFamille,
    handleDragEndFamille,
    handleDragStartProgramme,
    handleDragOverProgramme,
    handleDropProgramme,
    handleDragEndProgramme,
    handleDragStartProduit,
    handleDragOverProduit,
    handleDropProduit,
    handleDragEndProduit,
  };
}
