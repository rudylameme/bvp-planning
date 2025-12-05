import ProfilSwitch from './ProfilSwitch';
import ModeSwitch from './ModeSwitch';

export default function Header({ magasinNom, magasinCode }) {
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
                {magasinCode} - {magasinNom}
              </p>
            )}
          </div>
        </div>

        {/* Switches */}
        <div className="flex items-center gap-3">
          <ModeSwitch />
          <ProfilSwitch />
        </div>
      </div>
    </header>
  );
}
