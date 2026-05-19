import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { campaignsApi, type CampaignDTO } from '../api';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Tipos del dominio
// ---------------------------------------------------------------------------

export type EventType =
  | 'Mission'
  | 'Combat'
  | 'MainStory'
  | 'CharacterArc'
  | 'Exploration'
  | 'Social'
  | 'Rest'
  | 'Other';

export const EVENT_TYPES: EventType[] = [
  'Mission',
  'Combat',
  'MainStory',
  'CharacterArc',
  'Exploration',
  'Social',
  'Rest',
  'Other',
];

const LEGACY_EVENT_TYPE_MAP: Record<string, EventType> = {
  combate: 'Combat',
  historia: 'MainStory',
  mision: 'Mission',
  exploracion: 'Exploration',
  dialogo: 'Social',
};

export function normalizeEventType(type: string | undefined): EventType {
  if (!type) return 'Other';
  if (EVENT_TYPES.includes(type as EventType)) return type as EventType;
  return LEGACY_EVENT_TYPE_MAP[type] ?? 'Other';
}

export interface ChapterEventBlock {
  id: string;
  x: number;
  y: number;
  text: string;
  type: EventType;
  // Tamaño personalizado del bloque. Ausentes → se usan BLOCK_WIDTH/HEIGHT
  // por defecto. El usuario puede arrastrar el handle de la esquina
  // inferior derecha para redimensionar y leer textos largos sin recortes.
  width?: number;
  height?: number;
}

export interface ChapterEventConnection {
  id: string;
  from: string;
  to: string;
}

export interface ChapterMapEntity {
  category: 'character' | 'terrain' | 'enemy';
  subtype: string;
}

export interface ChapterMap {
  cells: Record<string, ChapterMapEntity>;
  cols: number;
  rows: number;
}

export interface Chapter {
  id: string;
  title: string;
  events: {
    blocks: ChapterEventBlock[];
    connections: ChapterEventConnection[];
  };
  map: ChapterMap;
}

export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterSlot {
  name: string;
  quantity?: number;
}

export interface CharacterAttack {
  name: string;
  description: string;
  attackBonus?: number;
  damage?: string;
}

export interface Character {
  id: string;
  name: string;
  kind: 'playable' | 'enemy';
  image?: string;
  apiIndex?: string;
  className?: string;
  level: number;
  race?: string;
  alignment?: string;
  background?: string;
  armor: number;
  hp: number;
  maxHp: number;
  movement: number;
  damageDice: string;
  initiative: number;
  stats: CharacterStats;
  savingThrows: string[];
  skills: string[];
  inventory: CharacterSlot[];
  inventorySlots: number;
  spells: string[];
  features: string[];
  attacks: CharacterAttack[];
  description: string;
}

export type MemberRole = 'dm' | 'co-dm' | 'player';

export interface CampaignMember {
  userId: string;
  role: MemberRole;
  characterId?: string;
  joinedAt: string;
}

