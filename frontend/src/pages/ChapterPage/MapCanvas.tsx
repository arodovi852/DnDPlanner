import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useUndoableState } from '../../hooks/useUndoableState';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type MapTool =
  | 'select'
  | 'pan'
  | 'character'
  | 'terrain'
  | 'enemy'
  | 'zoom'
  | 'simplify';

type EntityCategory = 'character' | 'terrain' | 'enemy';

interface Entity {
  subtype: string;
  category: EntityCategory;
  label: string;
  boss?: boolean;
  stats?: { hp: number; armor: number; initiative: number };
}

interface EntityOption {
  value: string;
  label: string;
  boss?: boolean;
  stats?: { hp: number; armor: number; initiative: number };
}

interface MapState {
  cells: Record<string, Entity>;
  cols: number;
  rows: number;
}

const CELL_SIZE_PX = 32; // = 2rem

const CHARACTER_OPTIONS: EntityOption[] = [
  { value: 'player-1', label: 'Player 1', stats: { hp: 20, armor: 14, initiative: 2 } },
  { value: 'player-2', label: 'Player 2', stats: { hp: 22, armor: 13, initiative: 1 } },
  { value: 'player-3', label: 'Player 3', stats: { hp: 18, armor: 15, initiative: 3 } },
  { value: 'npc-mercader', label: 'NPC · Merchant', stats: { hp: 8, armor: 10, initiative: 0 } },
  { value: 'npc-guardia', label: 'NPC · Guard', stats: { hp: 14, armor: 16, initiative: 1 } },
];

const TERRAIN_OPTIONS: EntityOption[] = [
  { value: 'boundary', label: 'Boundary' },
  { value: 'wall', label: 'Wall / Rock' },
  { value: 'object', label: 'Object (star)' },
  { value: 'trap', label: 'Trap' },
];

const ENEMY_OPTIONS: EntityOption[] = [
  { value: 'goblin', label: 'Goblin', stats: { hp: 7, armor: 13, initiative: 2 } },
  { value: 'orco', label: 'Orc', stats: { hp: 15, armor: 13, initiative: 1 } },
  { value: 'esqueleto', label: 'Skeleton', stats: { hp: 10, armor: 13, initiative: 2 } },
  { value: 'dragon', label: 'Boss · Dragon', boss: true, stats: { hp: 120, armor: 19, initiative: 4 } },
];

const cellKey = (x: number, y: number) => `${x}-${y}`;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Editor de mapa.
 *
 * Reglas:
 *   · Tamaño por defecto 15×15, configurable (1–40).
 *   · El mapa se centra al montar el componente calculando el pan
 *     inicial según el tamaño real del viewport. A partir de ese
 *     momento la fórmula de zoom funciona "al punto donde apunta el
 *     cursor" (porque el transform-origin es 0 0 y el pan contiene
 *     la compensación de centrado).
 *   · Click izquierdo con tool de colocación → coloca; mantener +
 *     arrastrar = paint mode.
 *   · Click derecho → elimina; mantener + arrastrar = paint-erase.
 *   · Doble click izquierdo sobre personaje / enemigo → popup stats.
 *   · Hover sobre celda ocupada → tooltip con el nombre + categoría.
 *   · Dos entidades NO comparten celda.
 *   · Undo/redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) vía useUndoableState.
 */
