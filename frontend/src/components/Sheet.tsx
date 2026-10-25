import { useEffect, type ReactNode } from 'react';
import './sheet.css';

/** Hoja modal: abajo en el celular, centrada en escritorio. Se cierra con Escape o tocando fuera. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
