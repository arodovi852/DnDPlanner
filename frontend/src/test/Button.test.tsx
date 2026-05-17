import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/shared/Button/Button';

describe('Button', () => {
  it('renderiza el texto que recibe como children', () => {
    render(<Button>Continuar</Button>);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('aplica la clase BEM base por defecto', () => {
    render(<Button>X</Button>);
    expect(screen.getByRole('button')).toHaveClass('button');
    expect(screen.getByRole('button')).not.toHaveClass('button--small');
  });

  it('aplica el modifier --small cuando size="small"', () => {
    render(<Button size="small">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('button');
    expect(btn).toHaveClass('button--small');
  });

  it('concatena className extra preservando las clases internas', () => {
    render(<Button className="extra">X</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('button');
    expect(btn).toHaveClass('extra');
  });

  it('llama al handler onClick al hacer click', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('por defecto es type="button" para no enviar formularios accidentalmente', () => {
    render(<Button>X</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('respeta type="submit" si se pasa explícitamente', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('queda deshabilitado y no dispara onClick si disabled', async () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        X
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
