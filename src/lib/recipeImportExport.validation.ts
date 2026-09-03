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
import { getLinkedRecipeDisplayName } from "@/lib/linkedRecipeDisplayName";
import { sampleRecipes } from "@/data/sampleRecipes";
import {
  parseRichTextDocument,
  richTextToPlainText,
  serializeRichTextDocument,
  toggleLinePrefixInDocument,
  toggleMarkInDocument,
  updateRichTextDocumentText
} from "@/lib/richText";
import {
  getDefaultRecipeViewTab,
  getRecipeCategoryIcon,
  getNotesTabSections,
  getPreparationTabSections,
  getRecipeTabSections
} from "@/lib/recipeView";
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
  notes: "**Tip**\n- Primer punto\n1. Paso",
  preparation: {
    steps: ["Mezclar ingredientes.", "Amasar hasta lograr estructura."]
  },
  fermentation: {
    instructions: "Fermentar en bloque.",
    visualCue: "Hasta que la masa se vea aireada.",
    timeMinMinutes: 60,
    timeMaxMinutes: 90,
    temperatureMinC: 24,
    temperatureMaxC: 26
  },
  baking: {
    instructions: "Hornear hasta dorar.",
    timeMinMinutes: 35,
    timeMaxMinutes: 45,
    temperatureMinC: 210,
    temperatureMaxC: 220
  },
  yield: {
    quantity: 2,
    unit: "piezas",
    weightPerUnit: 900,
    weightUnit: "g"
  },
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

