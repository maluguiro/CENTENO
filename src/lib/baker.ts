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

type BreakdownTargetKind = "flour" | "liquids";

function getFlourIngredients(ingredients: RecipeIngredient[]) {
  return ingredients.filter((ingredient) => flourRoles.includes(ingredient.role));
}

function getPrimaryFlourIngredient(ingredients: RecipeIngredient[]) {
  return getFlourIngredients(ingredients)[0] ?? null;
}

export function getPrimaryFlourQuantity(ingredients: RecipeIngredient[]) {
  return round(getPrimaryFlourIngredient(ingredients)?.quantity ?? 0);
}

export function isPrimaryFlourIngredient(
  ingredients: RecipeIngredient[],
  ingredientId: string
) {
  return getPrimaryFlourIngredient(ingredients)?.id === ingredientId;
}

function getIngredientPercentageBaseQuantity(
  ingredients: RecipeIngredient[],
  ingredient: Pick<RecipeIngredient, "id" | "role">
) {
  if (ingredient.role === "flour") {
    return getPrimaryFlourQuantity(ingredients);
  }

  return getTotalFlour(ingredients);
}

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
  scalingTarget?: RecipeScalingTarget,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
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

  return applyScaleByDoughWeight(ingredients, doughWeightTarget, recipeLookup, parentRecipeId);
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

export function getIngredientQuantityFromBakerPercentage(
  ingredients: RecipeIngredient[],
  ingredient: Pick<RecipeIngredient, "id" | "role">,
  bakerPercentage: number
) {
  if (ingredient.role === "flour" && isPrimaryFlourIngredient(ingredients, ingredient.id)) {
    return getPrimaryFlourQuantity(ingredients);
  }

  return getQuantityFromBakerPercentage(
    getIngredientPercentageBaseQuantity(ingredients, ingredient),
    bakerPercentage
  );
}

export function getIngredientBakerPercentageFromQuantity(
  ingredients: RecipeIngredient[],
  ingredient: Pick<RecipeIngredient, "id" | "role">,
  quantity: number
) {
  if (ingredient.role === "flour" && isPrimaryFlourIngredient(ingredients, ingredient.id)) {
    return quantity > 0 ? 100 : 0;
  }

  return getBakerPercentageFromQuantity(
    quantity,
    getIngredientPercentageBaseQuantity(ingredients, ingredient)
  );
}

export function normalizeIngredientsFromFlour(
  ingredients: RecipeIngredient[],
  flourTotal: number
) {
  const primaryFlour = getPrimaryFlourIngredient(ingredients);
  const flourPercentageTotal = getFlourIngredients(ingredients)
    .filter((ingredient) => ingredient.id !== primaryFlour?.id)
    .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);
  const primaryFlourTarget =
    primaryFlour && flourTotal > 0
      ? round(flourTotal / (1 + flourPercentageTotal / 100))
      : 0;

  return ingredients.map((ingredient) => {
    if (ingredient.role === "flour") {
      if (primaryFlour?.id === ingredient.id) {
        return {
          ...ingredient,
          quantity: primaryFlourTarget,
          bakerPercentage: primaryFlourTarget > 0 ? 100 : 0
        };
      }

      return {
        ...ingredient,
        quantity: getQuantityFromBakerPercentage(primaryFlourTarget, ingredient.bakerPercentage)
      };
    }

    return {
      ...ingredient,
      quantity: getQuantityFromBakerPercentage(flourTotal, ingredient.bakerPercentage)
    };
  });
}

export function updateIngredientFromPercentage(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  bakerPercentage: number
) {
  const nextIngredients = ingredients.map((ingredient) => {
    if (ingredient.id !== ingredientId) {
      return ingredient;
    }

    if (ingredient.role === "flour" && isPrimaryFlourIngredient(ingredients, ingredient.id)) {
      return {
        ...ingredient,
        bakerPercentage: ingredient.quantity > 0 ? 100 : 0
      };
    }

    return {
      ...ingredient,
      bakerPercentage,
      quantity: getIngredientQuantityFromBakerPercentage(ingredients, ingredient, bakerPercentage)
    };
  });

  return recalculateBakerPercentagesFromQuantities(nextIngredients);
}

export function updateIngredientFromQuantity(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  quantity: number
) {
  const nextIngredients = ingredients.map((ingredient) =>
    ingredient.id === ingredientId
      ? {
          ...ingredient,
          quantity: round(quantity)
        }
      : ingredient
  );

  return recalculateBakerPercentagesFromQuantities(nextIngredients);
}

export function recalculateBakerPercentagesFromQuantities(
  ingredients: RecipeIngredient[]
) {
  const primaryFlour = getPrimaryFlourIngredient(ingredients);
  const primaryFlourQuantity = getPrimaryFlourQuantity(ingredients);
  const totalFlour = getTotalFlour(ingredients);

  if (!primaryFlour || primaryFlourQuantity <= 0) {
    return ingredients;
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    bakerPercentage:
      ingredient.role === "flour"
        ? ingredient.id === primaryFlour.id
          ? 100
          : getBakerPercentageFromQuantity(ingredient.quantity, primaryFlourQuantity)
        : getBakerPercentageFromQuantity(ingredient.quantity, totalFlour)
  }));
}

