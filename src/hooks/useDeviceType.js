import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour détecter le type d'appareil
 * Retourne : 'mobile', 'tablet', ou 'desktop'
 *
 * Breakpoints :
 * - mobile: < 768px
 * - tablet: 768px - 1024px (ou appareil tactile)
 * - desktop: > 1024px (sans tactile)
 *
 * @returns {Object} { deviceType, isTouchDevice, screenWidth, orientation }
 */
export const useDeviceType = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    deviceType: 'desktop',
    isTouchDevice: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    orientation: 'landscape'
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orientation = width > height ? 'landscape' : 'portrait';

      let deviceType = 'desktop';

      if (width < 768) {
        deviceType = 'mobile';
      } else if (width < 1024) {
        deviceType = 'tablet';
      } else if (isTouchDevice) {
        // Même sur grand écran, si tactile, traiter comme tablette
        deviceType = 'tablet';
      }

      setDeviceInfo({
        deviceType,
        isTouchDevice,
        screenWidth: width,
        orientation
      });
    };

    // Vérification initiale
    checkDevice();

    // Écouter les changements de taille/orientation
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return deviceInfo;
};

/**
 * Hook simplifié qui retourne uniquement le type d'appareil
 */
export const useDevice = () => {
  const { deviceType } = useDeviceType();
  return deviceType;
};

/**
 * Hook pour vérifier si l'appareil est tactile
 */
export const useIsTouch = () => {
  const { isTouchDevice } = useDeviceType();
  return isTouchDevice;
};
