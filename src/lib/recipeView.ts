import { hasBaking, hasFermentation, hasPreparation, hasYieldData } from "@/lib/recipeFields";
import type { Recipe } from "@/types/recipe";

export type RecipeViewTab = "recipe" | "preparation" | "notes";

export function getDefaultRecipeViewTab(): RecipeViewTab {
  return "recipe";
}

export function getRecipeCategoryIcon(category?: Recipe["category"]) {
  if (category === "pastry") {
    return "🧁";
  }

  if (category === "bakery") {
    return "🍞";
  }

  return "•";
}

export function getPreparationTabSections(recipe: Recipe) {
  return {
    preparation: hasPreparation(recipe.preparation),
    fermentation: hasFermentation(recipe.fermentation),
    baking: hasBaking(recipe.baking)
  };
}

export function getNotesTabSections(recipe: Recipe) {
  return {
    notes: Boolean(recipe.notes?.trim())
  };
}

export function getRecipeTabSections(recipe: Recipe) {
  return {
    description: Boolean(recipe.description?.trim())
  };
}
