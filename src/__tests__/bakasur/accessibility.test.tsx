import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BakaSurPage } from '../../pages/BakaSurPage';
import { BakaSurRail } from '../../components/shell/BakaSurRail';
import { AuthContext } from '../../features/auth/AuthProvider';
import type { IdentityProvider } from '../../features/auth/types';

// Mock guest identity provider
const mockAuthContext: IdentityProvider = {
  user: {
    id: 'guest',
    email: 'guest@demo.local',
    name: 'Guest Explorer',
    provider: 'guest',
  },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: async () => '',
};

function renderWithProviders(ui: React.ReactElement, route = '/bakasur') {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('BakaSur Accessibility & Composer Disambiguation', () => {
  it('BakaSurPage exposes a unique accessible name "Ask BakaSur (Page Composer)"', () => {
    renderWithProviders(<BakaSurPage />);

    const pageInput = screen.getByRole('textbox', { name: 'Ask BakaSur (Page Composer)' });
    expect(pageInput).toBeTruthy();
    expect(pageInput.getAttribute('aria-label')).toBe('Ask BakaSur (Page Composer)');
    expect(pageInput.getAttribute('placeholder')).toBe('Ask BakaSur…');

    // Verify keyboard entry
    fireEvent.change(pageInput, { target: { value: 'How can I organize my tasks today?' } });
    expect((pageInput as HTMLInputElement).value).toBe('How can I organize my tasks today?');
  });

  it('BakaSurRail exposes a unique accessible name "Ask BakaSur (Docked Rail)" when expanded', () => {
    renderWithProviders(<BakaSurRail collapsed={false} onToggle={() => {}} />);

    const railInput = screen.getByRole('textbox', { name: 'Ask BakaSur (Docked Rail)' });
    expect(railInput).toBeTruthy();
    expect(railInput.getAttribute('aria-label')).toBe('Ask BakaSur (Docked Rail)');
    expect(railInput.getAttribute('placeholder')).toBe('Ask BakaSur…');

    // Verify keyboard entry
    fireEvent.change(railInput, { target: { value: 'Hello BakaSur' } });
    expect((railInput as HTMLInputElement).value).toBe('Hello BakaSur');
  });

  it('BakaSurRail hides its composer from assistive tech when collapsed', () => {
    renderWithProviders(<BakaSurRail collapsed={true} onToggle={() => {}} />);

    // When collapsed, BakaSurRail returns null, so no docked rail textbox should exist
    const railInput = screen.queryByRole('textbox', { name: 'Ask BakaSur (Docked Rail)' });
    expect(railInput).toBeNull();
  });

  it('resolves duplicate accessible names when both BakaSurPage and BakaSurRail are mounted simultaneously', () => {
    renderWithProviders(
      <div>
        <BakaSurPage />
        <BakaSurRail collapsed={false} onToggle={() => {}} />
      </div>
    );

    // Ensure NO elements have the ambiguous old label "Ask BakaSur"
    const ambiguousInputs = screen.queryAllByRole('textbox', { name: /^Ask BakaSur$/ });
    expect(ambiguousInputs.length).toBe(0);

    // Ensure both distinct composers can be selected unambiguously
    const pageComposer = screen.getByRole('textbox', { name: 'Ask BakaSur (Page Composer)' });
    const railComposer = screen.getByRole('textbox', { name: 'Ask BakaSur (Docked Rail)' });

    expect(pageComposer).toBeTruthy();
    expect(railComposer).toBeTruthy();
    expect(pageComposer).not.toBe(railComposer);
  });
});
