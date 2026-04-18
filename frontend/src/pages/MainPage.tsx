import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { Button } from '../components/shared/Button';
import { AuthModal } from '../components/shared/AuthModal';
import { NewCampaignModal } from '../components/shared/NewCampaignModal';
import { CampaignCard, CreateCampaignCard } from '../components/shared/CampaignCard';
import { useAuth } from '../context/AuthContext';
import { useCampaigns, CAMPAIGN_TEMPLATES } from '../context/CampaignContext';

// Campañas de ejemplo (templates oficiales).
import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import resacon from '../assets/campaigns/resacon.png';
import resaconHover from '../assets/campaigns/resacon-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';

interface TemplatePreview {
  id: string;
  name: string;
  image: string;
  hoverImage: string;
}

const TEMPLATES: TemplatePreview[] = [
  {
    id: 'destinos-cruzados',
    name: 'Destinos Cruzados',
    image: destinosCruzados,
    hoverImage: destinosCruzadosHover,
  },
  {
    id: 'campollano',
    name: 'Campollano',
    image: campollano,
    hoverImage: campollanoHover,
  },
  {
    id: 'guerra',
    name: 'Guerra',
    image: guerra,
    hoverImage: guerraHover,
  },
  {
    id: 'resacon',
    name: 'ResA.C.ón',
    image: resacon,
    hoverImage: resaconHover,
  },
];

/**
 * Landing page principal (/main).
 *
 * Estado según sesión:
 *   1. Deslogueado → Hero + taglines + CTA que abre AuthModal.
 *   2. Autenticado → grid con sus campañas + búsqueda de templates.
 *
 * Las plantillas oficiales tienen imagen de card pero también viven
 * como entradas de CAMPAIGN_TEMPLATES (en CampaignContext) para que
 * al seleccionarlas se clonen como campaña editable del usuario.
 */
export function MainPage() {
  const { isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Header hideLogo={!isAuthenticated} transparent={!isAuthenticated} />

      {isAuthenticated ? <LoggedInView /> : <LoggedOutView onLogin={() => setModalOpen(true)} />}

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Vista deslogueada
// ---------------------------------------------------------------------------

function LoggedOutView({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  const previewTemplates = TEMPLATES.slice(0, 3);

  return (
    <div className="main-page">
      <section className="main-page__hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="main-page__logo">
          DNDPLANNER
        </h1>

        <div className="main-page__taglines">
          <span>{t('main.prepare')}</span>
          <span>{t('main.createCharacters')}</span>
          <span>{t('main.connectPlayers')}</span>
        </div>

        <div className="main-page__cta">
          <Button size="small" onClick={onLogin}>
            {t('main.createCampaign')}
          </Button>
        </div>
      </section>

      <section className="main-page__section" aria-labelledby="templates-heading">
        <div className="main-page__section-header">
          <h2 id="templates-heading" className="main-page__section-title">
            {t('main.templates')}
          </h2>
          <Link to="/templates" className="main-page__see-more">
            {t('common.seeMore')}
          </Link>
        </div>

        <div className="main-page__grid">
          {previewTemplates.map((template) => (
            <CampaignCard
              key={template.id}
              name={template.name}
              image={template.image}
              hoverImage={template.hoverImage}
              onSelect={onLogin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista autenticada
// ---------------------------------------------------------------------------

function LoggedInView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaigns, setActiveCampaign, createCampaign } = useCampaigns();

  const [search, setSearch] = useState('');
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [initialTemplateId, setInitialTemplateId] = useState<string | undefined>();

  const filteredTemplates = TEMPLATES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleCreateCampaign = () => {
    setInitialTemplateId(undefined);
    setNewCampaignOpen(true);
  };

  const handleCampaignCreated = (campaignId: string) => {
    setActiveCampaign(campaignId);
    navigate('/chapterOrCharacter');
  };

  const handleOpenExistingCampaign = (campaignId: string) => {
    setActiveCampaign(campaignId);
    navigate('/chapterOrCharacter');
  };

  const handleUseTemplate = (templateId: string) => {
    // Si la plantilla existe en CAMPAIGN_TEMPLATES, se pre-selecciona.
    const isKnown = CAMPAIGN_TEMPLATES.some((tpl) => tpl.id === templateId);
    if (isKnown) {
      setInitialTemplateId(templateId);
      setNewCampaignOpen(true);
    } else {
      // Fallback: crea la campaña directamente con el nombre del preview.
      const preview = TEMPLATES.find((p) => p.id === templateId);
      const created = createCampaign({
        name: preview?.name ?? 'New campaign',
        templateId,
        ownerId: user?.id ?? 'user-anon',
      });
      handleCampaignCreated(created.id);
    }
  };

  return (
    <div className="main-page">
      <section className="main-page__section" aria-labelledby="your-campaigns-heading">
        <div className="main-page__section-header">
          <h2 id="your-campaigns-heading" className="main-page__section-title">
            {t('main.yourCampaigns')}
          </h2>
        </div>

        <div className="main-page__grid">
          <CreateCampaignCard onCreate={handleCreateCampaign} />
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              name={campaign.name}
              image={pickPreviewImage(campaign.templateId).image}
              hoverImage={pickPreviewImage(campaign.templateId).hoverImage}
              onSelect={() => handleOpenExistingCampaign(campaign.id)}
            />
          ))}
        </div>
      </section>

      <section className="main-page__section" aria-labelledby="search-heading">
        <div className="main-page__search">
          <h2 id="search-heading" className="main-page__section-title">
            {t('main.orSearchTemplate')}
          </h2>
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <input
              type="search"
              className="main-page__search-input"
              placeholder=""
              aria-label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="main-page__grid">
          {filteredTemplates.map((template) => (
            <CampaignCard
              key={template.id}
              name={template.name}
              image={template.image}
              hoverImage={template.hoverImage}
              onSelect={() => handleUseTemplate(template.id)}
            />
          ))}
        </div>
      </section>

      <NewCampaignModal
        open={newCampaignOpen}
        initialTemplateId={initialTemplateId}
        onClose={() => setNewCampaignOpen(false)}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}

function pickPreviewImage(templateId?: string): { image: string; hoverImage: string } {
  const preview = TEMPLATES.find((p) => p.id === templateId);
  return preview
    ? { image: preview.image, hoverImage: preview.hoverImage }
    : { image: destinosCruzados, hoverImage: destinosCruzadosHover };
}

export default MainPage;
