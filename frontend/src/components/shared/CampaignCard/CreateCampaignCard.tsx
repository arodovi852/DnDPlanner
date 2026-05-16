import type { KeyboardEvent } from 'react';

export interface CreateCampaignCardProps {
  /** Handler al hacer click / Enter / Espacio. */
  onCreate: () => void;
}

/**
 * Variante de CampaignCard usada para crear una campaña nueva.
 * Reutiliza el mismo tamaño y borde redondeado pero sustituye la
 * imagen por un icono "+" decorado con anillo y degradado.
 */
export function CreateCampaignCard({ onCreate }: CreateCampaignCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCreate();
    }
  };

  return (
    <div
      className="campaign-card campaign-card--plus"
      role="button"
      tabIndex={0}
      aria-label="Crear nueva campaña"
      onClick={onCreate}
      onKeyDown={handleKeyDown}
    >
      <div className="campaign-card__plus-bg" aria-hidden="true" />
      <svg
        className="campaign-card__plus-icon"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        {/* Anillo decorativo alrededor del + */}
        <circle
          cx="32"
          cy="32"
          r="22"
          stroke="var(--color-border)"
          strokeWidth="3"
          fill="var(--color-surface)"
        />
        {/* Sombra del + (offset hacia abajo y derecha) */}
        <path
          d="M32 16 L32 48 M16 32 L48 32"
          stroke="var(--color-border)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          transform="translate(1.5, 1.5)"
          opacity="0.35"
        />
        {/* Cuerpo principal del + en color marca */}
        <path
          d="M32 16 L32 48 M16 32 L48 32"
          stroke="var(--color-primary)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        {/* Brillo interior */}
        <path
          d="M32 18 L32 46 M18 32 L46 32"
          stroke="var(--color-primary-hover)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default CreateCampaignCard;
