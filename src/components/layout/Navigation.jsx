import { useProfil } from '../../contexts/ProfilContext';
import {
  Trash2, ClipboardList, Snowflake, Package,
  Download, Settings, TrendingUp, Upload
} from 'lucide-react';

const TABS_EMPLOYE = [
  { id: 'casse', label: 'Casse', icon: Trash2 },
  { id: 'planning', label: 'Planning Jour', icon: ClipboardList },
  { id: 'plaquage', label: 'Plaquage Demain', icon: Snowflake },
  { id: 'commande', label: 'Commande', icon: Package },
];

const TABS_RESPONSABLE = [
  { id: 'import', label: 'Import', icon: Download },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'ca', label: 'Pilotage CA', icon: TrendingUp },
  { id: 'fichier', label: 'Fichier Magasin', icon: Upload },
];

export default function Navigation({ activeTab, setActiveTab }) {
  const { isResponsable } = useProfil();

  const tabs = isResponsable
    ? [...TABS_RESPONSABLE, ...TABS_EMPLOYE]
    : TABS_EMPLOYE;

  return (
    <nav className="bg-[#E8E1D5] border-b border-[#D1D3D4]">
      <div className="flex overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#ED1C24] text-[#ED1C24] bg-white'
                : 'border-transparent text-[#58595B] hover:text-[#8B1538] hover:bg-white/50'
            }`}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
