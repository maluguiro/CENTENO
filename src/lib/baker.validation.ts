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
  getPrimaryFlourQuantity,
  getPrefermentBreakdown,
  getQuantityFromBakerPercentage,
  getRecipeSummary,
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
import { moveIngredientInList } from "./recipeOrder";
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

function runSingleFlourPrefermentStillWorksCase() {
  const levain: Recipe = {
    id: "levain-single",
    name: "Levain simple",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("levain-flour", "Harina", 250, "flour", 100),
      ingredient("levain-water", "Agua", 250, "water", 100)
    ]
  };

  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 600, "flour", 100),
    ingredient("water", "Agua", 390, "water", 65),
    {
      ...ingredient("levain", "Levain simple", 600, "preferment", 100),
      linkedRecipeId: levain.id,
      linkedRecipeName: levain.name
    }
  ];

  const lookup = (recipeId: string) => (recipeId === levain.id ? levain : undefined);

  assertDeepEqual(
    getIngredientDisplayBreakdown(ingredients[0], ingredients, lookup, "single-flour"),
    {
      totalRequired: 600,
      contributed: 300,
      visibleQuantity: 300,
      detail: "[600 - 300]",
      warning: null
    }
  );

  assertDeepEqual(
    getIngredientDisplayBreakdown(ingredients[1], ingredients, lookup, "single-flour"),
    {
      totalRequired: 390,
      contributed: 300,
      visibleQuantity: 90,
      detail: "[390 - 300]",
      warning: null
    }
  );
}

function runMultiFlourPrefermentBreakdownCase() {
  const starter60: Recipe = {
    id: "starter-60",
    name: "Masa madre 60",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("starter-flour", "Harina", 309.4, "flour", 100),
      ingredient("starter-water", "Agua", 185.6, "water", 60)
    ]
  };

  const ingredients: RecipeIngredient[] = [
    ingredient("main-flour", "Harina", 1500, "flour", 100),
    ingredient("rye-flour", "Harina de centeno", 150, "flour", 10),
    ingredient("water", "Agua", 1155, "water", 70),
    {
      ...ingredient("starter", "Pasta madre", 495, "preferment", 30),
      linkedRecipeId: starter60.id,
      linkedRecipeName: starter60.name
    },
    ingredient("walnuts", "Nueces", 165, "other", 10),
    ingredient("honey", "Miel", 82.5, "sugar", 5),
    ingredient("salt", "Sal", 33, "salt", 2)
  ];

  const recipe: Recipe = {
    id: "lactal-centeno",
    name: "Lactal centeno y nueces",
    description: "",
    notes: "",
    useAsPreferment: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients
  };

  const lookup = (recipeId: string) => (recipeId === starter60.id ? starter60 : undefined);
  const composition = getRecipeComposition(recipe, lookup);
  const prefermentBreakdown = getPrefermentBreakdown(ingredients[3], lookup, recipe.id);

  assertDeepEqual(composition, {
    flour: 1650,
    liquids: 1155,
    doughWeight: 3085.5,
    hydration: 70
  });

  assertDeepEqual(prefermentBreakdown, {
    status: "resolved",
    linkedRecipeId: starter60.id,
    linkedRecipeName: starter60.name,
    originalFlour: 309.4,
    originalLiquids: 185.6,
    originalHydration: 60,
    originalWeight: 495,
    contributedFlour: 309.4,
    contributedLiquids: 185.6,
    contributedWeight: 495
  });

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[0], ingredients, lookup, recipe.id), {
    totalRequired: 1500,
    contributed: 309.4,
    visibleQuantity: 1190.6,
    detail: "[1500 - 309.4]",
    warning: null
  });

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[1], ingredients, lookup, recipe.id), {
    totalRequired: 150,
    contributed: 0,
    visibleQuantity: 150,
    detail: null,
    warning: null
  });

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[2], ingredients, lookup, recipe.id), {
    totalRequired: 1155,
    contributed: 185.6,
    visibleQuantity: 969.4,
    detail: "[1155 - 185.6]",
    warning: null
  });
}

