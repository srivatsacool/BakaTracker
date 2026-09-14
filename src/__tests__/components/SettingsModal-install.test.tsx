import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsModal } from '../../components/shared/layout/SettingsModal';
import type { ApiClient } from '../../api/apiClient';

const { fetchMock, saveMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  saveMock: vi.fn(),
}));

vi.mock('../../services/assistantChat', () => ({
  fetchAiSettings: fetchMock,
  saveAiSettings: saveMock,
}));

vi.mock('../../services/push', () => ({
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  isPushSubscribed: vi.fn().mockResolvedValue(false),
}));

vi.mock('../../services/notificationSettings', () => ({
  NOTIF_TONES: ['concise'],
  getNotificationSettings: vi.fn().mockResolvedValue({
    enabled: false,
    tone: 'concise',
    quiet_hours: { enabled: false, start: '22:00', end: '07:00' },
  }),
  updateNotificationSettings: vi.fn((s: unknown) => Promise.resolve(s)),
}));

vi.mock('../../services/demoMode', () => ({
  seedDemoData: vi.fn(),
}));

vi.mock('../../components/shell', () => ({
  SyncStatus: () => null,
}));

const LIMITED_SETTINGS = {
  ai_turns_per_day: 30,
  custom_turns: null,
  effectiveQuota: 30,
  planMax: 30,
  quota: { used: 0, remaining: 30, effectiveQuota: 30 },
};

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const realUserAgent = window.navigator.userAgent;
const realMatchMedia = window.matchMedia;

function stubEnvironment(opts: { standalone?: boolean; ua?: string }) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: opts.ua ?? DESKTOP_UA,
    configurable: true,
  });
  window.matchMedia = ((query: string) => ({
    matches: query === '(display-mode: standalone)' ? (opts.standalone ?? false) : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderModal(isGuest = false) {
  render(
    <MemoryRouter>
      <SettingsModal
        user={null}
        isGuest={isGuest}
        isAuthConfigured
        login={vi.fn()}
        logout={vi.fn()}
        getAccessToken={vi.fn()}
        apiClient={{} as ApiClient}
        init={vi.fn()}
        clearDataByDays={vi.fn()}
        onReplayWalkthrough={vi.fn()}
        onClose={vi.fn()}
        onRequestExport={vi.fn()}
      />
    </MemoryRouter>,
  );
}

interface PromptEventInit {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function fireBeforeInstallPrompt(init: PromptEventInit) {
  const evt = new Event('beforeinstallprompt') as Event & Partial<PromptEventInit>;
  evt.prompt = init.prompt;
  evt.userChoice = init.userChoice;
  act(() => {
    window.dispatchEvent(evt);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({ ...LIMITED_SETTINGS });
});

afterEach(() => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: realUserAgent,
    configurable: true,
  });
  window.matchMedia = realMatchMedia;
});

describe('SettingsModal — Install App section', () => {
  it('hidden when no prompt, not iOS, not installed', async () => {
    stubEnvironment({});
    renderModal();
    await screen.findByText('Notifications');
    expect(screen.queryByText('Install App')).toBeNull();
  });

  it('shows Install button on beforeinstallprompt; click prompts and confirms', async () => {
    stubEnvironment({});
    const prompt = vi.fn().mockResolvedValue(undefined);
    renderModal();
    await screen.findByText('Notifications');

    fireBeforeInstallPrompt({
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'android' }),
    });

    const btn = await screen.findByRole('button', { name: 'Install BakaTracker app' });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    await screen.findByText(/Installed ✓/);
  });

  it('reports dismissal without hiding the section', async () => {
    stubEnvironment({});
    const prompt = vi.fn().mockResolvedValue(undefined);
    renderModal();
    await screen.findByText('Notifications');

    fireBeforeInstallPrompt({
      prompt,
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'android' }),
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Install BakaTracker app' }));
    await screen.findByText(/Install dismissed/);
    // Still retryable
    expect(screen.getByRole('button', { name: 'Install BakaTracker app' })).toBeTruthy();
  });

  it('shows iOS Share → Home Screen guidance (no prompt event on iOS)', async () => {
    stubEnvironment({ ua: IPHONE_UA });
    renderModal();
    await screen.findByText('Notifications');
    await screen.findByText(/Add to Home Screen/);
    expect(screen.queryByRole('button', { name: 'Install BakaTracker app' })).toBeNull();
  });

  it('hidden when already installed (standalone)', async () => {
    stubEnvironment({ standalone: true });
    renderModal();
    await screen.findByText('Notifications');
    expect(screen.queryByText('Install App')).toBeNull();
  });

  it('visible to guests when a prompt is available', async () => {
    stubEnvironment({});
    renderModal(true);
    await screen.findByText('Notifications');
    fireBeforeInstallPrompt({
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'android' }),
    });
    await screen.findByRole('button', { name: 'Install BakaTracker app' });
  });
});
