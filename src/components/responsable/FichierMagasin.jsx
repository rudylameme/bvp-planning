import { useState } from 'react';
import { Upload, Download, FileJson, Check, AlertCircle } from 'lucide-react';
import {
  exporterFichierMagasin,
  chargerFichierMagasin,
  validerFichierMagasin
} from '../../services/fichierMagasin';

export default function FichierMagasin({ donneesMagasin, onCharger }) {
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');

  // Export (async pour supporter showSaveFilePicker)
  const handleExport = async () => {
    try {
      setStatus(null);
      const fichier = await exporterFichierMagasin(donneesMagasin);
      setStatus('success');
      setMessage(`Fichier exporté : ${fichier.magasin.nom}`);
    } catch (error) {
      if (error.message === 'Export annulé') {
        setStatus(null);
        setMessage('');
      } else {
        setStatus('error');
        setMessage(error.message);
      }
    }
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fichier = await chargerFichierMagasin(file);
      const validation = validerFichierMagasin(fichier);

      if (!validation.valide) {
        throw new Error(validation.erreurs.join(', '));
      }

      onCharger(fichier);
      setStatus('success');
      setMessage(`Fichier chargé : ${fichier.magasin.nom} (${fichier.produits.length} produits)`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[#58595B]">
        <FileJson className="text-amber-700" />
        Fichier Magasin
      </h2>

      <p className="text-[#58595B]/70 mb-6">
        Le fichier magasin contient toute la configuration de votre point de vente.
        Il peut être copié sur clé USB, envoyé par email, ou archivé.
      </p>

      {/* Boutons - Charte Mousquetaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-3 p-6 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition-colors focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          <Download size={24} />
          <div className="text-left">
            <div className="font-semibold">Exporter</div>
            <div className="text-sm text-amber-200">Télécharger le fichier .bvp.json</div>
          </div>
        </button>

        {/* Import */}
        <label className="flex items-center justify-center gap-3 p-6 bg-[#E8E1D5] text-[#58595B] rounded-xl hover:bg-[#D1D3D4] transition-colors cursor-pointer border border-[#D1D3D4]">
          <Upload size={24} />
          <div className="text-left">
            <div className="font-semibold">Importer</div>
            <div className="text-sm text-[#58595B]/70">Charger un fichier existant</div>
          </div>
          <input
            type="file"
            accept=".json,.bvp.json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Status - Charte Mousquetaires */}
      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status === 'success'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {status === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{message}</span>
        </div>
      )}

      {/* Infos fichier actuel */}
      {donneesMagasin?.magasin?.nom && (
        <div className="mt-6 p-4 bg-[#E8E1D5] rounded-lg border border-[#D1D3D4]">
          <h3 className="font-semibold mb-2 text-[#58595B]">Configuration actuelle</h3>
          <ul className="text-sm text-[#58595B]/80 space-y-1">
            <li>Magasin : {donneesMagasin.magasin.code} - {donneesMagasin.magasin.nom}</li>
            <li>Produits : {donneesMagasin.produits?.length || 0}</li>
            <li>Générée le : {donneesMagasin.dateGeneration ? new Date(donneesMagasin.dateGeneration).toLocaleDateString('fr-FR') : '-'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
