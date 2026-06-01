"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type PromptState = {
  prompt: string;
  setPrompt: (prompt: string) => void;
};

/**
 * Holds the prompt used to (re)generate the current spec. Persisted to
 * localStorage so the prompt survives a full page reload of the editor.
 */
export const usePromptStore = create<PromptState>()(
  persist(
    (set) => ({
      prompt: "",
      setPrompt: (prompt) => set({ prompt }),
    }),
    { name: "prompt-to-game:prompt" },
  ),
);
