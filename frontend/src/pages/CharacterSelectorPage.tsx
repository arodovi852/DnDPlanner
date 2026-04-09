/**
 * Página /characterSelector.
 *
 * Placeholder provisional: misma estructura visual que /chapterSelector
 * pero con personajes. Se desarrollará en un sprint posterior.
 */
export function CharacterSelectorPage() {
  return (
    <section className="character-selector" aria-labelledby="character-heading">
      <h1 id="character-heading" className="character-selector__title">
        Characters
      </h1>
      <p className="character-selector__placeholder">
        Próximamente: selector de personajes.
      </p>
    </section>
  );
}

export default CharacterSelectorPage;