export function rebalanceFlourBlendPercentages(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  nextPercentage: number
) {
  const primaryFlour = getPrimaryFlourIngredient(ingredients);
  const primaryFlourQuantity = getPrimaryFlourQuantity(ingredients);

  if (!primaryFlour || primaryFlourQuantity <= 0) {
    return ingredients;
  }

  const clampedTargetPercentage = round(Math.max(0, nextPercentage));
  const nextIngredients = ingredients.map((ingredient) => {
    if (ingredient.id !== ingredientId || ingredient.role !== "flour") {
      return ingredient;
    }

    if (ingredient.id === primaryFlour.id) {
      return {
        ...ingredient,
        bakerPercentage: 100
      };
    }

    return {
      ...ingredient,
      bakerPercentage: clampedTargetPercentage,
      quantity: getQuantityFromBakerPercentage(primaryFlourQuantity, clampedTargetPercentage)
    };
  });

  return recalculateBakerPercentagesFromQuantities(nextIngredients);
}

export function getBaseIngredients(ingredients: RecipeIngredient[]) {
  const primaryFlour = getPrimaryFlourIngredient(ingredients);
  return primaryFlour ? [primaryFlour] : [];
}

export function getBasePercent(ingredients: RecipeIngredient[]) {
  return getBaseIngredients(ingredients).length ? 100 : 0;
}

export function getBaseQuantity(ingredients: RecipeIngredient[]) {
  return getPrimaryFlourQuantity(ingredients);
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
  const currentTotalFlour = getTotalFlour(ingredients);

  if (flourTarget <= 0 || currentTotalFlour <= 0) {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      scaledQuantity: 0
    }));
  }

  const factor = flourTarget / currentTotalFlour;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: round(ingredient.quantity * factor)
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
  doughWeightTarget: number,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  const currentDoughWeight = getDoughWeight(ingredients, recipeLookup, parentRecipeId);

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
  pieceWeight: number,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  const doughWeightTarget = pieceCount * pieceWeight;

  return scaleByDoughWeight(ingredients, doughWeightTarget, recipeLookup, parentRecipeId);
}

