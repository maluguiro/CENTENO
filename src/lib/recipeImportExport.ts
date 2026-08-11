import type {
  IngredientRole,
  IngredientUnit,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  RecipeScalingTarget
} from "@/types/recipe";

type RecipeExportPayload = {
  type: "centeno.recipe";
  version: 1;
  exportedAt: string;
  recipe: Recipe;
};

type RecipesBackupExportPayload = {
  type: "centeno.recipes.backup";
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
};

const validUnits: IngredientUnit[] = ["g", "kg", "ml", "l", "unit"];
const validRoles: IngredientRole[] = [
  "flour",
  "water",
  "salt",
  "yeast",
  "sourdough",
  "preferment",
  "sugar",
  "fat",
  "other"
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCategory(value: unknown): value is RecipeCategory {
  return value === "bakery" || value === "pastry";
}

function isValidScalingMode(value: unknown): value is RecipeScalingTarget["mode"] {
  return value === "totalFlour" || value === "doughWeight" || value === "pieces";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNameKey(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function validateScalingTargetPayload(value: unknown) {
  if (!isObject(value) || !isValidScalingMode(value.mode)) {
    return undefined;
  }

  return {
    mode: value.mode,
    totalFlour: typeof value.totalFlour === "number" ? value.totalFlour : undefined,
    doughWeight: typeof value.doughWeight === "number" ? value.doughWeight : undefined,
    pieces: typeof value.pieces === "number" ? value.pieces : undefined,
    pieceWeight: typeof value.pieceWeight === "number" ? value.pieceWeight : undefined
  } satisfies RecipeScalingTarget;
}

function validateIngredientPayload(
  value: unknown,
  index: number
): RecipeIngredient {
  if (!isObject(value)) {
    throw new Error(`Ingrediente ${index + 1} invalido.`);
  }

  const name = normalizeString(value.name);
  if (!name) {
    throw new Error(`Ingrediente ${index + 1} sin nombre.`);
  }

  const quantity = value.quantity;
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    throw new Error(`Ingrediente ${index + 1} con cantidad invalida.`);
  }

  const bakerPercentage = value.bakerPercentage;
  if (typeof bakerPercentage !== "number" || !Number.isFinite(bakerPercentage)) {
    throw new Error(`Ingrediente ${index + 1} con porcentaje panadero invalido.`);
  }

  if (!validUnits.includes(value.unit as IngredientUnit)) {
    throw new Error(`Ingrediente ${index + 1} con unidad invalida.`);
  }

  if (!validRoles.includes(value.role as IngredientRole)) {
    throw new Error(`Ingrediente ${index + 1} con rol invalido.`);
  }

  return {
    id: normalizeString(value.id) || `import-ingredient-${index + 1}`,
    name,
    quantity,
    unit: value.unit as IngredientUnit,
    role: value.role as IngredientRole,
    bakerPercentage,
    linkedRecipeId: normalizeString(value.linkedRecipeId) || undefined,
    linkedRecipeName: normalizeString(value.linkedRecipeName) || undefined
  };
}

function validateRecipePayload(recipePayload: unknown): Recipe {
  if (!isObject(recipePayload)) {
    throw new Error("No se encontro una receta valida.");
  }

  const name = normalizeString(recipePayload.name);
  if (!name) {
    throw new Error("La receta importada no tiene nombre.");
  }

  if (!Array.isArray(recipePayload.ingredients)) {
    throw new Error("La receta importada no tiene ingredientes validos.");
  }

  return {
    id: normalizeString(recipePayload.id) || "imported-recipe",
    name,
    description: normalizeOptionalString(recipePayload.description),
    notes: normalizeOptionalString(recipePayload.notes),
    category: isValidCategory(recipePayload.category) ? recipePayload.category : "bakery",
    useAsPreferment:
      typeof recipePayload.useAsPreferment === "boolean" ? recipePayload.useAsPreferment : false,
    scalingTarget: validateScalingTargetPayload(recipePayload.scalingTarget),
    scalingSnapshotIngredients: Array.isArray(recipePayload.scalingSnapshotIngredients)
      ? recipePayload.scalingSnapshotIngredients.map(validateIngredientPayload)
      : undefined,
    ingredients: recipePayload.ingredients.map(validateIngredientPayload),
    createdAt: normalizeString(recipePayload.createdAt),
    updatedAt: normalizeString(recipePayload.updatedAt)
  };
}

function getUniqueImportedName(name: string, existingRecipes: Recipe[], reservedNames: Set<string>) {
  const names = new Set([
    ...existingRecipes.map((recipe) => normalizeNameKey(recipe.name)),
    ...reservedNames
  ]);
  const normalizedBase = normalizeNameKey(name);

  if (!names.has(normalizedBase)) {
    return name;
  }

  const importedName = `${name} (importada)`;
  if (!names.has(normalizeNameKey(importedName))) {
    return importedName;
  }

  let suffix = 2;
  while (names.has(normalizeNameKey(`${name} (importada ${suffix})`))) {
    suffix += 1;
  }

  return `${name} (importada ${suffix})`;
}

function normalizeComparableRecipe(recipe: Recipe) {
  return {
    id: recipe.id,
    name: normalizeString(recipe.name),
    description: recipe.description ?? "",
    notes: recipe.notes ?? "",
    category: recipe.category ?? "bakery",
    useAsPreferment: recipe.useAsPreferment ?? false,
    scalingTarget: recipe.scalingTarget
      ? {
          mode: recipe.scalingTarget.mode,
          totalFlour: recipe.scalingTarget.totalFlour ?? null,
          doughWeight: recipe.scalingTarget.doughWeight ?? null,
          pieces: recipe.scalingTarget.pieces ?? null,
          pieceWeight: recipe.scalingTarget.pieceWeight ?? null
        }
      : null,
    scalingSnapshotIngredients:
      recipe.scalingSnapshotIngredients?.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        role: ingredient.role,
        bakerPercentage: ingredient.bakerPercentage,
        linkedRecipeId: ingredient.linkedRecipeId ?? null,
        linkedRecipeName: ingredient.linkedRecipeName ?? null
      })) ?? null,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      role: ingredient.role,
      bakerPercentage: ingredient.bakerPercentage,
      linkedRecipeId: ingredient.linkedRecipeId ?? null,
      linkedRecipeName: ingredient.linkedRecipeName ?? null
    })),
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt
  };
}

