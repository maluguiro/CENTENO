import type { IngredientRole, Recipe, RecipeIngredient } from "@/types/recipe";

const round = (value: number) => Math.round(value * 10) / 10;
const flourRoles: IngredientRole[] = ["flour"];
const liquidRoles: IngredientRole[] = ["water"];
const fatRoles: IngredientRole[] = ["fat"];
const moistureRoles: IngredientRole[] = ["water", "fat", "sourdough", "preferment"];

export function getBaseIngredients(ingredients: RecipeIngredient[]) {
  return ingredients.filter((ingredient) => flourRoles.includes(ingredient.role));
}

export function getBasePercent(ingredients: RecipeIngredient[]) {
  return getBaseIngredients(ingredients).reduce(
    (total, ingredient) => total + ingredient.bakerPercentage,
    0
  );
}

export function getBaseQuantity(ingredients: RecipeIngredient[]) {
  return getBaseIngredients(ingredients).reduce(
    (total, ingredient) => total + ingredient.quantity,
    0
  );
}

export function getTotalFlour(ingredients: RecipeIngredient[]) {
  return round(
    ingredients
      .filter((ingredient) => flourRoles.includes(ingredient.role))
      .reduce((total, ingredient) => total + ingredient.quantity, 0)
  );
}

export function getTotalLiquids(ingredients: RecipeIngredient[]) {
  return round(
    ingredients
      .filter((ingredient) => liquidRoles.includes(ingredient.role))
      .reduce((total, ingredient) => total + ingredient.quantity, 0)
  );
}

export function getTotalFats(ingredients: RecipeIngredient[]) {
  return round(
    ingredients
      .filter((ingredient) => fatRoles.includes(ingredient.role))
      .reduce((total, ingredient) => total + ingredient.quantity, 0)
  );
}

export function scaleIngredients(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  const basePercent = getBasePercent(ingredients);

  if (basePercent <= 0) {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      scaledQuantity: 0
    }));
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: round((flourTarget * ingredient.bakerPercentage) / basePercent)
  }));
}

export function getHydrationPercentage(ingredients: RecipeIngredient[]) {
  const basePercent = getBasePercent(ingredients);
  if (basePercent <= 0) {
    return 0;
  }

  const liquidPercent = ingredients
    .filter((ingredient) => liquidRoles.includes(ingredient.role))
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

  return round((liquidPercent / basePercent) * 100);
}

export function getHydrationPercent(ingredients: RecipeIngredient[]) {
  return getHydrationPercentage(ingredients);
}

export function getMoistureIndex(ingredients: RecipeIngredient[]) {
  const basePercent = getBasePercent(ingredients);
  if (basePercent <= 0) {
    return 0;
  }

  const moisturePercent = ingredients
    .filter((ingredient) => moistureRoles.includes(ingredient.role))
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

  return round((moisturePercent / basePercent) * 100);
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
  const baseQuantity = getTotalFlour(recipe.ingredients);
  const hydration = getHydrationPercentage(recipe.ingredients);
  const moistureIndex = getMoistureIndex(recipe.ingredients);
  const fats = getTotalFats(recipe.ingredients);
  const liquids = getTotalLiquids(recipe.ingredients);
  const doughWeight = getDoughWeight(recipe.ingredients);

  return {
    basePercent,
    baseQuantity,
    doughWeight,
    fats,
    hydration,
    liquids,
    moistureIndex,
    ingredientCount: recipe.ingredients.length
  };
}
