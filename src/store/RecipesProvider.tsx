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
import { normalizeRecipeMetadata } from "@/lib/recipeFields";
import type {
  Recipe,
  RecipeCategory,
  RecipeDraft,
  RecipeScalingTarget
} from "@/types/recipe";

const STORAGE_KEY = "centeno.recipes";
const isDev =
  typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

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
      if (isDev) {
        console.log("[CENTENO] storage: AsyncStorage OK");
      }
      return asyncStorage as StorageLike;
    }
  } catch {
  }

  if (isDev) {
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
  | { type: "import"; payload: Recipe }
  | { type: "importMany"; payload: Recipe[] }
  | { type: "restoreSamples"; payload: Recipe[] }
  | { type: "deleteAll" }
  | { type: "clearScalingTarget"; payload: { id: string; restoreSnapshot?: boolean } }
  | { type: "update"; payload: { id: string; draft: RecipeDraft } }
  | { type: "delete"; payload: { id: string } };

type RecipesContextValue = {
  recipes: Recipe[];
  isReady: boolean;
  createRecipe: (draft: RecipeDraft) => string;
  importRecipe: (recipe: Recipe) => string;
  importRecipes: (recipes: Recipe[]) => number;
  restoreSampleRecipes: () => void;
  deleteAllRecipes: () => void;
  clearScalingTarget: (id: string, restoreSnapshot?: boolean) => void;
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

function normalizeScalingTarget(scalingTarget?: RecipeScalingTarget) {
  if (!scalingTarget) {
    return undefined;
  }

  const mode = scalingTarget.mode;
  if (mode !== "totalFlour" && mode !== "doughWeight" && mode !== "pieces") {
    return undefined;
  }

  return {
    mode,
    totalFlour: scalingTarget.totalFlour,
    doughWeight: scalingTarget.doughWeight,
    pieces: scalingTarget.pieces,
    pieceWeight: scalingTarget.pieceWeight
  } satisfies RecipeScalingTarget;
}

function normalizeRecipe(recipe: Recipe): Recipe {
  const metadata = normalizeRecipeMetadata(recipe);

  return {
    ...recipe,
    ...metadata,
    category: normalizeCategory(recipe.category),
    scalingTarget: normalizeScalingTarget(recipe.scalingTarget),
    scalingSnapshotIngredients: recipe.scalingSnapshotIngredients?.map((ingredient) => ({
      ...ingredient
    }))
  };
}

function normalizeNameKey(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

export function mergeMissingSampleRecipes(existingRecipes: Recipe[], incomingSamples: Recipe[]) {
  const existingIds = new Set(existingRecipes.map((recipe) => recipe.id));
  const existingNames = new Set(existingRecipes.map((recipe) => normalizeNameKey(recipe.name)));

  const missingSamples = incomingSamples
    .map(normalizeRecipe)
    .filter(
      (sample) =>
        !existingIds.has(sample.id) && !existingNames.has(normalizeNameKey(sample.name))
    );

  return [...existingRecipes, ...missingSamples];
}

function recipesReducer(state: RecipesState, action: RecipesAction): RecipesState {
  switch (action.type) {
    case "hydrate":
      return { recipes: action.payload.map(normalizeRecipe) };
    case "create": {
      return { recipes: [normalizeRecipe(action.payload), ...state.recipes] };
    }
    case "import": {
      return { recipes: [normalizeRecipe(action.payload), ...state.recipes] };
    }
    case "importMany": {
      return { recipes: [...action.payload.map(normalizeRecipe), ...state.recipes] };
    }
    case "restoreSamples": {
      return {
        recipes: mergeMissingSampleRecipes(state.recipes, action.payload)
      };
    }
    case "deleteAll":
      return { recipes: [] };
    case "clearScalingTarget":
      return {
        recipes: state.recipes.map((recipe) =>
          recipe.id === action.payload.id
            ? {
                ...recipe,
                ingredients:
                  action.payload.restoreSnapshot && recipe.scalingSnapshotIngredients?.length
                    ? recipe.scalingSnapshotIngredients.map((ingredient) => ({ ...ingredient }))
                    : recipe.ingredients,
                scalingTarget: undefined,
                scalingSnapshotIngredients: undefined,
                updatedAt: new Date().toISOString()
              }
            : recipe
        )
      };
    case "update":
      return {
        recipes: state.recipes.map((recipe) =>
          recipe.id === action.payload.id
            ? (() => {
                const metadata = normalizeRecipeMetadata(action.payload.draft);

                return {
                  ...recipe,
                  ...metadata,
                  name: action.payload.draft.name.trim(),
                  category: normalizeCategory(action.payload.draft.category),
                  useAsPreferment: action.payload.draft.useAsPreferment,
                  scalingTarget: normalizeScalingTarget(action.payload.draft.scalingTarget),
                  scalingSnapshotIngredients: action.payload.draft.scalingSnapshotIngredients?.map(
                    (ingredient) => ({ ...ingredient })
                  ),
                  ingredients: action.payload.draft.ingredients,
                  updatedAt: new Date().toISOString()
                };
              })()
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
          if (isDev) {
            console.log("[CENTENO] storage: no stored recipes, using sampleRecipes");
          }
          return;
        }

        const parsed = JSON.parse(storedValue) as Recipe[];
        if (isDev) {
          console.log("[CENTENO] storage: loaded", parsed.length, "recipes from", STORAGE_KEY);
        }
        if (isMounted) {
          dispatch({ type: "hydrate", payload: parsed });
        }
      } catch (error) {
        if (isDev) {
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

    if (isDev) {
      console.log("[CENTENO] storage: persisting", state.recipes.length, "recipes");
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(state.recipes)).catch((error) => {
      if (isDev) {
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
        const metadata = normalizeRecipeMetadata(draft);
        const recipe: Recipe = {
          id: makeId(),
          name: draft.name.trim(),
          ...metadata,
          category: normalizeCategory(draft.category),
          useAsPreferment: draft.useAsPreferment,
          scalingTarget: normalizeScalingTarget(draft.scalingTarget),
          scalingSnapshotIngredients: draft.scalingSnapshotIngredients?.map((ingredient) => ({
            ...ingredient
          })),
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
      importRecipe: (recipe) => {
        dispatch({
          type: "import",
          payload: recipe
        });

        return recipe.id;
      },
      importRecipes: (recipes) => {
        if (!recipes.length) {
          return 0;
        }

        dispatch({
          type: "importMany",
          payload: recipes
        });

        return recipes.length;
      },
      restoreSampleRecipes: () => {
        dispatch({
          type: "restoreSamples",
          payload: sampleRecipes
        });
      },
      deleteAllRecipes: () => {
        dispatch({ type: "deleteAll" });
      },
      clearScalingTarget: (id, restoreSnapshot = false) => {
        dispatch({ type: "clearScalingTarget", payload: { id, restoreSnapshot } });
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