function areRecipesEquivalent(left: Recipe, right: Recipe) {
  return JSON.stringify(normalizeComparableRecipe(left)) === JSON.stringify(normalizeComparableRecipe(right));
}

function remapLinkedRecipes(
  ingredients: RecipeIngredient[],
  recipeIdMap: Map<string, string>
) {
  return ingredients.map((ingredient) => ({
    ...ingredient,
    linkedRecipeId: ingredient.linkedRecipeId
      ? recipeIdMap.get(ingredient.linkedRecipeId) ?? ingredient.linkedRecipeId
      : undefined
  }));
}

function parseCentenoPayload(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    throw new Error("No se pudo leer el JSON del archivo.");
  }
}

export function isRecipeBackupPayload(payload: unknown): payload is RecipesBackupExportPayload {
  return isObject(payload) && payload.type === "centeno.recipes.backup" && payload.version === 1;
}

export function exportRecipeToJson(recipe: Recipe) {
  const payload: RecipeExportPayload = {
    type: "centeno.recipe",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipe
  };

  return JSON.stringify(payload, null, 2);
}

export function exportRecipesToJson(recipes: Recipe[]) {
  const payload: RecipesBackupExportPayload = {
    type: "centeno.recipes.backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes
  };

  return JSON.stringify(payload, null, 2);
}

export function validateImportedRecipePayload(payload: unknown): Recipe {
  if (!isObject(payload)) {
    throw new Error("Payload invalido.");
  }

  if (payload.type !== "centeno.recipe") {
    throw new Error("Tipo de receta invalido.");
  }

  if (payload.version !== 1) {
    throw new Error("Version de receta invalida.");
  }

  return validateRecipePayload(payload.recipe);
}

export function validateImportedRecipesBackupPayload(payload: unknown): Recipe[] {
  if (!isObject(payload)) {
    throw new Error("Payload invalido.");
  }

  if (payload.type !== "centeno.recipes.backup") {
    throw new Error("Tipo de backup invalido.");
  }

  if (payload.version !== 1) {
    throw new Error("Version de backup invalida.");
  }

  if (!Array.isArray(payload.recipes)) {
    throw new Error("El backup no contiene recetas validas.");
  }

  return payload.recipes.map(validateRecipePayload);
}

