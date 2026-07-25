import type {
  IngredientRole,
  Recipe,
  RecipeIngredient,
  RecipeScalingTarget
} from "@/types/recipe";

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

export type PrefermentContributionTotals = {
  flour: number;
  liquids: number;
  warnings: string[];
};

export type IngredientDisplayBreakdown = {
  totalRequired: number;
  contributed: number;
  visibleQuantity: number;
  detail: string | null;
  warning: string | null;
};

export function getTargetDoughWeight(scalingTarget?: RecipeScalingTarget) {
  if (!scalingTarget) {
    return null;
  }

  if (scalingTarget.mode === "doughWeight") {
    return scalingTarget.doughWeight && scalingTarget.doughWeight > 0
      ? scalingTarget.doughWeight
      : null;
  }

  if (scalingTarget.mode === "pieces") {
    const pieces = scalingTarget.pieces ?? 0;
    const pieceWeight = scalingTarget.pieceWeight ?? 0;
    const target = pieces * pieceWeight;

    return target > 0 ? target : null;
  }

  return null;
}

export function applyScalingTarget(
  ingredients: RecipeIngredient[],
  scalingTarget?: RecipeScalingTarget
) {
  if (!scalingTarget) {
    return ingredients;
  }

  if (scalingTarget.mode === "totalFlour") {
    const flourTarget = scalingTarget.totalFlour ?? 0;
    return flourTarget > 0 ? applyScaleByTotalFlour(ingredients, flourTarget) : ingredients;
  }

  const doughWeightTarget = getTargetDoughWeight(scalingTarget);
  if (!doughWeightTarget || doughWeightTarget <= 0) {
    return ingredients;
  }

  const totalPercentage = ingredients.reduce(
    (total, ingredient) => total + ingredient.bakerPercentage,
    0
  );

  if (totalPercentage <= 0) {
    return ingredients;
  }

  const flourTarget = round((doughWeightTarget * 100) / totalPercentage);

  return applyScaleByTotalFlour(ingredients, flourTarget);
}

export function parseDecimalInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDecimalInput(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

export function getQuantityFromBakerPercentage(flourTotal: number, bakerPercentage: number) {
  if (flourTotal <= 0 || bakerPercentage <= 0) {
    return 0;
  }

  return round((flourTotal * bakerPercentage) / 100);
}

export function getBakerPercentageFromQuantity(quantity: number, flourTotal: number) {
  if (flourTotal <= 0 || quantity <= 0) {
    return 0;
  }

  return round((quantity / flourTotal) * 100);
}

export function normalizeIngredientsFromFlour(
  ingredients: RecipeIngredient[],
  flourTotal: number
) {
  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: getQuantityFromBakerPercentage(flourTotal, ingredient.bakerPercentage)
  }));
}

export function updateIngredientFromPercentage(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  bakerPercentage: number
) {
  const flourTotal = getTotalFlour(ingredients);

  return ingredients.map((ingredient) =>
    ingredient.id === ingredientId
      ? {
          ...ingredient,
          bakerPercentage,
          quantity: getQuantityFromBakerPercentage(flourTotal, bakerPercentage)
        }
      : ingredient
  );
}

export function updateIngredientFromQuantity(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  quantity: number
) {
  const flourTotal = getTotalFlour(ingredients);

  return ingredients.map((ingredient) =>
    ingredient.id === ingredientId
      ? {
          ...ingredient,
          quantity: round(quantity),
          bakerPercentage: getBakerPercentageFromQuantity(quantity, flourTotal)
        }
      : ingredient
  );
}

export function recalculateBakerPercentagesFromQuantities(
  ingredients: RecipeIngredient[]
) {
  const flourTotal = getTotalFlour(ingredients);

  if (flourTotal <= 0) {
    return ingredients;
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    bakerPercentage: getBakerPercentageFromQuantity(ingredient.quantity, flourTotal)
  }));
}

export function rebalanceFlourBlendPercentages(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  nextPercentage: number
) {
  const flourIngredients = ingredients.filter((ingredient) => ingredient.role === "flour");
  const flourTotal = getTotalFlour(ingredients);

  if (flourIngredients.length <= 1 || flourTotal <= 0) {
    return ingredients;
  }

  const clampedTargetPercentage = round(Math.max(0, Math.min(100, nextPercentage)));
  const otherFlours = flourIngredients.filter((ingredient) => ingredient.id !== ingredientId);
  const otherPercentageTotal = otherFlours.reduce(
    (total, ingredient) => total + ingredient.bakerPercentage,
    0
  );
  const remainingPercentage = round(Math.max(0, 100 - clampedTargetPercentage));

  let remainingPool = remainingPercentage;

  const nextFlourMap = new Map(
    flourIngredients.map((ingredient, index) => {
      if (ingredient.id === ingredientId) {
        return [
          ingredient.id,
          {
            ...ingredient,
            bakerPercentage: clampedTargetPercentage,
            quantity: getQuantityFromBakerPercentage(flourTotal, clampedTargetPercentage)
          }
        ] as const;
      }

      const otherIndex = otherFlours.findIndex((item) => item.id === ingredient.id);
      const isLastOther = otherIndex === otherFlours.length - 1;
      const proportionalPercentage =
        otherPercentageTotal > 0
          ? round((ingredient.bakerPercentage / otherPercentageTotal) * remainingPercentage)
          : round(remainingPercentage / otherFlours.length);
      const flourPercentage = isLastOther
        ? remainingPool
        : Math.max(0, Math.min(remainingPool, proportionalPercentage));

      remainingPool = round(Math.max(0, remainingPool - flourPercentage));

      return [
        ingredient.id,
        {
          ...ingredient,
          bakerPercentage: flourPercentage,
          quantity: getQuantityFromBakerPercentage(flourTotal, flourPercentage)
        }
      ] as const;
    })
  );

  return ingredients.map((ingredient) => nextFlourMap.get(ingredient.id) ?? ingredient);
}

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
  if (flourTarget <= 0 || getTotalFlour(ingredients) <= 0) {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      scaledQuantity: 0
    }));
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: getQuantityFromBakerPercentage(flourTarget, ingredient.bakerPercentage)
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
  const flourTotal = getTotalFlour(ingredients);
  if (flourTotal <= 0) {
    return 0;
  }

  const liquidPercent = round(
    ingredients
    .filter((ingredient) => liquidRoles.includes(ingredient.role))
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0)
  );

  return liquidPercent;
}

