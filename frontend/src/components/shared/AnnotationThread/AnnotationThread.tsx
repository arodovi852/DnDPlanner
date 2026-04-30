import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SpoilerText } from '../Spoiler';
import { useAuth } from '../../../context/AuthContext';
import {
  useCampaigns,
  type Annotation,
} from '../../../context/CampaignContext';
import { useUsers } from '../../../context/UsersContext';

export interface AnnotationThreadProps {
  campaignId: string;
  targetType: 'character' | 'chapter';
  targetId: string;
  /** Un título opcional para la cabecera del panel. */
  title?: string;
}

/**
 * Hilo de anotaciones (notas de jugadores) asociado a un personaje o
 * un capítulo. Los jugadores añaden notas que el DM y el resto de
 * jugadores con acceso podrán ver.
 *
 * Las anotaciones soportan la sintaxis `||spoiler||` — útil si el
 * DM quiere introducir una pista censurada desde su propio rol.
 */
export function AnnotationThread({
  campaignId,
  targetType,
  targetId,
  title,
}: AnnotationThreadProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { campaigns, addAnnotation, removeAnnotation, getRole } = useCampaigns();
  const { users } = useUsers();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const [text, setText] = useState('');

  if (!campaign) return null;

  const role = user ? getRole(campaign.id, user.id) : null;
  if (!role) return null; // No miembro → no ve el hilo.

  const thread = campaign.annotations.filter(
    (a) => a.targetType === targetType && a.targetId === targetId
  );

  const canDelete = (a: Annotation) =>
    user?.id === a.userId || role === 'dm' || role === 'co-dm';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    addAnnotation(campaign.id, {
      userId: user.id,
      targetType,
      targetId,
      text: trimmed,
    });
    setText('');
  };

  const authorName = (userId: string) =>
    users.find((u) => u.id === userId)?.username ?? userId;

  return (
    <section className="annotation-thread" aria-label={t('annotations.heading')}>
      <header className="annotation-thread__header">
        <h3 className="annotation-thread__title">
          {title ?? t('annotations.heading')}
        </h3>
        <span className="annotation-thread__count">{thread.length}</span>
      </header>

      {thread.length === 0 ? (
        <p className="annotation-thread__empty">{t('annotations.empty')}</p>
      ) : (
        <ul className="annotation-thread__list">
          {thread.map((a) => (
            <li key={a.id} className="annotation-thread__item">
              <div className="annotation-thread__item-head">
                <span className="annotation-thread__author">
                  {authorName(a.userId)}
                </span>
                <time className="annotation-thread__time">
                  {new Date(a.createdAt).toLocaleString()}
                </time>
                {canDelete(a) && (
                  <button
                    type="button"
                    className="annotation-thread__delete"
                    aria-label={t('common.delete')}
                    onClick={() => removeAnnotation(campaign.id, a.id)}
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="annotation-thread__body">
                <SpoilerText text={a.text} campaignId={campaign.id} />
              </p>
            </li>
          ))}
        </ul>
      )}

      {user && (
        <form className="annotation-thread__form" onSubmit={handleSubmit}>
          <textarea
            className="annotation-thread__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('annotations.placeholder')}
            rows={2}
          />
          <button
            type="submit"
            className="annotation-thread__submit"
            disabled={!text.trim()}
          >
            {t('annotations.send')}
          </button>
        </form>
      )}
    </section>
  );
}

export default AnnotationThread;
