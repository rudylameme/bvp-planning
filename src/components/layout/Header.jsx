import { RefreshCw } from 'lucide-react';
import ProfilSwitch from './ProfilSwitch';
import ModeSwitch from './ModeSwitch';

export default function Header({ magasinNom, magasinCode, semaine, annee, onChangerFichier }) {
  return (
    <header className="bg-[#8B1538] text-white px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo Mousquetaires + Nom */}
        <div className="flex items-center gap-4">
          <img
            src="/Data/GROUPEMENT_MOUSQUETAIRES_H_INV_HD.png"
            alt="Groupement Mousquetaires"
            className="h-10 w-auto"
          />
          <div className="border-l border-white/30 pl-4">
            <h1 className="text-xl font-bold">BVP Planning</h1>
            {magasinNom && (
              <p className="text-sm text-white/70">
                {magasinCode && `${magasinCode} - `}{magasinNom}
                {semaine && annee && ` • S${semaine}/${annee}`}
              </p>
            )}
          </div>
        </div>

        {/* Switches et bouton changer fichier */}
        <div className="flex items-center gap-3">
          {onChangerFichier && (
            <button
              onClick={onChangerFichier}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Changer de fichier"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Changer fichier</span>
            </button>
          )}
          <ModeSwitch />
          <ProfilSwitch />
        </div>
      </div>
    </header>
  );
}
