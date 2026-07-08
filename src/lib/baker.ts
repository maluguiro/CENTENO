import type { IngredientRole, Recipe, RecipeIngredient } from "@/types/recipe";

const round = (value: number) => Math.round(value * 10) / 10;
const baseRoles: IngredientRole[] = ["flour"];
const hydrationRoles: IngredientRole[] = ["water"];

export function getBaseIngredients(ingredients: RecipeIngredient[]) {
  return ingredients.filter((ingredient) => baseRoles.includes(ingredient.role));
}

export function getBasePercent(ingredients: RecipeIngredient[]) {
  const basePercent = getBaseIngredients(ingredients).reduce(
    (total, ingredient) => total + ingredient.bakerPercentage,
    0
  );

  return basePercent || 100;
}

export function getBaseQuantity(ingredients: RecipeIngredient[]) {
  return getBaseIngredients(ingredients).reduce(
    (total, ingredient) => total + ingredient.quantity,
    0
  );
}

export function scaleIngredients(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  const basePercent = getBasePercent(ingredients);

  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: round((flourTarget * ingredient.bakerPercentage) / basePercent)
  }));
}

export function getHydrationPercent(ingredients: RecipeIngredient[]) {
  const basePercent = getBasePercent(ingredients);
  const liquidPercent = ingredients
    .filter((ingredient) => hydrationRoles.includes(ingredient.role))
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

  return round((liquidPercent / basePercent) * 100);
}

export function getDoughWeight(ingredients: RecipeIngredient[]) {
  return round(
    ingredients.reduce((total, ingredient) => total + ingredient.quantity, 0)
  );
}

export function getScaledDoughWeight(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  return round(
    scaleIngredients(ingredients, flourTarget).reduce(
      (total, ingredient) => total + ingredient.scaledQuantity,
      0
    )
  );
}

export function getRecipeSummary(recipe: Recipe) {
  const basePercent = getBasePercent(recipe.ingredients);
  const baseQuantity = getBaseQuantity(recipe.ingredients);
  const hydration = getHydrationPercent(recipe.ingredients);
  const doughWeight = getDoughWeight(recipe.ingredients);

  return {
    basePercent,
    baseQuantity,
    doughWeight,
    hydration,
    ingredientCount: recipe.ingredients.length
  };
}
