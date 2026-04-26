import { useEffect, useRef, useState } from 'react';

/**
 * Hook que consume la API pública https://www.dnd5eapi.co/
 *
 * Expone:
 *   · `classes`: lista simplificada (`{ index, name }`).
 *   · `loading` / `error` para el estado de carga.
 *   · `fetchClassDetail(index)`: resuelve detalles relevantes (dado de
 *     golpe, tiros de salvación, competencias, etc.) para auto-rellenar
 *     la ficha del personaje. Los resultados se cachean en memoria.
 *
 * No bloquea el render de la página: si la API falla, `classes` se
 * queda vacío y el usuario puede usar la opción "Homebrew" para
 * escribir una clase a mano.
 */
export interface DndClassIndex {
  index: string;
  name: string;
}

export interface DndClassDetail {
  index: string;
  name: string;
  hitDie: number;
  savingThrows: string[];
  proficiencies: string[];
  startingEquipment: string[];
}

const API_BASE = 'https://www.dnd5eapi.co/api';

export function useDndClasses() {
  const [classes, setClasses] = useState<DndClassIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef<Map<string, DndClassDetail>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/classes`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          results: Array<{ index: string; name: string }>;
        };
        if (cancelled) return;
        setClasses(data.results.map((r) => ({ index: r.index, name: r.name })));
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

  const fetchClassDetail = async (index: string): Promise<DndClassDetail | null> => {
    if (!index) return null;
    const cached = detailCache.current.get(index);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_BASE}/classes/${index}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const detail: DndClassDetail = {
        index: data.index,
        name: data.name,
        hitDie: data.hit_die,
        savingThrows: (data.saving_throws ?? []).map((s: { name: string }) => s.name),
        proficiencies: (data.proficiencies ?? []).map((p: { name: string }) => p.name),
        startingEquipment: (data.starting_equipment ?? []).map(
          (p: { equipment: { name: string } }) => p.equipment.name
        ),
      };
      detailCache.current.set(index, detail);
      return detail;
    } catch {
      return null;
    }
  };

  return { classes, loading, error, fetchClassDetail };
}
