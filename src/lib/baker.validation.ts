import {
  applyScalingTarget,
  applyScaleByTotalFlour,
  applyScaleByYield,
  parseDecimalInput,
  getBakerPercentageFromQuantity,
  getDoughWeight,
  getHydrationPercentage,
  getIngredientDisplayBreakdown,
  getMoistureIndex,
  getPrefermentBreakdown,
  getQuantityFromBakerPercentage,
  rebalanceFlourBlendPercentages,
  recalculateBakerPercentagesFromQuantities,
  getScaledDoughWeight,
  getTotalFats,
  getTotalFlour,
  getTotalLiquids,
  getRecipeComposition,
  scaleByDoughWeight,
  scaleByTotalFlour,
  scaleByYield,
  scaleIngredients
} from "./baker";
import type { Recipe, RecipeIngredient } from "../types/recipe";

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)} but received ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown) {
  const actualSerialized = JSON.stringify(actual);
  const expectedSerialized = JSON.stringify(expected);

  if (actualSerialized !== expectedSerialized) {
    throw new Error(`Expected ${expectedSerialized} but received ${actualSerialized}`);
  }
}

function ingredient(
  id: string,
  name: string,
  quantity: number,
  role: RecipeIngredient["role"],
  bakerPercentage: number
): RecipeIngredient {
  return {
    id,
    name,
    quantity,
    unit: "g",
    role,
    bakerPercentage
  };
}

function runSimpleFormulaCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 700, "water", 70),
    ingredient("salt", "Sal", 20, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 1)
  ];

  assertEqual(getTotalFlour(ingredients), 1000);
  assertEqual(getHydrationPercentage(ingredients), 70);
  assertEqual(getDoughWeight(ingredients), 1730);
}

function runFatFormulaCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 750, "water", 75),
    ingredient("oil", "Aceite", 80, "fat", 8),
    ingredient("salt", "Sal", 20, "salt", 2)
  ];

  assertEqual(getHydrationPercentage(ingredients), 75);
  assertEqual(getTotalFats(ingredients), 80);
  assertEqual(getDoughWeight(ingredients), 1850);
  assertEqual(getMoistureIndex(ingredients), 83);
}

function runNoFlourCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("water", "Agua", 500, "water", 100),
    ingredient("salt", "Sal", 10, "salt", 2)
  ];

  assertEqual(getTotalFlour(ingredients), 0);
  assertEqual(getHydrationPercentage(ingredients), 0);
  assertEqual(getMoistureIndex(ingredients), 0);
  assertDeepEqual(
    scaleIngredients(ingredients, 1000).map((ingredient) => ingredient.scaledQuantity),
    [0, 0]
  );
}

function runScalingCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 700, "water", 70),
    ingredient("salt", "Sal", 20, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 1)
  ];

  const scaled = scaleIngredients(ingredients, 2000);

  assertDeepEqual(
    scaled.map((ingredient) => ingredient.scaledQuantity),
    [2000, 1400, 40, 20]
  );
  assertEqual(getScaledDoughWeight(ingredients, 2000), 3460);
}

function runScaleByTotalFlourCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 700, "water", 70),
    ingredient("salt", "Sal", 20, "salt", 2)
  ];

  const scaled = scaleByTotalFlour(ingredients, 1500);

  assertDeepEqual(
    scaled.map((ingredient) => ingredient.scaledQuantity),
    [1500, 1050, 30]
  );
}

function runScaleByDoughWeightCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 700, "water", 70),
    ingredient("salt", "Sal", 20, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 1)
  ];

  const scaled = scaleByDoughWeight(ingredients, 3460);

  assertDeepEqual(
    scaled.map((ingredient) => ingredient.scaledQuantity),
    [2000, 1400, 40, 20]
  );
}

function runScaleByYieldCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 700, "water", 70),
    ingredient("salt", "Sal", 20, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 1)
  ];

  const scaled = scaleByYield(ingredients, 10, 346);

  assertDeepEqual(
    scaled.map((ingredient) => ingredient.scaledQuantity),
    [2000, 1400, 40, 20]
  );
}

