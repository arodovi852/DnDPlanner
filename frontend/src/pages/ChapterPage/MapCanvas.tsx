import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUndoableState } from '../../hooks/useUndoableState';
import { useCampaignSocket } from '../../hooks/useCampaignSocket';
import { getSocket, SocketEvents } from '../../api';
import {
  useCampaigns,
  type Character,
  type CharacterAttack,
  type CharacterStats,
} from '../../context/CampaignContext';

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
  | 'erase';

type EntityCategory = 'character' | 'terrain' | 'enemy';

interface FullEntityStats {
  hp: number;
  armor: number;
  initiative: number;
  movement?: number;
  level?: number;
  damageDice?: string;
  abilities?: CharacterStats;
  attacks?: CharacterAttack[];
}

// La celda solo persiste category + subtype (id de personaje o terrain key).
// Toda la info visual (label, image, stats, boss) se resuelve en tiempo de
// render desde la campaña activa para que cualquier cambio en la ficha del
// personaje (foto, hp…) se vea reflejado aquí sin necesidad de recolocarlo.
interface Entity {
  category: EntityCategory;
  subtype: string;
}

interface ResolvedEntity {
  category: EntityCategory;
  subtype: string;
  label: string;
  boss?: boolean;
  image?: string;
  stats?: FullEntityStats;
}

interface EntityOption {
  value: string;
  label: string;
  boss?: boolean;
  image?: string;
  stats?: FullEntityStats;
}

interface MapState {
  cells: Record<string, Entity>;
  cols: number;
  rows: number;
}

const CELL_SIZE_PX = 32;

const TERRAIN_OPTIONS: EntityOption[] = [
  { value: 'boundary', label: 'Boundary' },
  { value: 'wall', label: 'Wall / Rock' },
  { value: 'object', label: 'Object (star)' },
  { value: 'trap', label: 'Trap' },
];

const cellKey = (x: number, y: number) => `${x}-${y}`;

function characterToOption(character: Character): EntityOption {
  return {
    value: character.id,
    label: character.name || '—',
    boss: character.kind === 'enemy' && (character.level ?? 0) >= 10,
    image: character.image,
    stats: {
      hp: character.hp,
      armor: character.armor,
      initiative: character.initiative,
      movement: character.movement,
      level: character.level,
      damageDice: character.damageDice,
      abilities: character.stats,
      attacks: character.attacks,
    },
  };
}

