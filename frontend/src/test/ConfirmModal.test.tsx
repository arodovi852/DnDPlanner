import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from '../components/shared/ConfirmModal/ConfirmModal';

const baseProps = {
  title: 'Eliminar campaña',
  description: 'Esta acción no se puede deshacer.',
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

describe('ConfirmModal', () => {
  it('no renderiza nada cuando open=false', () => {
    const { container } = render(<ConfirmModal {...baseProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título y descripción cuando open=true', () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.getByText('Eliminar campaña')).toBeInTheDocument();
    expect(
      screen.getByText('Esta acción no se puede deshacer.')
    ).toBeInTheDocument();
  });

  it('usa role="alertdialog" para que los lectores de pantalla lo anuncien con énfasis', () => {
    render(<ConfirmModal {...baseProps} open={true} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('llama onConfirm al pulsar el botón de confirmar', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        {...baseProps}
        open={true}
        onConfirm={onConfirm}
        confirmLabel="Borrar"
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('llama onClose al pulsar el botón de cancelar', async () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal
        {...baseProps}
        open={true}
        onClose={onClose}
        cancelLabel="Cancelar"
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama onClose al pulsar la X de cerrar', async () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar Escape (accesibilidad por teclado)', async () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...baseProps} open={true} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NO cierra al pulsar Escape si está cerrado (listener no activo)', async () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...baseProps} open={false} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
