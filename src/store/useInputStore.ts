import { create } from 'zustand';
import { soundBus } from '../audio/soundBus';

export type SubmitHandler = (given: number, thinkMs: number, totalMs: number) => void;

interface InputState {
  buffer: string;
  promptRenderedAt: number;
  firstKeypressAt: number | null;
  locked: boolean;
  submitCallback: SubmitHandler | null;

  startPrompt: (callback: SubmitHandler) => void;
  appendDigit: (digit: string) => void;
  backspace: () => void;
  clear: () => void;
  submit: () => void;
  setLocked: (locked: boolean) => void;
}

export const useInputStore = create<InputState>((set, get) => ({
  buffer: '',
  promptRenderedAt: Date.now(),
  firstKeypressAt: null,
  locked: false,
  submitCallback: null,

  startPrompt: (callback) => {
    set({
      buffer: '',
      promptRenderedAt: Date.now(),
      firstKeypressAt: null,
      locked: false,
      submitCallback: callback
    });
  },

  appendDigit: (digit: string) => {
    const state = get();
    if (state.locked) return;
    if (state.buffer.length >= 4) return; // Math answers are max 3 digits in 1-10

    const now = Date.now();
    const firstKey = state.firstKeypressAt === null ? now : state.firstKeypressAt;

    soundBus.play('click');
    set({
      buffer: state.buffer + digit,
      firstKeypressAt: firstKey
    });
  },

  backspace: () => {
    const state = get();
    if (state.locked) return;
    if (state.buffer.length > 0) {
      soundBus.play('click');
      set({ buffer: state.buffer.slice(0, -1) });
    }
  },

  clear: () => {
    const state = get();
    if (state.locked) return;
    set({ buffer: '' });
  },

  submit: () => {
    const state = get();
    if (state.locked) return;
    if (state.buffer.trim() === '') return;

    const now = Date.now();
    const thinkMs = state.firstKeypressAt !== null
      ? state.firstKeypressAt - state.promptRenderedAt
      : now - state.promptRenderedAt;
    const totalMs = now - state.promptRenderedAt;

    const val = parseInt(state.buffer, 10);
    if (Number.isNaN(val)) return;

    if (state.submitCallback) {
      state.submitCallback(val, Math.max(50, thinkMs), Math.max(50, totalMs));
    }
  },

  setLocked: (locked) => {
    set({ locked });
  }
}));
