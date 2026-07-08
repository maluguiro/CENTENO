import AsyncStorage from "@react-native-async-storage/async-storage";
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
import type { Recipe, RecipeDraft } from "@/types/recipe";

const STORAGE_KEY = "centeno.recipes";

type RecipesState = {
  recipes: Recipe[];
};

type RecipesAction =
  | { type: "hydrate"; payload: Recipe[] }
  | { type: "create"; payload: RecipeDraft }
  | { type: "update"; payload: { id: string; draft: RecipeDraft } }
  | { type: "delete"; payload: { id: string } };

type RecipesContextValue = {
  recipes: Recipe[];
  isReady: boolean;
  createRecipe: (draft: RecipeDraft) => void;
  updateRecipe: (id: string, draft: RecipeDraft) => void;
  deleteRecipe: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recipesReducer(state: RecipesState, action: RecipesAction): RecipesState {
  switch (action.type) {
    case "hydrate":
      return { recipes: action.payload };
    case "create": {
      const timestamp = new Date().toISOString();
      const recipe: Recipe = {
        id: makeId(),
        name: action.payload.name.trim(),
        description: action.payload.description.trim(),
        notes: action.payload.notes.trim(),
        ingredients: action.payload.ingredients,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      return { recipes: [recipe, ...state.recipes] };
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
  const [state, dispatch] = useReducer(recipesReducer, { recipes: sampleRecipes });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes() {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (!storedValue) {
          return;
        }

        const parsed = JSON.parse(storedValue) as Recipe[];
        if (isMounted) {
          dispatch({ type: "hydrate", payload: parsed });
        }
      } catch {
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

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipes)).catch(() => {});
  }, [isReady, state.recipes]);

  const value = useMemo<RecipesContextValue>(() => {
    return {
      recipes: state.recipes,
      isReady,
      createRecipe: (draft) => {
        dispatch({
          type: "create",
          payload: {
            ...draft,
            ingredients: draft.ingredients.map((ingredient) => ({
              ...ingredient,
              id: ingredient.id || makeId()
            }))
          }
        });
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
