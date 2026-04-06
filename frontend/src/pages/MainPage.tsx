import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/shared/Button';
import { AuthModal } from '../components/shared/AuthModal';
import { CampaignCard, CreateCampaignCard } from '../components/shared/CampaignCard';
import { useAuth } from '../context/AuthContext';

// Campañas de ejemplo (templates oficiales).
import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import resacon from '../assets/campaigns/resacon.png';
import resaconHover from '../assets/campaigns/resacon-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';

interface CampaignTemplate {
  id: string;
  name: string;
  image: string;
  hoverImage: string;
}

const TEMPLATES: CampaignTemplate[] = [
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
 * Tiene dos estados mutuamente excluyentes según el estado de sesión:
 *
 * 1. Usuario NO autenticado → Hero con logo grande + CTA que abre el
 *    modal de login. La sección de Templates queda "a medias" para
 *    llamar la atención del usuario y que haga scroll.
 *
 * 2. Usuario autenticado → Dashboard con:
 *      - "Your campaigns": tarjeta "+" + campañas del usuario.
 *      - "Or search a template…": buscador + templates disponibles.
 */
export function MainPage() {
  const { isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Cuando está deslogueado el header se funde con el fondo y
          oculta el logo (el logo se muestra como hero). */}
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
  // Muestra solo los primeros 3 templates para que hagan "peek" al
  // fondo del viewport (efecto de scroll bait).
  const previewTemplates = TEMPLATES.slice(0, 3);

  return (
    <div className="main-page">
      <section className="main-page__hero" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="main-page__logo">
          DNDPLANNER
        </h1>

        <div className="main-page__taglines">
          <span>Prepare your campaigns.</span>
          <span>Create characters.</span>
          <span>Connect with players.</span>
        </div>

        <div className="main-page__cta">
          <Button size="small" onClick={onLogin}>
            Create campaign
          </Button>
        </div>
      </section>

      <section className="main-page__section" aria-labelledby="templates-heading">
        <div className="main-page__section-header">
          <h2 id="templates-heading" className="main-page__section-title">
            Templates
          </h2>
          <Link to="/templates" className="main-page__see-more">
            See more
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
  const [search, setSearch] = useState('');

  // Mock de campañas del usuario — se sustituirá por una llamada al
  // backend cuando exista el endpoint correspondiente.
  const userCampaigns: CampaignTemplate[] = [];

  const filteredTemplates = TEMPLATES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleCreateCampaign = () => {
    // TODO: navegar al flujo de creación de campaña cuando exista.
    // eslint-disable-next-line no-console
    console.log('crear campaña');
  };

  return (
    <div className="main-page">
      <section className="main-page__section" aria-labelledby="your-campaigns-heading">
        <div className="main-page__section-header">
          <h2 id="your-campaigns-heading" className="main-page__section-title">
            Your campaigns
          </h2>
        </div>

        <div className="main-page__grid">
          <CreateCampaignCard onCreate={handleCreateCampaign} />
          {userCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              name={campaign.name}
              image={campaign.image}
              hoverImage={campaign.hoverImage}
              onSelect={() => console.log('abrir', campaign.id)}
            />
          ))}
        </div>
      </section>

      <section className="main-page__section" aria-labelledby="search-heading">
        <div className="main-page__search">
          <h2 id="search-heading" className="main-page__section-title">
            Or search a template…
          </h2>
          <form onSubmit={handleSearchSubmit} role="search" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <input
              type="search"
              className="main-page__search-input"
              placeholder=""
              aria-label="Buscar un template"
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
              onSelect={() => console.log('usar template', template.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default MainPage;
