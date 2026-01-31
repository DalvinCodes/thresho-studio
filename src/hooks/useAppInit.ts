/**
 * Application initialization hook
 * Handles database setup, default data loading, and app readiness
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from '../core/store';
import { initDatabase, initializeSchema } from '../core/db';

/**
 * Hook to initialize the application on mount
 * Should be called once at the app root level
 */
export function useAppInit() {
  const initState = useAppStore((state) => state.initState);
  const setInitState = useAppStore((state) => state.setInitState);
  const addToast = useAppStore((state) => state.addToast);

  // Track if initialization has started
  const initStarted = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initStarted.current) return;
    initStarted.current = true;

    const initialize = async () => {
      setInitState('initializing');

      try {
        console.log('Initializing Thresho Studio...');

        // Step 1: Initialize SQLite database
        console.log('Initializing database...');
        await initDatabase();

        // Step 2: Create database schema
        console.log('Creating database schema...');
        await initializeSchema();

        // Step 3: Load any seed data if needed
        // await seedDefaultData();

        console.log('Thresho Studio initialized successfully');
        setInitState('ready');

        addToast({
          type: 'success',
          title: 'Ready',
          message: 'Thresho Studio is ready to use',
          duration: 3000,
        });
      } catch (error) {
        console.error('Initialization failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setInitState('error', message);

        addToast({
          type: 'error',
          title: 'Initialization Failed',
          message: `Could not start Thresho Studio: ${message}`,
          duration: 0, // Don't auto-dismiss errors
        });
      }
    };

    initialize();
  }, [setInitState, addToast]);

  return {
    initState,
    isReady: initState === 'ready',
    isInitializing: initState === 'initializing',
    hasError: initState === 'error',
  };
}

/**
 * Hook to check if app is ready (for components that need it)
 */
export function useIsAppReady(): boolean {
  return useAppStore((state) => state.initState === 'ready');
}
