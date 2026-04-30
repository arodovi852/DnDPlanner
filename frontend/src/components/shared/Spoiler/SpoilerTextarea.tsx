import { useRef, type ChangeEvent } from 'react';

/**
 * Textarea con un botón "Marcar como spoiler" que envuelve la selección
 * actual entre `||...||`. Si no hay selección, inserta `||texto||` en la
 * posición del cursor y selecciona el placeholder "texto".
 *
 * Consumido por el DM en los campos de texto de la campaña (descripción
 * del personaje, título de capítulo, anotaciones, etc.) para ocultar
 * información a los jugadores hasta que la revele manualmente.
 */
export interface SpoilerTextareaProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  ariaLabel?: string;
  /** Si es `true`, oculta el botón "Marcar como spoiler" (útil para
   *  jugadores, que no deben poder crear spoilers pero sí escribir). */
  readOnlyMarker?: boolean;
  markLabel?: string;
}

export function SpoilerTextarea({
  value,
  onChange,
  placeholder,
  rows = 6,
  className,
  ariaLabel,
  readOnlyMarker = false,
  markLabel = 'Mark as spoiler',
}: SpoilerTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const wrapSelection = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const mid = value.slice(start, end);
    const after = value.slice(end);

    let next: string;
    let caretStart: number;
    let caretEnd: number;

    if (mid.length > 0) {
      next = `${before}||${mid}||${after}`;
      caretStart = start + 2;
      caretEnd = end + 2;
    } else {
      const placeholderText = 'secret';
      next = `${before}||${placeholderText}||${after}`;
      caretStart = start + 2;
      caretEnd = caretStart + placeholderText.length;
    }

    onChange(next);
    // Devolver el foco tras el render con la nueva selección.
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.setSelectionRange(caretStart, caretEnd);
    });
  };

  return (
    <div className="spoiler-textarea">
      <textarea
        ref={ref}
        className={className ?? 'spoiler-textarea__input'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
      />
      {!readOnlyMarker && (
        <div className="spoiler-textarea__toolbar">
          <button
            type="button"
            className="spoiler-textarea__mark"
            onClick={wrapSelection}
          >
            {markLabel}
          </button>
          <span className="spoiler-textarea__hint">
            <code>||secreto||</code>
          </span>
        </div>
      )}
    </div>
  );
}

export default SpoilerTextarea;
