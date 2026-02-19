/**
 * useFileAccess — Hook cross-browser pour l'accès aux fichiers et dossiers
 *
 * Chrome/Edge : utilise l'API File System Access (showDirectoryPicker, showOpenFilePicker)
 * Firefox/Safari : fallback vers <input type="file" webkitdirectory> avec des wrappers
 * qui émulent l'interface DirectoryHandle/FileHandle.
 */

// ── Détection de support ──
const isNativeSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

// ── Wrappers pour le fallback Firefox ──

class VirtualFileHandle {
  constructor(file) {
    this.file = file;
    this.name = file.name;
    this.kind = 'file';
  }
  async getFile() {
    return this.file;
  }
}

class VirtualDirectoryHandle {
  constructor(files, name) {
    this._files = Array.from(files);
    this.name = name || 'selected-folder';
    this.kind = 'directory';
  }

  async *values() {
    for (const file of this._files) {
      yield new VirtualFileHandle(file);
    }
  }

  async getFileHandle(name) {
    const file = this._files.find(
      (f) => f.name === name || f.webkitRelativePath?.endsWith('/' + name)
    );
    if (!file) {
      throw new DOMException(`File "${name}" not found`, 'NotFoundError');
    }
    return new VirtualFileHandle(file);
  }
}

// ── Utilitaire : créer un <input> caché et attendre la sélection ──

function createHiddenInput(attrs) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    Object.entries(attrs).forEach(([key, value]) => {
      if (value === true) input.setAttribute(key, '');
      else if (value) input.setAttribute(key, value);
    });

    const cleanup = () => {
      if (input.parentNode) document.body.removeChild(input);
    };

    input.addEventListener('change', () => {
      cleanup();
      if (input.files && input.files.length > 0) {
        resolve(input.files);
      } else {
        reject(new DOMException('No files selected', 'AbortError'));
      }
    });

    // Détection annulation : focus revient sans changement
    const onFocus = () => {
      setTimeout(() => {
        window.removeEventListener('focus', onFocus);
        if (!input.files || input.files.length === 0) {
          cleanup();
          reject(new DOMException('User cancelled', 'AbortError'));
        }
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

// ── Hook principal ──

export function useFileAccess() {
  return {
    isNativeSupported,

    /**
     * Sélectionner un dossier.
     * Options : { id, mode, startIn } (passées à showDirectoryPicker si natif)
     * Retourne un DirectoryHandle (natif) ou VirtualDirectoryHandle (fallback).
     */
    selectDirectory: async (options = {}) => {
      if (isNativeSupported) {
        return window.showDirectoryPicker(options);
      }
      // Fallback : <input webkitdirectory>
      const files = await createHiddenInput({ webkitdirectory: true, multiple: true });
      const firstPath = files[0]?.webkitRelativePath || '';
      const folderName = firstPath.split('/')[0] || 'selected-folder';
      return new VirtualDirectoryHandle(files, folderName);
    },

    /**
     * Sélectionner un fichier.
     * Options : { accept } ou { types: [{ accept: { ... } }] }
     * Retourne un FileHandle (natif) ou VirtualFileHandle (fallback).
     */
    selectFile: async (options = {}) => {
      if (isNativeSupported && window.showOpenFilePicker) {
        const [handle] = await window.showOpenFilePicker(options);
        return handle;
      }
      // Extraire le filtre accept
      let accept = options.accept || '';
      if (!accept && options.types?.[0]?.accept) {
        accept = Object.values(options.types[0].accept).flat().join(',');
      }
      const files = await createHiddenInput({ accept });
      if (files.length === 0) {
        throw new DOMException('No file selected', 'AbortError');
      }
      return new VirtualFileHandle(files[0]);
    },

    /**
     * Écrire un fichier dans un dossier.
     * - Natif (Chrome) : createWritable sur le handle
     * - Fallback (Firefox) : Blob + <a download>
     * Retourne { method: 'native' | 'download' }
     */
    writeFile: async (dirHandle, fileName, content, contentType = 'application/json') => {
      // Tentative native
      if (dirHandle?.getFileHandle && typeof dirHandle.getFileHandle === 'function') {
        try {
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          if (fileHandle.createWritable) {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return { method: 'native' };
          }
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          // Fall through to download
        }
      }
      // Fallback : Blob + download
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { method: 'download' };
    },
  };
}

/**
 * Vérifier/demander la permission sur un handle.
 * Les handles virtuels (Firefox) retournent toujours true.
 */
export async function checkHandlePermission(handle, mode = 'read') {
  if (!handle) return false;
  // Les handles virtuels n'ont pas queryPermission → toujours OK
  if (typeof handle.queryPermission !== 'function') return true;
  try {
    let perm = await handle.queryPermission({ mode });
    if (perm === 'granted') return true;
    perm = await handle.requestPermission({ mode });
    return perm === 'granted';
  } catch {
    return false;
  }
}
