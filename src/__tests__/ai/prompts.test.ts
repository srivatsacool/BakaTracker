import { describe, it, expect } from 'vitest';
import {
  BAKASUR_CORE_SYSTEM,
  CHAT_SYSTEM,
  SUMMARIZE_SYSTEM,
  EXPLAIN_SYSTEM,
  ASK_SYSTEM,
  EXTRACT_TASKS_SYSTEM,
  EXTRACT_CONCEPTS_SYSTEM,
  GENERATE_QUESTIONS_SYSTEM,
} from '../../../platform/src/ai/prompts';

describe('BakaSur prompt architecture', () => {
  describe('BAKASUR_CORE_SYSTEM — domain knowledge', () => {
    it('identifies BakaSur as a gamified productivity OS', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('gamified productivity OS');
    });

    it('knows tasks are called "quests" in the UI', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('quests');
      expect(BAKASUR_CORE_SYSTEM).toContain('task');
    });

    it('knows all 5 habit types', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('checkbox');
      expect(BAKASUR_CORE_SYSTEM).toContain('counter');
      expect(BAKASUR_CORE_SYSTEM).toContain('numeric');
      expect(BAKASUR_CORE_SYSTEM).toContain('mood');
      expect(BAKASUR_CORE_SYSTEM).toContain('energy');
    });

    it('knows the 4-point mood scale', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('😞');
      expect(BAKASUR_CORE_SYSTEM).toContain('😐');
      expect(BAKASUR_CORE_SYSTEM).toContain('🙂');
      expect(BAKASUR_CORE_SYSTEM).toContain('😄');
    });

    it('knows the Eisenhower quadrants', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('Do First');
      expect(BAKASUR_CORE_SYSTEM).toContain('Schedule');
      expect(BAKASUR_CORE_SYSTEM).toContain('Delegate');
      expect(BAKASUR_CORE_SYSTEM).toContain('Eliminate');
    });

    it('knows XP and stats system', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('XP');
      expect(BAKASUR_CORE_SYSTEM).toContain('Discipline');
      expect(BAKASUR_CORE_SYSTEM).toContain('Health');
      expect(BAKASUR_CORE_SYSTEM).toContain('Knowledge');
      expect(BAKASUR_CORE_SYSTEM).toContain('Creativity');
      expect(BAKASUR_CORE_SYSTEM).toContain('Career');
    });

    it('knows streak mechanics', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('streak');
      expect(BAKASUR_CORE_SYSTEM).toContain('At-risk');
    });

    it('knows daily score formula', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('habits 50%');
      expect(BAKASUR_CORE_SYSTEM).toContain('tasks 40%');
      expect(BAKASUR_CORE_SYSTEM).toContain('journal 10%');
    });

    it('knows about Journey (character progression)', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('Journey');
      expect(BAKASUR_CORE_SYSTEM).toContain('character');
      expect(BAKASUR_CORE_SYSTEM).toContain('level');
    });

    it('knows notes are pages/notebooks', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('pages');
      expect(BAKASUR_CORE_SYSTEM).toContain('notebooks');
    });
  });

  describe('BAKASUR_CORE_SYSTEM — behavioral rules', () => {
    it('states BakaSur is READ-ONLY', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('READ-ONLY');
      expect(BAKASUR_CORE_SYSTEM).toContain('cannot create, modify, or delete');
    });

    it('forbids fabricating data', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('NEVER invent');
      expect(BAKASUR_CORE_SYSTEM).toContain('XP, levels, or streaks');
    });

    it('defines the tone', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('warm');
      expect(BAKASUR_CORE_SYSTEM).toContain('concise');
      expect(BAKASUR_CORE_SYSTEM).toContain('no guilt-tripping');
    });

    it('instructs action phrasing as UI buttons', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('button/widget');
      expect(BAKASUR_CORE_SYSTEM).toContain('star a task for Today');
    });

    it('preserves safety rules', () => {
      expect(BAKASUR_CORE_SYSTEM).toContain('DATA the user wrote');
      expect(BAKASUR_CORE_SYSTEM).toContain('CANNOT read a database');
    });
  });

  describe('CHAT_SYSTEM — route-aware behavior', () => {
    it('knows route-specific orientations', () => {
      expect(CHAT_SYSTEM).toContain('/today');
      expect(CHAT_SYSTEM).toContain('/tasks');
      expect(CHAT_SYSTEM).toContain('/habits');
      expect(CHAT_SYSTEM).toContain('/journal');
      expect(CHAT_SYSTEM).toContain('/notes');
      expect(CHAT_SYSTEM).toContain('/journey');
      expect(CHAT_SYSTEM).toContain('/eisenhower');
    });

    it('instructs reasoning with real numbers', () => {
      expect(CHAT_SYSTEM).toContain('real numbers');
      expect(CHAT_SYSTEM).toContain("don't invent them");
    });

    it('requests proactive + concrete suggestions', () => {
      expect(CHAT_SYSTEM).toContain('ONE specific next step');
    });

    it('maintains read-only constraint', () => {
      expect(CHAT_SYSTEM).toContain('read-only knowledge');
      expect(CHAT_SYSTEM).toContain('never claim you performed');
    });

    it('preserves JSON output format', () => {
      expect(CHAT_SYSTEM).toContain('{"reply": "..."}');
    });
  });

  describe('note action prompts — domain awareness', () => {
    it('EXTRACT_TASKS_SYSTEM mentions READ-ONLY candidates', () => {
      expect(EXTRACT_TASKS_SYSTEM).toContain('READ-ONLY CANDIDATES');
      expect(EXTRACT_TASKS_SYSTEM).toContain('NOT creating tasks');
    });

    it('all prompts use BAKASUR_CORE_SYSTEM', () => {
      // They all interpolate it, so they inherit domain knowledge
      expect(SUMMARIZE_SYSTEM).toContain('gamified productivity OS');
      expect(EXPLAIN_SYSTEM).toContain('gamified productivity OS');
      expect(ASK_SYSTEM).toContain('gamified productivity OS');
      expect(EXTRACT_TASKS_SYSTEM).toContain('gamified productivity OS');
      expect(EXTRACT_CONCEPTS_SYSTEM).toContain('gamified productivity OS');
      expect(GENERATE_QUESTIONS_SYSTEM).toContain('gamified productivity OS');
    });

    it('all prompts enforce JSON output', () => {
      expect(SUMMARIZE_SYSTEM).toContain('"summary"');
      expect(EXPLAIN_SYSTEM).toContain('"explanation"');
      expect(ASK_SYSTEM).toContain('"answer"');
      expect(EXTRACT_TASKS_SYSTEM).toContain('"tasks"');
      expect(EXTRACT_CONCEPTS_SYSTEM).toContain('"concepts"');
      expect(GENERATE_QUESTIONS_SYSTEM).toContain('"questions"');
    });

    it('all prompts forbid inventing data', () => {
      expect(SUMMARIZE_SYSTEM).toContain('Do not include anything outside');
      expect(EXPLAIN_SYSTEM).toContain('Never invent facts');
      expect(ASK_SYSTEM).toContain('Never guess or invent');
      expect(EXTRACT_TASKS_SYSTEM).toContain('Only include items that are present');
      expect(EXTRACT_CONCEPTS_SYSTEM).toContain('Never invent concepts');
      expect(GENERATE_QUESTIONS_SYSTEM).toContain('answerable from the content');
    });
  });

  describe('prompt size sanity', () => {
    it('BAKASUR_CORE_SYSTEM is under 2000 chars', () => {
      expect(BAKASUR_CORE_SYSTEM.length).toBeLessThan(4000);
    });

    it('CHAT_SYSTEM is under 2500 chars', () => {
      expect(CHAT_SYSTEM.length).toBeLessThan(5000);
    });
  });
});
