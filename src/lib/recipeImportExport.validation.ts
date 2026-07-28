import {
  exportRecipeToJson,
  parseImportedRecipe,
  prepareImportedRecipe
} from "@/lib/recipeImportExport";
import { buildCentenoFileName } from "@/lib/recipeFileShare";
import { moveIngredientInList } from "@/lib/recipeOrder";
import { formatRecipeAsShareText } from "@/lib/recipeShareText";
import { sampleRecipes } from "@/data/sampleRecipes";
import { mergeMissingSampleRecipes } from "@/store/RecipesProvider";
import type { Recipe } from "@/types/recipe";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => void, message: string) {
  let threw = false;

  try {
    fn();
  } catch {
    threw = true;
  }

  assert(threw, message);
}

const baseRecipe: Recipe = {
  id: "recipe-1",
  name: "Pan de campo",
  description: "Receta de prueba",
  notes: "Notas",
  category: "bakery",
  useAsPreferment: false,
  scalingTarget: {
    mode: "pieces",
    pieces: 2,
    pieceWeight: 900,
    doughWeight: 1800
  },
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
  ingredients: [
    {
      id: "flour-1",
      name: "Harina",
      quantity: 500,
      unit: "g",
      role: "flour",
      bakerPercentage: 100
    },
    {
      id: "water-1",
      name: "Agua",
      quantity: 300,
      unit: "g",
      role: "water",
      bakerPercentage: 60
    }
  ]
};