function runPrefermentBreakdownCase() {
  const poolish: Recipe = {
    id: "poolish",
    name: "Poolish focaccia",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("poolish-flour", "Harina", 500, "flour", 100),
      ingredient("poolish-water", "Agua", 500, "water", 100)
    ]
  };

  const focacciaPreferment = {
    ...ingredient("pref", "Poolish focaccia", 800, "preferment", 80),
    linkedRecipeId: poolish.id,
    linkedRecipeName: poolish.name
  };

  const lookup = (recipeId: string) => (recipeId === poolish.id ? poolish : undefined);

  assertDeepEqual(getRecipeComposition(poolish, lookup), {
    flour: 500,
    liquids: 500,
    doughWeight: 1000,
    hydration: 100
  });

  assertDeepEqual(getPrefermentBreakdown(focacciaPreferment, lookup, "focaccia"), {
    status: "resolved",
    linkedRecipeId: "poolish",
    linkedRecipeName: "Poolish focaccia",
    originalFlour: 500,
    originalLiquids: 500,
    originalHydration: 100,
    originalWeight: 1000,
    contributedFlour: 400,
    contributedLiquids: 400,
    contributedWeight: 800
  });
}

function runPrefermentVisibleIngredientsCase() {
  const poolish: Recipe = {
    id: "poolish-600",
    name: "Poolish focaccia",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("poolish-flour", "Harina", 300, "flour", 100),
      ingredient("poolish-water", "Agua", 300, "water", 100)
    ]
  };

  const focacciaIngredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 600, "flour", 100),
    ingredient("water", "Agua", 390, "water", 65),
    {
      ...ingredient("poolish", "Poolish focaccia", 600, "preferment", 100),
      linkedRecipeId: poolish.id,
      linkedRecipeName: poolish.name
    },
    ingredient("oil", "Aceite", 30, "fat", 5),
    ingredient("salt", "Sal", 12, "salt", 2)
  ];

  const lookup = (recipeId: string) => (recipeId === poolish.id ? poolish : undefined);

  assertEqual(getHydrationPercentage(focacciaIngredients), 65);
  assertEqual(getTotalFlour(focacciaIngredients), 600);
  assertEqual(getTotalLiquids(focacciaIngredients), 390);

  assertDeepEqual(
    getIngredientDisplayBreakdown(focacciaIngredients[0], focacciaIngredients, lookup, "focaccia"),
    {
      totalRequired: 600,
      contributed: 300,
      visibleQuantity: 300,
      detail: "[600 - 300]",
      warning: null
    }
  );

  assertDeepEqual(
    getIngredientDisplayBreakdown(focacciaIngredients[1], focacciaIngredients, lookup, "focaccia"),
    {
      totalRequired: 390,
      contributed: 300,
      visibleQuantity: 90,
      detail: "[390 - 300]",
      warning: null
    }
  );
}

function runBaseRecipeCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 500, "flour", 100),
    ingredient("water", "Agua", 300, "water", 60),
    ingredient("salt", "Sal", 10, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 2)
  ];

  assertEqual(getQuantityFromBakerPercentage(500, 60), 300);
  assertEqual(getQuantityFromBakerPercentage(500, 2), 10);
  assertEqual(getHydrationPercentage(ingredients), 60);
  assertEqual(getDoughWeight(ingredients), 820);
}

function runAdjustPercentageCase() {
  const flourTotal = 1000;

  assertEqual(getQuantityFromBakerPercentage(flourTotal, 75), 750);
  assertEqual(getQuantityFromBakerPercentage(flourTotal, 2.5), 25);
  assertEqual(getBakerPercentageFromQuantity(25, flourTotal), 2.5);
}

function runDecimalParsingCase() {
  assertEqual(parseDecimalInput("2,5"), 2.5);
  assertEqual(parseDecimalInput("2.5"), 2.5);
  assertEqual(parseDecimalInput("17,6"), 17.6);
}

