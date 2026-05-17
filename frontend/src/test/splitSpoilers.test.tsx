import { describe, it, expect } from 'vitest';
import { splitSpoilers } from '../components/shared/Spoiler/SpoilerText';

describe('splitSpoilers', () => {
  it('devuelve un único bloque plano cuando no hay spoilers', () => {
    const parts = splitSpoilers('Hola mundo');
    expect(parts).toEqual([{ kind: 'plain', value: 'Hola mundo' }]);
  });

  it('parsea un único spoiler intermedio', () => {
    const parts = splitSpoilers('El asesino es ||el mayordomo|| en la cocina.');
    expect(parts).toEqual([
      { kind: 'plain', value: 'El asesino es ' },
      { kind: 'spoiler', value: 'el mayordomo' },
      { kind: 'plain', value: ' en la cocina.' },
    ]);
  });

  it('parsea varios spoilers en la misma cadena', () => {
    const parts = splitSpoilers('||Alpha|| dijo a ||Beta|| que huyeran.');
    // 4 bloques: [spoiler, plain, spoiler, plain] (no hay plano inicial).
    expect(parts).toHaveLength(4);
    expect(parts[0]).toEqual({ kind: 'spoiler', value: 'Alpha' });
    expect(parts[1]).toEqual({ kind: 'plain', value: ' dijo a ' });
    expect(parts[2]).toEqual({ kind: 'spoiler', value: 'Beta' });
    expect(parts[3]).toEqual({ kind: 'plain', value: ' que huyeran.' });
  });

  it('soporta spoiler al final de la cadena sin texto detrás', () => {
    const parts = splitSpoilers('Pista: ||clave secreta||');
    expect(parts[parts.length - 1]).toEqual({
      kind: 'spoiler',
      value: 'clave secreta',
    });
  });

  it('soporta cadena vacía', () => {
    expect(splitSpoilers('')).toEqual([]);
  });
});
