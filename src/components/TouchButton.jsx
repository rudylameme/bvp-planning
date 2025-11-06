import { useIsTouch } from '../hooks/useDeviceType';

/**
 * Bouton optimisé pour le tactile
 * S'adapte automatiquement selon le type d'appareil
 *
 * Props :
 * - variant : 'primary' | 'secondary' | 'danger' | 'ghost'
 * - size : 'sm' | 'md' | 'lg'
 * - fullWidth : boolean
 * - icon : React element (icône lucide-react)
 * - children : contenu du bouton
 * - onClick : fonction de callback
 * - disabled : boolean
 * - className : classes CSS additionnelles
 */
export default function TouchButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon = null,
  children,
  onClick,
  disabled = false,
  className = '',
  ...props
}) {
  const isTouch = useIsTouch();

  // Tailles adaptatives (plus grandes sur tactile)
  const sizeClasses = {
    sm: isTouch ? 'min-h-[40px] px-3 text-sm' : 'min-h-[32px] px-2 text-xs',
    md: isTouch ? 'min-h-[48px] px-4 text-base' : 'min-h-[36px] px-3 text-sm',
    lg: isTouch ? 'min-h-[56px] px-6 text-lg' : 'min-h-[44px] px-4 text-base'
  };

  // Variantes de couleurs
  const variantClasses = {
    primary: `
      bg-blue-600 text-white
      ${isTouch ? 'active:bg-blue-700' : 'hover:bg-blue-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    secondary: `
      bg-gray-200 text-gray-800
      ${isTouch ? 'active:bg-gray-300' : 'hover:bg-gray-300'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    danger: `
      bg-red-600 text-white
      ${isTouch ? 'active:bg-red-700' : 'hover:bg-red-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `,
    ghost: `
      bg-transparent border-2 border-gray-300 text-gray-700
      ${isTouch ? 'active:bg-gray-100' : 'hover:bg-gray-100'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `
  };

  // Animation tactile
  const touchAnimation = isTouch ? 'active:scale-95 transition-transform duration-100' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${touchAnimation}
        font-medium rounded-lg
        flex items-center justify-center gap-2
        shadow-sm
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
