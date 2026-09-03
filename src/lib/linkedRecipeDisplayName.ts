import type { Recipe, RecipeIngredient } from "@/types/recipe";

type RecipeNameLookup = ReadonlyMap<string, Pick<Recipe, "name">>;

/**
 * Returns the current name of a linked preferment when its recipe is available.
 * Stored names are retained exclusively as a safe fallback for broken links.
 */
export function getLinkedRecipeDisplayName(
  ingredient: RecipeIngredient,
  recipeLookup: RecipeNameLookup
) {
  if (ingredient.role !== "preferment") {
    return ingredient.name;
  }

  const linkedRecipe = ingredient.linkedRecipeId
    ? recipeLookup.get(ingredient.linkedRecipeId)
    : undefined;

  return linkedRecipe?.name.trim() || ingredient.linkedRecipeName?.trim() || ingredient.name;
}
