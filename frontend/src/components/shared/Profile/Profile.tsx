import type { KeyboardEvent } from 'react';

/**
 * Props del componente Profile.
 *
 * Representa el avatar de un usuario. Si no se proporciona imagen se
 * muestra un icono por defecto (silueta). Al hacer hover/focus se
 * agranda ligeramente.
 */
export interface ProfileProps {
  /** Nombre del usuario (usado como etiqueta accesible). */
  name: string;
  /** URL de la foto de perfil. Opcional. */
  image?: string;
  /** Marca el perfil como activo (cambia a la variante rosa clara). */
  active?: boolean;
  /** Handler opcional al hacer click o pulsar Enter/Espacio. */
  onSelect?: () => void;
}

/**
 * Avatar de usuario reutilizable.
 *
 * Accesibilidad (WCAG 2.1 AA):
 *   - `role="button"` + `tabIndex={0}` si es interactivo.
 *   - Activable con Enter y Espacio.
 *   - Placeholder SVG con `aria-hidden` para no duplicar información.
 */
export function Profile({ name, image, active = false, onSelect }: ProfileProps) {
  const interactive = typeof onSelect === 'function';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.();
    }
  };

  const className = active ? 'profile profile--active' : 'profile';

  return (
    <div
      className={className}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={name}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {image ? (
        <img className="profile__image" src={image} alt={name} loading="lazy" />
      ) : (
        <div className="profile__placeholder" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="70%"
            height="70%"
            fill="currentColor"
          >
            <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.9 1.7-9.9 4.9v2.4h19.8v-2.4c0-3.2-6.6-4.9-9.9-4.9z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default Profile;
