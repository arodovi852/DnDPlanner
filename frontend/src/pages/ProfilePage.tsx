import { useState } from 'react';
import { Profile } from '../components/shared/Profile';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';
import { CampaignCard } from '../components/shared/CampaignCard';
import { useAuth } from '../context/AuthContext';

// Mock de templates (reutilizamos los mismos assets del main).
import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';

interface UserCampaign {
  id: string;
  name: string;
  image: string;
  hoverImage: string;
}

// Mock de campañas del usuario — se sustituirá por una llamada al
// backend cuando exista el endpoint /users/:id/campaigns.
const USER_CAMPAIGNS: UserCampaign[] = [
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
];

const PLACEHOLDER_DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eleifend bibendum eleifend. Mauris ut felis dui. Nam mattis sed urna et ullamcorper.';

/**
 * Página de perfil de usuario (/profile).
 *
 * Layout:
 *   ┌────────────────────────── Header ──────────────────────────┐
 *   │ [Profile + nombre + ✏︎]        [TranslucidTextBox desc]     │
 *   │                                                             │
 *   │                  Campaigns          See more                │
 *   │        [Card]       [Card]       [Card]    ...              │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * El icono ✏︎ permite editar los campos del perfil inline. De momento
 * solo conmuta un flag visual — la persistencia real se añadirá cuando
 * exista el endpoint PATCH /users/me.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const displayName = user?.username ?? 'User';

  return (
    <section className="profile-page" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="visually-hidden">
        Perfil de {displayName}
      </h1>

      <div className="profile-page__top">
        {/* Columna izquierda: avatar + nombre + botón de edición */}
        <div className="profile-page__identity">
          <Profile name={displayName} active />
          <div className="profile-page__name-row">
            <span className="profile-page__name">{displayName}</span>
            <button
              type="button"
              className="profile-page__edit"
              aria-label={editing ? 'Terminar edición' : 'Editar perfil'}
              aria-pressed={editing}
              onClick={() => setEditing((prev) => !prev)}
            >
              {/* Icono bolígrafo (Material Symbols, inline SVG) */}
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

        {/* Columna derecha: descripción del perfil */}
        <div className="profile-page__description">
          <TranslucidTextBox>{PLACEHOLDER_DESCRIPTION}</TranslucidTextBox>
        </div>
      </div>

      <section className="profile-page__campaigns" aria-labelledby="campaigns-heading">
        <div className="profile-page__section-header">
          <h2 id="campaigns-heading" className="profile-page__section-title">
            Campaigns
          </h2>
          <a href="#" className="profile-page__see-more">
            See more
          </a>
        </div>

        <div className="profile-page__grid">
          {USER_CAMPAIGNS.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              name={campaign.name}
              image={campaign.image}
              hoverImage={campaign.hoverImage}
              onSelect={() => console.log('abrir campaña', campaign.id)}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ProfilePage;
