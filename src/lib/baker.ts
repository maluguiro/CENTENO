import type { IngredientRole, Recipe, RecipeIngredient } from "@/types/recipe";

const round = (value: number) => Math.round(value * 10) / 10;
const flourRoles: IngredientRole[] = ["flour"];
const liquidRoles: IngredientRole[] = ["water"];
const fatRoles: IngredientRole[] = ["fat"];
const moistureRoles: IngredientRole[] = ["water", "fat", "sourdough", "preferment"];

export type RecipeComposition = {
  flour: number;
  liquids: number;
  doughWeight: number;
  hydration: number;
};

export type PrefermentBreakdown =
  | {
      status: "resolved";
      linkedRecipeId: string;
      linkedRecipeName: string;
      originalFlour: number;
      originalLiquids: number;
      originalHydration: number;
      originalWeight: number;
      contributedFlour: number;
      contributedLiquids: number;
      contributedWeight: number;
    }
  | {
      status: "missing";
      linkedRecipeId?: string;
      linkedRecipeName: string;
      message: string;
    }
  | {
      status: "insufficient";
      linkedRecipeId: string;
      linkedRecipeName: string;
      message: string;
    };

type RecipeLookup = (recipeId: string) => Recipe | undefined;

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

export function scaleByTotalFlour(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  return scaleIngredients(ingredients, flourTarget);
}

export function scaleByDoughWeight(
  ingredients: RecipeIngredient[],
  doughWeightTarget: number
) {
  const currentDoughWeight = getDoughWeight(ingredients);

  if (currentDoughWeight <= 0) {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      scaledQuantity: 0
    }));
  }

  const factor = doughWeightTarget / currentDoughWeight;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: round(ingredient.quantity * factor)
  }));
}

export function scaleByYield(
  ingredients: RecipeIngredient[],
  pieceCount: number,
  pieceWeight: number
) {
  const doughWeightTarget = pieceCount * pieceWeight;

  return scaleByDoughWeight(ingredients, doughWeightTarget);
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

export function getRecipeComposition(
  recipe: Recipe,
  recipeLookup?: RecipeLookup,
  visitedRecipeIds: string[] = []
): RecipeComposition {
  const trail = new Set(visitedRecipeIds);
  trail.add(recipe.id);

  let flour = 0;
  let liquids = 0;

  for (const ingredient of recipe.ingredients) {
    if (flourRoles.includes(ingredient.role)) {
      flour += ingredient.quantity;
      continue;
    }

    if (liquidRoles.includes(ingredient.role)) {
      liquids += ingredient.quantity;
      continue;
    }

    if (ingredient.role !== "preferment" || !ingredient.linkedRecipeId || !recipeLookup) {
      continue;
    }

    if (trail.has(ingredient.linkedRecipeId)) {
      continue;
    }

    const linkedRecipe = recipeLookup(ingredient.linkedRecipeId);
    if (!linkedRecipe) {
      continue;
    }

    const linkedComposition = getRecipeComposition(
      linkedRecipe,
      recipeLookup,
      Array.from(trail)
    );

    if (linkedComposition.doughWeight <= 0) {
      continue;
    }

    const factor = ingredient.quantity / linkedComposition.doughWeight;
    flour += linkedComposition.flour * factor;
    liquids += linkedComposition.liquids * factor;
  }

  const doughWeight = getDoughWeight(recipe.ingredients);

  return {
    flour: round(flour),
    liquids: round(liquids),
    doughWeight,
    hydration: flour > 0 ? round((liquids / flour) * 100) : 0
  };
}

export function getPrefermentBreakdown(
  ingredient: RecipeIngredient,
  recipeLookup: RecipeLookup,
  parentRecipeId?: string
): PrefermentBreakdown | null {
  if (ingredient.role !== "preferment") {
    return null;
  }

  const linkedRecipeName = ingredient.linkedRecipeName?.trim() || ingredient.name;

  if (!ingredient.linkedRecipeId) {
    return {
      status: "missing",
      linkedRecipeName,
      message: "Prefermento no disponible"
    };
  }

  const linkedRecipe = recipeLookup(ingredient.linkedRecipeId);
  if (!linkedRecipe) {
    return {
      status: "missing",
      linkedRecipeId: ingredient.linkedRecipeId,
      linkedRecipeName,
      message: "Prefermento no disponible"
    };
  }

  const composition = getRecipeComposition(
    linkedRecipe,
    recipeLookup,
    parentRecipeId ? [parentRecipeId] : []
  );

  if (composition.doughWeight <= 0 || composition.flour <= 0) {
    return {
      status: "insufficient",
      linkedRecipeId: linkedRecipe.id,
      linkedRecipeName: linkedRecipe.name,
      message: "Datos insuficientes"
    };
  }

  const factor = ingredient.quantity / composition.doughWeight;

  return {
    status: "resolved",
    linkedRecipeId: linkedRecipe.id,
    linkedRecipeName: linkedRecipe.name,
    originalFlour: composition.flour,
    originalLiquids: composition.liquids,
    originalHydration: composition.hydration,
    originalWeight: composition.doughWeight,
    contributedFlour: round(composition.flour * factor),
    contributedLiquids: round(composition.liquids * factor),
    contributedWeight: round(composition.doughWeight * factor)
  };
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