function runMultiLiquidPrefermentBreakdownCase() {
  const preferment: Recipe = {
    id: "liquid-pref",
    name: "Prefermento liquido",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("pref-flour", "Harina", 200, "flour", 100),
      ingredient("pref-water", "Agua", 120, "water", 60)
    ]
  };

  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water-1", "Agua fria", 500, "water", 50),
    ingredient("water-2", "Agua extra", 100, "water", 10),
    {
      ...ingredient("pref", "Prefermento liquido", 320, "preferment", 32),
      linkedRecipeId: preferment.id,
      linkedRecipeName: preferment.name
    }
  ];

  const lookup = (recipeId: string) => (recipeId === preferment.id ? preferment : undefined);

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[1], ingredients, lookup, "multi-liquid"), {
    totalRequired: 500,
    contributed: 120,
    visibleQuantity: 380,
    detail: "[500 - 120]",
    warning: null
  });

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[2], ingredients, lookup, "multi-liquid"), {
    totalRequired: 100,
    contributed: 0,
    visibleQuantity: 100,
    detail: null,
    warning: null
  });
}

function runPrefermentHydrationVariantsCase() {
  const preferment100: Recipe = {
    id: "pref-100",
    name: "Poolish 100",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("pref100-flour", "Harina", 200, "flour", 100),
      ingredient("pref100-water", "Agua", 200, "water", 100)
    ]
  };

  const preferment60: Recipe = {
    id: "pref-60",
    name: "Masa madre 60",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("pref60-flour", "Harina", 250, "flour", 100),
      ingredient("pref60-water", "Agua", 150, "water", 60)
    ]
  };

  const lookup = (recipeId: string) => {
    if (recipeId === preferment100.id) {
      return preferment100;
    }

    if (recipeId === preferment60.id) {
      return preferment60;
    }

    return undefined;
  };

  assertDeepEqual(
    getPrefermentBreakdown(
      {
        ...ingredient("use-100", "Poolish 100", 400, "preferment", 40),
        linkedRecipeId: preferment100.id,
        linkedRecipeName: preferment100.name
      },
      lookup,
      "pref-hydration"
    ),
    {
      status: "resolved",
      linkedRecipeId: preferment100.id,
      linkedRecipeName: preferment100.name,
      originalFlour: 200,
      originalLiquids: 200,
      originalHydration: 100,
      originalWeight: 400,
      contributedFlour: 200,
      contributedLiquids: 200,
      contributedWeight: 400
    }
  );

  assertDeepEqual(
    getPrefermentBreakdown(
      {
        ...ingredient("use-60", "Masa madre 60", 200, "preferment", 20),
        linkedRecipeId: preferment60.id,
        linkedRecipeName: preferment60.name
      },
      lookup,
      "pref-hydration"
    ),
    {
      status: "resolved",
      linkedRecipeId: preferment60.id,
      linkedRecipeName: preferment60.name,
      originalFlour: 250,
      originalLiquids: 150,
      originalHydration: 60,
      originalWeight: 400,
      contributedFlour: 125,
      contributedLiquids: 75,
      contributedWeight: 200
    }
  );
}

function runPrefermentOverflowCase() {
  const preferment: Recipe = {
    id: "overflow-pref",
    name: "Prefermento intenso",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("overflow-flour", "Harina", 400, "flour", 100),
      ingredient("overflow-water", "Agua", 240, "water", 60)
    ]
  };

  const ingredients: RecipeIngredient[] = [
    ingredient("small-flour", "Harina principal", 300, "flour", 100),
    ingredient("water", "Agua", 500, "water", 166.7),
    {
      ...ingredient("overflow", "Prefermento intenso", 640, "preferment", 213.3),
      linkedRecipeId: preferment.id,
      linkedRecipeName: preferment.name
    }
  ];

  const lookup = (recipeId: string) => (recipeId === preferment.id ? preferment : undefined);

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[0], ingredients, lookup, "overflow"), {
    totalRequired: 300,
    contributed: 300,
    visibleQuantity: 0,
    detail: "[300 - 300]",
    warning: "El aporte del prefermento excede el ingrediente principal por 100 g"
  });
}

