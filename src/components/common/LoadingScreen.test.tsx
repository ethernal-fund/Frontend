import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('debería renderizar el spinner animado', () => {
    const { container } = render(<LoadingScreen />);
    const animatedElement = container.querySelector('.animate-spin');
    expect(animatedElement).not.toBeNull();
  });

  it('debería mostrar el título "Loading Ethernal"', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading Ethernal')).toBeDefined();
  });

  it('debería mostrar el subtítulo de conexión', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Connecting to blockchain...')).toBeDefined();
  });

  it('debería tener las clases CSS de centrado', () => {
    const { container } = render(<LoadingScreen />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('flex');
    expect(mainContainer.className).toContain('justify-center');
    expect(mainContainer.className).toContain('items-center');
  });

  it('debería renderizar el contenedor raíz', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).not.toBeNull();
  });
});