function runAppliedScalingCases() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 500, "flour", 100),
    ingredient("water", "Agua", 300, "water", 60),
    ingredient("salt", "Sal", 10, "salt", 2),
    ingredient("yeast", "Levadura", 10, "yeast", 2)
  ];

  const flourScaled = applyScaleByTotalFlour(ingredients, 1000);

  assertDeepEqual(
    flourScaled.map((ingredient) => ingredient.quantity),
    [1000, 600, 20, 20]
  );

  const yieldScaled = applyScaleByYield(ingredients, 10, 200);
  assertEqual(getDoughWeight(yieldScaled), 2000);
}

function runActiveScalingTargetCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 500, "flour", 100),
    ingredient("water", "Agua", 300, "water", 60),
    ingredient("salt", "Sal", 10, "salt", 2)
  ];

  const scalingTarget = {
    mode: "pieces" as const,
    pieces: 2,
    pieceWeight: 900,
    doughWeight: 1800
  };

  const scaled = applyScalingTarget(ingredients, scalingTarget);
  assertEqual(getDoughWeight(scaled), 1800);

  const withOil = [
    ...scaled,
    ingredient(
      "oil",
      "Aceite",
      getQuantityFromBakerPercentage(getTotalFlour(scaled), 5),
      "fat",
      5
    )
  ];
  const reapplied = applyScalingTarget(withOil, scalingTarget);
  const freed = applyScalingTarget(withOil, undefined);

  assertEqual(getDoughWeight(reapplied), 1800);
  assertEqual(reapplied.find((item) => item.id === "oil")?.bakerPercentage, 5);
  assertEqual(getDoughWeight(freed), getDoughWeight(withOil));
  assertEqual(
    freed.some((item) => item.id === "oil" && item.quantity > 0),
    true
  );
  assertEqual(getDoughWeight(freed) !== 1800, true);
}

function runMultipleFloursCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour-1", "Harina 000", 500, "flour", 100),
    ingredient("flour-2", "Harina integral", 200, "flour", 40),
    ingredient("water", "Agua", 390, "water", 78),
    ingredient("salt", "Sal", 14, "salt", 2.8)
  ];

  const recalculated = recalculateBakerPercentagesFromQuantities(ingredients);

  assertEqual(getTotalFlour(recalculated), 700);
  assertEqual(recalculated.find((item) => item.id === "flour-1")?.bakerPercentage, 71.4);
  assertEqual(recalculated.find((item) => item.id === "flour-2")?.bakerPercentage, 28.6);
  assertEqual(recalculated.find((item) => item.id === "water")?.bakerPercentage, 55.7);
  assertEqual(recalculated.find((item) => item.id === "salt")?.bakerPercentage, 2);
}

function runMultipleFloursRebalanceCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour-1", "Harina 000", 700, "flour", 70),
    ingredient("flour-2", "Harina integral", 300, "flour", 30),
    ingredient("water", "Agua", 650, "water", 65),
    ingredient("salt", "Sal", 20, "salt", 2)
  ];

  const rebalanced = rebalanceFlourBlendPercentages(ingredients, "flour-2", 40);

  assertEqual(getTotalFlour(rebalanced), 1000);
  assertEqual(rebalanced.find((item) => item.id === "flour-1")?.bakerPercentage, 60);
  assertEqual(rebalanced.find((item) => item.id === "flour-1")?.quantity, 600);
  assertEqual(rebalanced.find((item) => item.id === "flour-2")?.bakerPercentage, 40);
  assertEqual(rebalanced.find((item) => item.id === "flour-2")?.quantity, 400);
  assertEqual(rebalanced.find((item) => item.id === "water")?.quantity, 650);
  assertEqual(rebalanced.find((item) => item.id === "salt")?.quantity, 20);
}

export function runBakerValidation() {
  runSimpleFormulaCase();
  runFatFormulaCase();
  runNoFlourCase();
  runScalingCase();
  runScaleByTotalFlourCase();
  runScaleByDoughWeightCase();
  runScaleByYieldCase();
  runPrefermentBreakdownCase();
  runPrefermentVisibleIngredientsCase();
  runBaseRecipeCase();
  runAdjustPercentageCase();
  runDecimalParsingCase();
  runAppliedScalingCases();
  runActiveScalingTargetCase();
  runMultipleFloursCase();
  runMultipleFloursRebalanceCase();

  return "baker validation passed";
}

console.log(runBakerValidation());