const legacyRecipePayload = {
  id: "legacy-recipe",
  name: "Receta vieja",
  description: "Texto viejo",
  notes: "Notas viejas",
  category: "bakery",
  useAsPreferment: false,
  ingredients: [
    {
      id: "legacy-flour",
      name: "Harina",
      quantity: 500,
      unit: "g",
      role: "flour",
      bakerPercentage: 100
    },
    {
      id: "legacy-water",
      name: "Agua",
      quantity: 300,
      unit: "g",
      role: "water",
      bakerPercentage: 60
    }
  ],
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z"
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
  const renamedPreferment: Recipe = {
    ...prefermentRecipe,
    name: "MM centeno 60%"
  };
  const linkedPrefermentIngredient = parentRecipe.ingredients.find(
    (ingredient) => ingredient.role === "preferment"
  )!;
  const linkedRecipeLookup = new Map([[renamedPreferment.id, renamedPreferment]]);

  assert(
    getLinkedRecipeDisplayName(linkedPrefermentIngredient, linkedRecipeLookup) === "MM centeno 60%",
    "El nombre visible debe usar el nombre actual de la receta vinculada."
  );
  assert(
    getLinkedRecipeDisplayName(linkedPrefermentIngredient, new Map()) === "Masa madre 60",
    "Si el vinculo falta, el nombre visible debe usar linkedRecipeName como fallback."
  );
  assert(
    getLinkedRecipeDisplayName(
      { ...linkedPrefermentIngredient, linkedRecipeName: undefined },
      new Map()
    ) === "Pasta madre",
    "Si no hay linkedRecipeName, el nombre visible debe usar el nombre del ingrediente."
  );
  assert(
    getLinkedRecipeDisplayName(
      { ...linkedPrefermentIngredient, role: "other", linkedRecipeName: undefined },
      linkedRecipeLookup
    ) === "Pasta madre",
    "Un ingrediente sin vinculo prefermento debe conservar su nombre manual."
  );
  const renamedShareText = formatRecipeAsShareText(parentRecipe, [renamedPreferment]);
  assert(
    renamedShareText.includes("MM centeno 60%") && !renamedShareText.includes("• Pasta madre —"),
    "El texto compartido debe usar el nombre actual del prefermento vinculado."
  );

  const exported = exportRecipeToJson(baseRecipe);
  const parsedPayload = JSON.parse(exported) as { type: string; version: number; recipe: Recipe };

  assert(parsedPayload.type === "centeno.recipe", "Export type invalido.");
  assert(parsedPayload.version === 2, "Export version invalida.");

  const imported = parseImportedRecipe(exported);
  assert(imported.name === baseRecipe.name, "Import no conserva el nombre.");
  assert(imported.ingredients.length === 2, "Import no conserva ingredientes.");
  assert(imported.useAsPreferment === false, "Import no conserva useAsPreferment.");
  assert(imported.scalingTarget?.mode === "pieces", "Import no conserva scalingTarget.");
  assert(imported.scalingTarget?.pieces === 2, "Import no conserva piezas.");
  assert(imported.preparation?.steps.length === 2, "Import no conserva preparation.");
  assert(
    imported.fermentation?.timeMinMinutes === 60 &&
      imported.fermentation.temperatureMaxC === 26,
    "Import no conserva fermentation."
  );
  assert(
    imported.baking?.temperatureMinC === 210 && imported.baking.timeMaxMinutes === 45,
    "Import no conserva baking."
  );
  assert(
    imported.yield?.quantity === 2 && imported.yield.weightPerUnit === 900,
    "Import no conserva yield."
  );
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
  assert(shareText.includes("Preparacion:"), "El texto debe incluir preparation.");
  assert(shareText.includes("Fermentacion:"), "El texto debe incluir fermentation.");
  assert(shareText.includes("Horneado:"), "El texto debe incluir baking.");
  assert(shareText.includes("Rendimiento: 2 piezas · ~900 g c/u"), "El texto debe incluir yield.");
  assert(shareText.includes("• Primer punto"), "El rich text debe convertirse a texto legible.");
  assert(shareText.includes("1. Paso"), "La lista numerada debe conservarse en texto.");
  assert(!shareText.includes('"type": "centeno.recipe"'), "El texto legible no debe ser JSON.");
  assertThrows(
    () => parseImportedRecipe(shareText),
    "El texto legible no debe importarse como codigo."
  );

  assert(
    richTextToPlainText(baseRecipe.notes) === "Tip\n• Primer punto\n1. Paso",
    "El rich text debe poder degradarse a texto plano."
  );

  const missingCategoryJson = JSON.stringify({
    type: "centeno.recipe",
    version: 1,
    exportedAt: "2026-07-17T10:00:00.000Z",
    recipe: {
      ...legacyRecipePayload,
      category: undefined
    }
  });
  const missingCategoryRecipe = parseImportedRecipe(missingCategoryJson);
  assert(missingCategoryRecipe.category === "bakery", "Category por defecto incorrecta.");
  assert(
    missingCategoryRecipe.useAsPreferment === false,
    "useAsPreferment por defecto incorrecto."
  );
  assert(
    missingCategoryRecipe.preparation === undefined &&
      missingCategoryRecipe.fermentation === undefined &&
      missingCategoryRecipe.baking === undefined &&
      missingCategoryRecipe.yield === undefined,
    "Una receta V1 debe seguir siendo valida sin nuevos campos."
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
        JSON.stringify({ type: "centeno.recipe", version: 3, recipe: baseRecipe })
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
  assert(prepared.preparation?.steps[0] === "Mezclar ingredientes.", "prepareImportedRecipe debe conservar preparation.");
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
  assert(backupPayload.version === 2, "Version de backup invalida.");
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
  assert(
    importedPreferment?.useAsPreferment === true,
    "El backup debe conservar useAsPreferment."
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
    identicalMerge.length === 1,
    "Reimportar backup con misma receta por id debe reemplazar (no duplicar)."
  );
  assert(
    identicalMerge[0].id === baseRecipe.id,
    "La receta reemplazada debe conservar el mismo id."
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
  assert(conflictingIdMerge.length === 1, "El backup con mismo id debe reemplazar la receta existente.");
  assert(
    conflictingIdMerge[0].id === baseRecipe.id,
    "El reemplazo por id debe conservar el id original."
  );
  assert(
    conflictingIdMerge[0].notes === "Version modificada",
    "El reemplazo debe traer el contenido del backup."
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
    "importRecipesFromJson solo devuelve recetas del backup (el reducer combina con existentes)."
  );
  const mergedBase = mergeKeepsExisting.find((r) => r.id === baseRecipe.id);
  assert(
    mergedBase &&
      mergedBase.ingredients[0].role === "flour" &&
      mergedBase.ingredients[0].quantity === 500 &&
      mergedBase.ingredients[0].bakerPercentage === 100,
    "El backup debe conservar roles, cantidades y porcentajes."
  );

  const sameIdConflictBackup = {
    type: "centeno.recipes.backup",
    version: 2,
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
    sameIdConflictImported.length === 2,
    "El backup con conflicto de id debe reemplazar existente y agregar nuevo."
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
        JSON.stringify({ type: "centeno.recipes.backup", version: 3, recipes: [] })
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
      version: 2,
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

  assert(getDefaultRecipeViewTab() === "recipe", "La receta debe abrir siempre en la tab Receta.");
  assert(getRecipeCategoryIcon("bakery") === "🍞", "Panaderia debe usar icono pan.");
  assert(getRecipeCategoryIcon("pastry") === "🧁", "Pasteleria debe usar icono cupcake.");
  const recipeSections = getRecipeTabSections(baseRecipe);
  assert(recipeSections.description === true, "La tab Receta debe poder mostrar la descripcion.");
  const preparationSections = getPreparationTabSections(baseRecipe);
  assert(preparationSections.preparation === true, "Preparacion debe mostrar steps cuando existen.");
  assert(preparationSections.fermentation === true, "Preparacion debe mostrar fermentacion cuando existe.");
  assert(preparationSections.baking === true, "Preparacion debe mostrar horneado cuando existe.");
  const notesSections = getNotesTabSections(baseRecipe);
  assert(notesSections.notes === true, "Notas debe mostrar notes cuando existen.");
  const recipeWithoutEditorial: Recipe = {
    ...baseRecipe,
    description: "",
    notes: "",
    preparation: undefined,
    fermentation: undefined,
    baking: undefined,
    yield: undefined
  };
  assert(
    getPreparationTabSections(recipeWithoutEditorial).preparation === false &&
      getPreparationTabSections(recipeWithoutEditorial).fermentation === false &&
      getPreparationTabSections(recipeWithoutEditorial).baking === false,
    "Preparacion debe omitir bloques vacios."
  );
  assert(
    getNotesTabSections(recipeWithoutEditorial).notes === false,
    "Notas debe omitir contenido inexistente."
  );

  const richDocument = parseRichTextDocument("**Tip**\nversion simple");
  assert(richDocument.text === "Tip\nversion simple", "El parser rich text debe ocultar markdown al editor.");
  assert(
    serializeRichTextDocument(richDocument) === "**Tip**\nversion simple",
    "El serializador rich text debe conservar markdown liviano."
  );
  const toggledBold = toggleMarkInDocument(
    parseRichTextDocument("version con menos aceite"),
    { start: 8, end: 24 },
    "bold"
  );
  assert(
    serializeRichTextDocument(toggledBold) === "version **con menos aceite**",
    "La negrita debe persistirse sobre el texto seleccionado."
  );
  const toggledItalic = toggleMarkInDocument(
    parseRichTextDocument("masa suave"),
    { start: 0, end: 4 },
    "italic"
  );
  assert(
    serializeRichTextDocument(toggledItalic) === "*masa* suave",
    "La cursiva debe persistirse."
  );
  const toggledUnderline = toggleMarkInDocument(
    parseRichTextDocument("fermentacion corta"),
    { start: 0, end: 12 },
    "underline"
  );
  assert(
    serializeRichTextDocument(toggledUnderline) === "__fermentacion__ corta",
    "El subrayado debe persistirse."
  );
  const listed = toggleLinePrefixInDocument(
    parseRichTextDocument("primer item\nsegundo item"),
    { start: 0, end: 22 },
    "bullet"
  );
  assert(
    serializeRichTextDocument(listed.document) === "- primer item\n- segundo item",
    "La lista con vietas debe persistirse."
  );
  const numbered = toggleLinePrefixInDocument(
    parseRichTextDocument("amasar\nfermentar"),
    { start: 0, end: 17 },
    "numbered"
  );
  assert(
    serializeRichTextDocument(numbered.document) === "1. amasar\n2. fermentar",
    "La lista numerada debe persistirse."
  );
  const insertedBold = updateRichTextDocumentText(
    parseRichTextDocument("abc"),
    "abcd",
    { start: 3, end: 3 },
    "bold"
  );
  assert(
    serializeRichTextDocument(insertedBold.document) === "abc**d**",
    "El texto nuevo debe poder heredar formato activo."
  );

  const partialFieldsRecipe = parseImportedRecipe(
    JSON.stringify({
      type: "centeno.recipe",
      version: 2,
      exportedAt: "2026-08-10T00:00:00.000Z",
      recipe: {
        ...baseRecipe,
        notes: "Texto plano heredado",
        preparation: { steps: ["Unico paso"] },
        fermentation: { instructions: "Reposar." },
        baking: { temperatureMinC: 180 },
        yield: { unit: "lactales" }
      }
    })
  );
  assert(partialFieldsRecipe.notes === "Texto plano heredado", "Notes plano debe seguir importando.");
  assert(partialFieldsRecipe.preparation?.steps.length === 1, "Preparation parcial invalida.");
  assert(partialFieldsRecipe.fermentation?.instructions === "Reposar.", "Fermentation parcial invalida.");
  assert(partialFieldsRecipe.baking?.temperatureMinC === 180, "Baking parcial invalido.");
  assert(partialFieldsRecipe.yield?.unit === "lactales", "Yield parcial invalido.");

  const roundTripRecipe = parseImportedRecipe(exportRecipeToJson(baseRecipe));
  assert(roundTripRecipe.notes === baseRecipe.notes, "Round-trip debe conservar rich notes.");
  assert(
    roundTripRecipe.preparation?.steps.join("|") === baseRecipe.preparation?.steps.join("|"),
    "Round-trip debe conservar preparation."
  );
  assertApprox(
    getRecipeSummary(roundTripRecipe).baseQuantity,
    getRecipeSummary(baseRecipe).baseQuantity,
    "Los nuevos campos no deben alterar harina total."
  );
  assertApprox(
    getRecipeSummary(roundTripRecipe).liquids,
    getRecipeSummary(baseRecipe).liquids,
    "Los nuevos campos no deben alterar liquidos."
  );
  assertApprox(
    getRecipeSummary(roundTripRecipe).hydration,
    getRecipeSummary(baseRecipe).hydration,
    "Los nuevos campos no deben alterar hidratacion."
  );
  assertApprox(
    getRecipeSummary(roundTripRecipe).doughWeight,
    getRecipeSummary(baseRecipe).doughWeight,
    "Los nuevos campos no deben alterar masa total."
  );

  const formulaExport = exportRecipeToJson(baseRecipe, "formula");
  const formulaPayload = JSON.parse(formulaExport) as { exportMode: string; recipe: Record<string, unknown> };
  assert(formulaPayload.exportMode === "formula", "El export de formula debe declarar exportMode formula.");
  assert(
    !("preparation" in formulaPayload.recipe) &&
      !("fermentation" in formulaPayload.recipe) &&
      !("baking" in formulaPayload.recipe) &&
      !("yield" in formulaPayload.recipe) &&
      !("notes" in formulaPayload.recipe),
    "El export de formula no debe incluir elaboracion, fermentacion, horneado, rendimiento ni notas."
  );
  assert(
    Array.isArray(formulaPayload.recipe.ingredients) &&
      typeof formulaPayload.recipe.description === "string" &&
      formulaPayload.recipe.scalingTarget !== undefined,
    "El export de formula debe conservar ingredientes, descripcion y objetivo de produccion."
  );

  const importedFormula = parseImportedRecipe(formulaExport);
  assert(importedFormula.name === baseRecipe.name, "Formula importada no conserva el nombre.");
  assert(importedFormula.ingredients.length === 2, "Formula importada no conserva ingredientes.");
  assert(
    importedFormula.description === baseRecipe.description,
    "Formula importada no conserva la descripcion."
  );
  assert(importedFormula.preparation === undefined, "Formula importada no debe tener preparation.");
  assert(importedFormula.fermentation === undefined, "Formula importada no debe tener fermentation.");
  assert(importedFormula.baking === undefined, "Formula importada no debe tener baking.");
  assert(importedFormula.yield === undefined, "Formula importada no debe tener yield.");
  assert(importedFormula.notes === "", "Formula importada no debe tener notas.");
  assertApprox(
    getRecipeSummary(importedFormula).hydration,
    getRecipeSummary(baseRecipe).hydration,
    "La formula importada debe conservar la hidratacion."
  );
  assertApprox(
    getRecipeSummary(importedFormula).doughWeight,
    getRecipeSummary(baseRecipe).doughWeight,
    "La formula importada debe conservar la masa total."
  );

  const completeExport = exportRecipeToJson(baseRecipe, "complete");
  const completePayload = JSON.parse(completeExport) as { exportMode: string };
  assert(completePayload.exportMode === "complete", "El export completo debe declarar exportMode complete.");
  const importedComplete = parseImportedRecipe(completeExport);
  assert(
    importedComplete.preparation?.steps.length === 2 &&
      importedComplete.fermentation?.timeMinMinutes === 60 &&
      importedComplete.baking?.temperatureMinC === 210 &&
      importedComplete.yield?.weightPerUnit === 900,
    "El export completo debe conservar elaboracion, fermentacion, horneado y rendimiento."
  );
  assert(
    importedComplete.notes === baseRecipe.notes,
    "El export completo debe conservar las notas con su formato original."
  );

  const defaultExport = JSON.parse(exportRecipeToJson(baseRecipe)) as { exportMode: string };
  assert(
    defaultExport.exportMode === "complete",
    "El export sin modo debe comportarse como completo."
  );

  const recipeSnapshot = JSON.stringify(baseRecipe);
  exportRecipeToJson(baseRecipe, "formula");
  exportRecipeToJson(baseRecipe, "complete");
  assert(
    JSON.stringify(baseRecipe) === recipeSnapshot,
    "Exportar en cualquier modo no debe modificar la receta original."
  );

  const importedFormulaWithPreferment = parseImportedRecipe(exportRecipeToJson(parentRecipe, "formula"));
  const prefermentLink = importedFormulaWithPreferment.ingredients.find(
    (ingredient) => ingredient.role === "preferment"
  );
  assert(
    prefermentLink?.linkedRecipeId === "preferment-1" &&
      prefermentLink.linkedRecipeName === "Masa madre 60",
    "La formula exportada debe conservar el vinculo al prefermento."
  );
  assert(
    importedFormulaWithPreferment.notes === "" &&
      importedFormulaWithPreferment.preparation === undefined,
    "La formula exportada del padre no debe arrastrar contenido editorial."
  );

  const textFormula = formatRecipeAsShareText(baseRecipe, [], "formula");
  assert(
    textFormula.includes("Ingredientes:") && textFormula.includes("Hidratacion:"),
    "Texto formula debe contener ingredientes e hidratacion."
  );
  assert(
    !textFormula.includes("Preparacion:") &&
      !textFormula.includes("Fermentacion:") &&
      !textFormula.includes("Horneado:") &&
      !textFormula.includes("Rendimiento:") &&
      !textFormula.includes("Notas:"),
    "Texto formula no debe contener titulos editoriales."
  );
  assert(
    textFormula.includes("Exportado desde CENTENO"),
    "Texto formula debe cerrar con la marca de CENTENO."
  );

  const textComplete = formatRecipeAsShareText(baseRecipe, [], "complete");
  assert(
    textComplete.includes("Preparacion:") &&
      textComplete.includes("1. Mezclar ingredientes.") &&
      textComplete.includes("2. Amasar hasta lograr estructura."),
    "Texto completo debe incluir pasos numerados de preparacion."
  );
  assert(
    textComplete.includes("Fermentacion:") && textComplete.includes("Horneado:"),
    "Texto completo debe incluir fermentacion y horneado."
  );
  assert(
    textComplete.includes("Rendimiento:"),
    "Texto completo debe incluir rendimiento."
  );
  assert(
    textComplete.includes("Notas:") && !textComplete.includes("**"),
    "Texto completo debe incluir notas sin marcadores Markdown internos."
  );
  assert(
    textComplete.includes("Tipo: Panaderia") && textComplete.includes("Masa total:"),
    "Texto completo debe conservar datos de ficha tecnica."
  );

  const jsonFormulaPayload = JSON.parse(exportRecipeToJson(baseRecipe, "formula")) as {
    exportMode: string;
    recipe: Record<string, unknown>;
  };
  assert(jsonFormulaPayload.exportMode === "formula", "JSON formula debe declarar exportMode formula.");
  assert(
    !("preparation" in jsonFormulaPayload.recipe) &&
      !("fermentation" in jsonFormulaPayload.recipe) &&
      !("baking" in jsonFormulaPayload.recipe) &&
      !("yield" in jsonFormulaPayload.recipe) &&
      !("notes" in jsonFormulaPayload.recipe),
    "JSON formula no debe tener claves editoriales."
  );

  const jsonCompletePayload = JSON.parse(exportRecipeToJson(baseRecipe, "complete")) as {
    exportMode: string;
    recipe: Record<string, unknown>;
  };
  assert(
    jsonCompletePayload.exportMode === "complete" &&
      "preparation" in jsonCompletePayload.recipe &&
      "fermentation" in jsonCompletePayload.recipe &&
      "baking" in jsonCompletePayload.recipe &&
      "yield" in jsonCompletePayload.recipe &&
      "notes" in jsonCompletePayload.recipe,
    "JSON completo debe tener todas las claves editoriales."
  );
  assert(
    typeof jsonCompletePayload.recipe.notes === "string" &&
      (jsonCompletePayload.recipe.notes as string).includes("Tip"),
    "JSON completo debe preservar las notas con su contenido original."
  );

  const roundTripJsonFormula = parseImportedRecipe(exportRecipeToJson(baseRecipe, "formula"));
  assert(
    roundTripJsonFormula.preparation === undefined &&
      roundTripJsonFormula.fermentation === undefined &&
      roundTripJsonFormula.baking === undefined &&
      roundTripJsonFormula.yield === undefined &&
      roundTripJsonFormula.notes === "" &&
      roundTripJsonFormula.ingredients.length === 2,
    "Round-trip JSON formula: editorial ausente, formula preservada."
  );

  const roundTripJsonComplete = parseImportedRecipe(exportRecipeToJson(baseRecipe, "complete"));
  assert(
    roundTripJsonComplete.preparation?.steps.length === 2 &&
      roundTripJsonComplete.fermentation?.timeMinMinutes === 60 &&
      roundTripJsonComplete.baking?.temperatureMinC === 210 &&
      roundTripJsonComplete.yield?.weightPerUnit === 900 &&
      roundTripJsonComplete.notes === baseRecipe.notes,
    "Round-trip JSON completo: todos los campos editoriales preservados."
  );

  const snapshotBeforeText = JSON.stringify(baseRecipe);
  formatRecipeAsShareText(baseRecipe, [], "formula");
  formatRecipeAsShareText(baseRecipe, [], "complete");
  assert(
    JSON.stringify(baseRecipe) === snapshotBeforeText,
    "Compartir como texto no debe modificar la receta original."
  );

  const mergedSamples = mergeMissingSampleRecipes([baseRecipe], sampleRecipes);
  assert(
    mergedSamples.length === sampleRecipes.length + 1,
    "Restaurar samples debe agregar las recetas faltantes."
  );

  const mergedAgain = mergeMissingSampleRecipes(mergedSamples, sampleRecipes);
  assert(
    mergedAgain.length === mergedSamples.length,
    "Restaurar samples no debe duplicar recetas existentes."
  );

  const backupPayload2 = JSON.parse(
    exportRecipesToJson([prefermentRecipe, parentRecipe])
  ) as ReturnType<typeof JSON.parse>;

  const firstImport = importRecipesFromJson(backupPayload2, []);
  assert(firstImport.length === 2, "Primera importacion de backup debe crear 2 recetas.");

  const secondImport = importRecipesFromJson(backupPayload2, firstImport);
  assert(
    secondImport.length === 2,
    "Segunda importacion del mismo backup debe reemplazar (no duplicar)."
  );

  const importedPreferment2 = secondImport.find((r) => r.name === prefermentRecipe.name);
  const importedParent2 = secondImport.find((r) => r.name === parentRecipe.name);
  assert(importedPreferment2 && importedParent2, "Reimport debe conservar ambas recetas.");
  assert(
    importedParent2!.ingredients.find((i) => i.role === "preferment")?.linkedRecipeId ===
      importedPreferment2!.id,
    "Reimport debe preservar vinculo prefermento."
  );

  const backupWithPrep = {
    ...prefermentRecipe,
    preparation: { steps: ["Mezclar", "Fermentar"] },
    fermentation: { instructions: "12h a 4C", timeHours: 12, temperatureMinC: 4 },
    baking: { instructions: "Hornear 25 min", timeMinutes: 25, temperatureMinC: 220 },
    yield: { quantity: 1, unit: "lote", weightPerUnit: 600, weightUnit: "g" as const },
    notes: "Tips de prefermento."
  };
  const backupWithEditorial = JSON.parse(
    exportRecipesToJson([backupWithPrep])
  );
  const importedEditorial = importRecipesFromJson(backupWithEditorial, []);
  assert(
    importedEditorial[0].preparation?.steps.length === 2,
    "Backup completo debe conservar preparation."
  );
  assert(
    importedEditorial[0].fermentation?.instructions === "12h a 4C",
    "Backup completo debe conservar fermentation."
  );
  assert(
    importedEditorial[0].baking?.instructions === "Hornear 25 min",
    "Backup completo debe conservar baking."
  );
  assert(
    importedEditorial[0].yield?.quantity === 1,
    "Backup completo debe conservar yield."
  );
  assert(
    importedEditorial[0].notes === "Tips de prefermento.",
    "Backup completo debe conservar notes."
  );

  const snapshotForNoMutate = JSON.stringify(baseRecipe);
  exportRecipesToJson([baseRecipe]);
  exportRecipeToJson(baseRecipe);
  formatRecipeAsShareText(baseRecipe, [], "complete");
  formatRecipeAsShareText(baseRecipe, [], "formula");
  assert(
    JSON.stringify(baseRecipe) === snapshotForNoMutate,
    "Exportar no debe mutar la receta original."
  );

  console.log("recipe import/export validation passed");
}

runRecipeValidation();