export interface Annotation {
  id: string;
  userId: string;
  targetType: 'character' | 'chapter';
  targetId: string;
  text: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  chapters: Chapter[];
  characters: Character[];
  members: CampaignMember[];
  annotations: Annotation[];
  revealedSpoilers: string[];
  shareToken?: string;
  viewToken?: string;
  image?: string;
  visibility?: 'public' | 'private';
  /** Solo presente en listados públicos. */
  ownerProfile?: {
    id: string;
    username: string;
    avatar?: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Plantillas predefinidas (cliente)
// ---------------------------------------------------------------------------

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  build: () => Pick<Campaign, 'chapters' | 'characters'>;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty campaign — start from scratch.',
    build: () => ({ chapters: [], characters: [] }),
  },
  {
    id: 'campollano',
    name: 'Campollano',
    description: 'Twelve-chapter dark fantasy arc.',
    build: () => ({
      chapters: [
        emptyChapter('Chapter 1: Outbreak'),
        emptyChapter('Chapter 2: Between Worlds'),
        emptyChapter('Chapter 3: The Mansion'),
        emptyChapter('Chapter 4: Origins'),
        emptyChapter('Chapter 5: The Citadel'),
        emptyChapter('Chapter 6: Necromancer'),
        emptyChapter('Chapter 7: Betrayal'),
        emptyChapter('Chapter 8: Outer Rim'),
        emptyChapter('Chapter 9: Past, Present and Future'),
        emptyChapter('Chapter 10: As heaven in hell'),
        emptyChapter('Chapter 11: Pronubis'),
        emptyChapter('Chapter 12: The World Beyond'),
      ],
      characters: [],
    }),
  },
  {
    id: 'resacon',
    name: 'ResA.C.ón',
    description: 'A wild night-out turns into a five-chapter adventure.',
    build: () => ({
      chapters: [
        emptyChapter('Chapter 1: The Party'),
        emptyChapter('Chapter 2: Coast City'),
        emptyChapter('Chapter 3: Wrestling'),
        emptyChapter('Chapter 4: China'),
        emptyChapter('Chapter 5: Afterparty'),
      ],
      characters: [],
    }),
  },
  {
    id: 'guerra',
    name: 'Guerra',
    description: 'A war that simply will not end.',
    build: () => ({
      chapters: [
        emptyChapter('Chapter 1: War begins'),
        emptyChapter('Chapter 2: War continues'),
        emptyChapter('Chapter 3: War just… ends?'),
        emptyChapter('Chapter 4: War actually ends'),
      ],
      characters: [],
    }),
  },
  {
    id: 'destinos-cruzados',
    name: 'Destinos Cruzados',
    description: 'A seven-chapter conspiracy that spans worlds.',
    build: () => ({
      chapters: [
        emptyChapter('Chapter 1: Loss'),
        emptyChapter('Chapter 2: Underground'),
        emptyChapter('Chapter 3: Stux'),
        emptyChapter('Chapter 4: Secret Laboratory'),
        emptyChapter('Chapter 5: Across the Sea'),
        emptyChapter('Chapter 6: Ouroboros'),
        emptyChapter('Chapter 7: Destiny'),
      ],
      characters: [],
    }),
  },
];

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface CampaignContextValue {
  campaigns: Campaign[];
  /** True while the initial fetch from the API is in flight. */
  loading: boolean;
  /** True when at least one mutation is being persisted to the API. */
  syncing: boolean;
  /** Last sync error (network/API). Cleared on next successful sync. */
  syncError: string | null;
  activeCampaignId: string | null;
  activeCampaign: Campaign | null;
  setActiveCampaign: (id: string | null) => void;
  createCampaign: (input: {
    name: string;
    templateId?: string;
    ownerId: string;
  }) => Campaign;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  reorderCampaigns: (orderedIds: string[]) => void;
  cloneCampaign: (sourceId: string, newOwnerId: string) => Campaign | null;
  requestJoin: (campaignId: string, userId: string) => boolean;

  generateViewToken: (campaignId: string) => string;
  revokeViewToken: (campaignId: string) => void;
  findByViewToken: (token: string) => Campaign | null;

  addChapter: (campaignId: string, title?: string) => Chapter;
  updateChapter: (campaignId: string, chapterId: string, patch: Partial<Chapter>) => void;
  deleteChapter: (campaignId: string, chapterId: string) => void;
  updateChapterEvents: (
    campaignId: string,
    chapterId: string,
    events: Chapter['events']
  ) => void;
  updateChapterMap: (
    campaignId: string,
    chapterId: string,
    map: ChapterMap
  ) => void;

  addCharacter: (
    campaignId: string,
    input: { kind: 'playable' | 'enemy'; name?: string }
  ) => Character;
  updateCharacter: (
    campaignId: string,
    characterId: string,
    patch: Partial<Character>
  ) => void;
  deleteCharacter: (campaignId: string, characterId: string) => void;

  addMember: (
    campaignId: string,
    input: { userId: string; role: MemberRole; characterId?: string }
  ) => void;
  removeMember: (campaignId: string, userId: string) => void;
  updateMemberRole: (
    campaignId: string,
    userId: string,
    role: MemberRole
  ) => void;
  assignCharacter: (
    campaignId: string,
    userId: string,
    characterId: string | null
  ) => void;

  addAnnotation: (
    campaignId: string,
    input: {
      userId: string;
      targetType: 'character' | 'chapter';
      targetId: string;
      text: string;
    }
  ) => Annotation;
  removeAnnotation: (campaignId: string, annotationId: string) => void;

  toggleSpoiler: (campaignId: string, hash: string) => void;
  revealAllSpoilers: (campaignId: string) => void;
  hideAllSpoilers: (campaignId: string) => void;

  generateShareToken: (campaignId: string) => string;
  revokeShareToken: (campaignId: string) => void;
  findByShareToken: (token: string) => Campaign | null;
  acceptInvite: (
    token: string,
    userId: string,
    role?: MemberRole
  ) => Campaign | null;

  getRole: (campaignId: string, userId: string) => MemberRole | null;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

const ACTIVE_KEY = 'dndplanner:activeCampaign';
const DEMO_CAMPAIGNS_KEY = 'dndplanner:demo:campaigns';

function readActiveCampaignId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

// ---------------------------------------------------------------------------
// Demo persistence — only used when the active session is the offline demo
// account (see AuthContext.DEMO_USER_ID). Everything is stored under the
// `dndplanner:demo:*` namespace so it never collides with real user data.
// ---------------------------------------------------------------------------

function readDemoCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DEMO_CAMPAIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      ...c,
      chapters: (c.chapters ?? []).map((ch: Partial<Chapter>) => normalizeChapter(ch)),
      characters: (c.characters ?? []).map((ch: Partial<Character>) =>
        normalizeCharacter(ch)
      ),
      members: c.members ?? [],
      annotations: c.annotations ?? [],
      revealedSpoilers: c.revealedSpoilers ?? [],
    }));
  } catch {
    return [];
  }
}

