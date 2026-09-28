import { describe, it, expect } from 'vitest';
import { parseActionTag } from '../../features/tools/actionParser';

describe('Action Tag Parser', () => {
  it('returns clean text unchanged when no action tag is present', () => {
    const res = parseActionTag('Hello, how are your quests going today?');
    expect(res.cleanText).toBe('Hello, how are your quests going today?');
    expect(res.action).toBeUndefined();
  });

  it('parses an action tag with json parameters', () => {
    const input = 'I prepared this for you: [action:create_task {"title":"Buy groceries","area":"personal"}]';
    const res = parseActionTag(input);
    expect(res.cleanText).toBe('I prepared this for you:');
    expect(res.action).toBeDefined();
    expect(res.action?.toolName).toBe('create_task');
    expect(res.action?.input).toEqual({
      title: 'Buy groceries',
      area: 'personal',
    });
  });

  it('handles invalid json safely without throwing', () => {
    const input = 'Try this: [action:create_task {broken_json}]';
    const res = parseActionTag(input);
    expect(res.cleanText).toBe(input);
    expect(res.action).toBeUndefined();
  });

  it('handles multiline action tags', () => {
    const input = `Here is your journal:
[action:journal_today {
  "notes": "Had a productive focus session today.",
  "mood": "great"
}]`;
    const res = parseActionTag(input);
    expect(res.cleanText).toBe('Here is your journal:');
    expect(res.action?.toolName).toBe('journal_today');
    expect(res.action?.input.mood).toBe('great');
  });

  it('correctly parses nested JSON structures and curly braces in strings', () => {
    const input = 'Updated task: [action:update_task {"id":"task_1","metadata":{"tags":["work","high"]},"notes":"Fixed {issue} cleanly"}] Done!';
    const res = parseActionTag(input);
    expect(res.cleanText).toBe('Updated task:  Done!');
    expect(res.action).toBeDefined();
    expect(res.action?.toolName).toBe('update_task');
    expect(res.action?.input).toEqual({
      id: 'task_1',
      metadata: { tags: ['work', 'high'] },
      notes: 'Fixed {issue} cleanly',
    });
  });

  it('correctly parses multiple action tags in a single message', () => {
    const input = 'Created quests: [action:create_task {"title":"Quest 1"}] and [action:create_task {"title":"Quest 2"}] All set!';
    const res = parseActionTag(input);
    expect(res.cleanText).toBe('Created quests:  and  All set!');
    expect(res.actions.length).toBe(2);
    expect(res.actions[0].input.title).toBe('Quest 1');
    expect(res.actions[1].input.title).toBe('Quest 2');
    expect(res.action?.input.title).toBe('Quest 1');
  });
});
