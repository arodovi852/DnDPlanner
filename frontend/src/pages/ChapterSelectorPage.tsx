import { useState } from 'react';
import { Button } from '../components/shared/Button';
import { TextBox } from '../components/shared/TextBox';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';

interface Chapter {
  id: string;
  title: string;
}

/**
 * Página /chapterSelector.
 *
 * Muestra:
 *   1. Un botón "+" grande arriba para añadir un capítulo nuevo.
 *   2. Un TextBox contenedor scrolleable con la lista de capítulos.
 *      Cada capítulo es un TranslucidTextBox dentro del TextBox, de
 *      forma que visualmente parece una lista apilada con scroll.
 *
 * Los capítulos son mock. La persistencia se conectará al endpoint
 * /campaigns/:id/chapters cuando exista.
 */
export function ChapterSelectorPage() {
  const [chapters, setChapters] = useState<Chapter[]>(() =>
    Array.from({ length: 6 }, (_, index) => ({
      id: `chapter-${index + 1}`,
      title: `Chapter ${index + 1}: Lorem Ipsum`,
    }))
  );

  const handleAdd = () => {
    setChapters((prev) => [
      ...prev,
      {
        id: `chapter-${prev.length + 1}-${Date.now()}`,
        title: `Chapter ${prev.length + 1}: Lorem Ipsum`,
      },
    ]);
  };

  return (
    <section className="chapter-selector" aria-labelledby="chapter-heading">
      <h1 id="chapter-heading" className="visually-hidden">
        Seleccionar capítulo
      </h1>

      <div className="chapter-selector__add">
        <Button
          aria-label="Añadir nuevo capítulo"
          onClick={handleAdd}
          className="chapter-selector__add-button"
        >
          +
        </Button>
      </div>

      <div className="chapter-selector__list-wrapper">
        <TextBox>
          <ul className="chapter-selector__list" aria-label="Lista de capítulos">
            {chapters.map((chapter) => (
              <li key={chapter.id} className="chapter-selector__item">
                <TranslucidTextBox>{chapter.title}</TranslucidTextBox>
              </li>
            ))}
          </ul>
        </TextBox>
      </div>
    </section>
  );
}

export default ChapterSelectorPage;
