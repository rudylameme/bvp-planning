import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Accordéon pour afficher/masquer les rayons
 * Optimisé pour tablette et mobile
 *
 * Props :
 * - title : titre de l'accordéon (ex: "BOULANGERIE")
 * - subtitle : sous-titre optionnel (ex: "12 produits, 45 Pl.")
 * - children : contenu de l'accordéon
 * - defaultOpen : état initial (ouvert/fermé)
 * - badge : badge optionnel (nombre, statut, etc.)
 * - color : couleur du header (blue, green, orange, red)
 */
export default function AccordeonRayon({
  title,
  subtitle = null,
  children,
  defaultOpen = false,
  badge = null,
  color = 'blue'
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    orange: 'bg-orange-600 text-white',
    red: 'bg-red-600 text-white',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-gray-600 text-white'
  };

  return (
    <div className="mb-3 rounded-lg shadow-md overflow-hidden border border-gray-200">
      {/* Header cliquable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${colorClasses[color]}
          active:opacity-90 transition-opacity
          min-h-[56px]
        `}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Icône chevron */}
          {isOpen ? (
            <ChevronDown className="w-6 h-6 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-6 h-6 flex-shrink-0" />
          )}

          {/* Titre et sous-titre */}
          <div className="flex-1 text-left">
            <div className="font-bold text-lg">{title}</div>
            {subtitle && (
              <div className="text-sm opacity-90 mt-0.5">{subtitle}</div>
            )}
          </div>

          {/* Badge optionnel */}
          {badge && (
            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-semibold">
              {badge}
            </div>
          )}
        </div>
      </button>

      {/* Contenu dépliable */}
      <div
        className={`
          bg-white transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
