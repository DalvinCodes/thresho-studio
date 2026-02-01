/**
 * Application initialization hook
 * Handles database setup, default data loading, and app readiness
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from '../core/store';
import { initDatabase, initializeSchema } from '../core/db';
import { initializeStorage, getStorageType } from '../core/storage';

// Store initialization imports
import { useProviderStore } from '../features/providers/store';
import { initBrandStore } from '../features/brands/store';
import { initTalentStore } from '../features/talent/store';
import { useTemplateStore } from '../features/templates/store';
import { useAssetStore } from '../features/assets/store';
import { loadAssetsFromDb } from '../features/assets/services/assetDbService';
import { useGenerationStore } from '../features/generation/store';
import { useShotListStore } from '../features/shotList/store';
import { loadShotListsFromDb } from '../features/shotList/services/shotListDbService';

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

        // Step 1: Initialize file storage
        console.log('Initializing file storage...');
        await initializeStorage();
        const storageType = getStorageType();
        console.log(`  - Using ${storageType} storage`);

        // Step 2: Initialize SQLite database
        console.log('Initializing database...');
        await initDatabase();

        // Step 3: Create database schema
        console.log('Creating database schema...');
        await initializeSchema();

        // Step 4: Load all stores from database
        console.log('Loading stores from database...');
        
        // Load providers (includes validation of credentials)
        await useProviderStore.getState().loadFromDatabase();
        console.log('  - Providers loaded');
        
        // Load brands
        await initBrandStore();
        console.log('  - Brands loaded');
        
        // Load talent profiles
        await initTalentStore();
        console.log('  - Talents loaded');
        
        // Load templates
        await useTemplateStore.getState().loadFromDatabase();
        console.log('  - Templates loaded');
        
        // Load assets
        const { assets, collections } = await loadAssetsFromDb();
        useAssetStore.getState().loadFromDatabase(assets, collections);
        console.log(`  - Assets loaded (${assets.length} assets, ${collections.length} collections)`);
        
        // Load generation history
        await useGenerationStore.getState().initializeFromDatabase();
        console.log('  - Generation history loaded');
        
        // Load shot lists
        const shotListData = await loadShotListsFromDb();
        useShotListStore.getState().loadFromDatabase(shotListData);
        console.log(`  - Shot lists loaded (${shotListData.shotLists.length} lists, ${shotListData.shots.length} shots)`);

        // Step 5: Initialize default providers if none exist
        await useProviderStore.getState().initializeDefaults();
        console.log('  - Default providers initialized');

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