function writeDemoCampaigns(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_CAMPAIGNS_KEY, JSON.stringify(campaigns));
  } catch {
    // Quota / privacy mode — no actionable recovery.
  }
}

// ---------------------------------------------------------------------------
// Helpers de normalización (reciben CampaignDTO → Campaign)
// ---------------------------------------------------------------------------

function normalizeChapter(raw: Partial<Chapter>): Chapter {
  return {
    id: raw.id ?? generateId('ch'),
    title: raw.title ?? '',
    events: {
      blocks: (raw.events?.blocks ?? []).map((b) => ({
        ...b,
        type: normalizeEventType(b.type as unknown as string),
      })),
      connections: raw.events?.connections ?? [],
    },
    map: {
      cells: raw.map?.cells ?? {},
      cols: raw.map?.cols ?? 15,
      rows: raw.map?.rows ?? 15,
    },
  };
}

function normalizeCharacter(raw: Partial<Character>): Character {
  return {
    ...createEmptyCharacter(raw.kind ?? 'playable', raw.name),
    ...raw,
    attacks: raw.attacks ?? [],
    stats: raw.stats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: raw.savingThrows ?? [],
    skills: raw.skills ?? [],
    inventory: raw.inventory ?? [],
    spells: raw.spells ?? [],
    features: raw.features ?? [],
  } as Character;
}

