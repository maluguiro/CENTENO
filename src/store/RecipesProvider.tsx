import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren
} from "react";

import { sampleRecipes } from "@/data/sampleRecipes";
import type { Recipe, RecipeCategory, RecipeDraft } from "@/types/recipe";

const STORAGE_KEY = "centeno.recipes";

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const memoryStorageState = new Map<string, string>();

const memoryStorage: StorageLike = {
  async getItem(key) {
    return memoryStorageState.get(key) ?? null;
  },
  async setItem(key, value) {
    memoryStorageState.set(key, value);
  }
};

function getStorage(): StorageLike {
  try {
    const module = require("@react-native-async-storage/async-storage");
    const asyncStorage = module?.default;

    if (
      asyncStorage &&
      typeof asyncStorage.getItem === "function" &&
      typeof asyncStorage.setItem === "function"
    ) {
      if (__DEV__) {
        console.log("[CENTENO] storage: AsyncStorage OK");
      }
      return asyncStorage as StorageLike;
    }
  } catch {
  }

  if (__DEV__) {
    console.warn("[CENTENO] storage: AsyncStorage unavailable, falling back to memory");
  }
  return memoryStorage;
}

const storage = getStorage();

type RecipesState = {
  recipes: Recipe[];
};

type RecipesAction =
  | { type: "hydrate"; payload: Recipe[] }
  | { type: "create"; payload: Recipe }
  | { type: "update"; payload: { id: string; draft: RecipeDraft } }
  | { type: "delete"; payload: { id: string } };

type RecipesContextValue = {
  recipes: Recipe[];
  isReady: boolean;
  createRecipe: (draft: RecipeDraft) => string;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  deleteRecipe: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCategory(category?: RecipeCategory) {
  return category === "pastry" ? "pastry" : "bakery";
}

function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    category: normalizeCategory(recipe.category)
  };
}

function recipesReducer(state: RecipesState, action: RecipesAction): RecipesState {
  switch (action.type) {
    case "hydrate":
      return { recipes: action.payload.map(normalizeRecipe) };
    case "create": {
      return { recipes: [normalizeRecipe(action.payload), ...state.recipes] };
    }
    case "update":
      return {
        recipes: state.recipes.map((recipe) =>
          recipe.id === action.payload.id
            ? {
                ...recipe,
                name: action.payload.draft.name.trim(),
                description: action.payload.draft.description.trim(),
                notes: action.payload.draft.notes.trim(),
                category: normalizeCategory(action.payload.draft.category),
                useAsPreferment: action.payload.draft.useAsPreferment,
                ingredients: action.payload.draft.ingredients,
                updatedAt: new Date().toISOString()
              }
            : recipe
        )
      };
    case "delete":
      return {
        recipes: state.recipes.filter((recipe) => recipe.id !== action.payload.id)
      };
    default:
      return state;
  }
}

export function RecipesProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(recipesReducer, {
    recipes: sampleRecipes.map(normalizeRecipe)
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      try {
        const storedValue = await storage.getItem(STORAGE_KEY);
        if (!storedValue) {
          if (__DEV__) {
            console.log("[CENTENO] storage: no stored recipes, using sampleRecipes");
          }
          return;
        }

        const parsed = JSON.parse(storedValue) as Recipe[];
        if (__DEV__) {
          console.log("[CENTENO] storage: loaded", parsed.length, "recipes from", STORAGE_KEY);
        }
        if (isMounted) {
          dispatch({ type: "hydrate", payload: parsed });
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[CENTENO] storage: parse error, keeping sampleRecipes", error);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    loadRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (__DEV__) {
      console.log("[CENTENO] storage: persisting", state.recipes.length, "recipes");
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(state.recipes)).catch((error) => {
      if (__DEV__) {
        console.error("[CENTENO] storage: persist failed", error);
      }
    });
  }, [isReady, state.recipes]);

  const value = useMemo<RecipesContextValue>(() => {
    return {
      recipes: state.recipes,
      isReady,
      createRecipe: (draft) => {
        const timestamp = new Date().toISOString();
        const recipe: Recipe = {
          id: makeId(),
          name: draft.name.trim(),
          description: draft.description.trim(),
          notes: draft.notes.trim(),
          category: normalizeCategory(draft.category),
          useAsPreferment: draft.useAsPreferment,
          ingredients: draft.ingredients.map((ingredient) => ({
            ...ingredient,
            id: ingredient.id || makeId()
          })),
          createdAt: timestamp,
          updatedAt: timestamp
        };

        dispatch({
          type: "create",
          payload: recipe
        });

        return recipe.id;
      },
      updateRecipe: (id, draft) => {
        dispatch({
          type: "update",
          payload: {
            id,
            draft: {
              ...draft,
              ingredients: draft.ingredients.map((ingredient) => ({
                ...ingredient,
                id: ingredient.id || makeId()
              }))
            }
          }
        });
      },
      deleteRecipe: (id) => {
        dispatch({ type: "delete", payload: { id } });
      },
      getRecipeById: (id) => state.recipes.find((recipe) => recipe.id === id)
    };
  }, [isReady, state.recipes]);

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes() {
  const context = useContext(RecipesContext);

  if (!context) {
    throw new Error("useRecipes must be used inside RecipesProvider");
  }

  return context;
}
