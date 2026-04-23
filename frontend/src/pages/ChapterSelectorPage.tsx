import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/shared/Button';
import { TextBox } from '../components/shared/TextBox';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { useCampaigns, type Chapter } from '../context/CampaignContext';
import { useUndoableState } from '../hooks/useUndoableState';

/**
 * Página /chapterSelector.
 *
 * Lista de capítulos de la campaña activa. Características:
 *   · Botón "+" arriba para añadir un capítulo nuevo.
 *   · Los capítulos nuevos se crean SIN nombre y entran directamente
 *     en modo edición. Si el usuario no escribe nada, al perder el
 *     foco se aplica "Untitled Chapter N".
 *   · Icono lápiz a la izquierda de la papelera para editar el nombre.
 *   · Click derecho sobre la fila también edita el nombre.
 *   · Clic en el título navega a /chapter/:id.
 *   · Papelera abre ConfirmModal antes de eliminar.
 *   · Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z para deshacer/rehacer (a nivel
 *     de lista de capítulos).
 *
 * Estado: la lista se sincroniza con la campaña activa del contexto
 * global pero se mantiene localmente en un hook undoable para permitir
 * deshacer. Cualquier cambio de lista se propaga al contexto.
 */
export function ChapterSelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCampaign, updateCampaign } = useCampaigns();

  const seedChapters: Chapter[] = activeCampaign?.chapters ?? [];

  // Mantengo un historial undoable local sobre la lista de capítulos.
  const [chapters, setChapters, history] = useUndoableState<Chapter[]>(seedChapters);

  // Al cambiar de campaña activa, resetea el historial.
  useEffect(() => {
    history.reset(seedChapters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign?.id]);

  // Propaga cambios de la lista al contexto global cuando difieren.
  useEffect(() => {
    if (!activeCampaign) return;
    const same =
      chapters.length === activeCampaign.chapters.length &&
      chapters.every((c, i) => {
        const other = activeCampaign.chapters[i];
        return other && other.id === c.id && other.title === c.title;
      });
    if (!same) {
      updateCampaign(activeCampaign.id, { chapters });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters]);

  // Modal de confirmación de borrado.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteTitle =
    chapters.find((c) => c.id === pendingDeleteId)?.title ??
    t('common.untitled');

  // Capítulo en modo edición de nombre (id del capítulo + valor actual
  // del input). Null → nadie en edición.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus al entrar en modo edición.
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleAdd = () => {
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
    };
    setChapters((prev) => [...prev, newChapter]);
    setEditingId(newChapter.id);
    setEditingValue('');
  };

  const startEdit = (chapter: Chapter) => {
    setEditingId(chapter.id);
    setEditingValue(chapter.title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const value = editingValue.trim();
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id !== editingId) return c;
        if (value) return { ...c, title: value };
        // Sin nombre → "Untitled Chapter N" donde N es 1-based según
        // la posición actual en la lista.
        const index = prev.findIndex((ch) => ch.id === editingId);
        return {
          ...c,
          title: t('chapterSelector.untitledChapter', { number: index + 1 }),
        };
      })
    );
    setEditingId(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleOpenChapter = (id: string) => {
    navigate(`/chapter/${id}`);
  };

  const handleRowClick = (_event: MouseEvent, chapter: Chapter) => {
    if (editingId === chapter.id) return;
    handleOpenChapter(chapter.id);
  };

  const handleRowContextMenu = (event: MouseEvent, chapter: Chapter) => {
    // Click derecho → editar nombre inline.
    event.preventDefault();
    startEdit(chapter);
  };

  const handleRequestDelete = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    setPendingDeleteId(id);
  };

  const handleEditIconClick = (event: MouseEvent, chapter: Chapter) => {
    event.stopPropagation();
    startEdit(chapter);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setChapters((prev) => prev.filter((c) => c.id !== pendingDeleteId));
    setPendingDeleteId(null);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenChapter(id);
    }
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  const hasChapters = chapters.length > 0;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <section className="chapter-selector" aria-labelledby="chapter-heading">
      <h1 id="chapter-heading" className="visually-hidden">
        {t('chapter.events')}
      </h1>

      <div className="chapter-selector__add">
        <Button
          aria-label={t('chapterSelector.addChapter')}
          onClick={handleAdd}
          className="chapter-selector__add-button"
        >
          +
        </Button>
      </div>

      <div className="chapter-selector__list-wrapper">
        <TextBox>
          {hasChapters ? (
            <ul className="chapter-selector__list" aria-label={t('chapter.events')}>
              {chapters.map((chapter) => {
                const isEditing = editingId === chapter.id;
                return (
                  <li key={chapter.id} className="chapter-selector__item">
                    <div
                      className="chapter-selector__row"
                      role="button"
                      tabIndex={0}
                      aria-label={chapter.title || t('common.untitled')}
                      onClick={(e) => handleRowClick(e, chapter)}
                      onContextMenu={(e) => handleRowContextMenu(e, chapter)}
                      onKeyDown={(e) => handleRowKeyDown(e, chapter.id)}
                    >
                      <div className="chapter-selector__row-text">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            className="chapter-selector__edit-input"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleEditKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={t('chapterSelector.editName')}
                          />
                        ) : (
                          <TranslucidTextBox>
                            {chapter.title || (
                              <em>{t('common.untitled')}</em>
                            )}
                          </TranslucidTextBox>
                        )}
                      </div>

                      <button
                        type="button"
                        className="chapter-selector__edit"
                        aria-label={t('chapterSelector.editName')}
                        onClick={(e) => handleEditIconClick(e, chapter)}
                      >
                        <PencilIcon />
                      </button>

                      <button
                        type="button"
                        className="chapter-selector__delete"
                        aria-label={`${t('common.delete')} ${chapter.title}`}
                        onClick={(e) => handleRequestDelete(e, chapter.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="chapter-selector__empty" role="status">
              <p className="chapter-selector__empty-title">
                {t('chapterSelector.emptyTitle')}
              </p>
              <p className="chapter-selector__empty-hint">
                {t('chapterSelector.emptyHint')}
              </p>
            </div>
          )}
        </TextBox>
      </div>

      <ConfirmModal
        open={pendingDeleteId !== null}
        title={t('chapterSelector.confirmDeleteTitle')}
        description={t('chapterSelector.confirmDeleteDescription', {
          title: pendingDeleteTitle,
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDeleteId(null)}
      />
    </section>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1zm1 2h4V5h-4zM6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9zm3 2v9h2v-9H9zm4 0v9h2v-9h-2z" />
    </svg>
  );
}

function PencilIcon() {
  return (
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
  );
}

export default ChapterSelectorPage;
