import { useEffect, useRef, useState } from 'react';

const API_BASE = 'https://www.dnd5eapi.co/api';
const ASSET_BASE = 'https://www.dnd5eapi.co';

export interface DndMonsterIndex {
  index: string;
  name: string;
  url: string;
}

export interface DndMonsterAttack {
  name: string;
  description: string;
  attackBonus?: number;
  damage?: string;
}

export interface DndMonsterDetail {
  index: string;
  name: string;
  size?: string;
  type?: string;
  alignment?: string;
  armorClass: number;
  hitPoints: number;
  hitPointsRoll?: string;
  speed: number;
  challengeRating: number;
  proficiencyBonus: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  attacks: DndMonsterAttack[];
  image?: string;
}

interface ArmorClassEntry {
  type?: string;
  value?: number;
}

interface MonsterSpeedRaw {
  walk?: string;
  fly?: string;
  swim?: string;
  burrow?: string;
  climb?: string;
}

interface MonsterDamageRaw {
  damage_type?: { name?: string };
  damage_dice?: string;
}

interface MonsterActionRaw {
  name?: string;
  desc?: string;
  attack_bonus?: number;
  damage?: MonsterDamageRaw[];
}

function parseSpeed(speed: MonsterSpeedRaw | string | undefined): number {
  if (!speed) return 30;
  if (typeof speed === 'string') {
    const m = speed.match(/(\d+)/);
    return m ? parseInt(m[1]) : 30;
  }
  const m = speed.walk?.match(/(\d+)/);
  return m ? parseInt(m[1]) : 30;
}

function parseArmorClass(ac: ArmorClassEntry[] | number | undefined): number {
  if (typeof ac === 'number') return ac;
  if (Array.isArray(ac) && ac.length > 0) {
    return typeof ac[0].value === 'number' ? ac[0].value : 10;
  }
  return 10;
}

function parseAttacks(actions: MonsterActionRaw[] | undefined): DndMonsterAttack[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((a): a is MonsterActionRaw & { name: string } => Boolean(a?.name))
    .map((action) => {
      const damageDice = (action.damage ?? [])
        .map((d) => {
          const dice = d.damage_dice ?? '';
          const type = d.damage_type?.name ?? '';
          return type ? `${dice} ${type.toLowerCase()}` : dice;
        })
        .filter(Boolean)
        .join(' + ');
      return {
        name: action.name,
        description: action.desc ?? '',
        attackBonus:
          typeof action.attack_bonus === 'number' ? action.attack_bonus : undefined,
        damage: damageDice || undefined,
      };
    });
}

function buildImageUrl(image: string | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('http')) return image;
  return `${ASSET_BASE}${image.startsWith('/') ? image : `/${image}`}`;
}

/**
 * Hook que consume el API público de D&D 5e para monstruos.
 *
 * Devuelve la lista (`{ index, name }`) y un `fetchMonsterDetail` que
 * resuelve datos completos (stats, AC, HP, ataques, imagen…) y los
 * cachea en memoria.
 */
export function useDndMonsters() {
  const [monsters, setMonsters] = useState<DndMonsterIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef<Map<string, DndMonsterDetail>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/monsters`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          results: DndMonsterIndex[];
        };
        if (cancelled) return;
        setMonsters(data.results);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchMonsterDetail = async (
    index: string
  ): Promise<DndMonsterDetail | null> => {
    if (!index) return null;
    const cached = detailCache.current.get(index);
    if (cached) return cached;
    try {
      const res = await fetch(`${API_BASE}/monsters/${index}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const detail: DndMonsterDetail = {
        index: data.index,
        name: data.name,
        size: data.size,
        type: data.type,
        alignment: data.alignment,
        armorClass: parseArmorClass(data.armor_class),
        hitPoints: typeof data.hit_points === 'number' ? data.hit_points : 1,
        hitPointsRoll: data.hit_points_roll ?? data.hit_dice,
        speed: parseSpeed(data.speed),
        challengeRating:
          typeof data.challenge_rating === 'number' ? data.challenge_rating : 0,
        proficiencyBonus:
          typeof data.proficiency_bonus === 'number' ? data.proficiency_bonus : 2,
        stats: {
          str: data.strength ?? 10,
          dex: data.dexterity ?? 10,
          con: data.constitution ?? 10,
          int: data.intelligence ?? 10,
          wis: data.wisdom ?? 10,
          cha: data.charisma ?? 10,
        },
        attacks: parseAttacks(data.actions),
        image: buildImageUrl(data.image),
      };
      detailCache.current.set(index, detail);
      return detail;
    } catch {
      return null;
    }
  };

  return { monsters, loading, error, fetchMonsterDetail };
}
