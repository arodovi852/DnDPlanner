import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from '../hooks/usePageTitle';

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = 'DnDPlanner';
  });

  it('concatena el título recibido con la marca base', () => {
    renderHook(() => usePageTitle('Mi perfil'));
    expect(document.title).toBe('Mi perfil - DnDPlanner');
  });

  it('deja solo la marca si recibe null', () => {
    renderHook(() => usePageTitle(null));
    expect(document.title).toBe('DnDPlanner');
  });

  it('deja solo la marca si recibe cadena vacía', () => {
    renderHook(() => usePageTitle(''));
    expect(document.title).toBe('DnDPlanner');
  });

  it('reacciona a cambios del título entre renders', () => {
    const { rerender } = renderHook(({ title }: { title: string }) => usePageTitle(title), {
      initialProps: { title: 'Inicio' },
    });
    expect(document.title).toBe('Inicio - DnDPlanner');
    rerender({ title: 'Campañas' });
    expect(document.title).toBe('Campañas - DnDPlanner');
  });
});
