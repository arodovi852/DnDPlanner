import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaigns, type Character } from '../context/CampaignContext';
import { CampaignCard, CreateCampaignCard } from '../components/shared/CampaignCard';
import { useDndMonsters } from '../hooks/useDndMonsters';

type TabKey = 'playable' | 'enemy';

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

const ASSET_BASE = 'https://www.dnd5eapi.co';

/**
 * Página /characterSelector.
 *
 * Las dos pestañas alternan entre personajes jugables y enemigos. La
 * pestaña de enemigos sugiere también monstruos del API D&D 5e (con
 * imagen) cuando el usuario escribe en el buscador. Al pinchar una
 * sugerencia se crea un personaje pre-rellenado con sus datos.
 */
export function CharacterSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCampaign, addCharacter, updateCharacter } = useCampaigns();
  const { monsters, fetchMonsterDetail } = useDndMonsters();

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

  const apiSuggestions = useMemo(() => {
    if (tab !== 'enemy') return [];
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return monsters
      .filter((m) => m.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [tab, search, monsters]);

  const handleCreate = () => {
    if (!activeCampaign) return;
    const character = addCharacter(activeCampaign.id, { kind: tab });
    navigate(`/character/${character.id}`);
  };

  const handleOpen = (character: Character) => {
    navigate(`/character/${character.id}`);
  };

  const handleCreateFromMonster = async (index: string, name: string) => {
    if (!activeCampaign) return;
    const character = addCharacter(activeCampaign.id, { kind: 'enemy', name });
    const detail = await fetchMonsterDetail(index);
    if (detail) {
      updateCharacter(activeCampaign.id, character.id, {
        apiIndex: detail.index,
        name: detail.name,
        image: detail.image,
        armor: detail.armorClass,
        hp: detail.hitPoints,
        maxHp: detail.hitPoints,
        damageDice: detail.hitPointsRoll ?? '1d6',
        movement: detail.speed,
        stats: detail.stats,
        attacks: detail.attacks,
        level: Math.max(1, Math.round(detail.challengeRating || 1)),
      });
    }
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

            {(filtered.length > 0 || apiSuggestions.length > 0) && search.trim() && (
              <ul className="character-selector__suggestions">
                {filtered.map((character) => (
                  <li key={`local-${character.id}`}>
                    <button
                      type="button"
                      className="character-selector__suggestion"
                      onClick={() => handleOpen(character)}
                    >
                      <span className="character-selector__suggestion-name">
                        {character.name || t('common.untitled')}
                      </span>
                      {character.image ? (
                        <img
                          className="character-selector__suggestion-image"
                          src={character.image}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="character-selector__suggestion-placeholder" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
                {apiSuggestions.map((monster) => (
                  <li key={`api-${monster.index}`}>
                    <button
                      type="button"
                      className="character-selector__suggestion character-selector__suggestion--api"
                      onClick={() => handleCreateFromMonster(monster.index, monster.name)}
                    >
                      <span className="character-selector__suggestion-name">
                        {monster.name}
                        <span className="character-selector__suggestion-tag">SRD</span>
                      </span>
                      <img
                        className="character-selector__suggestion-image"
                        src={`${ASSET_BASE}/api/images/monsters/${monster.index}.png`}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                        }}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CharacterSelectorPage;
