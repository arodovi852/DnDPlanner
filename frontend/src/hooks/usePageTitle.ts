import { useEffect } from 'react';

const BASE_TITLE = 'DnDPlanner';

/**
 * Actualiza `document.title` con `<title> - DnDPlanner`.
 * Pasar `null` o cadena vacía deja solo el título base.
 */
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} - ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}
