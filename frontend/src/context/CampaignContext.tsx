import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Tipos del dominio
// ---------------------------------------------------------------------------

export interface Chapter {
  id: string;
  title: string;
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

export interface Character {
  id: string;
  name: string;
  kind: 'playable' | 'enemy';
  image?: string;
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
  description: string;
}

// ---------------------------------------------------------------------------
// Social: miembros, roles, anotaciones, spoilers, invitaciones
// ---------------------------------------------------------------------------

export type MemberRole = 'dm' | 'co-dm' | 'player';

export interface CampaignMember {
  userId: string;
  role: MemberRole;
  /** Sólo `player`: id del personaje asignado al jugador. */
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
  /** Creador original (DM por defecto). */
  ownerId: string;
  chapters: Chapter[];
  characters: Character[];
  members: CampaignMember[];
  annotations: Annotation[];
  /** Hashes de spoilers revelados por el DM → jugadores pueden verlos. */
  revealedSpoilers: string[];
  /** Token opaco para enlaces de invitación. */
  shareToken?: string;
}

// ---------------------------------------------------------------------------
// Plantillas predefinidas (provisional — el usuario aportará datos reales
// en un prompt posterior).
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
    build: () => ({
      chapters: [],
      characters: [],
    }),
  },
  {
    id: 'destinos-cruzados',
    name: 'Destinos Cruzados',
    description: 'Intrigue on a train crossing the continent.',
    build: () => ({
      chapters: [
        { id: generateId('ch'), title: 'Chapter 1: Departure' },
        { id: generateId('ch'), title: 'Chapter 2: The Passengers' },
        { id: generateId('ch'), title: 'Chapter 3: The Stormy Night' },
      ],
      characters: [],
    }),
  },
  {
    id: 'campollano',
    name: 'Campollano',
    description: 'Classic open-world adventure.',
    build: () => ({
      chapters: [
        { id: generateId('ch'), title: 'Chapter 1: The Tavern' },
        { id: generateId('ch'), title: 'Chapter 2: The Forest Trail' },
      ],
      characters: [],
    }),
  },
  {
    id: 'guerra',
    name: 'Guerra',
    description: 'High stakes military campaign.',
    build: () => ({
      chapters: [
        { id: generateId('ch'), title: 'Chapter 1: Call to Arms' },
        { id: generateId('ch'), title: 'Chapter 2: First Battle' },
        { id: generateId('ch'), title: 'Chapter 3: The Siege' },
        { id: generateId('ch'), title: 'Chapter 4: The Aftermath' },
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

  addChapter: (campaignId: string, title?: string) => Chapter;
  updateChapter: (campaignId: string, chapterId: string, patch: Partial<Chapter>) => void;
  deleteChapter: (campaignId: string, chapterId: string) => void;

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

  // --- Miembros -----------------------------------------------------------
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

  // --- Anotaciones --------------------------------------------------------
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

  // --- Spoilers -----------------------------------------------------------
  toggleSpoiler: (campaignId: string, hash: string) => void;
  revealAllSpoilers: (campaignId: string) => void;
  hideAllSpoilers: (campaignId: string) => void;

  // --- Invitaciones -------------------------------------------------------
  generateShareToken: (campaignId: string) => string;
  revokeShareToken: (campaignId: string) => void;
  findByShareToken: (token: string) => Campaign | null;
  acceptInvite: (
    token: string,
    userId: string,
    role?: MemberRole
  ) => Campaign | null;

  // --- Helpers de rol -----------------------------------------------------
  getRole: (campaignId: string, userId: string) => MemberRole | null;
}

const CampaignContext = createContext<CampaignContextValue | undefined>(undefined);

const STORAGE_KEY = 'dndplanner:campaigns';
const ACTIVE_KEY = 'dndplanner:activeCampaign';
const DRAFT_COOKIE = 'dndplanner_campaigns_draft';

/** Normaliza una campaña leída de localStorage rellenando campos nuevos. */
function normalizeCampaign(raw: Partial<Campaign>): Campaign {
  return {
    id: raw.id ?? generateId('camp'),
    name: raw.name ?? 'Untitled Campaign',
    templateId: raw.templateId,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    ownerId: raw.ownerId ?? '',
    chapters: raw.chapters ?? [],
    characters: raw.characters ?? [],
    members: raw.members ?? [],
    annotations: raw.annotations ?? [],
    revealedSpoilers: raw.revealedSpoilers ?? [],
    shareToken: raw.shareToken,
  };
}

function readStoredCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<Partial<Campaign>>).map(normalizeCampaign);
  } catch {
    return [];
  }
}

