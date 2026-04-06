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
      <span className="campaign-card__plus-icon" aria-hidden="true">
        +
      </span>
    </div>
  );
}

export default CreateCampaignCard;
