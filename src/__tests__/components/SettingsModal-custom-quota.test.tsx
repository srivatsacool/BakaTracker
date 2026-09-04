import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const LIMITED = {
  ai_turns_per_day: 30,
  custom_turns: null,
  effectiveQuota: 30,
  planMax: 30,
  hostCap: 30,
  quota: { used: 5, remaining: 25, effectiveQuota: 30 },
};

const customResponse = (val: number) => ({
  ai_turns_per_day: 30,
  custom_turns: val,
  effectiveQuota: val,
  planMax: 30,
  hostCap: 30,
  quota: { used: 5, remaining: val - 5, effectiveQuota: val },
});

function renderModal() {
  const apiClient = {} as ApiClient;
  render(
    <MemoryRouter>
      <SettingsModal
        user={null}
        isGuest={false}
        isAuthConfigured
        login={vi.fn()}
        logout={vi.fn()}
        getAccessToken={vi.fn()}
        apiClient={apiClient}
        init={vi.fn()}
        clearDataByDays={vi.fn()}
        onReplayWalkthrough={vi.fn()}
        onClose={vi.fn()}
        onRequestExport={vi.fn()}
      />
    </MemoryRouter>,
  );
  return apiClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({ ...LIMITED });
});

describe('SettingsModal AI quota — Custom mode selectability (regression)', () => {
  it('clicking Custom reveals the custom-turns input while in Limited mode', async () => {
    renderModal();
    // Limited UI renders first (slider present, custom input absent)
    await screen.findByRole('button', { name: /Limited/ });
    expect(screen.queryByLabelText('Custom AI turns per day')).toBeNull();

    // THE regression: clicking Custom must change the UI (previously a no-op)
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    const input = await screen.findByLabelText('Custom AI turns per day');
    expect(input).toBeTruthy();
    // Slider (Limited-only) is gone
    expect(screen.queryByLabelText('AI turns per day')).toBeNull();
    // No server call just for selecting
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('accepts 500, saves it, and shows the custom badge', async () => {
    const apiClient = renderModal();
    await screen.findByRole('button', { name: /Limited/ });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const input = await screen.findByLabelText('Custom AI turns per day');

    saveMock.mockResolvedValue(customResponse(500));
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][0]).toBe(apiClient);
    expect(saveMock.mock.calls[0][1]).toBe(30);
    expect(saveMock.mock.calls[0][2]).toBe(500);
    // Custom UI persists after save with exact quota
    await screen.findByText('500/day (custom)');
  });

  it('accepts 10000 (no planMax ceiling on Custom)', async () => {
    renderModal();
    await screen.findByRole('button', { name: /Limited/ });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const input = await screen.findByLabelText('Custom AI turns per day');

    saveMock.mockResolvedValue(customResponse(10000));
    fireEvent.change(input, { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][2]).toBe(10000);
    await screen.findByText('10000/day (custom)');
  });

  it('rejects invalid values without calling save', async () => {
    renderModal();
    await screen.findByRole('button', { name: /Limited/ });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const input = await screen.findByLabelText('Custom AI turns per day');

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Custom turns must be a positive integer (1-100,000).');
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('switching Custom → Limited restores the Limited UI', async () => {
    renderModal();
    await screen.findByRole('button', { name: /Limited/ });
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    await screen.findByLabelText('Custom AI turns per day');

    // Click Limited: must exit Custom UI and persist custom_turns=null
    saveMock.mockResolvedValue({ ...LIMITED });
    fireEvent.click(screen.getByRole('button', { name: /Limited/ }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1));
    expect(saveMock.mock.calls[0][2]).toBeNull();
    await waitFor(() =>
      expect(screen.queryByLabelText('Custom AI turns per day')).toBeNull(),
    );
    expect(screen.getByLabelText('AI turns per day')).toBeTruthy();
  });
});