function resolveEntity(
  entity: Entity,
  characters: Character[]
): ResolvedEntity | null {
  if (entity.category === 'character' || entity.category === 'enemy') {
    const character = characters.find((c) => c.id === entity.subtype);
    if (!character) {
      // El personaje fue eliminado — celda fantasma; mostramos placeholder.
      return {
        category: entity.category,
        subtype: entity.subtype,
        label: '—',
      };
    }
    return {
      category: entity.category,
      subtype: entity.subtype,
      ...characterToOption(character),
    };
  }
  const opt = TERRAIN_OPTIONS.find((o) => o.value === entity.subtype);
  return {
    category: 'terrain',
    subtype: entity.subtype,
    label: opt?.label ?? entity.subtype,
  };
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

interface MapCanvasProps {
  /** If true, hides placement/edit tools and disables cell mutations (player view). */
  readOnly?: boolean;
}

export function MapCanvas({ readOnly = false }: MapCanvasProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chapterId } = useParams<{ chapterId: string }>();
  const { activeCampaign, updateChapterMap } = useCampaigns();

  // Capítulo actualmente abierto. Su `map` persistido es la fuente de
  // verdad: lo cargamos al montar / cambiar de capítulo y autoguardamos
  // cualquier modificación local.
  const currentChapter = useMemo(() => {
    if (!activeCampaign || !chapterId) return null;
    return activeCampaign.chapters.find((c) => c.id === chapterId) ?? null;
  }, [activeCampaign, chapterId]);

  const [state, setState, history] = useUndoableState<MapState>({
    cells: currentChapter?.map.cells ?? {},
    cols: currentChapter?.map.cols ?? 15,
    rows: currentChapter?.map.rows ?? 15,
  });
  const { cells, cols, rows } = state;

  // Identificador único de esta pestaña — se incluye en cada `map:update`
  // emitido para que el receptor pueda descartar sus propios ecos.
  const originRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}`
  );
  // Bandera que se activa mientras aplicamos un cambio recibido por
  // socket. El autoguardado la lee y, si está activa, evita re-emitir el
  // evento (sería un loop) y evita una escritura redundante a la API
  // (la persistencia ya la hizo el emisor original).
  const isApplyingRemoteRef = useRef(false);

  // Reset cuando cambia el capítulo o la campaña activa.
  useEffect(() => {
    history.reset({
      cells: currentChapter?.map.cells ?? {},
      cols: currentChapter?.map.cols ?? 15,
      rows: currentChapter?.map.rows ?? 15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, activeCampaign?.id]);

  // Autoguardado + broadcast en vivo. Si el cambio se originó localmente
  // persistimos vía el contexto y emitimos `map:update` al room de la
  // campaña; si el cambio viene de un peer (flag activa) no hacemos
  // nada — ya está persistido por el emisor.
  useEffect(() => {
    if (!activeCampaign || !chapterId || !currentChapter) return;
    if (isApplyingRemoteRef.current) {
      // Liberamos la bandera tras este tick para que las siguientes
      // ediciones locales emitan con normalidad.
      isApplyingRemoteRef.current = false;
      return;
    }
    const persisted = currentChapter.map;
    if (
      persisted.cells === cells &&
      persisted.cols === cols &&
      persisted.rows === rows
    ) {
      return;
    }
    updateChapterMap(activeCampaign.id, chapterId, { cells, cols, rows });
    // Broadcast al room — el backend reenvía solo a los demás miembros.
    try {
      getSocket().emit(SocketEvents.mapUpdate, {
        campaignId: activeCampaign.id,
        chapterId,
        map: { cells, cols, rows },
        origin: originRef.current,
      });
    } catch {
      // Si el socket no conecta, el cambio queda persistido por la API
      // de todas formas; los peers verán el cambio al refrescar.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, cols, rows]);

  // Suscripción a updates en vivo del mapa.
  useCampaignSocket(activeCampaign?.id ?? null, {
    onMapUpdated: (payload) => {
      if (!activeCampaign || payload.campaignId !== activeCampaign.id) return;
      if (payload.chapterId !== chapterId) return;
      if (payload.origin === originRef.current) return; // eco propio
      isApplyingRemoteRef.current = true;
      setState({
        cells: (payload.map.cells as Record<string, Entity>) ?? {},
        cols: payload.map.cols ?? 15,
        rows: payload.map.rows ?? 15,
      });
      updateChapterMap(activeCampaign.id, payload.chapterId, {
        cells: payload.map.cells as Record<string, Entity>,
        cols: payload.map.cols,
        rows: payload.map.rows,
      });
    },
  });

  const characterOptions = useMemo<EntityOption[]>(() => {
    return (activeCampaign?.characters ?? [])
      .filter((c) => c.kind === 'playable')
      .map(characterToOption);
  }, [activeCampaign]);

  const enemyOptions = useMemo<EntityOption[]>(() => {
    return (activeCampaign?.characters ?? [])
      .filter((c) => c.kind === 'enemy')
      .map(characterToOption);
  }, [activeCampaign]);

  const [tool, setTool] = useState<MapTool>('select');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [query, setQuery] = useState('');

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);

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

  const viewportDragRef = useRef<
    | { kind: 'pan'; startPointerX: number; startPointerY: number; startPanX: number; startPanY: number }
    | { kind: 'zoom'; startPointerY: number; startZoom: number; originX: number; originY: number }
    | null
  >(null);

  const paintingRef = useRef(false);
  const erasingRef = useRef(false);
  // Marca si la pulsación actual nació mientras se pintaba — así una
  // pulsación que termina su gesto de pintura no abre el popup.
  const justPaintedRef = useRef(false);

  const [statsPopup, setStatsPopup] = useState<
    | { key: string; entity: ResolvedEntity; stats: FullEntityStats }
    | null
  >(null);

  // ------------------------------------------------------------------

  const mutate = (updater: (prev: MapState) => MapState) => {
    if (readOnly) return;
    setState(updater);
  };

  const setCells = (next: Record<string, Entity>) => {
    mutate((prev) => ({ ...prev, cells: next }));
  };

  const placeAt = (x: number, y: number) => {
    if (!isPlacementTool(tool)) return;
    const key = cellKey(x, y);
    if (cells[key]) return;
    const options = pickOptions(tool as EntityCategory, {
      character: characterOptions,
      enemy: enemyOptions,
    });
    const option = options.find((o) => o.value === selectedOption) ?? options[0];
    if (!option) return;
    setCells({
      ...cells,
      [key]: {
        category: tool as EntityCategory,
        subtype: option.value,
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
    setStatsPopup(null);
    setSelectedCellKey(null);
    if (nextTool === 'character') {
      setSelectedOption(characterOptions[0]?.value ?? '');
    } else if (nextTool === 'terrain') {
      setSelectedOption(TERRAIN_OPTIONS[0].value);
    } else if (nextTool === 'enemy') {
      setSelectedOption(enemyOptions[0]?.value ?? '');
    }
  };

  const applyZoomAtPoint = (nextZoom: number, localX: number, localY: number) => {
    const clampedZoom = clamp(nextZoom, 0.3, 3);
    setPan((prev) => ({
      x: localX - ((localX - prev.x) * clampedZoom) / zoom,
      y: localY - ((localY - prev.y) * clampedZoom) / zoom,
    }));
    setZoom(clampedZoom);
  };

  const handleChapterSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = event.target.value;
    if (id && id !== chapterId) {
      navigate(`/chapter/${id}`);
    }
  };

  // ------------------------------------------------------------------
  // Handlers del viewport
  // ------------------------------------------------------------------

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
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

  // Native non-passive wheel listener so preventDefault() actually works.
  // React's onWheel is passive in some environments and can't stop page scroll.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const nextZoom = clamp(currentZoom * factor, 0.3, 3);
      setPan((prev) => ({
        x: localX - ((localX - prev.x) * nextZoom) / currentZoom,
        y: localY - ((localY - prev.y) * nextZoom) / currentZoom,
      }));
      setZoom(nextZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Handlers por celda
  // ------------------------------------------------------------------

  const handleCellPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    if (event.button === 2 || (event.button === 0 && tool === 'erase')) {
      // Right-click (desktop) o tool === 'erase' (móvil con tap izquierdo).
      // En ambos casos arrancamos el gesto de borrado por arrastre.
      event.preventDefault();
      erasingRef.current = true;
      removeAt(x, y);
      return;
    }
    if (event.button === 0 && isPlacementTool(tool)) {
      paintingRef.current = true;
      justPaintedRef.current = true;
      placeAt(x, y);
    } else {
      justPaintedRef.current = false;
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

  // Solo en herramienta "select" tratamos los clics como selección y
  // apertura de stats. Un único click izquierdo selecciona la celda y, si
  // tiene stats (personaje/enemigo), abre el popup informativo. En las
  // demás herramientas el click es parte del gesto de pintura/borrado/
  // pan/zoom y nunca debe abrir el popup.
  const handleCellClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    x: number,
    y: number
  ) => {
    event.stopPropagation();
    if (tool !== 'select') return;
    if (justPaintedRef.current) {
      justPaintedRef.current = false;
      return;
    }
    const key = cellKey(x, y);
    const entity = cells[key];
    if (!entity) {
      setSelectedCellKey(null);
      setStatsPopup(null);
      return;
    }

    setSelectedCellKey(key);

    const resolved = resolveEntity(entity, activeCampaign?.characters ?? []);
    if (
      resolved &&
      (resolved.category === 'character' || resolved.category === 'enemy') &&
      resolved.stats
    ) {
      setStatsPopup({ key, entity: resolved, stats: { ...resolved.stats } });
    } else {
      setStatsPopup(null);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const showPicker =
    tool === 'character' || tool === 'terrain' || tool === 'enemy';
  const pickerList = showPicker
    ? pickOptions(tool as EntityCategory, {
        character: characterOptions,
        enemy: enemyOptions,
      })
    : [];
  const filteredPicker = showPicker
    ? pickerList.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="map-canvas">
      <div className="map-canvas__controls">
        {activeCampaign && activeCampaign.chapters.length > 0 && (
          <label className="map-canvas__chapter-select">
            <span className="map-canvas__chapter-select-label">
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
        )}
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
              const resolved = entity
                ? resolveEntity(entity, activeCampaign?.characters ?? [])
                : null;
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
                    resolved
                      ? `Cell ${x},${y}: ${resolved.label}`
                      : `Cell ${x},${y} empty`
                  }
                  onPointerDown={(e) => handleCellPointerDown(e, x, y)}
                  onPointerEnter={() => handleCellPointerEnter(x, y)}
                  onClick={(e) => handleCellClick(e, x, y)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {resolved && <EntityGlyph entity={resolved} />}
                </button>
              );
            })
          )}
        </div>

      </div>

      {statsPopup && (
        <StatsPopup
          label={statsPopup.entity.label}
          image={statsPopup.entity.image}
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
                    <span className="map-canvas__picker-label">{option.label}</span>
                    {option.image ? (
                      <img
                        className="map-canvas__picker-thumb"
                        src={option.image}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="map-canvas__picker-thumb map-canvas__picker-thumb--placeholder" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          {tool !== 'terrain' && (
            <button
              type="button"
              className="map-canvas__picker-create"
              onClick={() =>
                navigate(
                  tool === 'enemy'
                    ? '/characterSelector?tab=enemy'
                    : '/characterSelector'
                )
              }
            >
              {tool === 'enemy'
                ? t('chapter.createNewEnemy')
                : t('chapter.createNewCharacter')}
            </button>
          )}
        </div>
      )}

      <div className="events-canvas__toolbar" role="toolbar" aria-label="Map tools">
        <MapToolButton current={tool} value="select" label={t('chapter.tools.select')} onSelect={handleToolChange}>
          <CursorIcon />
        </MapToolButton>
        <MapToolButton current={tool} value="pan" label={t('chapter.tools.pan')} onSelect={handleToolChange}>
          <MoveIcon />
        </MapToolButton>
        {!readOnly && (
          <>
            <MapToolButton current={tool} value="character" label={t('chapter.tools.character')} onSelect={handleToolChange}>
              <PersonIcon />
            </MapToolButton>
            <MapToolButton current={tool} value="terrain" label={t('chapter.tools.terrain')} onSelect={handleToolChange}>
              <CubeIcon />
            </MapToolButton>
            <MapToolButton current={tool} value="enemy" label={t('chapter.tools.enemy')} onSelect={handleToolChange}>
              <EnemyIcon />
            </MapToolButton>
          </>
        )}
        <MapToolButton current={tool} value="zoom" label={t('chapter.tools.zoom')} onSelect={handleToolChange}>
          <ZoomIcon />
        </MapToolButton>
        {!readOnly && (
          <MapToolButton current={tool} value="erase" label={t('chapter.tools.erase')} onSelect={handleToolChange}>
            <TrashIcon />
          </MapToolButton>
        )}
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

function EntityGlyph({ entity }: { entity: ResolvedEntity }) {
  if (entity.category === 'character' || entity.category === 'enemy') {
    if (entity.image) {
      return (
        <img
          src={entity.image}
          alt=""
          className={
            entity.boss
              ? 'map-canvas__glyph map-canvas__glyph--portrait map-canvas__glyph--boss'
              : 'map-canvas__glyph map-canvas__glyph--portrait'
          }
          aria-hidden="true"
        />
      );
    }
    if (entity.category === 'character') {
      return <span className="map-canvas__glyph map-canvas__glyph--character" aria-hidden="true" />;
    }
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
  image?: string;
  stats: FullEntityStats;
  onChange: (patch: Partial<FullEntityStats>) => void;
  onClose: () => void;
}

function StatsPopup({ label, image, stats, onChange, onClose }: StatsPopupProps) {
  const { t } = useTranslation();
  const ABILITY_KEYS: Array<keyof CharacterStats> = [
    'str', 'dex', 'con', 'int', 'wis', 'cha',
  ];
  const abilities = stats.abilities;

  return (
    <div className="map-canvas__stats-popup" role="dialog" aria-label={label}>
      <div className="map-canvas__stats-popup-header">
        {image && (
          <img
            className="map-canvas__stats-popup-image"
            src={image}
            alt=""
          />
        )}
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

      <div className="map-canvas__stats-popup-grid">
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
        {stats.movement !== undefined && (
          <label>
            {t('characterSheet.movement')}
            <input
              type="number"
              value={stats.movement}
              onChange={(e) =>
                onChange({ movement: parseInt(e.target.value) || 0 })
              }
            />
          </label>
        )}
        {stats.level !== undefined && (
          <label>
            {t('characterSheet.level')}
            <input
              type="number"
              value={stats.level}
              onChange={(e) =>
                onChange({ level: parseInt(e.target.value) || 0 })
              }
            />
          </label>
        )}
        {stats.damageDice !== undefined && (
          <label>
            {t('characterSheet.damageDice')}
            <input
              type="text"
              value={stats.damageDice}
              onChange={(e) => onChange({ damageDice: e.target.value })}
            />
          </label>
        )}
      </div>

      {abilities && (
        <div className="map-canvas__stats-popup-abilities">
          {ABILITY_KEYS.map((key) => (
            <label key={key}>
              {t(`characterSheet.${key}`)}
              <input
                type="number"
                value={abilities[key]}
                onChange={(e) =>
                  onChange({
                    abilities: {
                      ...abilities,
                      [key]: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}

      {stats.attacks && stats.attacks.length > 0 && (
        <div className="map-canvas__stats-popup-attacks">
          <span className="map-canvas__stats-popup-section-label">
            {t('characterSheet.attacks')}
          </span>
          <ul>
            {stats.attacks.map((a, i) => (
              <li key={`${a.name}-${i}`}>
                <strong>{a.name}</strong>
                {a.attackBonus !== undefined && (
                  <span> {a.attackBonus >= 0 ? `+${a.attackBonus}` : a.attackBonus}</span>
                )}
                {a.damage && <span> · {a.damage}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="map-canvas__stats-popup-note">
        {t('chapter.statsPopupNote')}
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

interface OptionsByCategory {
  character: EntityOption[];
  enemy: EntityOption[];
}

function pickOptions(
  tool: EntityCategory,
  fromCampaign: OptionsByCategory
): EntityOption[] {
  if (tool === 'character') return fromCampaign.character;
  if (tool === 'terrain') return TERRAIN_OPTIONS;
  return fromCampaign.enemy;
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.25rem" height="1.25rem" fill="currentColor" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4zm-3 6h12l-1 12H7zm3 2v8h2v-8zm4 0v8h2v-8z" />
    </svg>
  );
}
