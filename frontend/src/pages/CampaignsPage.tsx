import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignCard } from '../components/shared/CampaignCard';
import { useCampaigns } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

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

/**
 * Página /campaigns — lista completa de campañas guardadas del usuario.
 *
 * Se llega desde el enlace "See more" del perfil cuando el usuario
 * tiene más de 8 campañas. Cada tarjeta es un `CampaignCard`.
 */
export function CampaignsPage() {
  usePageTitle('Mis campañas');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaigns, setActiveCampaign } = useCampaigns();

  const myCampaigns = campaigns.filter(
    (c) => c.ownerId === user?.id || c.members.some((m) => m.userId === user?.id)
  );

  const openCampaign = (id: string) => {
    setActiveCampaign(id);
    navigate('/chapterOrCharacter');
  };

  return (
    <section className="campaigns-page" aria-labelledby="all-campaigns-heading">
      <h1 id="all-campaigns-heading" className="campaigns-page__title">
        {t('profile.campaigns')}
      </h1>

      <div className="campaigns-page__grid">
        {myCampaigns.map((campaign) => {
          const images = campaign.image
            ? { image: campaign.image, hoverImage: campaign.image }
            : TEMPLATE_IMAGES[campaign.templateId ?? ''] ?? {
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
        })}
      </div>
    </section>
  );
}

export default CampaignsPage;