export function getHydrationPercentage(ingredients: RecipeIngredient[]) {
  const flourTotal = getTotalFlour(ingredients);
  if (flourTotal <= 0) {
    return 0;
  }

  return round((getTotalLiquids(ingredients) / flourTotal) * 100);
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

export function getDoughWeight(
  ingredients: RecipeIngredient[],
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  const totalWeight = ingredients.reduce((total, ingredient) => total + ingredient.quantity, 0);

  if (!recipeLookup) {
    return round(totalWeight);
  }

  const contributions = getPrefermentContributionTotals(ingredients, recipeLookup, parentRecipeId);

  return round(totalWeight - contributions.flour - contributions.liquids);
}

function getExpandedRecipeComposition(
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

    const linkedComposition = getExpandedRecipeComposition(
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

  const doughWeight = getDoughWeight(
    recipe.ingredients,
    recipeLookup,
    recipe.id
  );

  return {
    flour: round(flour),
    liquids: round(liquids),
    doughWeight,
    hydration: flour > 0 ? round((liquids / flour) * 100) : 0
  };
}

export function getRecipeComposition(
  recipe: Recipe,
  recipeLookup?: RecipeLookup,
  _visitedRecipeIds: string[] = []
): RecipeComposition {
  let flour = 0;
  let liquids = 0;

  for (const ingredient of recipe.ingredients) {
    if (flourRoles.includes(ingredient.role)) {
      flour += ingredient.quantity;
      continue;
    }

    if (liquidRoles.includes(ingredient.role)) {
      liquids += ingredient.quantity;
    }
  }

  return {
    flour: round(flour),
    liquids: round(liquids),
    doughWeight: getDoughWeight(recipe.ingredients, recipeLookup, recipe.id),
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

  const composition = getExpandedRecipeComposition(
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

function getBreakdownTargetKind(role: IngredientRole): BreakdownTargetKind | null {
  if (flourRoles.includes(role)) {
    return "flour";
  }

  if (liquidRoles.includes(role)) {
    return "liquids";
  }

  return null;
}

function getBreakdownTargetIngredient(
  ingredients: RecipeIngredient[],
  kind: BreakdownTargetKind
) {
  return (
    ingredients.find((item) => {
      const itemKind = getBreakdownTargetKind(item.role);
      return itemKind === kind && item.quantity > 0;
    }) ?? null
  );
}

function adjustIngredientQuantity(
  ingredients: RecipeIngredient[],
  ingredientId: string,
  delta: number
) {
  return ingredients.map((ingredient) =>
    ingredient.id === ingredientId
      ? {
          ...ingredient,
          quantity: round(ingredient.quantity + delta)
        }
      : ingredient
  );
}

function getPreferredAdjustmentIngredientId(ingredients: RecipeIngredient[]) {
  return getPrimaryFlourIngredient(ingredients)?.id ?? ingredients[0]?.id ?? null;
}

export function getIngredientDisplayBreakdown(
  ingredient: RecipeIngredient,
  ingredients: RecipeIngredient[],
  recipeLookup: RecipeLookup,
  parentRecipeId?: string
): IngredientDisplayBreakdown {
  const targetKind = getBreakdownTargetKind(ingredient.role);

  if (!targetKind) {
    return {
      totalRequired: ingredient.quantity,
      contributed: 0,
      visibleQuantity: ingredient.quantity,
      detail: null,
      warning: null
    };
  }

  const contributions = getPrefermentContributionTotals(ingredients, recipeLookup, parentRecipeId);
  const totalContribution = targetKind === "flour" ? contributions.flour : contributions.liquids;

  if (totalContribution <= 0) {
    return {
      totalRequired: ingredient.quantity,
      contributed: 0,
      visibleQuantity: ingredient.quantity,
      detail: null,
      warning: null
    };
  }

  const targetIngredient = getBreakdownTargetIngredient(ingredients, targetKind);

  if (!targetIngredient || targetIngredient.id !== ingredient.id) {
    return {
      totalRequired: ingredient.quantity,
      contributed: 0,
      visibleQuantity: ingredient.quantity,
      detail: null,
      warning: null
    };
  }

  const actualContribution = round(Math.min(totalContribution, ingredient.quantity));
  const visibleQuantity = round(Math.max(0, ingredient.quantity - actualContribution));
  const exceeded = totalContribution > ingredient.quantity;

  return {
    totalRequired: ingredient.quantity,
    contributed: actualContribution,
    visibleQuantity,
    detail: `[${round(ingredient.quantity)} - ${actualContribution}]`,
    warning: exceeded
      ? `El aporte del prefermento excede el ingrediente principal por ${round(totalContribution - ingredient.quantity)} g`
      : null
  };
}

export function getScaledDoughWeight(
  ingredients: RecipeIngredient[],
  flourTarget: number,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  const scaledIngredients = scaleIngredients(ingredients, flourTarget).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));

  return getDoughWeight(scaledIngredients, recipeLookup, parentRecipeId);
}

export function applyScaleByTotalFlour(
  ingredients: RecipeIngredient[],
  flourTarget: number
) {
  const scaledIngredients = scaleByTotalFlour(ingredients, flourTarget).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));
  const flourDelta = round(flourTarget - getTotalFlour(scaledIngredients));
  const adjustmentId = getPreferredAdjustmentIngredientId(scaledIngredients);
  const reconciledIngredients =
    adjustmentId && flourDelta !== 0
      ? adjustIngredientQuantity(scaledIngredients, adjustmentId, flourDelta)
      : scaledIngredients;

  return recalculateBakerPercentagesFromQuantities(reconciledIngredients);
}

export function applyScaleByDoughWeight(
  ingredients: RecipeIngredient[],
  doughWeightTarget: number,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  const scaledIngredients = scaleByDoughWeight(
    ingredients,
    doughWeightTarget,
    recipeLookup,
    parentRecipeId
  ).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  }));
  const doughDelta = round(
    doughWeightTarget - getDoughWeight(scaledIngredients, recipeLookup, parentRecipeId)
  );
  const adjustmentId = getPreferredAdjustmentIngredientId(scaledIngredients);
  const reconciledIngredients =
    adjustmentId && doughDelta !== 0
      ? adjustIngredientQuantity(scaledIngredients, adjustmentId, doughDelta)
      : scaledIngredients;

  return recalculateBakerPercentagesFromQuantities(reconciledIngredients);
}

export function applyScaleByYield(
  ingredients: RecipeIngredient[],
  pieceCount: number,
  pieceWeight: number,
  recipeLookup?: RecipeLookup,
  parentRecipeId?: string
) {
  return recalculateBakerPercentagesFromQuantities(scaleByYield(
    ingredients,
    pieceCount,
    pieceWeight,
    recipeLookup,
    parentRecipeId
  ).map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.scaledQuantity
  })));
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

export function getRecipeSummary(
  recipe: Recipe,
  recipeLookup?: RecipeLookup
) {
  const basePercent = getBasePercent(recipe.ingredients);
  const baseQuantity = getTotalFlour(recipe.ingredients);
  const hydration = getHydrationPercentage(recipe.ingredients);
  const moistureIndex = getMoistureIndex(recipe.ingredients);
  const fats = getTotalFats(recipe.ingredients);
  const liquids = getTotalLiquids(recipe.ingredients);
  const doughWeight = getDoughWeight(recipe.ingredients, recipeLookup, recipe.id);

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
