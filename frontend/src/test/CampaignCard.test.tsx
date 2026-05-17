import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignCard } from '../components/shared/CampaignCard/CampaignCard';

const props = {
  image: 'https://example.test/cover.png',
  hoverImage: 'https://example.test/cover-hover.png',
  name: 'La sombra de Ravenwood',
};

describe('CampaignCard', () => {
  it('expone el nombre como aria-label accesible', () => {
    render(<CampaignCard {...props} />);
    expect(
      screen.getByRole('button', { name: 'La sombra de Ravenwood' })
    ).toBeInTheDocument();
  });

  it('renderiza la imagen base con alt = nombre (texto descriptivo)', () => {
    render(<CampaignCard {...props} />);
    const baseImg = screen.getByAltText('La sombra de Ravenwood') as HTMLImageElement;
    expect(baseImg.src).toBe(props.image);
  });

  it('marca la imagen de hover como decorativa (alt vacío + aria-hidden)', () => {
    render(<CampaignCard {...props} />);
    const hoverImg = document.querySelector(
      '.campaign-card__image--hover'
    ) as HTMLImageElement;
    expect(hoverImg).not.toBeNull();
    expect(hoverImg.alt).toBe('');
    expect(hoverImg.getAttribute('aria-hidden')).toBe('true');
  });

  it('llama onSelect al hacer click', async () => {
    const onSelect = vi.fn();
    render(<CampaignCard {...props} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('llama onSelect al pulsar Enter (accesibilidad por teclado)', async () => {
    const onSelect = vi.fn();
    render(<CampaignCard {...props} onSelect={onSelect} />);
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('llama onSelect al pulsar Espacio (accesibilidad por teclado)', async () => {
    const onSelect = vi.fn();
    render(<CampaignCard {...props} onSelect={onSelect} />);
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('es navegable por teclado (tabIndex=0)', () => {
    render(<CampaignCard {...props} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});
