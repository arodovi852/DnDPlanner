import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUndoableState } from '../hooks/useUndoableState';

describe('useUndoableState', () => {
  it('comienza con el estado inicial y sin historial', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    const [value, , history] = result.current;
    expect(value).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('actualiza el estado con un valor directo', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => {
      result.current[1](5);
    });
    expect(result.current[0]).toBe(5);
    expect(result.current[2].canUndo).toBe(true);
  });

  it('actualiza el estado con una función de transición', () => {
    const { result } = renderHook(() => useUndoableState<number>(10));
    act(() => {
      result.current[1]((prev) => prev * 2);
    });
    expect(result.current[0]).toBe(20);
  });

  it('deshace volviendo al estado anterior', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => {
      result.current[1](1);
    });
    act(() => {
      result.current[1](2);
    });
    expect(result.current[0]).toBe(2);

    act(() => {
      result.current[2].undo();
    });
    expect(result.current[0]).toBe(1);
    expect(result.current[2].canUndo).toBe(true);
    expect(result.current[2].canRedo).toBe(true);
  });

  it('rehace el estado tras un undo', () => {
    const { result } = renderHook(() => useUndoableState<string>('a'));
    act(() => {
      result.current[1]('b');
    });
    act(() => {
      result.current[2].undo();
    });
    expect(result.current[0]).toBe('a');

    act(() => {
      result.current[2].redo();
    });
    expect(result.current[0]).toBe('b');
    expect(result.current[2].canRedo).toBe(false);
  });

  it('un nuevo cambio limpia el "future" (no se puede rehacer tras divergir)', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => result.current[1](1));
    act(() => result.current[1](2));
    act(() => result.current[2].undo());
    expect(result.current[2].canRedo).toBe(true);

    // Divergimos: nuevo set que no es 2.
    act(() => result.current[1](99));
    expect(result.current[0]).toBe(99);
    expect(result.current[2].canRedo).toBe(false);
  });

  it('reset borra el historial y fija un nuevo estado', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => result.current[1](1));
    act(() => result.current[1](2));
    expect(result.current[2].canUndo).toBe(true);

    act(() => result.current[2].reset(42));
    expect(result.current[0]).toBe(42);
    expect(result.current[2].canUndo).toBe(false);
    expect(result.current[2].canRedo).toBe(false);
  });

  it('Ctrl+Z dispara undo cuando el foco NO está en un input', () => {
    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => result.current[1](7));
    expect(result.current[0]).toBe(7);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
      );
    });
    expect(result.current[0]).toBe(0);
  });

  it('Ctrl+Y dispara redo', () => {
    const { result } = renderHook(() => useUndoableState<string>('start'));
    act(() => result.current[1]('next'));
    act(() => result.current[2].undo());
    expect(result.current[0]).toBe('start');

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })
      );
    });
    expect(result.current[0]).toBe('next');
  });

  it('ignora los atajos si el foco está en un input editable', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useUndoableState<number>(0));
    act(() => result.current[1](5));

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
      );
    });
    // Como el target es un input, el hook no ha hecho undo.
    expect(result.current[0]).toBe(5);

    document.body.removeChild(input);
  });
});