function runRecipeValidation() {
  const exported = exportRecipeToJson(baseRecipe);
  const parsedPayload = JSON.parse(exported) as { type: string; version: number; recipe: Recipe };

  assert(parsedPayload.type === "centeno.recipe", "Export type invalido.");
  assert(parsedPayload.version === 1, "Export version invalida.");

  const imported = parseImportedRecipe(exported);
  assert(imported.name === baseRecipe.name, "Import no conserva el nombre.");
  assert(imported.ingredients.length === 2, "Import no conserva ingredientes.");
  assert(imported.useAsPreferment === false, "Import no conserva useAsPreferment.");
  assert(imported.scalingTarget?.mode === "pieces", "Import no conserva scalingTarget.");
  assert(imported.scalingTarget?.pieces === 2, "Import no conserva piezas.");
  assert(
    buildCentenoFileName("Focaccia") === "Focaccia.centeno",
    "El nombre simple debe conservarse."
  );
  assert(
    buildCentenoFileName("Pan de campo") === "Pan-de-campo.centeno",
    "Los espacios deben sanitizarse."
  );
  assert(
    buildCentenoFileName("Receta / rara : test") === "Receta-rara-test.centeno",
    "Los caracteres invalidos deben sanitizarse."
  );
  assert(
    buildCentenoFileName("") === "receta-centeno.centeno",
    "El nombre vacio debe usar fallback."
  );

  const shareText = formatRecipeAsShareText(baseRecipe, [baseRecipe]);
  assert(shareText.length > 0, "El texto compartible no debe estar vacio.");
  assert(shareText.includes("Pan de campo"), "El texto debe incluir el nombre.");
  assert(shareText.includes("Ingredientes:"), "El texto debe incluir ingredientes.");
  assert(shareText.includes("500 g"), "El texto debe incluir gramos.");
  assert(shareText.includes("Hidratacion: 60%"), "El texto debe incluir hidratacion.");
  assert(!shareText.includes('"type": "centeno.recipe"'), "El texto legible no debe ser JSON.");
  assertThrows(
    () => parseImportedRecipe(shareText),
    "El texto legible no debe importarse como codigo."
  );

  const missingCategoryJson = JSON.stringify({
    type: "centeno.recipe",
    version: 1,
    exportedAt: "2026-07-17T10:00:00.000Z",
    recipe: {
      ...baseRecipe,
      category: undefined
    }
  });
  const missingCategoryRecipe = parseImportedRecipe(missingCategoryJson);
  assert(missingCategoryRecipe.category === "bakery", "Category por defecto incorrecta.");
  assert(
    missingCategoryRecipe.useAsPreferment === false,
    "useAsPreferment por defecto incorrecto."
  );

  assertThrows(() => parseImportedRecipe("no es json"), "JSON invalido debe fallar.");
  assertThrows(
    () =>
      parseImportedRecipe(
        JSON.stringify({ type: "otro.tipo", version: 1, recipe: baseRecipe })
      ),
    "Type invalido debe fallar."
  );
  assertThrows(
    () =>
      parseImportedRecipe(
        JSON.stringify({ type: "centeno.recipe", version: 2, recipe: baseRecipe })
      ),
    "Version invalida debe fallar."
  );

  const prepared = prepareImportedRecipe(baseRecipe, [baseRecipe]);
  assert(prepared.id !== baseRecipe.id, "La receta importada debe tener nuevo id.");
  assert(prepared.ingredients.length === baseRecipe.ingredients.length, "Debe conservar ingredientes.");
  assert(
    prepared.ingredients[0].id !== baseRecipe.ingredients[0].id,
    "Los ingredientes importados deben tener nuevos ids."
  );
  assert(
    prepared.name === "Pan de campo (importada)",
    "El primer duplicado debe usar sufijo importada."
  );

  const preparedTwice = prepareImportedRecipe(baseRecipe, [baseRecipe, prepared]);
  assert(
    preparedTwice.name === "Pan de campo (importada 2)",
    "El segundo duplicado debe usar sufijo importada 2."
  );

  const orderedRecipe: Recipe = {
    ...baseRecipe,
    ingredients: [
      {
        id: "water-1",
        name: "Agua",
        quantity: 300,
        unit: "g",
        role: "water",
        bakerPercentage: 60
      },
      {
        id: "flour-1",
        name: "Harina",
        quantity: 500,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "salt-1",
        name: "Sal",
        quantity: 10,
        unit: "g",
        role: "salt",
        bakerPercentage: 2
      }
    ]
  };

  const movedUp = moveIngredientInList(orderedRecipe.ingredients, "flour-1", "up");
  assert(
    movedUp.map((ingredient) => ingredient.id).join(",") === "flour-1,water-1,salt-1",
    "Mover hacia arriba debe intercambiar posiciones."
  );
  assert(
    movedUp[0].quantity === 500 && movedUp[0].bakerPercentage === 100,
    "Mover no debe cambiar cantidades ni porcentajes."
  );

  const firstUp = moveIngredientInList(orderedRecipe.ingredients, "water-1", "up");
  assert(
    firstUp.map((ingredient) => ingredient.id).join(",") === "water-1,flour-1,salt-1",
    "Mover el primero hacia arriba no debe cambiar nada."
  );

  const movedDown = moveIngredientInList(orderedRecipe.ingredients, "flour-1", "down");
  assert(
    movedDown.map((ingredient) => ingredient.id).join(",") === "water-1,salt-1,flour-1",
    "Mover hacia abajo debe intercambiar posiciones."
  );

  const lastDown = moveIngredientInList(orderedRecipe.ingredients, "salt-1", "down");
  assert(
    lastDown.map((ingredient) => ingredient.id).join(",") === "water-1,flour-1,salt-1",
    "Mover el ultimo hacia abajo no debe cambiar nada."
  );

  const exportedOrdered = exportRecipeToJson(orderedRecipe);
  const importedOrdered = parseImportedRecipe(exportedOrdered);
  assert(
    importedOrdered.ingredients.map((ingredient) => ingredient.id).join(",") ===
      "water-1,flour-1,salt-1",
    "Exportar e importar debe conservar el orden de ingredientes."
  );

  const mergedSamples = mergeMissingSampleRecipes([baseRecipe], sampleRecipes);
  assert(
    mergedSamples.length === 2,
    "Restaurar samples debe agregar las recetas faltantes."
  );

  const mergedAgain = mergeMissingSampleRecipes(mergedSamples, sampleRecipes);
  assert(
    mergedAgain.length === mergedSamples.length,
    "Restaurar samples no debe duplicar recetas existentes."
  );

  console.log("recipe import/export validation passed");
}

runRecipeValidation();
