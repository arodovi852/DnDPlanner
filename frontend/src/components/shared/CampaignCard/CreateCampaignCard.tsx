import type { KeyboardEvent } from 'react';

export interface CreateCampaignCardProps {
  /** Handler al hacer click / Enter / Espacio. */
  onCreate: () => void;
}

/**
 * Variante de CampaignCard usada para crear una campaña nueva.
 * Reutiliza el mismo tamaño y borde redondeado pero sustituye la
 * imagen por un icono "+" centrado.
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
      {/* Uso SVG en lugar de "+" como texto para garantizar un trazo
          grueso con borde oscuro visible independiente de la fuente. */}
      <svg
        className="campaign-card__plus-icon"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path
          d="M32 12 L32 52 M12 32 L52 32"
          stroke="var(--color-primary)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 12 L32 52 M12 32 L52 32"
          stroke="var(--color-primary-dark)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default CreateCampaignCard;
