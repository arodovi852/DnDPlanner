import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MembersPanel } from '../components/shared/MembersPanel';
import { useAuth } from '../context/AuthContext';
import { useCampaigns } from '../context/CampaignContext';

/**
 * Página /chapterOrCharacter — hub de la campaña activa.
 *
 * Muestra dos tarjetas grandes (Chapters / Characters) para navegar al
 * selector correspondiente. Incluye un botón "Miembros" (arriba a la
 * derecha) que abre el modal de gestión: añadir/quitar jugadores, roles
 * (DM / Co-DM / Jugador), asignación de personaje y enlace de invitación.
 */
export function ChapterOrCharacterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCampaign, getRole } = useCampaigns();

  const [membersOpen, setMembersOpen] = useState(false);

  const role = activeCampaign && user ? getRole(activeCampaign.id, user.id) : null;
  const canSeeMembers = role === 'dm' || role === 'co-dm' || role === 'player';

  return (
    <section className="chapter-or-character" aria-labelledby="chapter-or-character-heading">
      <h1 id="chapter-or-character-heading" className="visually-hidden">
        {t('chapterOrCharacter.heading')}
      </h1>

      {activeCampaign && canSeeMembers && (
        <div className="chapter-or-character__toolbar">
          <button
            type="button"
            className="chapter-or-character__members-button"
            onClick={() => setMembersOpen(true)}
          >
            {t('members.title')} · {activeCampaign.members.length}
          </button>
        </div>
      )}

      <div className="chapter-or-character__cards">
        <OptionCard
          label={t('chapterOrCharacter.chapters')}
          ariaLabel={t('chapterOrCharacter.goToChapters')}
          onClick={() => navigate('/chapterSelector')}
        />
        <OptionCard
          label={t('chapterOrCharacter.characters')}
          ariaLabel={t('chapterOrCharacter.goToCharacters')}
          onClick={() => navigate('/characterSelector')}
        />
      </div>

      {activeCampaign && (
        <MembersPanel
          open={membersOpen}
          campaignId={activeCampaign.id}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </section>
  );
}

interface OptionCardProps {
  label: string;
  ariaLabel: string;
  onClick: () => void;
}

function OptionCard({ label, ariaLabel, onClick }: OptionCardProps) {
  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="chapter-or-character__card"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKey}
    >
      <div className="chapter-or-character__image" aria-hidden="true">
        <span className="chapter-or-character__label">{label}</span>
      </div>
    </div>
  );
}

export default ChapterOrCharacterPage;
