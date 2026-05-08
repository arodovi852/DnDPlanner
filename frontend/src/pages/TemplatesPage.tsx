import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  CAMPAIGN_TEMPLATES,
  useCampaigns,
  type Campaign,
} from '../context/CampaignContext';
import { useUsers } from '../context/UsersContext';
import { CampaignCard } from '../components/shared/CampaignCard';
import { Button } from '../components/shared/Button';

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

function imagesForCampaign(campaign: Campaign) {
  if (campaign.image) {
    return { image: campaign.image, hoverImage: campaign.image };
  }
  return (
    TEMPLATE_IMAGES[campaign.templateId ?? ''] ?? {
      image: destinosCruzados,
      hoverImage: destinosCruzadosHover,
    }
  );
}

/**
 * /templates — explorador de campañas públicas.
 *
 * Lista todas las campañas con `visibility === 'public'` (de cualquier
 * usuario que las haya marcado como públicas) y permite:
 *   · Clonarlas como punto de partida de una campaña propia.
 *   · Pedir unirse como jugador (se añade el usuario al `members` con
 *     rol `player`).
 *
 * Mientras no haya backend conectado, "online" significa todas las
 * campañas presentes en el `localStorage` del navegador. Cuando el
 * backend esté operativo el listado vendrá del servidor sin cambios en
 * la UI.
 */
export function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaigns, cloneCampaign, requestJoin, setActiveCampaign } =
    useCampaigns();
  const { findById } = useUsers();
  const [query, setQuery] = useState('');

  const publicCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns
      .filter((c) => c.visibility === 'public')
      .filter((c) => {
        if (!q) return true;
        const dms = c.members
          .filter((m) => m.role === 'dm' || m.role === 'co-dm')
          .map((m) => findById(m.userId)?.username ?? '')
          .join(' ');
        return (
          c.name.toLowerCase().includes(q) ||
          dms.toLowerCase().includes(q)
        );
      });
  }, [campaigns, query, findById]);

  /** Solo los nombres de DM y Co-DMs (no exponemos jugadores). */
  const creatorsOf = (campaign: Campaign): string => {
    const names = campaign.members
      .filter((m) => m.role === 'dm' || m.role === 'co-dm')
      .map((m) => findById(m.userId)?.username)
      .filter((n): n is string => Boolean(n));
    return names.join(', ') || '—';
  };

  /** Nombre legible de la plantilla original si la campaña fue clonada. */
  const sourceTemplateOf = (campaign: Campaign): string | null => {
    if (!campaign.templateId) return null;
    const tpl = CAMPAIGN_TEMPLATES.find((tpl) => tpl.id === campaign.templateId);
    return tpl?.name ?? null;
  };

  const handleClone = (campaign: Campaign) => {
    if (!user) return;
    const clone = cloneCampaign(campaign.id, user.id);
    if (clone) {
      navigate('/profile');
    }
  };

  const handleJoin = (campaign: Campaign) => {
    if (!user) return;
    const ok = requestJoin(campaign.id, user.id);
    if (ok) {
      setActiveCampaign(campaign.id);
      navigate('/chapterOrCharacter');
    }
  };

  return (
    <section className="templates-page" aria-labelledby="templates-heading">
      <header className="templates-page__header">
        <h1 id="templates-heading" className="templates-page__title">
          {t('templates.title')}
        </h1>
        <p className="templates-page__lead">{t('templates.lead')}</p>
      </header>

      <div className="templates-page__controls">
        <input
          type="search"
          className="templates-page__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('templates.searchPlaceholder')}
          aria-label={t('templates.searchPlaceholder')}
        />
      </div>

      {publicCampaigns.length === 0 ? (
        <div className="templates-page__empty">
          <p>{t('templates.empty')}</p>
          <p className="templates-page__empty-hint">
            {t('templates.publishHint')}
          </p>
        </div>
      ) : (
        <ul className="templates-page__grid">
          {publicCampaigns.map((campaign) => {
            const images = imagesForCampaign(campaign);
            const creators = creatorsOf(campaign);
            const sourceTpl = sourceTemplateOf(campaign);
            const alreadyMember =
              user && campaign.members.some((m) => m.userId === user.id);
            return (
              <li className="templates-page__item" key={campaign.id}>
                <CampaignCard
                  name={campaign.name}
                  image={images.image}
                  hoverImage={images.hoverImage}
                />
                <div className="templates-page__item-info">
                  <span className="templates-page__item-name">
                    {campaign.name}
                  </span>
                  <span className="templates-page__item-author">
                    {t('templates.creators')} {creators}
                  </span>
                  {sourceTpl && (
                    <span className="templates-page__item-source">
                      {t('templates.basedOn')} {sourceTpl}
                    </span>
                  )}
                </div>
                <div className="templates-page__item-actions">
                  {!user ? (
                    <span className="templates-page__login-hint">
                      {t('templates.loginToInteract')}
                    </span>
                  ) : (
                    <>
                      <Button size="small" onClick={() => handleClone(campaign)}>
                        {t('templates.clone')}
                      </Button>
                      <Button
                        size="small"
                        disabled={!!alreadyMember}
                        onClick={() => handleJoin(campaign)}
                      >
                        {alreadyMember
                          ? t('templates.joined')
                          : t('templates.join')}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default TemplatesPage;
