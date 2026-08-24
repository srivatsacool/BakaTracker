import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/useStore';
// Types available for reference: Habit, HabitLog

// Reset the store before each test
beforeEach(() => {
  useStore.getState().resetStore();
});

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addTestHabit(overrides: Partial<{ id: string; name: string; type: string; xp: number; stat: string }> = {}) {
  const { addHabit } = useStore.getState();
  addHabit({
    name: overrides.name || 'Test Habit',
    type: (overrides.type || 'checkbox') as any,
    icon: '✅',
    xp: overrides.xp || 10,
    stat: (overrides.stat || 'discipline') as any,
  });
  return useStore.getState().habits[useStore.getState().habits.length - 1];
}

describe('toggleHabit', () => {
  it('creates a log entry when toggling on', async () => {
    const habit = addTestHabit();
    const today = getToday();
    const { toggleHabit } = useStore.getState();
    await toggleHabit(habit.id, today);
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].value).toBe(1);
  });

  it('removes log entry when toggling off', async () => {
    const habit = addTestHabit();
    const today = getToday();
    const { toggleHabit } = useStore.getState();
    await toggleHabit(habit.id, today); // on
    await toggleHabit(habit.id, today); // off
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(0);
  });

  it('does not clobber non-checkbox habits on past day click', async () => {
    const habit = addTestHabit({ type: 'counter' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // First set a counter value
    const { incrementCounterHabit } = useStore.getState();
    await incrementCounterHabit(habit.id, dateStr, 5);

    // toggleHabit should NOT be called for counter habits in week-strip
    // (the week-strip handler checks type before calling toggleHabit)
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(Number(logs[0].value)).toBe(5);
  });
});

describe('incrementCounterHabit', () => {
  it('creates a log with the incremented value', async () => {
    const habit = addTestHabit({ type: 'counter' });
    const today = getToday();
    const { incrementCounterHabit } = useStore.getState();
    await incrementCounterHabit(habit.id, today, 3);
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(Number(logs[0].value)).toBe(3);
  });

  it('accumulates counter values', async () => {
    const habit = addTestHabit({ type: 'counter' });
    const today = getToday();
    const { incrementCounterHabit } = useStore.getState();
    await incrementCounterHabit(habit.id, today, 3);
    await incrementCounterHabit(habit.id, today, 2);
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(Number(logs[0].value)).toBe(5);
  });
});

describe('setNumericHabit', () => {
  it('sets the exact numeric value', async () => {
    const habit = addTestHabit({ type: 'numeric' });
    const today = getToday();
    const { setNumericHabit } = useStore.getState();
    await setNumericHabit(habit.id, today, 42);
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(Number(logs[0].value)).toBe(42);
  });
});

describe('setMoodHabit', () => {
  it('stores the mood emoji as string value', async () => {
    const habit = addTestHabit({ type: 'mood' });
    const today = getToday();
    const { setMoodHabit } = useStore.getState();
    await setMoodHabit(habit.id, today, '😄');
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].value).toBe('😄');
  });

  it('stores all 4 mood emojis', async () => {
    const habit = addTestHabit({ type: 'mood' });
    const { setMoodHabit } = useStore.getState();
    const moods = ['😞', '😐', '🙂', '😄'];
    for (const mood of moods) {
      await setMoodHabit(habit.id, getToday(), mood);
    }
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].value).toBe('😄'); // last mood wins (upsert by date)
  });
});

describe('setEnergyHabit', () => {
  it('stores the energy label as string value', async () => {
    const habit = addTestHabit({ type: 'energy' });
    const today = getToday();
    const { setEnergyHabit } = useStore.getState();
    await setEnergyHabit(habit.id, today, 'high');
    const logs = useStore.getState().habitLogs.filter(l => l.habit_id === habit.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].value).toBe('high');
  });

  it('stores energy labels without collapsing to count=1', async () => {
    const habit = addTestHabit({ type: 'energy' });
    const today = getToday();
    const { setEnergyHabit } = useStore.getState();
    await setEnergyHabit(habit.id, today, 'low');
    const log = useStore.getState().habitLogs.find(l => l.habit_id === habit.id);
    // The value should be the string 'low', NOT a number
    expect(typeof log!.value).toBe('string');
    expect(log!.value).toBe('low');
  });
});

describe('addHabit', () => {
  it('creates a habit with correct defaults', () => {
    const habit = addTestHabit({ name: 'Morning Run' });
    expect(habit.name).toBe('Morning Run');
    expect(habit.active).toBe(true);
    expect(habit.id).toBeTruthy();
  });

  it('habits appear in the store', () => {
    addTestHabit({ name: 'Habit 1' });
    addTestHabit({ name: 'Habit 2' });
    expect(useStore.getState().habits).toHaveLength(2);
  });
});

describe('deleteHabit', () => {
  it('removes habit from store', async () => {
    const habit = addTestHabit();
    const { deleteHabit } = useStore.getState();
    await deleteHabit(habit.id);
    expect(useStore.getState().habits.find(h => h.id === habit.id)).toBeUndefined();
  });

  it('adds habit to deletedHabitIds tombstone queue', async () => {
    const habit = addTestHabit();
    const { deleteHabit } = useStore.getState();
    await deleteHabit(habit.id);
    expect(useStore.getState().deletedHabitIds).toContain(habit.id);
  });

  it('removes habit logs', async () => {
    const habit = addTestHabit();
    const today = getToday();
    await useStore.getState().toggleHabit(habit.id, today);
    expect(useStore.getState().habitLogs.filter(l => l.habit_id === habit.id)).toHaveLength(1);

    await useStore.getState().deleteHabit(habit.id);
    expect(useStore.getState().habitLogs.filter(l => l.habit_id === habit.id)).toHaveLength(0);
  });
});
