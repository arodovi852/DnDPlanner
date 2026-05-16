import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaigns, type Character } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { CampaignCard, CreateCampaignCard } from '../components/shared/CampaignCard';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { useDndMonsters } from '../hooks/useDndMonsters';
import { usePageTitle } from '../hooks/usePageTitle';

type TabKey = 'playable' | 'enemy';

import defaultPlayer from '../assets/characters/default-player.svg';
import defaultEnemy from '../assets/characters/default-enemy.svg';

// Imágenes por defecto según el tipo de personaje. Antes se reutilizaban
// las imágenes de campañas como fallback, lo que era visualmente confuso
// (un jugador podía aparecer con la portada de "Campollano").
const DEFAULT_IMAGE: Record<'playable' | 'enemy', { image: string; hoverImage: string }> = {
  playable: { image: defaultPlayer, hoverImage: defaultPlayer },
  enemy: { image: defaultEnemy, hoverImage: defaultEnemy },
};

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
  usePageTitle('Personajes');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCampaign, addCharacter, updateCharacter, deleteCharacter, getRole } =
    useCampaigns();
  const { user } = useAuth();
  const { monsters, fetchMonsterDetail } = useDndMonsters();
  const [searchParams] = useSearchParams();

  const role =
    activeCampaign && user ? getRole(activeCampaign.id, user.id) : null;
  const canEdit = role === 'dm' || role === 'co-dm';

  const initialTab: TabKey =
    searchParams.get('tab') === 'enemy' ? 'enemy' : 'playable';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const allCharacters = activeCampaign?.characters ?? [];

  // Players see ALL characters and enemies (read-only); only DM/co-DM can
  // create, delete or rename them, and only the assigned playable character
  // is editable in CharacterSheetPage (gated there, not here).
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

      <nav className="chapter-page__campaign-nav" aria-label={t('chapter.campaignNav')}>
        <button
          type="button"
          className="chapter-page__campaign-nav-btn"
          onClick={() => navigate('/chapterOrCharacter')}
        >
          {activeCampaign?.name ?? t('chapter.campaignHub')}
        </button>
        <span className="chapter-page__campaign-nav-sep" aria-hidden="true">/</span>
        <button
          type="button"
          className="chapter-page__campaign-nav-btn"
          onClick={() => navigate('/chapterSelector')}
        >
          {t('chapterOrCharacter.chapters')}
        </button>
        <span className="chapter-page__campaign-nav-sep" aria-hidden="true">/</span>
        <button
          type="button"
          className="chapter-page__campaign-nav-btn chapter-page__campaign-nav-btn--active"
          onClick={() => navigate('/characterSelector')}
        >
          {t('chapterOrCharacter.characters')}
        </button>
      </nav>

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
            {canEdit && <CreateCampaignCard onCreate={handleCreate} />}
            {filtered.map((character) => {
              const images = DEFAULT_IMAGE[character.kind];
              return (
                <div className="character-selector__card-wrapper" key={character.id}>
                  <CampaignCard
                    name={character.name || t('common.untitled')}
                    image={character.image ?? images.image}
                    hoverImage={character.image ?? images.hoverImage}
                    onSelect={() => handleOpen(character)}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      className="character-selector__delete"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDeleteId(character.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canEdit && (
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
          )}
        </div>
      </div>

      <ConfirmModal
        open={pendingDeleteId !== null}
        title={t('common.delete')}
        description={
          pendingDeleteId
            ? t('characterSelector.confirmDeleteDescription', {
                name:
                  allCharacters.find((c) => c.id === pendingDeleteId)?.name ||
                  t('common.untitled'),
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (pendingDeleteId && activeCampaign) {
            deleteCharacter(activeCampaign.id, pendingDeleteId);
          }
          setPendingDeleteId(null);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </section>
  );
}

export default CharacterSelectorPage;
