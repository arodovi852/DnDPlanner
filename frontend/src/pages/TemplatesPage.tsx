import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  CAMPAIGN_TEMPLATES,
  useCampaigns,
  type Campaign,
} from '../context/CampaignContext';
import { useUsers } from '../context/UsersContext';
import { campaignsApi } from '../api';
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
 * Lista las campañas con `visibility === 'public'` de **cualquier
 * usuario** del backend (no solo las del usuario actual). Las recibe
 * a través del endpoint `GET /api/campaigns/public`, que ya popula el
 * perfil del owner para que el listado pueda mostrar su nombre sin
 * resolver IDs uno por uno desde el `UsersContext`.
 *
 * Acciones disponibles para usuarios logueados:
 *   · Clonar la campaña (deep copy, owner = usuario actual).
 *   · Unirse como `player`.
 */
export function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cloneCampaign, requestJoin, setActiveCampaign } = useCampaigns();
  const { findById } = useUsers();
  const [query, setQuery] = useState('');
  const [publicList, setPublicList] = useState<Campaign[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the public listing once on mount and whenever the user logs
  // in/out (the backend gates the endpoint behind auth).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setPublicList(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const list = await campaignsApi.listPublic();
        if (cancelled) return;
        // The DTO matches the local `Campaign` type 1:1 (we just trust
        // the backend's normalisation).
        setPublicList(list as unknown as Campaign[]);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load templates');
        setPublicList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const list = publicList ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const owner = c.ownerProfile?.username ?? findById(c.ownerId)?.username ?? '';
      return (
        c.name.toLowerCase().includes(q) ||
        owner.toLowerCase().includes(q)
      );
    });
  }, [publicList, query, findById]);

  /** Owner = creator. The backend pre-populates `ownerProfile`; we fall
   *  back to the local users directory if needed (e.g. tests). */
  const creatorOf = (campaign: Campaign): string => {
    if (campaign.ownerProfile?.username) return campaign.ownerProfile.username;
    return findById(campaign.ownerId)?.username ?? '—';
  };

  const sourceTemplateOf = (campaign: Campaign): string | null => {
    if (!campaign.templateId) return null;
    const tpl = CAMPAIGN_TEMPLATES.find((tpl) => tpl.id === campaign.templateId);
    return tpl?.name ?? null;
  };

  const handleClone = (campaign: Campaign) => {
    if (!user) return;
    const clone = cloneCampaign(campaign.id, user.id);
    if (clone) navigate('/profile');
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

      {!user ? (
        <div className="templates-page__empty">
          <p>{t('templates.loginToBrowse')}</p>
        </div>
      ) : loading ? (
        <div className="templates-page__empty">
          <p>{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="templates-page__empty">
          <p role="alert">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="templates-page__empty">
          <p>{t('templates.empty')}</p>
          <p className="templates-page__empty-hint">
            {t('templates.publishHint')}
          </p>
        </div>
      ) : (
        <ul className="templates-page__grid">
          {filtered.map((campaign) => {
            const images = imagesForCampaign(campaign);
            const creator = creatorOf(campaign);
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
                    {t('templates.creators')} {creator}
                  </span>
                  {sourceTpl && (
                    <span className="templates-page__item-source">
                      {t('templates.basedOn')} {sourceTpl}
                    </span>
                  )}
                </div>
                <div className="templates-page__item-actions">
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
