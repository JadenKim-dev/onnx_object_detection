'use client';

import { useReducer, useCallback, useEffect, useRef } from 'react';
import { loadModel, releaseModel } from '@/app/lib/onnx-loader';
import type {
  ModelMetadata,
  ModelSession,
  ExecutionProvider,
  LoadingState,
  ModelError,
} from '@/app/lib/types/model';

interface UseModelLoaderState {
  session: ModelSession | null;
  loadingState: LoadingState;
  error: ModelError | null;
  loadTimeMs: number | null;
  executionProvider: ExecutionProvider | null;
}

type ModelLoaderAction =
  | { type: 'LOAD_START' }
  | {
      type: 'LOAD_SUCCESS';
      payload: {
        session: ModelSession;
        loadTimeMs: number;
        executionProvider: ExecutionProvider;
      };
    }
  | {
      type: 'LOAD_ERROR';
      payload: ModelError;
    }
  | { type: 'UNLOAD' };

function modelLoaderReducer(
  state: UseModelLoaderState,
  action: ModelLoaderAction
): UseModelLoaderState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loadingState: 'loading',
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        session: action.payload.session,
        loadingState: 'loaded',
        error: null,
        loadTimeMs: action.payload.loadTimeMs,
        executionProvider: action.payload.executionProvider,
      };

    case 'LOAD_ERROR':
      return {
        session: null,
        loadingState: 'error',
        error: action.payload,
        loadTimeMs: null,
        executionProvider: null,
      };

    case 'UNLOAD':
      return {
        session: null,
        loadingState: 'idle',
        error: null,
        loadTimeMs: null,
        executionProvider: null,
      };

    default:
      return state;
  }
}

interface UseModelLoaderReturn extends UseModelLoaderState {
  loadModel: (
    metadata: ModelMetadata,
    provider?: ExecutionProvider
  ) => Promise<void>;
  switchModel: (metadata: ModelMetadata) => Promise<void>;
  unloadModel: () => Promise<void>;
}

export function useModelLoader(): UseModelLoaderReturn {
  const [state, dispatch] = useReducer(modelLoaderReducer, {
    session: null,
    loadingState: 'idle',
    error: null,
    loadTimeMs: null,
    executionProvider: null,
  });

  const sessionRef = useRef<ModelSession | null>(null);

  const loadModelFn = useCallback(
    async (metadata: ModelMetadata, provider?: ExecutionProvider) => {
      dispatch({ type: 'LOAD_START' });

      let result;
      try {
        result = await loadModel(metadata, provider);
      } catch (error) {
        console.error('[useModelLoader] Failed to load model:', error);
        const modelError: ModelError = {
          message: error instanceof Error ? error.message : 'Unknown error',
          provider,
        };

        sessionRef.current = null;
        dispatch({
          type: 'LOAD_ERROR',
          payload: modelError,
        });

        return;
      }

      sessionRef.current = result.session;
      dispatch({
        type: 'LOAD_SUCCESS',
        payload: {
          session: result.session,
          loadTimeMs: result.loadTimeMs,
          executionProvider: result.executionProvider,
        },
      });
    },
    []
  );

  const switchModel = useCallback(
    async (metadata: ModelMetadata) => {
      if (sessionRef.current) {
        await releaseModel(sessionRef.current);
        sessionRef.current = null;
      }

      await loadModelFn(metadata);
    },
    [loadModelFn]
  );

  const unloadModel = useCallback(async () => {
    if (sessionRef.current) {
      await releaseModel(sessionRef.current);
      sessionRef.current = null;
      dispatch({ type: 'UNLOAD' });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        releaseModel(sessionRef.current).catch(console.error);
      }
    };
  }, []);

  return {
    ...state,
    loadModel: loadModelFn,
    switchModel,
    unloadModel,
  };
}
