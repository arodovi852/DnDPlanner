import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Profile } from '../components/shared/Profile';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';
import { CampaignCard } from '../components/shared/CampaignCard';
import { FollowButton } from '../components/shared/FollowButton';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../context/UsersContext';
import { useCampaigns, type Campaign } from '../context/CampaignContext';

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

function imagesForCampaign(campaign: Campaign): { image: string; hoverImage: string } {
  if (campaign.image) return { image: campaign.image, hoverImage: campaign.image };
  return (
    TEMPLATE_IMAGES[campaign.templateId ?? ''] ?? {
      image: destinosCruzados,
      hoverImage: destinosCruzadosHover,
    }
  );
}

/**
 * /profile/:userId — perfil público (de otra persona).
 *
 * Acceso:
 *   · Cualquier usuario puede ver perfiles no privados.
 *   · Si `target.isPrivate`, solo ve el perfil quien sea DM/co-DM de
 *     una campaña donde `target` figure como `player`.
 *
 * Contenido:
 *   · Avatar, nombre, descripción.
 *   · Campañas públicas en las que `target` es DM o Co-DM (sin
 *     información sobre los miembros).
 */
export function UserProfilePage() {
  const { t } = useTranslation();
  const { userId = '' } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { findById } = useUsers();
  const { campaigns } = useCampaigns();

  const target = findById(userId);

  const canSeePrivate = useMemo(() => {
    if (!target?.isPrivate) return true;
    if (!user) return false;
    return campaigns.some(
      (c) =>
        c.members.some(
          (m) => m.userId === user.id && (m.role === 'dm' || m.role === 'co-dm')
        ) &&
        c.members.some((m) => m.userId === target.id && m.role === 'player')
    );
  }, [target, user, campaigns]);

  const visibleCampaigns = useMemo(() => {
    if (!target) return [];
    return campaigns.filter((c) => {
      const m = c.members.find((mm) => mm.userId === target.id);
      if (!m) return false;
      if (m.role !== 'dm' && m.role !== 'co-dm') return false;
      // Solo campañas públicas: el resto son privadas del DM y no se
      // exponen en el perfil público.
      return c.visibility === 'public';
    });
  }, [campaigns, target]);

  if (!target) {
    return (
      <section className="user-profile-page" aria-labelledby="user-profile-heading">
        <h1 id="user-profile-heading" className="user-profile-page__title">
          {t('userProfile.notFoundTitle')}
        </h1>
        <p className="user-profile-page__lead">{t('userProfile.notFoundBody')}</p>
        <Link to="/users" className="user-profile-page__back">
          {t('userProfile.backToUsers')}
        </Link>
      </section>
    );
  }

  if (!canSeePrivate) {
    return (
      <section className="user-profile-page" aria-labelledby="user-profile-heading">
        <div className="user-profile-page__identity">
          <Profile name={target.username} image={target.avatar} />
          <h1 id="user-profile-heading" className="user-profile-page__title">
            {target.username}
          </h1>
        </div>
        <p className="user-profile-page__private">
          {t('userProfile.privateBody')}
        </p>
        <Link to="/users" className="user-profile-page__back">
          {t('userProfile.backToUsers')}
        </Link>
      </section>
    );
  }

  return (
    <section className="user-profile-page" aria-labelledby="user-profile-heading">
      <div className="user-profile-page__top">
        <div className="user-profile-page__identity">
          <Profile name={target.username} image={target.avatar} />
          <h1 id="user-profile-heading" className="user-profile-page__title">
            {target.username}
          </h1>
          {user && user.id !== target.id && <FollowButton userId={target.id} />}
        </div>

        <div className="user-profile-page__description">
          <TranslucidTextBox className="translucid-text-box--dark translucid-text-box--tall">
            {target.description?.trim() || t('userProfile.noDescription')}
          </TranslucidTextBox>
        </div>
      </div>

      <section className="user-profile-page__campaigns" aria-labelledby="user-campaigns-heading">
        <h2
          id="user-campaigns-heading"
          className="user-profile-page__section-title"
        >
          {t('userProfile.publicCampaigns')}
        </h2>

        {visibleCampaigns.length === 0 ? (
          <p className="user-profile-page__empty">
            {t('userProfile.noPublicCampaigns')}
          </p>
        ) : (
          <ul className="user-profile-page__grid">
            {visibleCampaigns.map((c) => {
              const images = imagesForCampaign(c);
              const targetMember = c.members.find((m) => m.userId === target.id);
              const roleKey = targetMember?.role === 'co-dm' ? 'CoDm' : 'Dm';
              return (
                <li key={c.id} className="user-profile-page__card">
                  <CampaignCard
                    name={c.name}
                    image={images.image}
                    hoverImage={images.hoverImage}
                  />
                  <span className="user-profile-page__card-name">{c.name}</span>
                  <span className="user-profile-page__card-role">
                    {t(`members.role${roleKey}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

export default UserProfilePage;
