import type { KeyboardEvent } from 'react';

/**
 * Props del componente CampaignCard.
 *
 * Cada tarjeta representa una campaña de rol. Al hacer hover (o focus
 * mediante teclado) la imagen base se sustituye por la imagen "hover"
 * y la tarjeta se agranda ligeramente.
 */
export interface CampaignCardProps {
  /** Imagen en estado normal. */
  image: string;
  /** Imagen que se muestra al hacer hover/focus. */
  hoverImage: string;
  /** Nombre de la campaña. Se usa como texto alternativo accesible. */
  name: string;
  /** Handler opcional al hacer click o pulsar Enter/Espacio. */
  onSelect?: () => void;
}

/**
 * Tarjeta de campaña reutilizable.
 *
 * Accesibilidad (WCAG 2.1 AA):
 *   - `role="button"` y `tabIndex={0}` para que sea navegable por teclado.
 *   - Activable con Enter y Espacio.
 *   - La imagen "hover" se marca como decorativa (`alt=""`) para evitar
 *     que los lectores de pantalla anuncien el mismo nombre dos veces.
 */
export function CampaignCard({
  image,
  hoverImage,
  name,
  onSelect,
}: CampaignCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      className="campaign-card"
      role="button"
      tabIndex={0}
      aria-label={name}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="campaign-card__image-wrapper">
        <img
          className="campaign-card__image campaign-card__image--base"
          src={image}
          alt={name}
          loading="lazy"
        />
        <img
          className="campaign-card__image campaign-card__image--hover"
          src={hoverImage}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default CampaignCard;