function readActiveCampaignId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => readStoredCampaigns());
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(() =>
    readActiveCampaignId()
  );

  // Persistencia: localStorage + cookie de respaldo ("draft").
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(campaigns);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    document.cookie = `${DRAFT_COOKIE}=${encodeURIComponent(
      serialized
    )}; max-age=${60 * 60 * 24 * 7}; path=/; SameSite=Lax`;
  }, [campaigns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeCampaignId) {
      window.localStorage.setItem(ACTIVE_KEY, activeCampaignId);
    } else {
      window.localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeCampaignId]);

  const setActiveCampaign = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
  }, []);

  // Helper interno para mutar una campaña por id.
  const patchCampaign = useCallback(
    (campaignId: string, patch: (c: Campaign) => Campaign) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId
            ? { ...patch(c), updatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
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
      const now = new Date().toISOString();
      const finalName = name.trim() || 'Untitled Campaign';
      const template = templateId
        ? CAMPAIGN_TEMPLATES.find((t) => t.id === templateId)
        : undefined;
      const base = template ? template.build() : { chapters: [], characters: [] };

      const campaign: Campaign = {
        id: generateId('camp'),
        name: finalName,
        templateId: template?.id,
        createdAt: now,
        updatedAt: now,
        ownerId,
        chapters: base.chapters,
        characters: base.characters,
        members: [
          {
            userId: ownerId,
            role: 'dm',
            joinedAt: now,
          },
        ],
        annotations: [],
        revealedSpoilers: [],
      };

      setCampaigns((prev) => [...prev, campaign]);
      setActiveCampaignIdState(campaign.id);
      return campaign;
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
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setActiveCampaignIdState((curr) => (curr === id ? null : curr));
  }, []);

  // ------------------------------------------------------------------
  // Chapters
  // ------------------------------------------------------------------

  const addChapter = useCallback(
    (campaignId: string, title?: string): Chapter => {
      const chapter: Chapter = {
        id: generateId('ch'),
        title: title ?? '',
      };
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
        // También desasignamos el personaje de cualquier miembro que lo tuviera.
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
            {
              userId,
              role,
              characterId,
              joinedAt: new Date().toISOString(),
            },
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
        // El owner nunca puede ser expulsado.
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
  // Invitaciones
  // ------------------------------------------------------------------

  const generateShareToken = useCallback(
    (campaignId: string): string => {
      const token = generateId('inv').replace(/[^a-z0-9-]/gi, '');
      patchCampaign(campaignId, (c) => ({ ...c, shareToken: token }));
      return token;
    },
    [patchCampaign]
  );

  const revokeShareToken = useCallback(
    (campaignId: string) => {
      patchCampaign(campaignId, (c) => ({ ...c, shareToken: undefined }));
    },
    [patchCampaign]
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
      const target = campaigns.find((c) => c.shareToken === token);
      if (!target) return null;
      if (target.members.some((m) => m.userId === userId)) {
        return target;
      }
      const now = new Date().toISOString();
      const updated: Campaign = {
        ...target,
        members: [...target.members, { userId, role, joinedAt: now }],
        updatedAt: now,
      };
      setCampaigns((prev) => prev.map((c) => (c.id === target.id ? updated : c)));
      return updated;
    },
    [campaigns]
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
      activeCampaignId,
      activeCampaign,
      setActiveCampaign,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      addChapter,
      updateChapter,
      deleteChapter,
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
      acceptInvite,
      getRole,
    }),
    [
      campaigns,
      activeCampaignId,
      activeCampaign,
      setActiveCampaign,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      addChapter,
      updateChapter,
      deleteChapter,
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

/** Hash determinista (djb2) usado para identificar spoilers por contenido. */
export function spoilerHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/** Sintaxis soportada: `||texto oculto||`. */
export const SPOILER_REGEX = /\|\|([\s\S]+?)\|\|/g;

/** Recorre todos los textos conocidos de la campaña y devuelve hashes únicos. */
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
    description: '',
  };
}

/** Fórmula estándar de DnD 5e: `(score - 10) / 2` redondeado hacia abajo. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
