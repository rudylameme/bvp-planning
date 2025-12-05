import { useProfil, PROFILS } from '../../contexts/ProfilContext';
import { User, Settings } from 'lucide-react';

export default function ProfilSwitch() {
  const { profil, toggleProfil } = useProfil();

  return (
    <button
      onClick={toggleProfil}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        profil === PROFILS.RESPONSABLE
          ? 'bg-amber-700 text-white hover:bg-amber-800'
          : 'bg-white/20 text-white hover:bg-white/30'
      }`}
    >
      {profil === PROFILS.RESPONSABLE ? (
        <>
          <Settings size={20} />
          <span>Responsable</span>
        </>
      ) : (
        <>
          <User size={20} />
          <span>Équipier</span>
        </>
      )}
    </button>
  );
}