function runIngredientOrderStabilityCase() {
  const preferment: Recipe = {
    id: "order-pref",
    name: "Prefermento orden",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("order-pref-flour", "Harina", 150, "flour", 100),
      ingredient("order-pref-water", "Agua", 90, "water", 60)
    ]
  };

  const ordered: RecipeIngredient[] = [
    ingredient("flour-main", "Harina principal", 600, "flour", 100),
    ingredient("flour-secondary", "Harina integral", 200, "flour", 33.3),
    ingredient("water-main", "Agua", 520, "water", 86.7),
    {
      ...ingredient("pref", "Prefermento orden", 240, "preferment", 40),
      linkedRecipeId: preferment.id,
      linkedRecipeName: preferment.name
    },
    ingredient("salt", "Sal", 16, "salt", 2.7)
  ];

  const reordered: RecipeIngredient[] = [
    ordered[3],
    ordered[2],
    ordered[1],
    ordered[4],
    ordered[0]
  ];

  const lookup = (recipeId: string) => (recipeId === preferment.id ? preferment : undefined);
  const orderedRecipe: Recipe = {
    id: "ordered",
    name: "",
    description: "",
    notes: "",
    createdAt: "",
    updatedAt: "",
    ingredients: ordered
  };
  const reorderedRecipe: Recipe = {
    id: "reordered",
    name: "",
    description: "",
    notes: "",
    createdAt: "",
    updatedAt: "",
    ingredients: reordered
  };

  assertEqual(getRecipeComposition(orderedRecipe, lookup).flour, 800);
  assertEqual(getRecipeComposition(reorderedRecipe, lookup).flour, 800);
  assertEqual(getRecipeComposition(orderedRecipe, lookup).hydration, 65);
  assertEqual(getRecipeComposition(reorderedRecipe, lookup).hydration, 65);
  assertEqual(getRecipeComposition(orderedRecipe, lookup).doughWeight, 1336);
  assertEqual(getRecipeComposition(reorderedRecipe, lookup).doughWeight, 1336);
}

function runPrimaryFlourReorderStabilityCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour-base", "Harina base", 1000, "flour", 100),
    ingredient("flour-secondary", "Harina secundaria", 150, "flour", 15),
    ingredient("water", "Agua", 805, "water", 70),
    ingredient("salt", "Sal", 23, "salt", 2)
  ];

  const movedFlourDown = moveIngredientInList(ingredients, "flour-base", "down");
  assertDeepEqual(movedFlourDown, ingredients);

  const movedSecondaryUp = moveIngredientInList(ingredients, "flour-secondary", "up");
  assertDeepEqual(movedSecondaryUp, ingredients);

  const movedWaterUp = moveIngredientInList(ingredients, "water", "up");
  assertDeepEqual(
    movedWaterUp.map((ingredient) => ingredient.id),
    ["flour-base", "water", "flour-secondary", "salt"]
  );

  const movedSaltUp = moveIngredientInList(ingredients, "salt", "up");
  assertDeepEqual(
    movedSaltUp.map((ingredient) => ingredient.id),
    ["flour-base", "flour-secondary", "salt", "water"]
  );

  assertEqual(getTotalFlour(movedSaltUp), 1150);
  assertEqual(getTotalLiquids(movedSaltUp), 805);
  assertEqual(getDoughWeight(movedSaltUp), 1978);
  assertEqual(getHydrationPercentage(movedSaltUp), 70);

  const renamedBase = [
    {
      ...ingredients[0],
      name: "Harina integral"
    },
    ...ingredients.slice(1)
  ];

  assertEqual(getPrimaryFlourQuantity(renamedBase), 1000);
  assertEqual(
    recalculateBakerPercentagesFromQuantities(renamedBase).find((ingredient) => ingredient.id === "flour-base")
      ?.bakerPercentage,
    100
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
  assertEqual(recalculated.find((item) => item.id === "flour-1")?.bakerPercentage, 100);
  assertEqual(recalculated.find((item) => item.id === "flour-2")?.bakerPercentage, 40);
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

  assertEqual(getTotalFlour(rebalanced), 980);
  assertEqual(rebalanced.find((item) => item.id === "flour-1")?.bakerPercentage, 100);
  assertEqual(rebalanced.find((item) => item.id === "flour-1")?.quantity, 700);
  assertEqual(rebalanced.find((item) => item.id === "flour-2")?.bakerPercentage, 40);
  assertEqual(rebalanced.find((item) => item.id === "flour-2")?.quantity, 280);
  assertEqual(rebalanced.find((item) => item.id === "water")?.quantity, 650);
  assertEqual(rebalanced.find((item) => item.id === "salt")?.quantity, 20);
  assertEqual(rebalanced.find((item) => item.id === "water")?.bakerPercentage, 66.3);
  assertEqual(rebalanced.find((item) => item.id === "salt")?.bakerPercentage, 2);
}

function runTwoFloursWithoutPrefermentCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour-main", "Harina principal", 1000, "flour", 100),
    ingredient("flour-whole", "Harina integral", 200, "flour", 20),
    ingredient("water", "Agua", 840, "water", 70)
  ];

  assertEqual(getPrimaryFlourQuantity(ingredients), 1000);
  assertEqual(getTotalFlour(ingredients), 1200);
  assertEqual(getTotalLiquids(ingredients), 840);
  assertEqual(getHydrationPercentage(ingredients), 70);
  assertEqual(getDoughWeight(ingredients), 2040);
}

function runTwoFloursPrefermentCase() {
  const preferment: Recipe = {
    id: "two-flour-pref",
    name: "Poolish 100",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("pref-flour", "Harina", 200, "flour", 100),
      ingredient("pref-water", "Agua", 200, "water", 100)
    ]
  };

  const ingredients: RecipeIngredient[] = [
    ingredient("flour-main", "Harina principal", 1000, "flour", 100),
    ingredient("flour-secondary", "Harina integral", 200, "flour", 20),
    ingredient("water", "Agua", 840, "water", 70),
    {
      ...ingredient("pref", "Poolish 100", 400, "preferment", 33.3),
      linkedRecipeId: preferment.id,
      linkedRecipeName: preferment.name
    }
  ];

  const lookup = (recipeId: string) => (recipeId === preferment.id ? preferment : undefined);

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[0], ingredients, lookup, "two-flour"), {
    totalRequired: 1000,
    contributed: 200,
    visibleQuantity: 800,
    detail: "[1000 - 200]",
    warning: null
  });

  assertDeepEqual(getIngredientDisplayBreakdown(ingredients[1], ingredients, lookup, "two-flour"), {
    totalRequired: 200,
    contributed: 0,
    visibleQuantity: 200,
    detail: null,
    warning: null
  });
}

function runScalingMultiFlourCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour-main", "Harina principal", 1000, "flour", 100),
    ingredient("flour-secondary", "Harina integral", 200, "flour", 20),
    ingredient("water", "Agua", 840, "water", 70),
    ingredient("salt", "Sal", 24, "salt", 2)
  ];

  const byFlour = applyScaleByTotalFlour(ingredients, 1800);
  assertEqual(getPrimaryFlourQuantity(byFlour), 1500);
  assertEqual(byFlour.find((item) => item.id === "flour-secondary")?.quantity, 300);
  assertEqual(byFlour.find((item) => item.id === "water")?.quantity, 1260);
  assertEqual(getTotalFlour(byFlour), 1800);
  assertEqual(getDoughWeight(byFlour), 3096);

  const scalingTarget = {
    mode: "doughWeight" as const,
    doughWeight: 2580
  };
  const byTarget = applyScalingTarget(ingredients, scalingTarget);

  assertEqual(getDoughWeight(byTarget), 2580);
  assertEqual(getTotalFlour(byTarget), 1500);
  assertEqual(getPrimaryFlourQuantity(byTarget), 1250);
  assertEqual(byTarget.find((item) => item.id === "flour-secondary")?.quantity, 250);
  assertEqual(byTarget.find((item) => item.id === "water")?.quantity, 1050);
  assertEqual(byTarget.find((item) => item.id === "flour-secondary")?.bakerPercentage, 20);
  assertEqual(byTarget.find((item) => item.id === "water")?.bakerPercentage, 70);
}