export function parseImportedRecipe(input: string) {
  return validateImportedRecipePayload(parseCentenoPayload(input));
}

export function parseImportedRecipesBackup(input: string) {
  return validateImportedRecipesBackupPayload(parseCentenoPayload(input));
}

export function prepareImportedRecipe(recipe: Recipe, existingRecipes: Recipe[]) {
  const now = new Date().toISOString();
  const normalizedName = normalizeString(recipe.name);

  return {
    ...recipe,
    id: makeId(),
    name: getUniqueImportedName(normalizedName, existingRecipes, new Set()),
    description: recipe.description ?? "",
    notes: recipe.notes ?? "",
    category: recipe.category ?? "bakery",
    scalingTarget: recipe.scalingTarget,
    scalingSnapshotIngredients: recipe.scalingSnapshotIngredients?.map((ingredient) => ({
      ...ingredient,
      id: makeId(),
      name: normalizeString(ingredient.name),
      linkedRecipeId: normalizeString(ingredient.linkedRecipeId) || undefined,
      linkedRecipeName: normalizeString(ingredient.linkedRecipeName) || undefined
    })),
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      id: makeId(),
      name: normalizeString(ingredient.name),
      linkedRecipeId: normalizeString(ingredient.linkedRecipeId) || undefined,
      linkedRecipeName: normalizeString(ingredient.linkedRecipeName) || undefined
    })),
    createdAt: normalizeString(recipe.createdAt) || now,
    updatedAt: now
  } satisfies Recipe;
}

export function importRecipesFromJson(payload: unknown, existingRecipes: Recipe[]) {
  const importedRecipes = validateImportedRecipesBackupPayload(payload);
  const existingById = new Map(existingRecipes.map((recipe) => [recipe.id, recipe]));
  const reservedNames = new Set(existingRecipes.map((recipe) => normalizeNameKey(recipe.name)));
  const reservedIds = new Set(existingRecipes.map((recipe) => recipe.id));
  const sourceIdToFinalId = new Map<string, string>();
  const recipesToImport: Recipe[] = [];
  const now = new Date().toISOString();

  for (const recipe of importedRecipes) {
    const existingSameId = existingById.get(recipe.id);

    if (existingSameId && areRecipesEquivalent(existingSameId, recipe)) {
      sourceIdToFinalId.set(recipe.id, existingSameId.id);
      continue;
    }

    let finalId = recipe.id;
    let finalName = normalizeString(recipe.name);

    if (reservedIds.has(finalId)) {
      finalId = makeId();
    }

    if (
      reservedNames.has(normalizeNameKey(finalName)) &&
      (!existingSameId || normalizeNameKey(existingSameId.name) !== normalizeNameKey(finalName))
    ) {
      finalName = getUniqueImportedName(finalName, existingRecipes, reservedNames);
    }

    reservedIds.add(finalId);
    reservedNames.add(normalizeNameKey(finalName));
    sourceIdToFinalId.set(recipe.id, finalId);

    recipesToImport.push({
      ...recipe,
      id: finalId,
      name: finalName,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
      category: recipe.category ?? "bakery",
      createdAt: normalizeString(recipe.createdAt) || now,
      updatedAt: now
    });
  }

  return recipesToImport.map((recipe) => ({
    ...recipe,
    scalingSnapshotIngredients: recipe.scalingSnapshotIngredients
      ? remapLinkedRecipes(recipe.scalingSnapshotIngredients, sourceIdToFinalId).map((ingredient) => ({
          ...ingredient,
          linkedRecipeName: normalizeString(ingredient.linkedRecipeName) || undefined
        }))
      : undefined,
    ingredients: remapLinkedRecipes(recipe.ingredients, sourceIdToFinalId).map((ingredient) => ({
      ...ingredient,
      linkedRecipeName: normalizeString(ingredient.linkedRecipeName) || undefined
    }))
  }));
}

export function parseImportedCentenoFile(
  input: string,
  existingRecipes: Recipe[]
) {
  const payload = parseCentenoPayload(input);

  if (isRecipeBackupPayload(payload)) {
    return {
      type: "backup" as const,
      recipes: importRecipesFromJson(payload, existingRecipes)
    };
  }

  return {
    type: "recipe" as const,
    recipes: [prepareImportedRecipe(validateImportedRecipePayload(payload), existingRecipes)]
  };
}
