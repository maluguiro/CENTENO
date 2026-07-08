import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  getDoughWeight,
  getHydrationPercentage,
  getMoistureIndex,
  getScaledDoughWeight,
  getTotalFats,
  getTotalFlour,
  scaleIngredients
} from "./baker";
import type { RecipeIngredient } from "../types/recipe";

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

  assert.equal(getTotalFlour(ingredients), 1000);
  assert.equal(getHydrationPercentage(ingredients), 70);
  assert.equal(getDoughWeight(ingredients), 1730);
}

function runFatFormulaCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("flour", "Harina", 1000, "flour", 100),
    ingredient("water", "Agua", 750, "water", 75),
    ingredient("oil", "Aceite", 80, "fat", 8),
    ingredient("salt", "Sal", 20, "salt", 2)
  ];

  assert.equal(getHydrationPercentage(ingredients), 75);
  assert.equal(getTotalFats(ingredients), 80);
  assert.equal(getDoughWeight(ingredients), 1850);
  assert.equal(getMoistureIndex(ingredients), 83);
}

function runNoFlourCase() {
  const ingredients: RecipeIngredient[] = [
    ingredient("water", "Agua", 500, "water", 100),
    ingredient("salt", "Sal", 10, "salt", 2)
  ];

  assert.equal(getTotalFlour(ingredients), 0);
  assert.equal(getHydrationPercentage(ingredients), 0);
  assert.equal(getMoistureIndex(ingredients), 0);
  assert.deepEqual(
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

  assert.deepEqual(
    scaled.map((ingredient) => ingredient.scaledQuantity),
    [2000, 1400, 40, 20]
  );
  assert.equal(getScaledDoughWeight(ingredients, 2000), 3460);
}

export function runBakerValidation() {
  runSimpleFormulaCase();
  runFatFormulaCase();
  runNoFlourCase();
  runScalingCase();

  return "baker validation passed";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(runBakerValidation());
}
