import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Team } from '../api/types';
import { Icon } from './Icon';
import { Sheet } from "./Sheet";
import "./team-editor.css";
import { crestPreviewUrl, isLight, teamLogoUrl } from './TeamBadge';

const STYLES = ['Clásico', 'Rayas', 'Redondo', 'Mitades', 'Insignia', 'Banda'];
const SWATCHES = ['#1F5BFF', '#18C46A', '#FF3B30', '#FF9F0A', '#F5C542', '#AF52DE', '#0A84FF', '#1D1D1F', '#8E1B2E', '#0B6E4F', '#FFFFFF'];

/** Personaliza un equipo: nombre, abreviatura, colores y escudo (foto del club o escudo generado). */
export function TeamEditor({ org, team, onClose, onSaved }: { org: string; team: Team; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(team.name);
  const [shortName, setShortName] = useState(team.shortName);
  const [color, setColor] = useState(team.color.toUpperCase());
  const [color2, setColor2] = useState((team.color2 ?? (isLight(team.color) ? '#1D1D1F' : '#FFFFFF')).toUpperCase());
  const [style, setStyle] = useState(team.crestStyle ?? 0);
  // undefined: deja la foto como está · '': sin foto · data URL: foto nueva
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<'photo' | 'crest'>(team.hasPhoto ? 'photo' : 'crest');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const label = (shortName || name).trim().slice(0, 3).toUpperCase();
  const hasPhoto = photo !== undefined ? photo !== '' : team.hasPhoto;
  const preview = mode === 'photo' && hasPhoto
    ? (photo || teamLogoUrl(team))
    : crestPreviewUrl(style, color, color2, label);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (!f.type.startsWith('image/')) return setError('Elige una imagen (PNG, JPG o WebP).');
    if (f.size > 8 * 1024 * 1024) return setError('La imagen pesa más de 8 MB.');
    try {
      setPhoto(await shrink(f));
      setMode('photo');
    } catch {
      setError('No se pudo leer la imagen. Prueba con otra.');
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('El equipo necesita un nombre.');
    setBusy(true);
    setError(null);
    try {
      await api.updateTeam(org, team.id, {
        name: name.trim(), shortName: shortName.trim(), color, color2, crestStyle: style,
        // Al elegir el escudo generado se quita la foto
        logo: mode === 'crest' ? (team.hasPhoto || photo ? '' : undefined) : photo,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Personalizar equipo" onClose={onClose}>
      <form className="team-editor" onSubmit={save}>
        <div className="te-preview">
          <img src={preview} alt="Escudo" width={112} height={112} />
          <div>
            <b>{name || 'Equipo'}</b>
            <span className="muted">Así se verá en el calendario, las tablas y la página pública.</span>
          </div>
        </div>

        <div className="te-row">
          <label className="field" style={{ flex: '1 1 220px' }}><span>Nombre</span>
            <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field" style={{ width: 110 }}><span>Abreviatura</span>
            <input className="input" value={shortName} maxLength={4} onChange={(e) => setShortName(e.target.value.toUpperCase())} /></label>
        </div>

        <div className="te-row">
          <ColorField label="Color principal" value={color} onChange={setColor} />
          <ColorField label="Color secundario" value={color2} onChange={setColor2} />
        </div>

        <div className="field"><span>Escudo</span>
          <div className="segmented" role="tablist" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
            <button type="button" role="tab" aria-selected={mode === 'crest'} className={mode === 'crest' ? 'active' : ''} onClick={() => setMode('crest')}>Escudo con sus colores</button>
            <button type="button" role="tab" aria-selected={mode === 'photo'} className={mode === 'photo' ? 'active' : ''} onClick={() => setMode('photo')}>Foto del escudo</button>
          </div>
        </div>

        {mode === 'crest' ? (
          <div className="te-styles">
            {STYLES.map((s, i) => (
              <button key={s} type="button" className={`te-style ${style === i ? 'active' : ''}`} aria-pressed={style === i} onClick={() => setStyle(i)}>
                <img src={crestPreviewUrl(i, color, color2, label)} alt="" width={56} height={56} loading="lazy" />
                <small>{s}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="te-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
            <Icon name="shield" size={22} />
            <p><b>Sube el escudo del club</b><br /><span className="muted">PNG, JPG o WebP. Mejor cuadrado y con fondo transparente.</span></p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => file.current?.click()}>{hasPhoto ? 'Cambiar imagen' : 'Elegir imagen'}</button>
              {hasPhoto && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPhoto(''); setMode('crest'); }}>Quitar foto</button>}
            </div>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="te-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Sheet>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ flex: '1 1 240px' }}><span>{label}</span>
      <div className="te-swatches">
        {SWATCHES.map((c) => (
          <button key={c} type="button" className={`te-swatch ${value === c ? 'active' : ''}`} style={{ background: c }} aria-label={c} aria-pressed={value === c} onClick={() => onChange(c)} />
        ))}
        <label className="te-swatch te-custom" title="Otro color">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label}: otro color`} />
        </label>
      </div>
    </div>
  );
}

/** Reduce la imagen a 256 px (WebP) para que cargue rápido en todos lados. */
async function shrink(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const max = 256;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL('image/webp', 0.9);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
