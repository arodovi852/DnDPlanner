import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface UndoableControls {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Borra el historial (normalmente tras un "save" contra backend). */
  reset: (state: unknown) => void;
}

/**
 * Hook genérico de estado con historial de deshacer/rehacer.
 *
 * Atajos globales registrados mientras el hook está vivo:
 *   · Ctrl+Z          → undo
 *   · Ctrl+Y          → redo
 *   · Ctrl+Shift+Z    → redo
 *
 * Los atajos se ignoran si el foco está en un input editable
 * (input/textarea/contenteditable) para no pisar el undo nativo del
 * navegador.
 *
 * Ejemplo:
 * ```ts
 * const [chapters, setChapters, history] = useUndoableState<Chapter[]>([]);
 * setChapters((prev) => [...prev, newChapter]);
 * history.undo();
 * ```
 */
export function useUndoableState<T>(initial: T): [
  T,
  (next: T | ((prev: T) => T)) => void,
  UndoableControls
] {
  // Historial: arrays de snapshots + puntero.
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  // Referencias actualizadas para los handlers de teclado (evita
  // registrar varios listeners al cambiar el estado).
  const pastRef = useRef(past);
  const presentRef = useRef(present);
  const futureRef = useRef(future);

  useEffect(() => {
    pastRef.current = past;
  }, [past]);
  useEffect(() => {
    presentRef.current = present;
  }, [present]);
  useEffect(() => {
    futureRef.current = future;
  }, [future]);

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      setPresent((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (Object.is(resolved, prev)) return prev;
        setPast((p) => [...p, prev]);
        setFuture([]);
        return resolved;
      });
    },
    []
  );

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const previous = p[p.length - 1];
    setPast(p.slice(0, -1));
    setFuture((f) => [presentRef.current, ...f]);
    setPresent(previous);
  }, []);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const next = f[0];
    setFuture(f.slice(1));
    setPast((p) => [...p, presentRef.current]);
    setPresent(next);
  }, []);

  const reset = useCallback((state: unknown) => {
    setPast([]);
    setFuture([]);
    setPresent(state as T);
  }, []);

  // Atajos de teclado globales.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (isTextInput(target)) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const controls = useMemo<UndoableControls>(
    () => ({
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      reset,
    }),
    [undo, redo, reset, past.length, future.length]
  );

  return [present, setState, controls];
}

function isTextInput(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}
