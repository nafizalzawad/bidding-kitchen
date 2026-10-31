import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App.js';
import { getTransitionConfig } from '../src/tokens/motion-tokens.js';

describe('App Component (Phase 1 Contract Diagnostic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'ok',
          version: '0.1.0',
          activeRooms: 0,
          sharedContractsLoaded: true,
          streetIngredientsCount: 19,
        }),
    } as Response);
  });

  it('renders heading, app title and semantic sections', async () => {
    render(<App />);
    expect(screen.getByTestId('app-title')).toBeInTheDocument();
    expect(screen.getByTestId('tag-swatch-section')).toBeInTheDocument();
    expect(screen.getByTestId('tier-list-section')).toBeInTheDocument();
    expect(screen.getByTestId('street-ingredients-section')).toBeInTheDocument();
  });

  it('renders all 5 colorblind-safe FlavorTag pills', async () => {
    render(<App />);
    expect(screen.getAllByTestId('flavor-pill-smoky').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-spicy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-rich').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-crispy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-fresh').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 19 canonical Street Burger ingredients', async () => {
    render(<App />);
    expect(screen.getByTestId('ingredient-card-street_bun_plain')).toBeInTheDocument();
    expect(screen.getByTestId('ingredient-card-street_patty_wagyu')).toBeInTheDocument();
    expect(screen.getByTestId('ingredient-card-street_topping_bacon')).toBeInTheDocument();
  });

  it('renders detailed card for Wagyu with price, taste score, limited stock, and Rich tag', async () => {
    render(<App />);
    const wagyuCard = screen.getByTestId('ingredient-card-street_patty_wagyu');
    expect(wagyuCard).toBeInTheDocument();
    expect(wagyuCard).toHaveTextContent('Wagyu');
    expect(wagyuCard).toHaveTextContent('$8');
    expect(wagyuCard).toHaveTextContent('Taste: 10');
    expect(wagyuCard).toHaveTextContent('Stock: 1 (Limited)');
    expect(wagyuCard).toHaveTextContent('RICH');
  });

  it('displays online server health badge when fetch succeeds', async () => {
    render(<App />);
    await waitFor(() => {
      const badge = screen.getByTestId('server-health-badge');
      expect(badge).toHaveTextContent(/online/i);
    });
  });

  it('getTransitionConfig returns 120ms linear fade when prefersReducedMotion is true', () => {
    const reducedConfig = getTransitionConfig('ingredientSlap', true);
    expect(reducedConfig.duration).toBe(0.12);
    expect(reducedConfig.ease).toBe('linear');
    expect(reducedConfig.animateProperty).toBe('opacity');

    const normalConfig = getTransitionConfig('ingredientSlap', false);
    expect(normalConfig).toHaveProperty('stiffness', 520);
    expect(normalConfig).toHaveProperty('damping', 18);
  });
});
