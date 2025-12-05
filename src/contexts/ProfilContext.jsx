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
