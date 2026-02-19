/**
 * SectionRepliable.jsx
 *
 * Composant réutilisable pour créer des sections repliables
 * avec un bouton "Voir le détail" / "Réduire".
 *
 * Pattern identique au "Voir tout" du tableau Je me compare.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SectionRepliable = ({
  children,
  labelExpand = 'Voir le détail',
  labelCollapse = 'Réduire',
  defaultOpen = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      {isOpen && (
        <div className="mt-4 animate-in fade-in duration-200">
          {children}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 mx-auto mt-3 px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-[#8B1538] transition-colors rounded-full hover:bg-gray-50"
      >
        {isOpen ? (
          <>
            <ChevronUp className="w-4 h-4" />
            {labelCollapse}
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            {labelExpand}
          </>
        )}
      </button>
    </div>
  );
};

export default SectionRepliable;