function dtoToCampaign(dto: CampaignDTO): Campaign {
  return {
    id: dto.id,
    name: dto.name,
    templateId: dto.templateId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    ownerId: dto.ownerId,
    chapters: (dto.chapters ?? []).map((c) =>
      normalizeChapter(c as unknown as Chapter)
    ),
    characters: (dto.characters ?? []).map((c) =>
      normalizeCharacter(c as unknown as Character)
    ),
    members: (dto.members ?? []).map((m) => ({
      userId: m.userId,
      role: m.role,
      characterId: m.characterId,
      joinedAt: m.joinedAt,
    })),
    annotations: dto.annotations ?? [],
    revealedSpoilers: dto.revealedSpoilers ?? [],
    shareToken: dto.shareToken,
    viewToken: dto.viewToken,
    image: dto.image,
    visibility: dto.visibility,
    ownerProfile: dto.ownerProfile,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const SYNC_DEBOUNCE_MS = 600;

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, status, isDemo } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    () => readActiveCampaignId()
  );
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Per-campaign debounce timers + a snapshot of the in-flight version so
  // we can drop stale updates if the user kept editing while a request
  // was in flight.
  const syncTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlight = useRef<Set<string>>(new Set());

  // `isDemo` is read inside callbacks via this ref so we don't need to
  // re-create every memoised callback when the flag changes.
  const isDemoRef = useRef(isDemo);
  useEffect(() => {
    isDemoRef.current = isDemo;
  }, [isDemo]);

  // ------------------------------------------------------------------
  // Initial load.
  //   • Real session: fetch from the API.
  //   • Demo session: read from localStorage (no network at all).
  //   • Logged out: drop in-memory state.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'authenticated' || !isAuthenticated) {
      setCampaigns([]);
      setActiveCampaignIdState(null);
      return;
    }
    if (isDemo) {
      setCampaigns(readDemoCampaigns());
      setLoading(false);
      setSyncError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const list = await campaignsApi.list();
        if (cancelled) return;
        setCampaigns(list.map(dtoToCampaign));
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        setSyncError(err instanceof Error ? err.message : 'Could not load campaigns');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status, isDemo]);

  // Demo persistence: mirror in-memory state into localStorage on every
  // change while the demo session is active. The guard prevents real users
  // from ever writing into the demo bucket.
  useEffect(() => {
    if (!isDemo) return;
    writeDemoCampaigns(campaigns);
  }, [campaigns, isDemo]);

  // Persist active campaign id locally so a refresh keeps the same workspace.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeCampaignId) {
      window.localStorage.setItem(ACTIVE_KEY, activeCampaignId);
    } else {
      window.localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeCampaignId]);

  // ------------------------------------------------------------------
  // Sync helpers
  // ------------------------------------------------------------------

  /**
   * Push a campaign's current state to the server.
   *
   * Debounced per-campaign so rapid edits collapse into one PUT. Fire and
   * forget — we don't await callers; UI errors surface via `syncError`.
   */
  const scheduleSync = useCallback((campaignId: string) => {
    // Demo session: there's nothing to sync. The campaigns useEffect
    // already mirrors state into localStorage on every change.
    if (isDemoRef.current) return;
    const timers = syncTimers.current;
    const existing = timers.get(campaignId);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(async () => {
      timers.delete(campaignId);
      // Read the latest snapshot from setState so we PUT what's current.
      let snapshot: Campaign | undefined;
      setCampaigns((prev) => {
        snapshot = prev.find((c) => c.id === campaignId);
        return prev;
      });
      if (!snapshot) return;
      inFlight.current.add(campaignId);
      setSyncing(true);
      try {
        await campaignsApi.update(campaignId, {
          name: snapshot.name,
          chapters: snapshot.chapters as unknown as CampaignDTO['chapters'],
          characters: snapshot.characters as unknown as CampaignDTO['characters'],
          members: snapshot.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            characterId: m.characterId,
            joinedAt: m.joinedAt,
          })),
          annotations: snapshot.annotations,
          revealedSpoilers: snapshot.revealedSpoilers,
          image: snapshot.image,
          visibility: snapshot.visibility,
        });
        setSyncError(null);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed');
      } finally {
        inFlight.current.delete(campaignId);
        if (inFlight.current.size === 0 && syncTimers.current.size === 0) {
          setSyncing(false);
        }
      }
    }, SYNC_DEBOUNCE_MS);
    timers.set(campaignId, handle);
  }, []);

  // Cleanup pending timers on unmount so we don't fire after the provider dies.
  useEffect(() => {
    const timers = syncTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const setActiveCampaign = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
  }, []);

  // Helper: mutate a campaign by id and schedule a sync.
  const patchCampaign = useCallback(
    (campaignId: string, patch: (c: Campaign) => Campaign) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? { ...patch(c), updatedAt: new Date().toISOString() }
            : c
        )
      );
      scheduleSync(campaignId);
    },
    [scheduleSync]
  );

  // ------------------------------------------------------------------
  // CRUD de campañas
  // ------------------------------------------------------------------

  const createCampaign = useCallback(
    ({
      name,
      templateId,
      ownerId,
    }: {
      name: string;
      templateId?: string;
      ownerId: string;
    }) => {
      // Optimistic creation: insert locally with a temp id, then replace it
      // with the server id when the POST resolves. This keeps the call
      // synchronous to consumers that expect a Campaign back.
      const now = new Date().toISOString();
      const finalName = name.trim() || 'Untitled Campaign';
      const template = templateId
        ? CAMPAIGN_TEMPLATES.find((t) => t.id === templateId)
        : undefined;
      const base = template ? template.build() : { chapters: [], characters: [] };

      // Demo session: create with a final id directly, no server round-trip.
      if (isDemoRef.current) {
        const id = generateId('camp');
        const local: Campaign = {
          id,
          name: finalName,
          templateId: template?.id,
          createdAt: now,
          updatedAt: now,
          ownerId,
          chapters: base.chapters,
          characters: base.characters,
          members: [{ userId: ownerId, role: 'dm', joinedAt: now }],
          annotations: [],
          revealedSpoilers: [],
        };
        setCampaigns((prev) => [...prev, local]);
        setActiveCampaignIdState(id);
        return local;
      }

      const tempId = generateId('camp-tmp');
      const local: Campaign = {
        id: tempId,
        name: finalName,
        templateId: template?.id,
        createdAt: now,
        updatedAt: now,
        ownerId,
        chapters: base.chapters,
        characters: base.characters,
        members: [{ userId: ownerId, role: 'dm', joinedAt: now }],
        annotations: [],
        revealedSpoilers: [],
      };

      setCampaigns((prev) => [...prev, local]);
      setActiveCampaignIdState(tempId);

      // Real POST in background.
      (async () => {
        try {
          const dto = await campaignsApi.create({
            name: finalName,
            templateId: template?.id,
            chapters: base.chapters as unknown as CampaignDTO['chapters'],
            characters: base.characters as unknown as CampaignDTO['characters'],
          });
          const real = dtoToCampaign(dto);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === tempId ? real : c))
          );
          setActiveCampaignIdState((curr) => (curr === tempId ? real.id : curr));
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not create campaign');
          // Roll back local optimistic insertion.
          setCampaigns((prev) => prev.filter((c) => c.id !== tempId));
          setActiveCampaignIdState((curr) => (curr === tempId ? null : curr));
        }
      })();

      return local;
    },
    []
  );

  const updateCampaign = useCallback(
    (id: string, patch: Partial<Campaign>) => {
      patchCampaign(id, (c) => ({ ...c, ...patch }));
    },
    [patchCampaign]
  );

  const deleteCampaign = useCallback((id: string) => {
    // Optimistic: remove locally, then DELETE on the server.
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setActiveCampaignIdState((curr) => (curr === id ? null : curr));
    if (isDemoRef.current) return; // local-only session
    if (id.startsWith('camp-tmp-')) return; // never reached the server
    (async () => {
      try {
        await campaignsApi.delete(id);
        setSyncError(null);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not delete campaign');
      }
    })();
  }, []);

  const cloneCampaign = useCallback(
    (sourceId: string, newOwnerId: string): Campaign | null => {
      const source = campaigns.find((c) => c.id === sourceId);
      if (!source) return null;
      const now = new Date().toISOString();
      const id = generateId(isDemoRef.current ? 'camp' : 'camp-tmp');
      const optimistic: Campaign = JSON.parse(JSON.stringify(source));
      optimistic.id = id;
      optimistic.name = `${source.name} (clone)`;
      optimistic.ownerId = newOwnerId;
      optimistic.createdAt = now;
      optimistic.updatedAt = now;
      optimistic.visibility = 'private';
      optimistic.shareToken = undefined;
      optimistic.viewToken = undefined;
      optimistic.members = [{ userId: newOwnerId, role: 'dm', joinedAt: now }];
      optimistic.annotations = [];
      optimistic.revealedSpoilers = [];

      setCampaigns((prev) => [...prev, optimistic]);
      setActiveCampaignIdState(id);

      // Demo session: deep copy already in state, nothing more to do.
      if (isDemoRef.current) return optimistic;

      (async () => {
        try {
          const dto = await campaignsApi.clone(sourceId);
          const real = dtoToCampaign(dto);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === id ? real : c))
          );
          setActiveCampaignIdState((curr) => (curr === id ? real.id : curr));
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not clone campaign');
          setCampaigns((prev) => prev.filter((c) => c.id !== id));
        }
      })();

      return optimistic;
    },
    [campaigns]
  );

  const requestJoin = useCallback(
    (campaignId: string, userId: string): boolean => {
      const c = campaigns.find((x) => x.id === campaignId);
      if (!c || c.visibility !== 'public') return false;
      if (c.members.some((m) => m.userId === userId)) return false;
      patchCampaign(campaignId, (c) => ({
        ...c,
        members: [
          ...c.members,
          { userId, role: 'player', joinedAt: new Date().toISOString() },
        ],
      }));
      return true;
    },
    [campaigns, patchCampaign]
  );

  const reorderCampaigns = useCallback((orderedIds: string[]) => {
    // Reordering is purely client-side; the API doesn't store user-specific
    // sort order yet. We mutate local state only.
    setCampaigns((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c] as const));
      const next: Campaign[] = [];
      for (const id of orderedIds) {
        const camp = byId.get(id);
        if (camp) {
          next.push(camp);
          byId.delete(id);
        }
      }
      for (const camp of byId.values()) next.push(camp);
      return next;
    });
  }, []);

  // ------------------------------------------------------------------
  // Chapters
  // ------------------------------------------------------------------

  const addChapter = useCallback(
    (campaignId: string, title?: string): Chapter => {
      const chapter = emptyChapter(title ?? '');
      patchCampaign(campaignId, (c) => ({
        ...c,
        chapters: [...c.chapters, chapter],
      }));
      return chapter;
    },
    [patchCampaign]
  );

  const updateChapter = useCallback(
    (campaignId: string, chapterId: string, patch: Partial<Chapter>) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        chapters: c.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, ...patch } : ch
        ),
      }));
    },
    [patchCampaign]
  );

  const deleteChapter = useCallback(
    (campaignId: string, chapterId: string) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        chapters: c.chapters.filter((ch) => ch.id !== chapterId),
      }));
    },
    [patchCampaign]
  );

  const updateChapterEvents = useCallback(
    (campaignId: string, chapterId: string, events: Chapter['events']) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        chapters: c.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, events } : ch
        ),
      }));
    },
    [patchCampaign]
  );

  const updateChapterMap = useCallback(
    (campaignId: string, chapterId: string, map: ChapterMap) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        chapters: c.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, map } : ch
        ),
      }));
    },
    [patchCampaign]
  );

  // ------------------------------------------------------------------
  // Characters
  // ------------------------------------------------------------------

  const addCharacter = useCallback(
    (
      campaignId: string,
      input: { kind: 'playable' | 'enemy'; name?: string }
    ): Character => {
      const character = createEmptyCharacter(input.kind, input.name);
      patchCampaign(campaignId, (c) => ({
        ...c,
        characters: [...c.characters, character],
      }));
      return character;
    },
    [patchCampaign]
  );

  const updateCharacter = useCallback(
    (campaignId: string, characterId: string, patch: Partial<Character>) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        characters: c.characters.map((ch) =>
          ch.id === characterId ? { ...ch, ...patch } : ch
        ),
      }));
    },
    [patchCampaign]
  );

  const deleteCharacter = useCallback(
    (campaignId: string, characterId: string) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        characters: c.characters.filter((ch) => ch.id !== characterId),
        members: c.members.map((m) =>
          m.characterId === characterId ? { ...m, characterId: undefined } : m
        ),
      }));
    },
    [patchCampaign]
  );

  // ------------------------------------------------------------------
  // Miembros
  // ------------------------------------------------------------------

  const addMember = useCallback(
    (
      campaignId: string,
      { userId, role, characterId }: { userId: string; role: MemberRole; characterId?: string }
    ) => {
      patchCampaign(campaignId, (c) => {
        if (c.members.some((m) => m.userId === userId)) return c;
        return {
          ...c,
          members: [
            ...c.members,
            { userId, role, characterId, joinedAt: new Date().toISOString() },
          ],
        };
      });
    },
    [patchCampaign]
  );

  const removeMember = useCallback(
    (campaignId: string, userId: string) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        members: c.members.filter(
          (m) => m.userId !== userId || m.userId === c.ownerId
        ),
      }));
    },
    [patchCampaign]
  );

  const updateMemberRole = useCallback(
    (campaignId: string, userId: string, role: MemberRole) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        members: c.members.map((m) =>
          m.userId === userId && m.userId !== c.ownerId ? { ...m, role } : m
        ),
      }));
    },
    [patchCampaign]
  );

  const assignCharacter = useCallback(
    (campaignId: string, userId: string, characterId: string | null) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        members: c.members.map((m) =>
          m.userId === userId
            ? { ...m, characterId: characterId ?? undefined }
            : m
        ),
      }));
    },
    [patchCampaign]
  );

  // ------------------------------------------------------------------
  // Anotaciones
  // ------------------------------------------------------------------

  const addAnnotation = useCallback(
    (
      campaignId: string,
      input: {
        userId: string;
        targetType: 'character' | 'chapter';
        targetId: string;
        text: string;
      }
    ): Annotation => {
      const annotation: Annotation = {
        id: generateId('ann'),
        userId: input.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        text: input.text,
        createdAt: new Date().toISOString(),
      };
      patchCampaign(campaignId, (c) => ({
        ...c,
        annotations: [...c.annotations, annotation],
      }));
      return annotation;
    },
    [patchCampaign]
  );

  const removeAnnotation = useCallback(
    (campaignId: string, annotationId: string) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        annotations: c.annotations.filter((a) => a.id !== annotationId),
      }));
    },
    [patchCampaign]
  );

  // ------------------------------------------------------------------
  // Spoilers
  // ------------------------------------------------------------------

  const toggleSpoiler = useCallback(
    (campaignId: string, hash: string) => {
      patchCampaign(campaignId, (c) => ({
        ...c,
        revealedSpoilers: c.revealedSpoilers.includes(hash)
          ? c.revealedSpoilers.filter((h) => h !== hash)
          : [...c.revealedSpoilers, hash],
      }));
    },
    [patchCampaign]
  );

  const revealAllSpoilers = useCallback(
    (campaignId: string) => {
      patchCampaign(campaignId, (c) => {
        const allHashes = collectSpoilerHashes(c);
        return { ...c, revealedSpoilers: allHashes };
      });
    },
    [patchCampaign]
  );

  const hideAllSpoilers = useCallback(
    (campaignId: string) => {
      patchCampaign(campaignId, (c) => ({ ...c, revealedSpoilers: [] }));
    },
    [patchCampaign]
  );

  // ------------------------------------------------------------------
  // Invitaciones / view-only links — server-issued
  // ------------------------------------------------------------------

  const generateShareToken = useCallback(
    (campaignId: string): string => {
      // Optimistic placeholder while the request is in flight; replaced
      // with the real token when the API answers.
      const placeholder = generateId('inv').replace(/[^a-z0-9-]/gi, '');
      patchCampaign(campaignId, (c) => ({ ...c, shareToken: placeholder }));
      // Demo session: the placeholder *is* the token (purely local).
      if (isDemoRef.current) return placeholder;
      (async () => {
        try {
          const real = await campaignsApi.generateShareToken(campaignId);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === campaignId ? { ...c, shareToken: real } : c))
          );
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not generate share token');
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId ? { ...c, shareToken: undefined } : c
            )
          );
        }
      })();
      return placeholder;
    },
    [patchCampaign]
  );

  const revokeShareToken = useCallback(
    (campaignId: string) => {
      patchCampaign(campaignId, (c) => ({ ...c, shareToken: undefined }));
      if (isDemoRef.current) return;
      (async () => {
        try {
          await campaignsApi.revokeShareToken(campaignId);
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not revoke share token');
        }
      })();
    },
    [patchCampaign]
  );

  const generateViewToken = useCallback(
    (campaignId: string): string => {
      const placeholder = generateId('view').replace(/[^a-z0-9-]/gi, '');
      patchCampaign(campaignId, (c) => ({ ...c, viewToken: placeholder }));
      if (isDemoRef.current) return placeholder;
      (async () => {
        try {
          const real = await campaignsApi.generateViewToken(campaignId);
          setCampaigns((prev) =>
            prev.map((c) => (c.id === campaignId ? { ...c, viewToken: real } : c))
          );
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not generate view token');
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId ? { ...c, viewToken: undefined } : c
            )
          );
        }
      })();
      return placeholder;
    },
    [patchCampaign]
  );

  const revokeViewToken = useCallback(
    (campaignId: string) => {
      patchCampaign(campaignId, (c) => ({ ...c, viewToken: undefined }));
      if (isDemoRef.current) return;
      (async () => {
        try {
          await campaignsApi.revokeViewToken(campaignId);
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not revoke view token');
        }
      })();
    },
    [patchCampaign]
  );

  const findByViewToken = useCallback(
    (token: string): Campaign | null => {
      if (!token) return null;
      return campaigns.find((c) => c.viewToken === token) ?? null;
    },
    [campaigns]
  );

  const findByShareToken = useCallback(
    (token: string): Campaign | null => {
      if (!token) return null;
      return campaigns.find((c) => c.shareToken === token) ?? null;
    },
    [campaigns]
  );

  const acceptInvite = useCallback(
    (token: string, userId: string, role: MemberRole = 'player'): Campaign | null => {
      // Local optimistic join when the campaign is already in our list,
      // plus a server-side join via the share-token endpoint to cover the
      // case where the campaign isn't in our state yet.
      const target = campaigns.find((c) => c.shareToken === token);
      if (target && !target.members.some((m) => m.userId === userId)) {
        patchCampaign(target.id, (c) => ({
          ...c,
          members: [
            ...c.members,
            { userId, role, joinedAt: new Date().toISOString() },
          ],
        }));
      }
      // Demo session: tokens are local; whatever was found in state is final.
      if (isDemoRef.current) return target ?? null;
      (async () => {
        try {
          const dto = await campaignsApi.acceptInvite(token);
          const real = dtoToCampaign(dto);
          setCampaigns((prev) => {
            const idx = prev.findIndex((c) => c.id === real.id);
            if (idx === -1) return [...prev, real];
            const copy = [...prev];
            copy[idx] = real;
            return copy;
          });
          setSyncError(null);
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Could not accept invite');
        }
      })();
      return target ?? null;
    },
    [campaigns, patchCampaign]
  );

  // ------------------------------------------------------------------
  // Helpers de rol
  // ------------------------------------------------------------------

  const getRole = useCallback(
    (campaignId: string, userId: string): MemberRole | null => {
      const c = campaigns.find((x) => x.id === campaignId);
      if (!c) return null;
      const m = c.members.find((x) => x.userId === userId);
      return m ? m.role : null;
    },
    [campaigns]
  );

  // ------------------------------------------------------------------
  // Derivado
  // ------------------------------------------------------------------

  const activeCampaign = useMemo(() => {
    if (!activeCampaignId) return null;
    return campaigns.find((c) => c.id === activeCampaignId) ?? null;
  }, [campaigns, activeCampaignId]);

  const value = useMemo<CampaignContextValue>(
    () => ({
      campaigns,
      loading,
      syncing,
      syncError,
      activeCampaignId,
      activeCampaign,
      setActiveCampaign,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      reorderCampaigns,
      cloneCampaign,
      requestJoin,
      addChapter,
      updateChapter,
      deleteChapter,
      updateChapterEvents,
      updateChapterMap,
      addCharacter,
      updateCharacter,
      deleteCharacter,
      addMember,
      removeMember,
      updateMemberRole,
      assignCharacter,
      addAnnotation,
      removeAnnotation,
      toggleSpoiler,
      revealAllSpoilers,
      hideAllSpoilers,
      generateShareToken,
      revokeShareToken,
      findByShareToken,
      generateViewToken,
      revokeViewToken,
      findByViewToken,
      acceptInvite,
      getRole,
    }),
    [
      campaigns,
      loading,
      syncing,
      syncError,
      activeCampaignId,
      activeCampaign,
      setActiveCampaign,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      reorderCampaigns,
      cloneCampaign,
      requestJoin,
      addChapter,
      updateChapter,
      deleteChapter,
      updateChapterEvents,
      updateChapterMap,
      addCharacter,
      updateCharacter,
      deleteCharacter,
      addMember,
      removeMember,
      updateMemberRole,
      assignCharacter,
      addAnnotation,
      removeAnnotation,
      toggleSpoiler,
      revealAllSpoilers,
      hideAllSpoilers,
      generateShareToken,
      revokeShareToken,
      findByShareToken,
      generateViewToken,
      revokeViewToken,
      findByViewToken,
      acceptInvite,
      getRole,
    ]
  );

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaigns(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error('useCampaigns debe usarse dentro de <CampaignProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers públicos
// ---------------------------------------------------------------------------

export function isDungeonMaster(
  campaign: Campaign | null,
  userId: string | null
): boolean {
  if (!campaign || !userId) return false;
  const m = campaign.members.find((x) => x.userId === userId);
  return m?.role === 'dm' || m?.role === 'co-dm';
}

export function canSeeSpoilers(
  campaign: Campaign | null,
  userId: string | null
): boolean {
  return isDungeonMaster(campaign, userId);
}

export function spoilerHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export const SPOILER_REGEX = /\|\|([\s\S]+?)\|\|/g;

function collectSpoilerHashes(c: Campaign): string[] {
  const hashes = new Set<string>();
  const scan = (text: string | undefined) => {
    if (!text) return;
    let m: RegExpExecArray | null;
    const re = new RegExp(SPOILER_REGEX.source, 'g');
    while ((m = re.exec(text)) !== null) {
      hashes.add(spoilerHash(m[1]));
    }
  };
  c.characters.forEach((ch) => scan(ch.description));
  c.annotations.forEach((a) => scan(a.text));
  c.chapters.forEach((ch) => scan(ch.title));
  return Array.from(hashes);
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyChapter(title: string): Chapter {
  return {
    id: generateId('ch'),
    title,
    events: { blocks: [], connections: [] },
    map: { cells: {}, cols: 15, rows: 15 },
  };
}

export function createEmptyCharacter(
  kind: 'playable' | 'enemy',
  name?: string
): Character {
  return {
    id: generateId('char'),
    name: name ?? '',
    kind,
    level: 1,
    armor: 10,
    hp: 10,
    maxHp: 10,
    movement: 30,
    damageDice: '1d6',
    initiative: 0,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: [],
    skills: [],
    inventory: [],
    inventorySlots: 12,
    spells: [],
    features: [],
    attacks: [],
    description: '',
  };
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
