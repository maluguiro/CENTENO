import {
  getDoughWeight,
  getHydrationPercentage,
  getMoistureIndex,
  getPrefermentBreakdown,
  getScaledDoughWeight,
  getTotalFats,
  getTotalFlour,
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

export function runBakerValidation() {
  runSimpleFormulaCase();
  runFatFormulaCase();
  runNoFlourCase();
  runScalingCase();
  runScaleByTotalFlourCase();
  runScaleByDoughWeightCase();
  runScaleByYieldCase();
  runPrefermentBreakdownCase();

  return "baker validation passed";
}

console.log(runBakerValidation());
