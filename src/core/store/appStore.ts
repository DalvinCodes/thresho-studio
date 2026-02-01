/**
 * Root application state store using Zustand
 * Manages global UI state, session data, and notifications
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { UUID, Timestamp } from '../types/common';

// Toast notification type
export interface Toast {
  id: UUID;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  createdAt: Timestamp;
}

// App initialization state
export type InitState = 'idle' | 'initializing' | 'ready' | 'error';

// App store state interface
interface AppState {
  // Initialization
  initState: InitState;
  initError?: string;

  // Navigation
  sidebarOpen: boolean;

  // Theme
  isDarkMode: boolean;

  // Session - current selections
  currentProjectId: UUID | null;
  currentBrandId: UUID | null;

  // Notifications
  toasts: Toast[];

  // Loading states
  isLoading: boolean;
  loadingMessage?: string;

  // Modal state
  activeModal: string | null;
  modalProps?: Record<string, unknown>;
}

// App store actions interface
interface AppActions {
  // Initialization
  setInitState: (state: InitState, error?: string) => void;

  // Navigation
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Theme
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;

  // Session
  setCurrentProject: (id: UUID | null) => void;
  setCurrentBrand: (id: UUID | null) => void;

  // Toasts
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => UUID;
  removeToast: (id: UUID) => void;
  clearToasts: () => void;

  // Loading
  setLoading: (isLoading: boolean, message?: string) => void;

  // Modal
  openModal: (modalId: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Reset
  reset: () => void;
}

// Combined store type
type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  initState: 'idle',
  sidebarOpen: true,
  isDarkMode: true, // Default to dark mode for Thresho brand
  currentProjectId: null,
  currentBrandId: null,
  toasts: [],
  isLoading: false,
  activeModal: null,
};

// Create UUID for toasts
const createToastId = (): UUID => crypto.randomUUID() as UUID;

/**
 * Main application store
 */
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, _get) => ({
          ...initialState,

          // Initialization
          setInitState: (state, error) =>
            set((draft) => {
              draft.initState = state;
              draft.initError = error;
            }),

          // Navigation
          toggleSidebar: () =>
            set((draft) => {
              draft.sidebarOpen = !draft.sidebarOpen;
            }),

          setSidebarOpen: (open) =>
            set((draft) => {
              draft.sidebarOpen = open;
            }),

          // Theme
          toggleDarkMode: () =>
            set((draft) => {
              draft.isDarkMode = !draft.isDarkMode;
            }),

          setDarkMode: (dark) =>
            set((draft) => {
              draft.isDarkMode = dark;
            }),

          // Session
          setCurrentProject: (id) =>
            set((draft) => {
              draft.currentProjectId = id;
            }),

          setCurrentBrand: (id) =>
            set((draft) => {
              draft.currentBrandId = id;
            }),

          // Toasts
          addToast: (toast) => {
            const id = createToastId();
            set((draft) => {
              draft.toasts.push({
                ...toast,
                id,
                createdAt: Date.now(),
                duration: toast.duration ?? 5000,
              });
            });
            return id;
          },

          removeToast: (id) =>
            set((draft) => {
              draft.toasts = draft.toasts.filter((t) => t.id !== id);
            }),

          clearToasts: () =>
            set((draft) => {
              draft.toasts = [];
            }),

          // Loading
          setLoading: (isLoading, message) =>
            set((draft) => {
              draft.isLoading = isLoading;
              draft.loadingMessage = message;
            }),

          // Modal
          openModal: (modalId, props) =>
            set((draft) => {
              draft.activeModal = modalId;
              draft.modalProps = props;
            }),

          closeModal: () =>
            set((draft) => {
              draft.activeModal = null;
              draft.modalProps = undefined;
            }),

          // Reset
          reset: () => set(initialState),
        })),
        {
          name: 'thresho-app-store',
          // Only persist certain keys
          partialize: (state) => ({
            isDarkMode: state.isDarkMode,
            sidebarOpen: state.sidebarOpen,
            currentProjectId: state.currentProjectId,
            currentBrandId: state.currentBrandId,
          }),
        }
      )
    ),
    { name: 'AppStore' }
  )
);

// Selector hooks for common patterns
export const useIsDarkMode = () => useAppStore((state) => state.isDarkMode);
export const useCurrentProjectId = () => useAppStore((state) => state.currentProjectId);
export const useCurrentBrandId = () => useAppStore((state) => state.currentBrandId);
export const useToasts = () => useAppStore((state) => state.toasts);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useInitState = () => useAppStore((state) => state.initState);