export function MapCanvas() {
  const { t } = useTranslation();

  const [state, setState] = useUndoableState<MapState>({
    cells: {},
    cols: 15,
    rows: 15,
  });
  const { cells, cols, rows } = state;

  const [tool, setTool] = useState<MapTool>('select');
  const [selectedOption, setSelectedOption] = useState<string>(CHARACTER_OPTIONS[0].value);
  const [query, setQuery] = useState('');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);

  // Refs y centrado inicial.
  const viewportRef = useRef<HTMLDivElement>(null);
  const didInitialCenterRef = useRef(false);

  useLayoutEffect(() => {
    if (didInitialCenterRef.current) return;
    const el = viewportRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    if (clientWidth === 0 || clientHeight === 0) return;
    const gridWidth = cols * CELL_SIZE_PX;
    const gridHeight = rows * CELL_SIZE_PX;
    setPan({
      x: (clientWidth - gridWidth) / 2,
      y: (clientHeight - gridHeight) / 2,
    });
    didInitialCenterRef.current = true;
  });

  // Viewport drag state (pan / zoom-drag).
  const viewportDragRef = useRef<
    | { kind: 'pan'; startPointerX: number; startPointerY: number; startPanX: number; startPanY: number }
    | { kind: 'zoom'; startPointerY: number; startZoom: number; originX: number; originY: number }
    | null
  >(null);

  // Paint / erase state.
  const paintingRef = useRef(false);
  const erasingRef = useRef(false);

  // Tooltip + stats popup.
  const [tooltip, setTooltip] = useState<
    | { x: number; y: number; text: string }
    | null
  >(null);
  const [statsPopup, setStatsPopup] = useState<
    | { key: string; entity: Entity; stats: NonNullable<Entity['stats']> }
    | null
  >(null);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const mutate = (updater: (prev: MapState) => MapState) => setState(updater);

  const setCells = (next: Record<string, Entity>) => {
    mutate((prev) => ({ ...prev, cells: next }));
  };

  const placeAt = (x: number, y: number) => {
    if (!isPlacementTool(tool)) return;
    const key = cellKey(x, y);
    if (cells[key]) return;
    const options = pickOptions(tool as EntityCategory);
    const option = options.find((o) => o.value === selectedOption);
    if (!option) return;
    setCells({
      ...cells,
      [key]: {
        category: tool as EntityCategory,
        subtype: option.value,
        label: option.label,
        boss: option.boss,
        stats: option.stats,
      },
    });
  };

  const removeAt = (x: number, y: number) => {
    const key = cellKey(x, y);
    if (!cells[key]) return;
    const next = { ...cells };
    delete next[key];
    setCells(next);
    if (selectedCellKey === key) setSelectedCellKey(null);
  };

  const selectAt = (x: number, y: number) => {
    const key = cellKey(x, y);
    setSelectedCellKey(cells[key] ? key : null);
  };

  const removeSelected = () => {
    if (!selectedCellKey || !cells[selectedCellKey]) return;
    const next = { ...cells };
    delete next[selectedCellKey];
    setCells(next);
    setSelectedCellKey(null);
  };

  const handleToolChange = (nextTool: MapTool) => {
    setTool(nextTool);
    setQuery('');
    if (nextTool === 'character') setSelectedOption(CHARACTER_OPTIONS[0].value);
    else if (nextTool === 'terrain') setSelectedOption(TERRAIN_OPTIONS[0].value);
    else if (nextTool === 'enemy') setSelectedOption(ENEMY_OPTIONS[0].value);
  };

  // Aplica un zoom nuevo conservando el punto (localX, localY) bajo el
  // cursor. Funciona porque `__grid` está en `left:0;top:0` con
  // transform-origin en 0 0: el pan contiene la compensación.
  const applyZoomAtPoint = (nextZoom: number, localX: number, localY: number) => {
    const clampedZoom = clamp(nextZoom, 0.3, 3);
    setPan((prev) => ({
      x: localX - ((localX - prev.x) * clampedZoom) / zoom,
      y: localY - ((localY - prev.y) * clampedZoom) / zoom,
    }));
    setZoom(clampedZoom);
  };

  // ------------------------------------------------------------------
  // Handlers del viewport (pan / zoom / wheel)
  // ------------------------------------------------------------------

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return; // zoom/pan solo con izquierdo
    if (tool === 'pan') {
      viewportDragRef.current = {
        kind: 'pan',
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === 'zoom') {
      const rect = event.currentTarget.getBoundingClientRect();
      viewportDragRef.current = {
        kind: 'zoom',
        startPointerY: event.clientY,
        startZoom: zoom,
        originX: event.clientX - rect.left,
        originY: event.clientY - rect.top,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = viewportDragRef.current;
    if (!drag) return;

    if (drag.kind === 'pan') {
      setPan({
        x: drag.startPanX + (event.clientX - drag.startPointerX),
        y: drag.startPanY + (event.clientY - drag.startPointerY),
      });
    } else {
      const deltaY = drag.startPointerY - event.clientY;
      const factor = Math.exp(deltaY / 150);
      applyZoomAtPoint(drag.startZoom * factor, drag.originX, drag.originY);
    }
  };

  const handleViewportPointerUp = () => {
    viewportDragRef.current = null;
    paintingRef.current = false;
    erasingRef.current = false;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoomAtPoint(
      zoom * factor,
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  };

  // ------------------------------------------------------------------
  // Handlers por celda
  // ------------------------------------------------------------------

  const handleCellPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    // Botón derecho → erase (simple + mantén para borrar varias).
    if (event.button === 2) {
      event.preventDefault();
      erasingRef.current = true;
      removeAt(x, y);
      return;
    }

    // Botón izquierdo con tool de colocación → paint.
    if (event.button === 0 && isPlacementTool(tool)) {
      paintingRef.current = true;
      placeAt(x, y);
    }
  };

  const handleCellPointerEnter = (x: number, y: number) => {
    if (erasingRef.current) {
      removeAt(x, y);
      return;
    }
    if (paintingRef.current && isPlacementTool(tool)) {
      placeAt(x, y);
    }
  };

  const handleCellClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    event.stopPropagation();
    if (tool === 'select') selectAt(x, y);
  };

  const handleCellDoubleClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    const key = cellKey(x, y);
    const entity = cells[key];
    if (!entity) return;
    const supportsStats =
      (entity.category === 'character' || entity.category === 'enemy') &&
      entity.stats;
    if (supportsStats && entity.stats) {
      event.preventDefault();
      event.stopPropagation();
      setStatsPopup({ key, entity, stats: { ...entity.stats } });
    }
  };

  const handleCellPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    const key = cellKey(x, y);
    const entity = cells[key];
    if (!entity) {
      if (tooltip) setTooltip(null);
      return;
    }
    const viewportEl = event.currentTarget.closest(
      '.map-canvas__viewport'
    ) as HTMLElement | null;
    if (!viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    setTooltip({
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
      text: `${entity.label} · ${t(
        `chapter.mapCategories.${entityCategoryLabelKey(entity)}`
      )}`,
    });
  };

  const handleCellPointerLeave = () => {
    setTooltip(null);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const showPicker =
    tool === 'character' || tool === 'terrain' || tool === 'enemy';
  const pickerList = showPicker ? pickOptions(tool as EntityCategory) : [];
  const filteredPicker = showPicker
    ? pickerList.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="map-canvas">
      <div className="map-canvas__controls">
        <label className="map-canvas__dim">
          {t('chapter.mapCols')}
          <input
            type="number"
            min={1}
            max={40}
            value={cols}
            onChange={(e) =>
              mutate((prev) => ({
                ...prev,
                cols: clamp(parseInt(e.target.value) || 1, 1, 40),
              }))
            }
          />
        </label>
        <label className="map-canvas__dim">
          {t('chapter.mapRows')}
          <input
            type="number"
            min={1}
            max={40}
            value={rows}
            onChange={(e) =>
              mutate((prev) => ({
                ...prev,
                rows: clamp(parseInt(e.target.value) || 1, 1, 40),
              }))
            }
          />
        </label>
        {selectedCellKey && tool === 'select' && (
          <button
            type="button"
            className="map-canvas__remove"
            onClick={removeSelected}
          >
            {t('chapter.removeSelection')}
          </button>
        )}
      </div>

      <div
        ref={viewportRef}
        className={`map-canvas__viewport map-canvas__viewport--tool-${tool}`}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="map-canvas__grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE_PX}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL_SIZE_PX}px)`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {Array.from({ length: rows }).flatMap((_, y) =>
            Array.from({ length: cols }).map((__, x) => {
              const key = cellKey(x, y);
              const entity = cells[key];
              const isSelected = selectedCellKey === key;
              return (
                <button
                  type="button"
                  key={key}
                  className={
                    isSelected
                      ? 'map-canvas__cell map-canvas__cell--selected'
                      : 'map-canvas__cell'
                  }
                  aria-label={
                    entity
                      ? `Cell ${x},${y}: ${entity.label}`
                      : `Cell ${x},${y} empty`
                  }
                  onPointerDown={(e) => handleCellPointerDown(e, x, y)}
                  onPointerEnter={() => handleCellPointerEnter(x, y)}
                  onPointerMove={(e) => handleCellPointerMove(e, x, y)}
                  onPointerLeave={handleCellPointerLeave}
                  onClick={(e) => handleCellClick(e, x, y)}
                  onDoubleClick={(e) => handleCellDoubleClick(e, x, y)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {entity && <EntityGlyph entity={entity} />}
                </button>
              );
            })
          )}
        </div>

        {tooltip && (
          <div
            className="map-canvas__tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
            role="tooltip"
          >
            {tooltip.text}
          </div>
        )}

        {statsPopup && (
          <StatsPopup
            label={statsPopup.entity.label}
            stats={statsPopup.stats}
            onChange={(patch) =>
              setStatsPopup((prev) =>
                prev
                  ? { ...prev, stats: { ...prev.stats, ...patch } }
                  : prev
              )
            }
            onClose={() => setStatsPopup(null)}
          />
        )}
      </div>

      {showPicker && (
        <div className="map-canvas__picker" role="dialog" aria-label="Pick entity">
          <input
            type="search"
            className="map-canvas__picker-search"
            placeholder={t('common.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="map-canvas__picker-list">
            {filteredPicker.length === 0 ? (
              <li className="map-canvas__picker-empty">—</li>
            ) : (
              filteredPicker.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={
                      selectedOption === option.value
                        ? 'map-canvas__picker-item map-canvas__picker-item--active'
                        : 'map-canvas__picker-item'
                    }
                    onClick={() => setSelectedOption(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="events-canvas__toolbar" role="toolbar" aria-label="Map tools">
        <MapToolButton current={tool} value="select" label={t('chapter.tools.select')} onSelect={handleToolChange}>
          <CursorIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="pan" label={t('chapter.tools.pan')} onSelect={handleToolChange}>
          <MoveIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="character" label={t('chapter.tools.character')} onSelect={handleToolChange}>
          <PersonIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="terrain" label={t('chapter.tools.terrain')} onSelect={handleToolChange}>
          <CubeIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="enemy" label={t('chapter.tools.enemy')} onSelect={handleToolChange}>
          <EnemyIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="zoom" label={t('chapter.tools.zoom')} onSelect={handleToolChange}>
          <ZoomIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="simplify" label={t('chapter.tools.simplify')} onSelect={handleToolChange}>
          <NotesIcon />
        </MapToolButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

interface MapToolButtonProps {
  current: MapTool;
  value: MapTool;
  label: string;
  onSelect: (tool: MapTool) => void;
  children: React.ReactNode;
}

function MapToolButton({ current, value, label, onSelect, children }: MapToolButtonProps) {
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

function EntityGlyph({ entity }: { entity: Entity }) {
  if (entity.category === 'character') {
    return <span className="map-canvas__glyph map-canvas__glyph--character" aria-hidden="true" />;
  }
  if (entity.category === 'enemy') {
    return (
      <span
        className={
          entity.boss
            ? 'map-canvas__glyph map-canvas__glyph--enemy map-canvas__glyph--boss'
            : 'map-canvas__glyph map-canvas__glyph--enemy'
        }
        aria-hidden="true"
      />
    );
  }
  if (entity.subtype === 'boundary') {
    return <span className="map-canvas__glyph map-canvas__glyph--boundary" aria-hidden="true" />;
  }
  if (entity.subtype === 'wall') {
    return <span className="map-canvas__glyph map-canvas__glyph--wall" aria-hidden="true" />;
  }
  if (entity.subtype === 'object') {
    return <span className="map-canvas__glyph map-canvas__glyph--object" aria-hidden="true">★</span>;
  }
  if (entity.subtype === 'trap') {
    return <span className="map-canvas__glyph map-canvas__glyph--trap" aria-hidden="true">✕</span>;
  }
  return null;
}

interface StatsPopupProps {
  label: string;
  stats: { hp: number; armor: number; initiative: number };
  onChange: (patch: Partial<{ hp: number; armor: number; initiative: number }>) => void;
  onClose: () => void;
}

function StatsPopup({ label, stats, onChange, onClose }: StatsPopupProps) {
  const { t } = useTranslation();
  return (
    <div className="map-canvas__stats-popup" role="dialog" aria-label={label}>
      <div className="map-canvas__stats-popup-header">
        <strong>{label}</strong>
        <button
          type="button"
          className="map-canvas__stats-popup-close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label>
        {t('characterSheet.hp')}
        <input
          type="number"
          value={stats.hp}
          onChange={(e) => onChange({ hp: parseInt(e.target.value) || 0 })}
        />
      </label>
      <label>
        {t('characterSheet.armor')}
        <input
          type="number"
          value={stats.armor}
          onChange={(e) => onChange({ armor: parseInt(e.target.value) || 0 })}
        />
      </label>
      <label>
        {t('characterSheet.initiative')}
        <input
          type="number"
          value={stats.initiative}
          onChange={(e) => onChange({ initiative: parseInt(e.target.value) || 0 })}
        />
      </label>
      <p className="map-canvas__stats-popup-note">
        Solo afecta a esta instancia del mapa.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function isPlacementTool(tool: MapTool): boolean {
  return tool === 'character' || tool === 'terrain' || tool === 'enemy';
}

function pickOptions(tool: EntityCategory): EntityOption[] {
  if (tool === 'character') return CHARACTER_OPTIONS;
  if (tool === 'terrain') return TERRAIN_OPTIONS;
  return ENEMY_OPTIONS;
}

function entityCategoryLabelKey(entity: Entity): string {
  if (entity.category === 'character') return 'character';
  if (entity.category === 'enemy') return entity.boss ? 'boss' : 'enemy';
  if (entity.subtype === 'object') return 'object';
  if (entity.subtype === 'trap') return 'trap';
  return 'terrain';
}

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

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v3h16v-3c0-3.3-4.7-5-8-5z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M12 2l9 5v10l-9 5-9-5V7zm0 2.3L5.4 8 12 11.7 18.6 8zM4 9.5v7l7 3.8v-7zm16 0l-7 3.8v7l7-3.8z" />
    </svg>
  );
}

function EnemyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M12 2C7 2 4 6 4 10c0 3 2 5 4 6v3l2-2 2 2 2-2 2 2v-3c2-1 4-3 4-6 0-4-3-8-8-8zm-3 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
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
