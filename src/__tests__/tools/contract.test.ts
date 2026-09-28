import { describe, it, expect } from 'vitest';
import { toolRegistry, clientToolSchemas } from '../../features/tools/registry';
import { useStore } from '../../store/useStore';

describe('Tool Contract & Schema Alignment Verification', () => {
  it('registers all 40 canonical tools without duplicates or missing entries', () => {
    const names = Object.keys(toolRegistry);
    expect(names.length).toBeGreaterThanOrEqual(40);
    expect(new Set(names).size).toBe(names.length);
  });

  describe('Page schemas alignment', () => {
    it('create_page supports text, excalidraw, and legacy aliases', () => {
      const tool = toolRegistry.create_page;
      expect(tool).toBeDefined();
      expect(tool.route).toBe('server_rest');
      const kindProp = tool.parameters.properties.kind as { enum?: string[] };
      expect(kindProp.enum).toContain('text');
      expect(kindProp.enum).toContain('excalidraw');
      expect(kindProp.enum).toContain('markdown');
      expect(kindProp.enum).toContain('visual');
    });
  });

  describe('File attachment tools schema alignment', () => {
    it('file_upload defines canonical filename, mime_type, data_base64 and aliases', () => {
      const tool = toolRegistry.file_upload;
      expect(tool).toBeDefined();
      expect(tool.route).toBe('server_rest');
      const props = tool.parameters.properties;
      expect(props.filename).toBeDefined();
      expect(props.mime_type).toBeDefined();
      expect(props.content_type).toBeDefined();
      expect(props.data_base64).toBeDefined();
      expect(props.data).toBeDefined();
      expect(tool.parameters.required).toContain('filename');
    });

    it('file_get and file_delete accept id as canonical identifier', () => {
      const getTool = toolRegistry.file_get;
      const deleteTool = toolRegistry.file_delete;
      expect(getTool.parameters.required).toContain('id');
      expect(getTool.parameters.properties.key).toBeDefined();

      expect(deleteTool.parameters.required).toContain('id');
      expect(deleteTool.parameters.properties.key).toBeDefined();
      expect(deleteTool.safetyTier).toBe('tier3_destructive');
    });

    it('file_list parameters align with server limit pagination', () => {
      const tool = toolRegistry.file_list;
      expect(tool.parameters.properties.limit).toBeDefined();
    });
  });

  describe('Memory and planning tools schema alignment', () => {
    it('remember requires key and value (matching KV contract)', () => {
      const tool = toolRegistry.remember;
      expect(tool.parameters.required).toContain('key');
      expect(tool.parameters.required).toContain('value');
      expect(tool.parameters.properties.fact).toBeDefined();
    });

    it('recall requires key (matching KV contract)', () => {
      const tool = toolRegistry.recall;
      expect(tool.parameters.required).toContain('key');
      expect(tool.parameters.properties.query).toBeDefined();
    });

    it('weekly_review schema matches server empty object contract', () => {
      const tool = toolRegistry.weekly_review;
      expect(Object.keys(tool.parameters.properties)).toHaveLength(0);
    });
  });

  describe('Local-first CRUD existence and idempotency', () => {
    it('update_task returns error when task does not exist', async () => {
      const res = await toolRegistry.update_task.execute({ id: 'non_existent_123', status: 'done' });
      expect(res).toEqual({
        success: false,
        error: 'Task "non_existent_123" not found.',
      });
    });

    it('delete_task returns error when task does not exist', async () => {
      const res = await toolRegistry.delete_task.execute({ id: 'non_existent_456' });
      expect(res).toEqual({
        success: false,
        error: 'Task "non_existent_456" not found.',
      });
    });

    it('delete_habit returns error when habit does not exist', async () => {
      const res = await toolRegistry.delete_habit.execute({ id: 'non_existent_habit' });
      expect(res).toEqual({
        success: false,
        error: 'Habit "non_existent_habit" not found.',
      });
    });

    it('create_habit creates habit and returns generated id', async () => {
      const res = await toolRegistry.create_habit.execute({
        title: 'Morning Yoga',
        category: 'health',
        frequency: 'daily',
      }) as { success: boolean; id: string; title: string; habit: unknown };

      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();
      expect(res.title).toBe('Morning Yoga');
      expect(res.habit).toBeDefined();
    });

    it('log_habit is idempotent when called multiple times on the same date', async () => {
      // 1. Create a habit first
      const createRes = await toolRegistry.create_habit.execute({
        title: 'Meditation Test',
        category: 'mindfulness',
      }) as { success: boolean; id: string };

      const habitId = createRes.id;
      const today = new Date().toISOString().split('T')[0];

      // 2. Log first time -> completes habit
      const firstLog = await toolRegistry.log_habit.execute({
        id: habitId,
        date: today,
      }) as { success: boolean; alreadyCompleted: boolean };

      expect(firstLog.success).toBe(true);
      expect(firstLog.alreadyCompleted).toBe(false);

      // Verify it is completed in store
      const logsAfterFirst = useStore.getState().habitLogs.filter(
        (l) => l.habit_id === habitId && l.date === today
      );
      expect(logsAfterFirst.length).toBeGreaterThan(0);
      expect(logsAfterFirst[0].value).toBe(1);

      // 3. Log second time -> idempotent, does NOT untoggle!
      const secondLog = await toolRegistry.log_habit.execute({
        id: habitId,
        date: today,
      }) as { success: boolean; alreadyCompleted: boolean };

      expect(secondLog.success).toBe(true);
      expect(secondLog.alreadyCompleted).toBe(true);

      // Verify it is STILL completed in store!
      const logsAfterSecond = useStore.getState().habitLogs.filter(
        (l) => l.habit_id === habitId && l.date === today
      );
      expect(logsAfterSecond.length).toBeGreaterThan(0);
      expect(logsAfterSecond[0].value).toBe(1);
    });
  });

  describe('Safety Tiers Enforcement', () => {
    it('classifies all destructive operations under tier3_destructive', () => {
      const tier3Tools = [
        'delete_task',
        'delete_habit',
        'delete_page',
        'delete_notebook',
        'file_delete',
        'reset_account',
      ];

      for (const name of tier3Tools) {
        expect(toolRegistry[name]).toBeDefined();
        expect(toolRegistry[name].safetyTier).toBe('tier3_destructive');
      }
    });
  });
});