function runRecipeSummaryCase() {
  const starter60: Recipe = {
    id: "summary-starter-60",
    name: "Masa madre 60",
    description: "",
    notes: "",
    useAsPreferment: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("starter-flour", "Harina", 309.4, "flour", 100),
      ingredient("starter-water", "Agua", 185.6, "water", 60)
    ]
  };

  const lactal: Recipe = {
    id: "summary-lactal",
    name: "Lactal centeno y nueces",
    description: "",
    notes: "",
    useAsPreferment: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("main-flour", "Harina", 1500, "flour", 100),
      ingredient("rye-flour", "Harina de centeno", 150, "flour", 10),
      ingredient("water", "Agua", 1155, "water", 70),
      {
        ...ingredient("starter", "Pasta madre", 495, "preferment", 30),
        linkedRecipeId: starter60.id,
        linkedRecipeName: starter60.name
      },
      ingredient("walnuts", "Nueces", 165, "other", 10),
      ingredient("honey", "Miel", 82.5, "sugar", 5),
      ingredient("salt", "Sal", 33, "salt", 2)
    ]
  };

  const simple: Recipe = {
    id: "summary-simple",
    name: "Simple",
    description: "",
    notes: "",
    useAsPreferment: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("flour", "Harina", 1000, "flour", 100),
      ingredient("water", "Agua", 650, "water", 65),
      ingredient("salt", "Sal", 20, "salt", 2),
      ingredient("yeast", "Levadura", 10, "yeast", 1)
    ]
  };

  const poolish100: Recipe = {
    id: "summary-poolish-100",
    name: "Poolish 100",
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

  const focaccia: Recipe = {
    id: "summary-focaccia",
    name: "Focaccia",
    description: "",
    notes: "",
    useAsPreferment: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: [
      ingredient("flour", "Harina", 600, "flour", 100),
      ingredient("water", "Agua", 390, "water", 65),
      {
        ...ingredient("poolish", "Poolish 100", 600, "preferment", 50),
        linkedRecipeId: poolish100.id,
        linkedRecipeName: poolish100.name
      },
      ingredient("oil", "Aceite", 30, "fat", 5),
      ingredient("salt", "Sal", 12, "salt", 2)
    ]
  };

  const lookup = (recipeId: string) => {
    if (recipeId === starter60.id) {
      return starter60;
    }

    if (recipeId === poolish100.id) {
      return poolish100;
    }

    return undefined;
  };

  assertEqual(getRecipeSummary(lactal, lookup).doughWeight, 3085.5);
  assertEqual(getRecipeSummary(lactal).doughWeight, 3580.5);
  assertEqual(getRecipeSummary(simple).doughWeight, 1680);
  assertEqual(getRecipeSummary(focaccia, lookup).doughWeight, 1032);
  assertEqual(getRecipeSummary(focaccia).doughWeight, 1632);

  const missingPrefermentRecipe: Recipe = {
    ...focaccia,
    id: "summary-missing-pref",
    ingredients: focaccia.ingredients.map((ingredient) =>
      ingredient.id === "poolish"
        ? {
            ...ingredient,
            linkedRecipeId: "missing-pref",
            linkedRecipeName: "Falta"
          }
        : ingredient
    )
  };

  assertEqual(getRecipeSummary(missingPrefermentRecipe, lookup).doughWeight, 1632);
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
  runSingleFlourPrefermentStillWorksCase();
  runMultiFlourPrefermentBreakdownCase();
  runMultiLiquidPrefermentBreakdownCase();
  runPrefermentHydrationVariantsCase();
  runPrefermentOverflowCase();
  runIngredientOrderStabilityCase();
  runPrimaryFlourReorderStabilityCase();
  runBaseRecipeCase();
  runAdjustPercentageCase();
  runDecimalParsingCase();
  runAppliedScalingCases();
  runActiveScalingTargetCase();
  runMultipleFloursCase();
  runMultipleFloursRebalanceCase();
  runTwoFloursWithoutPrefermentCase();
  runTwoFloursPrefermentCase();
  runScalingMultiFlourCase();
  runRecipeSummaryCase();

  return "baker validation passed";
}

console.log(runBakerValidation());
