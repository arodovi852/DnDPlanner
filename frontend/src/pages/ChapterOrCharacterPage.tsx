import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MembersPanel } from '../components/shared/MembersPanel';
import { ConfirmModal } from '../components/shared/ConfirmModal';
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
  const { activeCampaign, getRole, updateCampaign, deleteCampaign } = useCampaigns();

  const [membersOpen, setMembersOpen] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingVisibility, setConfirmingVisibility] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const role = activeCampaign && user ? getRole(activeCampaign.id, user.id) : null;
  const isDm = role === 'dm' || role === 'co-dm';
  const canSeeMembers = role === 'dm' || role === 'co-dm' || role === 'player';

  const handleDeleteCampaign = () => {
    if (!activeCampaign) return;
    deleteCampaign(activeCampaign.id);
    setConfirmingDelete(false);
    navigate('/main');
  };

  const handleToggleVisibility = () => {
    if (!activeCampaign) return;
    updateCampaign(activeCampaign.id, {
      visibility: activeCampaign.visibility === 'public' ? 'private' : 'public',
    });
    setConfirmingVisibility(false);
  };

  return (
    <section className="chapter-or-character" aria-labelledby="chapter-or-character-heading">
      <h1 id="chapter-or-character-heading" className="visually-hidden">
        {t('chapterOrCharacter.heading')}
      </h1>

      {activeCampaign && (
        <div className="chapter-or-character__toolbar">
          <div className="chapter-or-character__toolbar-left">
            {isDm && (
              <button
                type="button"
                className={
                  'chapter-or-character__visibility-toggle' +
                  (activeCampaign.visibility === 'public'
                    ? ' chapter-or-character__visibility-toggle--public'
                    : '')
                }
                onClick={() => setConfirmingVisibility(true)}
                aria-pressed={activeCampaign.visibility === 'public'}
                aria-label={
                  activeCampaign.visibility === 'public'
                    ? t('profile.makePrivate')
                    : t('profile.makePublic')
                }
                title={
                  activeCampaign.visibility === 'public'
                    ? t('profile.public')
                    : t('profile.private')
                }
              >
                {activeCampaign.visibility === 'public' ? '🌐' : '🔒'}
              </button>
            )}
            <div className="chapter-or-character__campaign-title">
              {renamingCampaign && isDm ? (
                <input
                  ref={renameInputRef}
                  className="chapter-or-character__rename-input"
                  defaultValue={activeCampaign.name}
                  aria-label={t('profile.renameCampaign')}
                  autoFocus
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name) updateCampaign(activeCampaign.id, { name });
                    setRenamingCampaign(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      setRenamingCampaign(false);
                    }
                  }}
                />
              ) : (
                <span
                  className="chapter-or-character__campaign-name"
                  title={isDm ? t('profile.renameCampaign') : undefined}
                  onClick={() => {
                    if (isDm) setRenamingCampaign(true);
                  }}
                >
                  {activeCampaign.name}
                  {isDm && (
                    <span className="chapter-or-character__rename-icon" aria-hidden="true">✎</span>
                  )}
                </span>
              )}
            </div>
          </div>
          {canSeeMembers && (
            <button
              type="button"
              className="chapter-or-character__members-button"
              onClick={() => setMembersOpen(true)}
            >
              {t('members.title')} · {activeCampaign.members.length}
            </button>
          )}
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

      {activeCampaign && isDm && (
        <button
          type="button"
          className="chapter-or-character__delete-campaign"
          onClick={() => setConfirmingDelete(true)}
          aria-label={t('profile.confirmDeleteTitle')}
        >
          🗑 {t('common.delete')}
        </button>
      )}

      {activeCampaign && (
        <MembersPanel
          open={membersOpen}
          campaignId={activeCampaign.id}
          onClose={() => setMembersOpen(false)}
        />
      )}

      <ConfirmModal
        open={confirmingDelete}
        title={t('profile.confirmDeleteTitle')}
        description={
          activeCampaign
            ? t('profile.confirmDeleteDescription', { name: activeCampaign.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteCampaign}
        onClose={() => setConfirmingDelete(false)}
      />

      <ConfirmModal
        open={confirmingVisibility}
        title={
          activeCampaign?.visibility === 'public'
            ? t('profile.confirmMakePrivateTitle')
            : t('profile.confirmMakePublicTitle')
        }
        description={
          activeCampaign
            ? t(
                activeCampaign.visibility === 'public'
                  ? 'profile.confirmMakePrivateDescription'
                  : 'profile.confirmMakePublicDescription',
                { name: activeCampaign.name }
              )
            : ''
        }
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleToggleVisibility}
        onClose={() => setConfirmingVisibility(false)}
      />
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
