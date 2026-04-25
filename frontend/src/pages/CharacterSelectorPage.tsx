import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaigns, type Character } from '../context/CampaignContext';
import { CampaignCard, CreateCampaignCard } from '../components/shared/CampaignCard';

type TabKey = 'playable' | 'enemy';

// Placeholder genéricos para personajes sin imagen propia.
import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';

const FALLBACK_IMAGES = [
  { image: destinosCruzados, hoverImage: destinosCruzadosHover },
  { image: campollano, hoverImage: campollanoHover },
  { image: guerra, hoverImage: guerraHover },
];

/**
 * Página /characterSelector.
 *
 * Usa el mismo "cuadro/carpeta" que /chapter# con dos pestañas que
 * alternan entre personajes jugables y enemigos. Cada pestaña tiene
 * su propio buscador.
 *
 * El botón "+" crea un personaje vacío en la categoría activa y
 * navega a su ficha /character/:id.
 */
export function CharacterSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCampaign, addCharacter } = useCampaigns();

  const [tab, setTab] = useState<TabKey>('playable');
  const [search, setSearch] = useState('');

  const allCharacters = activeCampaign?.characters ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allCharacters.filter((c) => {
      if (c.kind !== tab) return false;
      if (!query) return true;
      return c.name.toLowerCase().includes(query);
    });
  }, [allCharacters, tab, search]);

  const handleCreate = () => {
    if (!activeCampaign) return;
    const character = addCharacter(activeCampaign.id, { kind: tab });
    navigate(`/character/${character.id}`);
  };

  const handleOpen = (character: Character) => {
    navigate(`/character/${character.id}`);
  };

  return (
    <section
      className="character-selector chapter-page"
      aria-labelledby="character-selector-heading"
    >
      <h1 id="character-selector-heading" className="visually-hidden">
        {t('chapterOrCharacter.characters')}
      </h1>

      <div className="chapter-page__tabs" role="tablist" aria-label={t('chapterOrCharacter.characters')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'playable'}
          className={
            tab === 'playable'
              ? 'chapter-page__tab chapter-page__tab--active'
              : 'chapter-page__tab'
          }
          onClick={() => {
            setTab('playable');
            setSearch('');
          }}
        >
          {t('characterSelector.playable')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'enemy'}
          className={
            tab === 'enemy'
              ? 'chapter-page__tab chapter-page__tab--active'
              : 'chapter-page__tab'
          }
          onClick={() => {
            setTab('enemy');
            setSearch('');
          }}
        >
          {t('characterSelector.enemies')}
        </button>
      </div>

      <div className="chapter-page__folder character-selector__folder" role="tabpanel">
        <div className="chapter-page__canvas character-selector__canvas">
          <div className="character-selector__grid">
            <CreateCampaignCard onCreate={handleCreate} />
            {filtered.map((character, index) => {
              const images =
                FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
              return (
                <CampaignCard
                  key={character.id}
                  name={character.name || t('common.untitled')}
                  image={character.image ?? images.image}
                  hoverImage={character.image ?? images.hoverImage}
                  onSelect={() => handleOpen(character)}
                />
              );
            })}
          </div>

          <div className="character-selector__search">
            <label htmlFor="character-search" className="character-selector__search-label">
              {t('characterSelector.searchCharacter')}
            </label>
            <input
              id="character-search"
              type="search"
              className="character-selector__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('common.search')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default CharacterSelectorPage;
