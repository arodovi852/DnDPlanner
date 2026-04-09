import { useNavigate } from 'react-router-dom';
import { Button } from '../components/shared/Button';

/**
 * Página /creatorSelector.
 *
 * Pantalla intermedia con dos botones que permiten al usuario elegir
 * qué tipo de contenido quiere crear dentro de una campaña:
 *   - Chapters   → /chapterSelector
 *   - Characters → /characterSelector
 *
 * En sprints futuros se añadirán también botones para NPCs, mapas, etc.
 */
export function CreatorSelectorPage() {
  const navigate = useNavigate();

  return (
    <section className="creator-selector" aria-labelledby="creator-heading">
      <h1 id="creator-heading" className="creator-selector__title">
        What do you want to create?
      </h1>

      <div className="creator-selector__buttons">
        <Button onClick={() => navigate('/chapterSelector')}>Chapters</Button>
        <Button onClick={() => navigate('/characterSelector')}>Characters</Button>
      </div>
    </section>
  );
}

export default CreatorSelectorPage;
