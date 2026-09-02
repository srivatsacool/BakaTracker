/**
 * Phase 3 — Progressive conversational onboarding for BakaSur.
 *
 * Design principles:
 *   - Server-authoritative: Soul (KV) is the source of truth, not client state
 *   - Client state machine reads from Soul on mount — resumes after refresh
 *   - Each answer is persisted immediately via PUT /api/v1/soul
 *   - Existing users with meaningful Soul content bypass onboarding
 *   - One question at a time — natural conversation, not a form
 *
 * Onboarding questions (progressive):
 *   1. Name / how to be addressed
 *   2. Current goals / projects
 *   3. Communication style preference
 *   4. What's most important right now
 */
import type { ApiClient } from "../api/apiClient";

export interface SoulState {
  content: string;
  updated_at: string;
}

/** Threshold: if Soul has more than this many chars, skip onboarding. */
const SOUL_MINIMAL_THRESHOLD = 50;

/**
 * Onboarding question definition.
 * Each question maps to a Soul section that gets appended incrementally.
 */
export interface OnboardingStep {
  id: string;
  /** The question BakaSur asks the user. */
  question: string;
  /** Soul section header to append the answer under. */
  section: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "name",
    question: "What should I call you? (Just your first name or nickname is fine.)",
    section: "Identity",
  },
  {
    id: "goals",
    question: "What are you working on right now? Any projects or goals on your mind?",
    section: "Goals & Priorities",
  },
  {
    id: "style",
    question: "How do you prefer I communicate? Casual and brief, detailed and structured, encouraging, or something else?",
    section: "Communication Style",
  },
  {
    id: "focus",
    question: "What's most important to you this week? This helps me prioritize what I surfaces.",
    section: "Current Chapter",
  },
];

/**
 * Determine onboarding state from the persisted Soul.
 * Returns the index of the next unanswered step, or -1 if onboarding is complete.
 *
 * This is the ONLY source of truth — client state is derived from server Soul.
 */
export function getOnboardingProgress(soulContent: string): number {
  if (!soulContent || soulContent.trim().length < SOUL_MINIMAL_THRESHOLD) {
    return 0; // No meaningful Soul — start from beginning
  }

  // Check which sections have content
  for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
    const step = ONBOARDING_STEPS[i];
    const sectionRegex = new RegExp(`##\\s*${step.section}[\\s\\S]*?(?=##\\s*|$)`, "i");
    const match = soulContent.match(sectionRegex);
    if (!match || match[0].replace(/##\s*\w+[\s\S]*/, "").trim().length < 10) {
      return i; // This section is missing or too short
    }
  }
  return -1; // All sections have content — onboarding complete
}

/**
 * Append a new section to the Soul content.
 * If the section already exists, replace it. Otherwise, append.
 */
export function appendSoulSection(existing: string, section: string, content: string): string {
  const header = `## ${section}`;
  const sectionRegex = new RegExp(`(##\\s*${section}[\\s\\S]*?)(?=##\\s*|$)`, "i");
  const match = existing.match(sectionRegex);

  const block = `${header}\n\n${content}\n`;
  if (match) {
    // Replace existing section
    return existing.replace(sectionRegex, block);
  }
  // Append new section
  const separator = existing.trim().endsWith("\n") ? "\n" : "\n\n";
  return `${existing.trim()}${separator}${block}`;
}

/**
 * Load Soul from server and return current onboarding state.
 * This is the entry point — called on mount to determine where to resume.
 */
export async function loadOnboardingState(apiClient: ApiClient): Promise<{
  soul: SoulState;
  nextStep: number;
  isComplete: boolean;
}> {
  try {
    const res = await apiClient.get<{ ok: boolean; soul: SoulState }>("/api/v1/soul");
    if (res.ok && res.soul) {
      const nextStep = getOnboardingProgress(res.soul.content);
      return {
        soul: res.soul,
        nextStep,
        isComplete: nextStep === -1,
      };
    }
  } catch {
    // Silently handle — onboarding will start fresh
  }
  return { soul: { content: "", updated_at: "" }, nextStep: 0, isComplete: false };
}

/**
 * Persist the current Soul to server after an onboarding answer.
 * Returns the updated Soul state.
 */
export async function persistSoulUpdate(
  apiClient: ApiClient,
  currentContent: string,
  step: OnboardingStep,
  answer: string,
): Promise<SoulState> {
  const updatedContent = appendSoulSection(currentContent, step.section, answer);
  try {
    const res = await apiClient.put<{ ok: boolean; soul: SoulState }>("/api/v1/soul", {
      content: updatedContent,
    });
    if (res.ok && res.soul) {
      return res.soul;
    }
  } catch {
    // Persist failed — return local state so UI continues
  }
  return { content: updatedContent, updated_at: new Date().toISOString() };
}
