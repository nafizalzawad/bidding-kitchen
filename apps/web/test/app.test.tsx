import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../src/App.js';
import { getTransitionConfig } from '../src/tokens/motion-tokens.js';

describe('App Component (Phase 2 Engine Sandbox & Contract Diagnostic)', () => {
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
          engineVerified: true,
        }),
    } as Response);
  });

  it('renders heading, app title and Live Dual-Client Inspector by default', async () => {
    render(<App />);
    expect(screen.getByTestId('app-title')).toBeInTheDocument();
    expect(screen.getByTestId('tab-live-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('hidden-info-proof-badge')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-quick-start-btn')).toBeInTheDocument();
    expect(screen.getByTestId('client-a-panel')).toBeInTheDocument();
    expect(screen.getByTestId('client-b-panel')).toBeInTheDocument();
  });

  it('allows simulating deterministic matches and switching presets in Engine Sandbox', async () => {
    render(<App defaultTab="SANDBOX" />);
    const simButton = screen.getByTestId('btn-simulate-match');
    fireEvent.click(simButton);
    expect(screen.getByTestId('match-winner-badge')).toBeInTheDocument();

    const collisionPreset = screen.getByTestId('btn-test-collision');
    fireEvent.click(collisionPreset);
    expect(screen.getByTestId('round-card-1')).toHaveTextContent(/Collision/i);
  });

  it('switches to Contract Diagnostics tab and renders 5 FlavorTag pills and 19 Street variants', async () => {
    render(<App />);
    const contractTab = screen.getByTestId('tab-contract-diagnostics');
    fireEvent.click(contractTab);

    expect(screen.getByTestId('tag-swatch-section')).toBeInTheDocument();
    expect(screen.getByTestId('tier-list-section')).toBeInTheDocument();
    expect(screen.getByTestId('street-ingredients-section')).toBeInTheDocument();

    expect(screen.getAllByTestId('flavor-pill-smoky').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-spicy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-rich').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-crispy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('flavor-pill-fresh').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByTestId('ingredient-card-street_bun_plain')).toBeInTheDocument();
    expect(screen.getByTestId('ingredient-card-street_patty_wagyu')).toBeInTheDocument();
    expect(screen.getByTestId('ingredient-card-street_topping_bacon')).toBeInTheDocument();
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
