import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/shared/Button';
import { useAuth } from '../context/AuthContext';
import { useCampaigns } from '../context/CampaignContext';
import { useUsers } from '../context/UsersContext';
import { usePageTitle } from '../hooks/usePageTitle';

import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import campollano from '../assets/campaigns/campollano.png';
import guerra from '../assets/campaigns/guerra.png';
import resacon from '../assets/campaigns/resacon.png';

const TEMPLATE_COVERS: Record<string, string> = {
  'destinos-cruzados': destinosCruzados,
  campollano,
  guerra,
  resacon,
};

const ROLE_KEYS: Record<string, string> = {
  dm: 'members.roleDm',
  'co-dm': 'members.roleCoDm',
  player: 'members.rolePlayer',
};

/**
 * /view/:viewToken — vista de solo lectura de una campaña.
 *
 * Accesible sin autenticación. Muestra:
 *   - Imagen y nombre de la campaña.
 *   - Lista de miembros con su rol.
 *   - Títulos de los capítulos.
 *   - CTA para unirse si la campaña tiene shareToken.
 */
export function CampaignViewPage() {
  usePageTitle('Campaña pública');
  const { t } = useTranslation();
  const { viewToken = '' } = useParams<{ viewToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { findByViewToken, setActiveCampaign } = useCampaigns();
  const { findById } = useUsers();

  const campaign = useMemo(
    () => findByViewToken(viewToken),
    [findByViewToken, viewToken]
  );

  if (!campaign) {
    return (
      <section className="campaign-view-page" aria-labelledby="view-heading">
        <h1 id="view-heading" className="campaign-view-page__title">
          {t('view.invalidTitle')}
        </h1>
        <p className="campaign-view-page__lead">{t('view.invalidBody')}</p>
        <Button onClick={() => navigate('/main')}>{t('invite.goHome')}</Button>
      </section>
    );
  }

  const cover =
    campaign.image ??
    TEMPLATE_COVERS[campaign.templateId ?? ''] ??
    destinosCruzados;

  const alreadyMember =
    user && campaign.members.some((m) => m.userId === user.id);

  const handleGoToCampaign = () => {
    setActiveCampaign(campaign.id);
    navigate('/chapterOrCharacter');
  };

  return (
    <section className="campaign-view-page" aria-labelledby="view-heading">
      <div className="campaign-view-page__hero">
        <img
          src={cover}
          alt={campaign.name}
          className="campaign-view-page__cover"
        />
        <div className="campaign-view-page__hero-info">
          <span className="campaign-view-page__badge">
            {t('view.readOnly')}
          </span>
          <h1 id="view-heading" className="campaign-view-page__title">
            {campaign.name}
          </h1>
          <p className="campaign-view-page__stats">
            {t('view.memberCount', { count: campaign.members.length })}
            {' · '}
            {t('view.chapterCount', { count: campaign.chapters.length })}
          </p>

          {alreadyMember ? (
            <Button onClick={handleGoToCampaign}>
              {t('view.goToMyCampaign')}
            </Button>
          ) : campaign.shareToken ? (
            <Button
              onClick={() => navigate(`/invite/${campaign.shareToken}`)}
            >
              {t('view.joinLink')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="campaign-view-page__body">
        <section
          className="campaign-view-page__section"
          aria-labelledby="view-members-heading"
        >
          <h2
            id="view-members-heading"
            className="campaign-view-page__section-title"
          >
            {t('members.title')}
          </h2>
          <ul className="campaign-view-page__list">
            {campaign.members.map((m) => {
              const u = findById(m.userId);
              return (
                <li key={m.userId} className="campaign-view-page__member">
                  <span className="campaign-view-page__member-name">
                    {u?.username ?? m.userId}
                  </span>
                  <span className="campaign-view-page__member-role">
                    {t(ROLE_KEYS[m.role] ?? 'members.rolePlayer')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {campaign.chapters.length > 0 && (
          <section
            className="campaign-view-page__section"
            aria-labelledby="view-chapters-heading"
          >
            <h2
              id="view-chapters-heading"
              className="campaign-view-page__section-title"
            >
              {t('chapterOrCharacter.chapters')}
            </h2>
            <ol className="campaign-view-page__list">
              {campaign.chapters.map((ch, i) => (
                <li key={ch.id} className="campaign-view-page__chapter">
                  <span className="campaign-view-page__chapter-num">
                    {i + 1}.
                  </span>
                  <span className="campaign-view-page__chapter-title">
                    {ch.title || t('common.untitled')}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <p className="campaign-view-page__footer-note">
        {t('view.footerNote')}{' '}
        <Link to="/main">{t('invite.goHome')}</Link>
      </p>
    </section>
  );
}

export default CampaignViewPage;
