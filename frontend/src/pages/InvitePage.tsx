import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/shared/Button';
import { AuthModal } from '../components/shared/AuthModal';
import { useAuth } from '../context/AuthContext';
import { useCampaigns } from '../context/CampaignContext';

/**
 * /invite/:token — pantalla de aceptación de invitación a campaña.
 *
 * Flujo:
 *   · Busca la campaña por `shareToken`. Si no existe, muestra error.
 *   · Si el usuario NO está autenticado, abre el AuthModal. Tras login
 *     el propio flujo de aceptación se ejecuta automáticamente.
 *   · Si está autenticado, muestra resumen de la campaña y un botón
 *     "Unirme" que llama a `acceptInvite(token, userId, 'player')` y
 *     navega a /chapterOrCharacter.
 */
export function InvitePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { findByShareToken, acceptInvite, setActiveCampaign } = useCampaigns();

  const campaign = useMemo(() => findByShareToken(token), [findByShareToken, token]);
  const [authOpen, setAuthOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Si ya estoy logueado y el token es válido, ofrezco unirme; si además
  // acabo de loguearme mientras la pantalla estaba abierta, no auto-uno —
  // prefiero que el usuario confirme.
  useEffect(() => {
    if (isAuthenticated) setAuthOpen(false);
  }, [isAuthenticated]);

  if (!token || !campaign) {
    return (
      <section className="invite-page" aria-labelledby="invite-heading">
        <h1 id="invite-heading" className="invite-page__title">
          {t('invite.invalidTitle')}
        </h1>
        <p className="invite-page__body">{t('invite.invalidBody')}</p>
        <Button onClick={() => navigate('/main')}>{t('invite.goHome')}</Button>
      </section>
    );
  }

  if (accepted) {
    return (
      <section className="invite-page" aria-labelledby="invite-heading">
        <h1 id="invite-heading" className="invite-page__title">
          {t('invite.joinedTitle', { name: campaign.name })}
        </h1>
        <p className="invite-page__body">{t('invite.joinedBody')}</p>
        <div className="invite-page__actions">
          <Button
            onClick={() => {
              setActiveCampaign(campaign.id);
              navigate('/chapterOrCharacter');
            }}
          >
            {t('invite.openCampaign')}
          </Button>
        </div>
      </section>
    );
  }

  const handleJoin = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const result = acceptInvite(token, user.id, 'player');
    if (result) {
      setAccepted(true);
    }
  };

  return (
    <section className="invite-page" aria-labelledby="invite-heading">
      <h1 id="invite-heading" className="invite-page__title">
        {t('invite.title', { name: campaign.name })}
      </h1>
      <p className="invite-page__body">{t('invite.body')}</p>
      <dl className="invite-page__meta">
        <dt>{t('invite.members')}</dt>
        <dd>{campaign.members.length}</dd>
        <dt>{t('invite.chapters')}</dt>
        <dd>{campaign.chapters.length}</dd>
      </dl>
      <div className="invite-page__actions">
        <Button onClick={handleJoin}>
          {isAuthenticated ? t('invite.join') : t('invite.loginToJoin')}
        </Button>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}

export default InvitePage;
