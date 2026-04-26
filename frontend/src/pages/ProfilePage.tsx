import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Profile } from '../components/shared/Profile';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';
import { CampaignCard } from '../components/shared/CampaignCard';
import { useAuth } from '../context/AuthContext';
import { useCampaigns } from '../context/CampaignContext';

// Assets fallback para las tarjetas de campaña.
import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';
import resacon from '../assets/campaigns/resacon.png';
import resaconHover from '../assets/campaigns/resacon-hover.png';

const TEMPLATE_IMAGES: Record<string, { image: string; hoverImage: string }> = {
  'destinos-cruzados': { image: destinosCruzados, hoverImage: destinosCruzadosHover },
  campollano: { image: campollano, hoverImage: campollanoHover },
  guerra: { image: guerra, hoverImage: guerraHover },
  resacon: { image: resacon, hoverImage: resaconHover },
};

const PLACEHOLDER_DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eleifend bibendum eleifend. Mauris ut felis dui. Nam mattis sed urna et ullamcorper.';

const MAX_VISIBLE = 8;

/**
 * Página de perfil de usuario (/profile).
 *
 * Layout:
 *   ┌───────── Header ─────────┐
 *   │ [Profile + nombre + ✏︎]   [TranslucidTextBox desc]     │
 *   │                                                         │
 *   │            Campaigns                 See more           │
 *   │  [Card] [Card] [Card] [Card] ... (máx. 8)               │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Si el usuario tiene más de 8 campañas se muestra el enlace
 * "See more" arriba a la derecha, que lleva a /campaigns con la
 * lista completa.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { campaigns, setActiveCampaign } = useCampaigns();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const displayName = user?.username ?? 'User';
  const visibleCampaigns = campaigns.slice(0, MAX_VISIBLE);
  const hasMore = campaigns.length > MAX_VISIBLE;

  const openCampaign = (id: string) => {
    setActiveCampaign(id);
    navigate('/chapterOrCharacter');
  };

  return (
    <section className="profile-page" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="visually-hidden">
        {t('header.profile')} · {displayName}
      </h1>

      <div className="profile-page__top">
        <div className="profile-page__identity">
          <Profile name={displayName} active />
          <div className="profile-page__name-row">
            <span className="profile-page__name">{displayName}</span>
            <button
              type="button"
              className="profile-page__edit"
              aria-label={editing ? t('profile.finishEdit') : t('profile.editProfile')}
              aria-pressed={editing}
              onClick={() => setEditing((prev) => !prev)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="1.25rem"
                height="1.25rem"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="profile-page__description">
          <TranslucidTextBox>{PLACEHOLDER_DESCRIPTION}</TranslucidTextBox>
        </div>
      </div>

      <section className="profile-page__campaigns" aria-labelledby="campaigns-heading">
        <div className="profile-page__section-header">
          <h2 id="campaigns-heading" className="profile-page__section-title">
            {t('profile.campaigns')}
          </h2>
          {hasMore && (
            <Link to="/campaigns" className="profile-page__see-more">
              {t('common.seeMore')}
            </Link>
          )}
        </div>

        <div className="profile-page__grid">
          {visibleCampaigns.length === 0 ? (
            <p className="profile-page__empty">—</p>
          ) : (
            visibleCampaigns.map((campaign) => {
              const images = TEMPLATE_IMAGES[campaign.templateId ?? ''] ?? {
                image: destinosCruzados,
                hoverImage: destinosCruzadosHover,
              };
              return (
                <CampaignCard
                  key={campaign.id}
                  name={campaign.name}
                  image={images.image}
                  hoverImage={images.hoverImage}
                  onSelect={() => openCampaign(campaign.id)}
                />
              );
            })
          )}
        </div>
      </section>
    </section>
  );
}

export default ProfilePage;
