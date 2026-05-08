import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUndoableState } from '../../hooks/useUndoableState';
import {
  useCampaigns,
  EVENT_TYPES,
  type ChapterEventBlock as Block,
  type ChapterEventConnection as Connection,
  type EventType,
} from '../../context/CampaignContext';
import { SpoilerText } from '../../components/shared/Spoiler';

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface CanvasState {
  blocks: Block[];
  connections: Connection[];
}

type Tool =
  | 'select'
  | 'pan'
  | 'text'
  | 'create'
  | 'connect'
  | 'zoom'
  | 'notes'
  | 'redact';

const BLOCK_WIDTH = 220;
const BLOCK_HEIGHT = 150;
const DRAG_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function EventsCanvas() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const { activeCampaign, updateChapterEvents } = useCampaigns();

  const currentChapter = useMemo(() => {
    if (!activeCampaign || !chapterId) return null;
    return activeCampaign.chapters.find((c) => c.id === chapterId) ?? null;
  }, [activeCampaign, chapterId]);

  const [state, setState, history] = useUndoableState<CanvasState>({
    blocks: currentChapter?.events.blocks ?? [],
    connections: currentChapter?.events.connections ?? [],
  });
  const { blocks, connections } = state;

  // Reset cuando cambia el capítulo, cargando los eventos persistidos.
  useEffect(() => {
    history.reset({
      blocks: currentChapter?.events.blocks ?? [],
      connections: currentChapter?.events.connections ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, activeCampaign?.id]);

  // Persistir eventos en la campaña conforme cambian.
  useEffect(() => {
    if (!activeCampaign || !chapterId) return;
    // Evita escrituras redundantes si el estado coincide con el persistido.
    const persisted = currentChapter?.events;
    if (
      persisted &&
      persisted.blocks === blocks &&
      persisted.connections === connections
    ) {
      return;
    }
    updateChapterEvents(activeCampaign.id, chapterId, { blocks, connections });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, connections]);

  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [eventType, setEventType] = useState<EventType>('MainStory');
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const [dragCursor, setDragCursor] = useState<{ x: number; y: number } | null>(
    null
  );

  const dragRef = useRef<
    | {
        kind: 'block';
        blockId: string;
        startPointerX: number;
        startPointerY: number;
        startBlockX: number;
        startBlockY: number;
      }
    | {
        kind: 'pan';
        startPointerX: number;
        startPointerY: number;
        startPanX: number;
        startPanY: number;
      }
    | {
        kind: 'zoom';
        startPointerY: number;
        startZoom: number;
        originX: number;
        originY: number;
      }
    | {
        kind: 'connect';
        fromId: string;
        startClientX: number;
        startClientY: number;
        moved: boolean;
      }
    | null
  >(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef<HTMLTextAreaElement>(null);

  // ------------------------------------------------------------------
  // Helpers de mutación
  // ------------------------------------------------------------------

  const mutate = useCallback(
    (updater: (prev: CanvasState) => CanvasState) => {
      setState(updater);
    },
    [setState]
  );

  const bringToFront = (blockId: string) => {
    mutate((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1 || idx === prev.blocks.length - 1) return prev;
      const reordered = [...prev.blocks];
      const [block] = reordered.splice(idx, 1);
      reordered.push(block);
      return { ...prev, blocks: reordered };
    });
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    mutate((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const deleteBlock = (id: string) => {
    mutate((prev) => ({
      blocks: prev.blocks.filter((b) => b.id !== id),
      connections: prev.connections.filter(
        (c) => c.from !== id && c.to !== id
      ),
    }));
    if (editingBlockId === id) {
      setEditingBlockId(null);
      setEditingText('');
    }
    if (connectFrom === id) setConnectFrom(null);
  };

  const createBlockAt = (worldX: number, worldY: number) => {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const text = '';
    mutate((prev) => ({
      ...prev,
      blocks: [
        ...prev.blocks,
        {
          id,
          x: worldX - BLOCK_WIDTH / 2,
          y: worldY - BLOCK_HEIGHT / 2,
          text,
          type: eventType,
        },
      ],
    }));
    setEditingBlockId(id);
    setEditingText(text);
  };

  const addConnection = (from: string, to: string) => {
    if (from === to) return;
    mutate((prev) => {
      if (prev.connections.some((c) => c.from === from && c.to === to)) return prev;
      return {
        ...prev,
        connections: [
          ...prev.connections,
          {
            id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            from,
            to,
          },
        ],
      };
    });
  };

  const commitEditing = () => {
    if (!editingBlockId) return;
    updateBlock(editingBlockId, { text: editingText });
    setEditingBlockId(null);
    setEditingText('');
  };

  /**
   * Aplica/quita marcadores `||...||` al texto de un bloque para censurarlo
   * a los jugadores. El DM siempre ve el contenido. Si el texto del bloque
   * ya está envuelto en spoilers, se quitan; en caso contrario se envuelve
   * todo el contenido.
   */
  const toggleBlockRedacted = (block: Block) => {
    const text = block.text ?? '';
    const trimmed = text.trim();
    let next: string;
    if (trimmed.startsWith('||') && trimmed.endsWith('||') && trimmed.length >= 4) {
      next = trimmed.slice(2, -2);
    } else if (trimmed.length === 0) {
      next = '||secreto||';
    } else {
      next = `||${trimmed}||`;
    }
    updateBlock(block.id, { text: next });
  };

  useEffect(() => {
    if (editingBlockId) {
      editingRef.current?.focus();
      editingRef.current?.select();
    }
  }, [editingBlockId]);

  const pointerToWorld = (clientX: number, clientY: number, viewportEl: HTMLElement) => {
    const rect = viewportEl.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: (localX - pan.x) / zoom,
      y: (localY - pan.y) / zoom,
    };
  };

  const applyZoomAtPoint = (nextZoom: number, localX: number, localY: number) => {
    const clampedZoom = clamp(nextZoom, 0.3, 3);
    setPan((prev) => ({
      x: localX - ((localX - prev.x) * clampedZoom) / zoom,
      y: localY - ((localY - prev.y) * clampedZoom) / zoom,
    }));
    setZoom(clampedZoom);
  };

  // ------------------------------------------------------------------
  // Handlers: viewport
  // ------------------------------------------------------------------

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;

    if (tool === 'pan') {
      dragRef.current = {
        kind: 'pan',
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      viewport.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'zoom') {
      const rect = viewport.getBoundingClientRect();
      dragRef.current = {
        kind: 'zoom',
        startPointerY: event.clientY,
        startZoom: zoom,
        originX: event.clientX - rect.left,
        originY: event.clientY - rect.top,
      };
      viewport.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'create') {
      const world = pointerToWorld(event.clientX, event.clientY, viewport);
      createBlockAt(world.x, world.y);
      return;
    }

    if (tool === 'connect') {
      setConnectFrom(null);
    }
  };

  const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === 'block') {
      const dx = (event.clientX - drag.startPointerX) / zoom;
      const dy = (event.clientY - drag.startPointerY) / zoom;
      updateBlock(drag.blockId, {
        x: drag.startBlockX + dx,
        y: drag.startBlockY + dy,
      });
    } else if (drag.kind === 'pan') {
      setPan({
        x: drag.startPanX + (event.clientX - drag.startPointerX),
        y: drag.startPanY + (event.clientY - drag.startPointerY),
      });
    } else if (drag.kind === 'zoom') {
      const deltaY = drag.startPointerY - event.clientY;
      const factor = Math.exp(deltaY / 150);
      applyZoomAtPoint(drag.startZoom * factor, drag.originX, drag.originY);
    } else if (drag.kind === 'connect') {
      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.moved = true;
        setConnectFrom(drag.fromId);
      }
      if (drag.moved) {
        const viewport = viewportRef.current;
        if (viewport) {
          const world = pointerToWorld(event.clientX, event.clientY, viewport);
          setDragCursor(world);
        }
      }
    }
  };

  const handleViewportPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.kind === 'connect') {
      if (drag.moved) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        const blockEl = el?.closest('[data-block-id]') as HTMLElement | null;
        const targetId = blockEl?.dataset.blockId;
        if (targetId && targetId !== drag.fromId) {
          addConnection(drag.fromId, targetId);
        }
        setConnectFrom(null);
      }
      setDragCursor(null);
    }

    dragRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoomAtPoint(zoom * factor, event.clientX - rect.left, event.clientY - rect.top);
  };

  // ------------------------------------------------------------------
  // Handlers: bloque
  // ------------------------------------------------------------------

  const handleBlockPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    block: Block
  ) => {
    if (editingBlockId === block.id) return;

    event.stopPropagation();
    bringToFront(block.id);

    if (tool === 'select') {
      dragRef.current = {
        kind: 'block',
        blockId: block.id,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startBlockX: block.x,
        startBlockY: block.y,
      };
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      return;
    }

    if (tool === 'connect') {
      dragRef.current = {
        kind: 'connect',
        fromId: block.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      };
    }
  };

  const handleBlockClick = (event: ReactMouseEvent<HTMLDivElement>, block: Block) => {
    if (editingBlockId === block.id) return;
    event.stopPropagation();

    if (tool === 'text') {
      setEditingBlockId(block.id);
      setEditingText(block.text);
      return;
    }

    if (tool === 'redact') {
      toggleBlockRedacted(block);
      return;
    }

    if (tool === 'connect') {
      if (connectFrom === null) {
        setConnectFrom(block.id);
      } else if (connectFrom === block.id) {
        setConnectFrom(null);
      } else {
        addConnection(connectFrom, block.id);
        setConnectFrom(null);
      }
    }
  };

  const handleBlockDoubleClick = (
    event: ReactMouseEvent<HTMLDivElement>,
    block: Block
  ) => {
    event.stopPropagation();
    setEditingBlockId(block.id);
    setEditingText(block.text);
  };

  const handleBlockContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
    block: Block
  ) => {
    event.preventDefault();
    event.stopPropagation();
    deleteBlock(block.id);
  };

  const handleEditingKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setEditingBlockId(null);
      setEditingText('');
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitEditing();
    }
  };

  const handleTypeChange = (
    event: ChangeEvent<HTMLSelectElement>,
    block: Block
  ) => {
    event.stopPropagation();
    updateBlock(block.id, { type: event.target.value as EventType });
  };

  // ------------------------------------------------------------------
  // Derivados
  // ------------------------------------------------------------------

  const blockById = useMemo(() => {
    const map = new Map<string, Block>();
    for (const block of blocks) map.set(block.id, block);
    return map;
  }, [blocks]);

  const notesOrder = useMemo(
    () => buildNotesOrder(blocks, connections),
    [blocks, connections]
  );

  const handleChapterSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    if (id && id !== chapterId) {
      navigate(`/chapter/${id}`);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="events-canvas">
      {activeCampaign && activeCampaign.chapters.length > 0 && (
        <div className="events-canvas__chapter-bar">
          <label className="events-canvas__chapter-select">
            <span className="events-canvas__chapter-select-label">
              {t('chapter.currentChapter')}
            </span>
            <select
              value={chapterId ?? ''}
              onChange={handleChapterSelect}
              aria-label={t('chapter.currentChapter')}
            >
              {activeCampaign.chapters.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.title || t('chapterSelector.untitledChapter', { number: i + 1 })}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tool === 'notes' ? (
        <div className="events-canvas__notes">
          {notesOrder.length === 0 ? (
            <p className="events-canvas__notes-empty">{t('chapter.emptyNotes')}</p>
          ) : (
            notesOrder.map((entry, index) => (
              <div
                key={entry.block.id}
                className={
                  entry.isAlt
                    ? 'events-canvas__note events-canvas__note--alt'
                    : 'events-canvas__note'
                }
              >
                <span className="events-canvas__note-index">
                  {entry.isAlt ? `Alt ${index}` : `${index + 1}.`}
                </span>
                <span className="events-canvas__note-type">
                  {t(`chapter.eventTypes.${entry.block.type}`)}
                </span>
                <p className="events-canvas__note-text">
                  <SpoilerText text={entry.block.text} />
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={`events-canvas__viewport events-canvas__viewport--tool-${tool}`}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="events-canvas__world"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg className="events-canvas__edges" aria-hidden="true">
              <defs>
                <marker
                  id="events-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
                </marker>
              </defs>
              {connections.map((conn) => {
                const from = blockById.get(conn.from);
                const to = blockById.get(conn.to);
                if (!from || !to) return null;
                const fx = from.x + BLOCK_WIDTH / 2;
                const fy = from.y + BLOCK_HEIGHT / 2;
                const tx = to.x + BLOCK_WIDTH / 2;
                const ty = to.y + BLOCK_HEIGHT / 2;
                const angle = Math.atan2(ty - fy, tx - fx);
                const pad = Math.max(BLOCK_WIDTH, BLOCK_HEIGHT) / 2 + 4;
                const endX = tx - Math.cos(angle) * pad;
                const endY = ty - Math.sin(angle) * pad;
                return (
                  <line
                    key={conn.id}
                    x1={fx}
                    y1={fy}
                    x2={endX}
                    y2={endY}
                    stroke="var(--color-border)"
                    strokeWidth={3}
                    markerEnd="url(#events-arrow)"
                  />
                );
              })}

              {dragCursor && connectFrom && blockById.has(connectFrom) && (
                <line
                  x1={blockById.get(connectFrom)!.x + BLOCK_WIDTH / 2}
                  y1={blockById.get(connectFrom)!.y + BLOCK_HEIGHT / 2}
                  x2={dragCursor.x}
                  y2={dragCursor.y}
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  strokeDasharray="4 6"
                />
              )}
            </svg>

            {blocks.map((block) => {
              const isEditing = editingBlockId === block.id;
              const isSelected = connectFrom === block.id;
              return (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  className={
                    'events-canvas__block' +
                    (isSelected ? ' events-canvas__block--selected' : '') +
                    (isEditing ? ' events-canvas__block--editing' : '')
                  }
                  style={{
                    left: block.x,
                    top: block.y,
                    width: BLOCK_WIDTH,
                    height: BLOCK_HEIGHT,
                  }}
                  onPointerDown={(event) => handleBlockPointerDown(event, block)}
                  onClick={(event) => handleBlockClick(event, block)}
                  onDoubleClick={(event) => handleBlockDoubleClick(event, block)}
                  onContextMenu={(event) => handleBlockContextMenu(event, block)}
                >
                  <div className="events-canvas__block-header">
                    <span className="events-canvas__block-type-label">
                      {t(`chapter.eventTypes.${block.type}`)}
                    </span>
                    <span className="events-canvas__block-caret" aria-hidden="true">
                      ▾
                    </span>
                    <select
                      className="events-canvas__block-type-select"
                      value={block.type}
                      onChange={(event) => handleTypeChange(event, block)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.stopPropagation()}
                      aria-label={t('chapter.tools.create')}
                    >
                      {EVENT_TYPES.map((key) => (
                        <option key={key} value={key}>
                          {t(`chapter.eventTypes.${key}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="events-canvas__block-body">
                    {isEditing ? (
                      <textarea
                        ref={editingRef}
                        className="events-canvas__block-edit"
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={handleEditingKeyDown}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <p className="events-canvas__block-text">
                        <SpoilerText text={block.text} />
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      <div className="events-canvas__toolbar" role="toolbar" aria-label="Tools">
        <ToolButton current={tool} value="select" label={t('chapter.tools.select')} onSelect={setTool}>
          <CursorIcon />
        </ToolButton>
        <ToolButton current={tool} value="pan" label={t('chapter.tools.pan')} onSelect={setTool}>
          <MoveIcon />
        </ToolButton>
        <ToolButton current={tool} value="text" label={t('chapter.tools.text')} onSelect={setTool}>
          <TextIcon />
        </ToolButton>
        <div className="events-canvas__create-wrapper">
          <ToolButton
            current={tool}
            value="create"
            label={t('chapter.tools.create')}
            onSelect={setTool}
          >
            <SquareIcon />
          </ToolButton>
          {tool === 'create' && (
            <select
              className="events-canvas__create-select"
              aria-label={t('chapter.tools.create')}
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
            >
              {EVENT_TYPES.map((key) => (
                <option key={key} value={key}>
                  {t(`chapter.eventTypes.${key}`)}
                </option>
              ))}
            </select>
          )}
        </div>
        <ToolButton current={tool} value="connect" label={t('chapter.tools.connect')} onSelect={setTool}>
          <LineIcon />
        </ToolButton>
        <ToolButton current={tool} value="redact" label={t('chapter.tools.redact')} onSelect={setTool}>
          <RedactIcon />
        </ToolButton>
        <ToolButton current={tool} value="zoom" label={t('chapter.tools.zoom')} onSelect={setTool}>
          <ZoomIcon />
        </ToolButton>
        <ToolButton current={tool} value="notes" label={t('chapter.tools.notes')} onSelect={setTool}>
          <NotesIcon />
        </ToolButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolButtonProps {
  current: Tool;
  value: Tool;
  label: string;
  onSelect: (tool: Tool) => void;
  children: React.ReactNode;
}

function ToolButton({ current, value, label, onSelect, children }: ToolButtonProps) {
  const active = current === value;
  return (
    <button
      type="button"
      className={
        active
          ? 'events-canvas__tool events-canvas__tool--active'
          : 'events-canvas__tool'
      }
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notas: orden jerárquico
// ---------------------------------------------------------------------------

interface NoteEntry {
  block: Block;
  isAlt: boolean;
}

function buildNotesOrder(blocks: Block[], connections: Connection[]): NoteEntry[] {
  if (blocks.length === 0) return [];

  const incoming = new Map<string, number>();
  for (const block of blocks) incoming.set(block.id, 0);
  for (const conn of connections) {
    incoming.set(conn.to, (incoming.get(conn.to) ?? 0) + 1);
  }

  const roots = blocks.filter((block) => (incoming.get(block.id) ?? 0) === 0);
  const startId = (roots[0] ?? blocks[0]).id;

  const outgoingMap = new Map<string, string[]>();
  for (const conn of connections) {
    const list = outgoingMap.get(conn.from) ?? [];
    list.push(conn.to);
    outgoingMap.set(conn.from, list);
  }

  const visited = new Set<string>();
  const mainPath: Block[] = [];

  let currentId: string | undefined = startId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const block = blocks.find((b) => b.id === currentId);
    if (!block) break;
    mainPath.push(block);
    currentId = outgoingMap.get(currentId)?.[0];
  }

  const altEntries: NoteEntry[] = blocks
    .filter((block) => !visited.has(block.id))
    .map((block) => ({ block, isAlt: true }));

  return [...mainPath.map((block) => ({ block, isAlt: false })), ...altEntries];
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Iconos
// ---------------------------------------------------------------------------

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M5 3l7 17 2.5-7.5L22 10z" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M5 4h14v3h-2V6h-4v12h2v2H9v-2h2V6H7v1H5z" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M4 20L20 4l1.4 1.4L5.4 21.4z" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 1-5.3 14l-3.4 3.4-1.4-1.4L3.3 14.6A8 8 0 0 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 3h2v2h2v2h-2v2H9v-2H7V9h2z" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M12 2l4 4h-3v5h5V8l4 4-4 4v-3h-5v5h3l-4 4-4-4h3v-5H6v3l-4-4 4-4v3h5V6H8z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M6 2h9l5 5v15H6zm8 1v5h5zM8 12h8v2H8zm0 4h8v2H8z" />
    </svg>
  );
}

function RedactIcon() {
  // Marca de censura: barras negras tipo "documento clasificado".
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <rect x="3" y="6" width="14" height="3" rx="0.5" />
      <rect x="3" y="11" width="18" height="3" rx="0.5" />
      <rect x="3" y="16" width="10" height="3" rx="0.5" />
    </svg>
  );
}
