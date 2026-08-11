import {
  getDoughWeight,
  getHydrationPercentage,
  getPrefermentBreakdown,
  getRecipeSummary
} from "@/lib/baker";
import {
  exportRecipeToJson,
  exportRecipesToJson,
  importRecipesFromJson,
  isRecipeBackupPayload,
  parseImportedCentenoFile,
  parseImportedRecipe,
  parseImportedRecipesBackup,
  prepareImportedRecipe
} from "@/lib/recipeImportExport";
import { buildCentenoBackupFileName, buildCentenoFileName } from "@/lib/recipeFileShare";
import { canMoveIngredient, getPrimaryFlourIndex, moveIngredientInList } from "@/lib/recipeOrder";
import { formatRecipeAsShareText } from "@/lib/recipeShareText";
import { sampleRecipes } from "@/data/sampleRecipes";
import { mergeMissingSampleRecipes } from "@/store/RecipesProvider";
import type { Recipe } from "@/types/recipe";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertApprox(actual: number, expected: number, message: string, tolerance = 0.1) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message} Esperado ${expected}, recibido ${actual}.`);
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

const prefermentRecipe: Recipe = {
  id: "preferment-1",
  name: "Masa madre 60",
  description: "",
  notes: "",
  category: "bakery",
  useAsPreferment: true,
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
  ingredients: [
    {
      id: "pref-flour",
      name: "Harina",
      quantity: 1000,
      unit: "g",
      role: "flour",
      bakerPercentage: 100
    },
    {
      id: "pref-water",
      name: "Agua",
      quantity: 600,
      unit: "g",
      role: "water",
      bakerPercentage: 60
    }
  ]
};

const parentRecipe: Recipe = {
  id: "recipe-parent",
  name: "Lactal centeno y nueces",
  description: "",
  notes: "",
  category: "bakery",
  useAsPreferment: false,
  scalingTarget: {
    mode: "doughWeight",
    doughWeight: 3085.5
  },
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
  ingredients: [
    {
      id: "flour-main",
      name: "Harina",
      quantity: 1500,
      unit: "g",
      role: "flour",
      bakerPercentage: 100
    },
    {
      id: "flour-rye",
      name: "Harina de centeno",
      quantity: 150,
      unit: "g",
      role: "flour",
      bakerPercentage: 10
    },
    {
      id: "water-main",
      name: "Agua",
      quantity: 1155,
      unit: "g",
      role: "water",
      bakerPercentage: 70
    },
    {
      id: "preferment-link",
      name: "Pasta madre",
      quantity: 495,
      unit: "g",
      role: "preferment",
      bakerPercentage: 30,
      linkedRecipeId: "preferment-1",
      linkedRecipeName: "Masa madre 60"
    },
    {
      id: "nuts-1",
      name: "Nueces",
      quantity: 165,
      unit: "g",
      role: "other",
      bakerPercentage: 10
    },
    {
      id: "honey-1",
      name: "Miel",
      quantity: 82.5,
      unit: "g",
      role: "sugar",
      bakerPercentage: 5
    },
    {
      id: "salt-1",
      name: "Sal",
      quantity: 33,
      unit: "g",
      role: "salt",
      bakerPercentage: 2
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
  assert(
    buildCentenoBackupFileName(new Date("2026-08-10T15:00:00.000Z")) ===
      "centeno-recetas-2026-08-10.centeno",
    "El nombre del backup debe incluir la fecha."
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
  assert(
    prepared.ingredients.length === baseRecipe.ingredients.length,
    "Debe conservar ingredientes."
  );
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
    "La harina principal debe poder subir hasta quedar como primera."
  );
  assert(
    movedUp[0].quantity === 500 && movedUp[0].bakerPercentage === 100,
    "Mover no debe cambiar cantidades ni porcentajes."
  );
  assert(
    getPrimaryFlourIndex(movedUp) === 0,
    "La harina principal debe detectarse correctamente tras subir."
  );

  const firstUp = moveIngredientInList(orderedRecipe.ingredients, "water-1", "up");
  assert(
    firstUp.map((ingredient) => ingredient.id).join(",") === "water-1,flour-1,salt-1",
    "Mover el primero hacia arriba no debe cambiar nada."
  );
  assert(
    canMoveIngredient(movedUp, "water-1", "up") === false,
    "Ningun ingrediente debe poder subir por encima de la harina principal."
  );

  const movedDown = moveIngredientInList(orderedRecipe.ingredients, "flour-1", "down");
  assert(
    movedDown.map((ingredient) => ingredient.id).join(",") === "water-1,flour-1,salt-1",
    "La harina principal no debe poder bajar."
  );

  const lastDown = moveIngredientInList(orderedRecipe.ingredients, "salt-1", "down");
  assert(
    lastDown.map((ingredient) => ingredient.id).join(",") === "water-1,flour-1,salt-1",
    "Mover el ultimo hacia abajo no debe cambiar nada."
  );

  const multiFlourRecipe: Recipe = {
    ...baseRecipe,
    ingredients: [
      {
        id: "flour-base",
        name: "Base",
        quantity: 1000,
        unit: "g",
        role: "flour",
        bakerPercentage: 100
      },
      {
        id: "flour-secondary",
        name: "Secundaria",
        quantity: 150,
        unit: "g",
        role: "flour",
        bakerPercentage: 15
      },
      {
        id: "water-main",
        name: "Agua",
        quantity: 805,
        unit: "g",
        role: "water",
        bakerPercentage: 70
      },
      {
        id: "salt-main",
        name: "Sal",
        quantity: 23,
        unit: "g",
        role: "salt",
        bakerPercentage: 2
      }
    ]
  };

  assert(
    canMoveIngredient(multiFlourRecipe.ingredients, "flour-base", "down") === false,
    "La harina principal no puede bajar."
  );
  assert(
    canMoveIngredient(multiFlourRecipe.ingredients, "flour-secondary", "up") === false,
    "Una harina secundaria no puede subir por encima de la harina principal."
  );
  assert(
    canMoveIngredient(multiFlourRecipe.ingredients, "water-main", "up") === true,
    "Un ingrediente no-harina debe poder subir mientras quede debajo de la harina principal."
  );

  const reorderedBelowBase = moveIngredientInList(multiFlourRecipe.ingredients, "salt-main", "up");
  assert(
    reorderedBelowBase.map((ingredient) => ingredient.id).join(",") ===
      "flour-base,flour-secondary,salt-main,water-main",
    "Los ingredientes debajo de la harina principal deben poder reordenarse."
  );

  const noFlourRecipe: Recipe = {
    ...baseRecipe,
    ingredients: [
      {
        id: "water-a",
        name: "Agua",
        quantity: 400,
        unit: "g",
        role: "water",
        bakerPercentage: 100
      },
      {
        id: "salt-a",
        name: "Sal",
        quantity: 8,
        unit: "g",
        role: "salt",
        bakerPercentage: 2
      }
    ]
  };

  assert(
    getPrimaryFlourIndex(noFlourRecipe.ingredients) === -1,
    "Una receta sin harina debe devolver indice seguro."
  );
  assert(
    moveIngredientInList(noFlourRecipe.ingredients, "salt-a", "up")
      .map((ingredient) => ingredient.id)
      .join(",") === "salt-a,water-a",
    "Sin harina debe mantenerse el comportamiento seguro de reordenamiento."
  );

  const exportedOrdered = exportRecipeToJson(orderedRecipe);
  const importedOrdered = parseImportedRecipe(exportedOrdered);
  assert(
    importedOrdered.ingredients.map((ingredient) => ingredient.id).join(",") ===
      "water-1,flour-1,salt-1",
    "Exportar e importar debe conservar el orden de ingredientes."
  );

  const backupPayload = JSON.parse(exportRecipesToJson([])) as {
    type: string;
    version: number;
    exportedAt: string;
    recipes: Recipe[];
  };
  assert(backupPayload.type === "centeno.recipes.backup", "Type de backup invalido.");
  assert(backupPayload.version === 1, "Version de backup invalida.");
  assert(Array.isArray(backupPayload.recipes) && backupPayload.recipes.length === 0, "El backup vacio debe exportar recipes vacio.");
  assert(
    isRecipeBackupPayload(backupPayload),
    "El helper debe detectar payloads de backup validos."
  );

  const singleBackup = parseImportedRecipesBackup(exportRecipesToJson([baseRecipe]));
  assert(singleBackup.length === 1, "El backup simple debe importar una receta.");
  assert(singleBackup[0].name === baseRecipe.name, "El backup simple debe conservar el nombre.");

  const multiBackup = parseImportedRecipesBackup(exportRecipesToJson([prefermentRecipe, parentRecipe]));
  assert(multiBackup.length === 2, "El backup multiple debe importar todas las recetas.");

  const parsedSingleFile = parseImportedCentenoFile(exportRecipeToJson(baseRecipe), []);
  assert(parsedSingleFile.type === "recipe", "El import de archivo individual debe seguir funcionando.");
  assert(parsedSingleFile.recipes.length === 1, "El archivo individual debe devolver una receta.");

  const parsedBackupFile = parseImportedCentenoFile(
    exportRecipesToJson([prefermentRecipe, parentRecipe]),
    []
  );
  assert(parsedBackupFile.type === "backup", "El import de archivo debe detectar backups.");
  assert(parsedBackupFile.recipes.length === 2, "El backup debe devolver todas las recetas.");

  const importedBackupIntoEmpty = importRecipesFromJson(
    JSON.parse(exportRecipesToJson([prefermentRecipe, parentRecipe])),
    []
  );
  assert(
    importedBackupIntoEmpty.length === 2,
    "Importar backup en estado vacio debe reconstruir todo el recetario exportado."
  );
  const importedPreferment = importedBackupIntoEmpty.find((recipe) => recipe.name === prefermentRecipe.name);
  const importedParent = importedBackupIntoEmpty.find((recipe) => recipe.name === parentRecipe.name);
  assert(importedPreferment && importedParent, "El backup debe conservar padre y prefermento.");
  const importedLink = importedParent?.ingredients.find((ingredient) => ingredient.role === "preferment");
  assert(
    importedLink?.linkedRecipeId === importedPreferment?.id,
    "El backup debe preservar el vinculo interno entre receta padre y prefermento."
  );
  assert(
    importedLink?.linkedRecipeName === "Masa madre 60",
    "El backup debe conservar linkedRecipeName."
  );
  assert(
    importedParent?.scalingTarget?.mode === "doughWeight" &&
      importedParent.scalingTarget.doughWeight === 3085.5,
    "El backup debe conservar scalingTarget."
  );

  const lookup = new Map(importedBackupIntoEmpty.map((recipe) => [recipe.id, recipe]));
  const importedSummary = getRecipeSummary(importedParent!, (recipeId) => lookup.get(recipeId));
  assertApprox(importedSummary.baseQuantity, 1650, "La harina total round-trip debe conservarse.");
  assertApprox(importedSummary.liquids, 1155, "El liquido total round-trip debe conservarse.");
  assertApprox(importedSummary.doughWeight, 3085.5, "La masa neta round-trip debe conservarse.");
  assertApprox(importedSummary.hydration, 70, "La hidratacion round-trip debe conservarse.");
  assertApprox(
    getDoughWeight(importedParent!.ingredients, (recipeId) => lookup.get(recipeId), importedParent!.id),
    3085.5,
    "La masa con prefermento importado debe seguir calculando correctamente."
  );
  assertApprox(
    getHydrationPercentage(importedParent!.ingredients),
    70,
    "La hidratacion base no debe cambiar tras importar."
  );
  const prefermentBreakdown = getPrefermentBreakdown(
    importedParent!.ingredients[3],
    (recipeId) => lookup.get(recipeId),
    importedParent!.id
  );
  assertApprox(
    prefermentBreakdown?.status === "resolved" ? prefermentBreakdown.contributedFlour : 0,
    309.375,
    "El aporte de harina del prefermento importado debe conservarse."
  );
  assertApprox(
    prefermentBreakdown?.status === "resolved" ? prefermentBreakdown.contributedLiquids : 0,
    185.625,
    "El aporte de agua del prefermento importado debe conservarse."
  );

  const identicalMerge = importRecipesFromJson(
    JSON.parse(exportRecipesToJson([baseRecipe])),
    [baseRecipe]
  );
  assert(
    identicalMerge.length === 0,
    "Si el backup trae la misma receta por id y contenido, no debe duplicarla."
  );

  const conflictingIdRecipe: Recipe = {
    ...baseRecipe,
    notes: "Version modificada",
    ingredients: [
      ...baseRecipe.ingredients.slice(0, 1),
      {
        ...baseRecipe.ingredients[1],
        quantity: 320
      }
    ]
  };
  const conflictingIdMerge = importRecipesFromJson(
    JSON.parse(exportRecipesToJson([conflictingIdRecipe])),
    [baseRecipe]
  );
  assert(conflictingIdMerge.length === 1, "El conflicto de id con contenido distinto debe importar una copia.");
  assert(
    conflictingIdMerge[0].id !== baseRecipe.id,
    "El conflicto de id con contenido distinto debe generar nuevo id."
  );
  assert(
    conflictingIdMerge[0].name === baseRecipe.name,
    "El conflicto de id distinto puede conservar el nombre si no hay otro conflicto adicional."
  );

  const sameNameDifferentId: Recipe = {
    ...baseRecipe,
    id: "recipe-2",
    name: baseRecipe.name
  };
  const sameNameMerge = importRecipesFromJson(
    JSON.parse(exportRecipesToJson([sameNameDifferentId])),
    [baseRecipe]
  );
  assert(
    sameNameMerge.length === 1,
    "El conflicto por mismo nombre y distinto id debe importar una copia."
  );
  assert(
    sameNameMerge[0].name === "Pan de campo (importada)",
    "El conflicto por nombre debe desambiguarse."
  );

  const mergeKeepsExisting = importRecipesFromJson(
    JSON.parse(exportRecipesToJson([baseRecipe])),
    [prefermentRecipe]
  );
  assert(
    mergeKeepsExisting.length === 1,
    "Importar backup no debe borrar recetas locales existentes."
  );
  assert(
    mergeKeepsExisting[0].ingredients[0].role === "flour" &&
      mergeKeepsExisting[0].ingredients[0].quantity === 500 &&
      mergeKeepsExisting[0].ingredients[0].bakerPercentage === 100,
    "El backup debe conservar roles, cantidades y porcentajes."
  );

  const sameIdConflictBackup = {
    type: "centeno.recipes.backup",
    version: 1,
    exportedAt: "2026-08-10T00:00:00.000Z",
    recipes: [
      {
        ...parentRecipe,
        id: prefermentRecipe.id,
        linkedRecipeName: undefined
      },
      prefermentRecipe
    ]
  };
  const sameIdConflictImported = importRecipesFromJson(sameIdConflictBackup, [prefermentRecipe]);
  assert(
    sameIdConflictImported.length === 1,
    "El backup con conflicto de id igual y contenido igual debe omitir duplicados."
  );

  assertThrows(
    () => parseImportedRecipesBackup("no es json"),
    "Un backup con JSON invalido debe fallar."
  );
  assertThrows(
    () =>
      parseImportedRecipesBackup(
        JSON.stringify({ type: "centeno.recipe", version: 1, recipes: [] })
      ),
    "Un backup con type incorrecto debe fallar."
  );
  assertThrows(
    () =>
      parseImportedRecipesBackup(
        JSON.stringify({ type: "centeno.recipes.backup", version: 2, recipes: [] })
      ),
    "Un backup con version incorrecta debe fallar."
  );
  assertThrows(
    () =>
      parseImportedRecipesBackup(
        JSON.stringify({ type: "centeno.recipes.backup", version: 1, recipes: {} })
      ),
    "Un backup con recipes invalido debe fallar."
  );

  const missingLinkedBackup = importRecipesFromJson(
    {
      type: "centeno.recipes.backup",
      version: 1,
      exportedAt: "2026-08-10T00:00:00.000Z",
      recipes: [
        {
          ...parentRecipe,
          ingredients: parentRecipe.ingredients.map((ingredient) =>
            ingredient.role === "preferment"
              ? {
                  ...ingredient,
                  linkedRecipeId: "missing-preferment",
                  linkedRecipeName: "Prefermento faltante"
                }
              : ingredient
          )
        }
      ]
    },
    []
  );
  assert(
    missingLinkedBackup[0].ingredients.find((ingredient) => ingredient.role === "preferment")
      ?.linkedRecipeId === "missing-preferment",
    "Si el prefermento no existe, el linkedRecipeId debe mantenerse sin crashear."
  );
  assertApprox(
    getRecipeSummary(missingLinkedBackup[0]).doughWeight,
    3580.5,
    "Sin lookup el fallback debe seguir devolviendo una masa coherente."
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
