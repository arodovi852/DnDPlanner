import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EventsCanvas } from './EventsCanvas';
import { MapCanvas } from './MapCanvas';
import { AnnotationThread } from '../../components/shared/AnnotationThread';
import { useCampaigns } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';

type TabKey = 'events' | 'map';

/**
 * Página /chapter/:chapterId.
 *
 * Estructura visual (imagen 3 del brief):
 *   .chapter-page
 *     .chapter-page__tabs      → pestañas Events/Map a la izquierda
 *     .chapter-page__folder    → marco rosa grueso (ocupa toda la altura)
 *       .chapter-page__canvas  → área interna crema con el contenido
 *
 * Las pestañas "se apoyan" sobre el borde superior del folder con un
 * negative margin para crear la ilusión de carpeta.
 */
export function ChapterPage() {
  const { t } = useTranslation();
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuth();
  const { activeCampaign, getRole } = useCampaigns();
  const [tab, setTab] = useState<TabKey>('events');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);

  const role = activeCampaign && user ? getRole(activeCampaign.id, user.id) : null;

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = folderRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  return (
    <section className="chapter-page" aria-labelledby="chapter-page-heading">
      <h1 id="chapter-page-heading" className="visually-hidden">
        Chapter {chapterId}
      </h1>

      <div className="chapter-page__tabs" role="tablist" aria-label="Chapter views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'events'}
          className={
            tab === 'events'
              ? 'chapter-page__tab chapter-page__tab--active'
              : 'chapter-page__tab'
          }
          onClick={() => setTab('events')}
        >
          {t('chapter.events')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'map'}
          className={
            tab === 'map'
              ? 'chapter-page__tab chapter-page__tab--active'
              : 'chapter-page__tab'
          }
          onClick={() => setTab('map')}
        >
          {t('chapter.map')}
        </button>
      </div>

      <div ref={folderRef} className="chapter-page__folder" role="tabpanel">
        <button
          type="button"
          className="chapter-page__fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? t('chapter.exitFullscreen') : t('chapter.fullscreen')}
          title={isFullscreen ? t('chapter.exitFullscreen') : t('chapter.fullscreen')}
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </button>

        <div className="chapter-page__canvas">
          {tab === 'events' ? <EventsCanvas /> : <MapCanvas />}
        </div>
      </div>

      {activeCampaign && chapterId && role && (
        <AnnotationThread
          campaignId={activeCampaign.id}
          targetType="chapter"
          targetId={chapterId}
          title={t('annotations.chapterHeading')}
        />
      )}
    </section>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1rem" height="1.1rem" fill="currentColor" aria-hidden="true">
      <path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zm-8 14H4v-6h2v4h4v2zm12 0v-6h-2v4h-4v2h6z" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1rem" height="1.1rem" fill="currentColor" aria-hidden="true">
      <path d="M6 6H4v4h6V4H8v2H6zm10 0h-2V4h-2v6h6V6h-2zM4 14v4h4v-2H6v-2H4zm16 0h-2v2h-2v2h4v-4z" />
    </svg>
  );
}

export default ChapterPage;