export function getHydrationPercent(ingredients: RecipeIngredient[]) {
  return getHydrationPercentage(ingredients);
}

export function getMoistureIndex(ingredients: RecipeIngredient[]) {
  const flourTotal = getTotalFlour(ingredients);
  if (flourTotal <= 0) {
    return 0;
  }

  return round(
    ingredients
    .filter((ingredient) => moistureRoles.includes(ingredient.role))
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0)
  );
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

export function getPrefermentContributionTotals(
  ingredients: RecipeIngredient[],
  recipeLookup: RecipeLookup,
  parentRecipeId?: string
): PrefermentContributionTotals {
  return ingredients.reduce<PrefermentContributionTotals>(
    (totals, ingredient) => {
      const breakdown = getPrefermentBreakdown(ingredient, recipeLookup, parentRecipeId);

      if (breakdown?.status !== "resolved") {
        return totals;
      }

      return {
        flour: round(totals.flour + breakdown.contributedFlour),
        liquids: round(totals.liquids + breakdown.contributedLiquids),
        warnings: totals.warnings
      };
    },
    { flour: 0, liquids: 0, warnings: [] }
  );
}

export function getIngredientDisplayBreakdown(
  ingredient: RecipeIngredient,
  ingredients: RecipeIngredient[],
  recipeLookup: RecipeLookup,
  parentRecipeId?: string
): IngredientDisplayBreakdown {
  const prefersFlour = ingredient.role === "flour";
  const prefersLiquid = liquidRoles.includes(ingredient.role);

  if (!prefersFlour && !prefersLiquid) {
    return {
      totalRequired: ingredient.quantity,
      contributed: 0,
      visibleQuantity: ingredient.quantity,
      detail: null,
      warning: null
    };
  }

  const contributions = getPrefermentContributionTotals(ingredients, recipeLookup, parentRecipeId);
  const roleIngredients = ingredients.filter((item) => item.role === ingredient.role);
  const totalRequiredForRole = round(
    roleIngredients.reduce((total, item) => total + item.quantity, 0)
  );
  const totalContribution = prefersFlour ? contributions.flour : contributions.liquids;

  if (totalRequiredForRole <= 0 || totalContribution <= 0) {
    return {
      totalRequired: ingredient.quantity,
      contributed: 0,
      visibleQuantity: ingredient.quantity,
      detail: null,
      warning: null
    };
  }

  const contributionShare = round((totalContribution * ingredient.quantity) / totalRequiredForRole);
  const actualContribution = round(Math.min(contributionShare, ingredient.quantity));
  const visibleQuantity = round(Math.max(0, ingredient.quantity - actualContribution));
  const exceeded = contributionShare > ingredient.quantity;

  return {
    totalRequired: ingredient.quantity,
    contributed: actualContribution,
    visibleQuantity,
    detail: `[${round(ingredient.quantity)} - ${actualContribution}]`,
    warning: exceeded ? "El prefermento excede el total calculado" : null
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

export function applyScaleByTotalFlour(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  return scaleByTotalFlour(ingredients, flourTarget).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));
}

export function applyScaleByDoughWeight(
  ingredients: RecipeIngredient[],
  doughWeightTarget: number
) {
  return scaleByDoughWeight(ingredients, doughWeightTarget).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));
}

export function applyScaleByYield(
  ingredients: RecipeIngredient[],
  pieceCount: number,
  pieceWeight: number
) {
  return scaleByYield(ingredients, pieceCount, pieceWeight).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));
}

export function buildScalingTargetLabel(scalingTarget?: RecipeScalingTarget) {
  if (!scalingTarget) {
    return null;
  }

  if (scalingTarget.mode === "pieces") {
    const pieces = scalingTarget.pieces ?? 0;
    const pieceWeight = scalingTarget.pieceWeight ?? 0;
    const total = getTargetDoughWeight(scalingTarget) ?? 0;

    if (pieces > 0 && pieceWeight > 0 && total > 0) {
      return `Ajuste activo: ${pieces} piezas x ${round(pieceWeight)} g = ${round(total)} g`;
    }
  }

  if (scalingTarget.mode === "doughWeight") {
    const doughWeight = scalingTarget.doughWeight ?? 0;
    if (doughWeight > 0) {
      return `Objetivo: ${round(doughWeight)} g de masa`;
    }
  }

  if (scalingTarget.mode === "totalFlour") {
    const totalFlour = scalingTarget.totalFlour ?? 0;
    if (totalFlour > 0) {
      return `Objetivo: ${round(totalFlour)} g de harina`;
    }
  }

  return null;
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
