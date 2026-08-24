import type {
  Recipe,
  RecipeBaking,
  RecipeFermentation,
  RecipePreparation,
  RecipeYield,
  RecipeYieldWeightUnit
} from "@/types/recipe";

function normalizeTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeTrimmedString(value);
  return normalized ? normalized : undefined;
}

function normalizeOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step) => normalizeTrimmedString(step))
    .filter((step) => step.length > 0);
}

export function normalizeRecipePreparation(value: unknown): RecipePreparation | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const steps = normalizeSteps(value.steps);
  return steps.length ? { steps } : undefined;
}

function buildNormalizedFermentation(value: Record<string, unknown>) {
  const instructions = normalizeOptionalText(value.instructions);
  const visualCue = normalizeOptionalText(value.visualCue);
  const timeMinMinutes = normalizeOptionalNumber(value.timeMinMinutes);
  const timeMaxMinutes = normalizeOptionalNumber(value.timeMaxMinutes);
  const temperatureMinC = normalizeOptionalNumber(value.temperatureMinC);
  const temperatureMaxC = normalizeOptionalNumber(value.temperatureMaxC);

  if (
    !instructions &&
    !visualCue &&
    timeMinMinutes === undefined &&
    timeMaxMinutes === undefined &&
    temperatureMinC === undefined &&
    temperatureMaxC === undefined
  ) {
    return undefined;
  }

  return {
    instructions,
    visualCue,
    timeMinMinutes,
    timeMaxMinutes,
    temperatureMinC,
    temperatureMaxC
  } satisfies RecipeFermentation;
}

export function normalizeRecipeFermentation(value: unknown): RecipeFermentation | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  return buildNormalizedFermentation(value);
}

export function normalizeRecipeBaking(value: unknown): RecipeBaking | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const instructions = normalizeOptionalText(value.instructions);
  const timeMinMinutes = normalizeOptionalNumber(value.timeMinMinutes);
  const timeMaxMinutes = normalizeOptionalNumber(value.timeMaxMinutes);
  const temperatureMinC = normalizeOptionalNumber(value.temperatureMinC);
  const temperatureMaxC = normalizeOptionalNumber(value.temperatureMaxC);

  if (
    !instructions &&
    timeMinMinutes === undefined &&
    timeMaxMinutes === undefined &&
    temperatureMinC === undefined &&
    temperatureMaxC === undefined
  ) {
    return undefined;
  }

  return {
    instructions,
    timeMinMinutes,
    timeMaxMinutes,
    temperatureMinC,
    temperatureMaxC
  };
}

function normalizeYieldWeightUnit(value: unknown): RecipeYieldWeightUnit | undefined {
  return value === "kg" || value === "g" ? value : undefined;
}

export function normalizeRecipeYield(value: unknown): RecipeYield | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const quantity = normalizeOptionalNumber(value.quantity);
  const unit = normalizeOptionalText(value.unit);
  const weightPerUnit = normalizeOptionalNumber(value.weightPerUnit);
  const weightUnit = normalizeYieldWeightUnit(value.weightUnit);

  if (
    quantity === undefined &&
    !unit &&
    weightPerUnit === undefined &&
    weightUnit === undefined
  ) {
    return undefined;
  }

  return {
    quantity,
    unit,
    weightPerUnit,
    weightUnit
  };
}

export function normalizeRecipeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRecipeMetadata<T extends {
  description?: unknown;
  notes?: unknown;
  preparation?: unknown;
  fermentation?: unknown;
  baking?: unknown;
  yield?: unknown;
}>(recipe: T) {
  const description = normalizeRecipeText(recipe.description);
  const notes = normalizeRecipeText(recipe.notes);

  return {
    description,
    notes,
    preparation: normalizeRecipePreparation(recipe.preparation),
    fermentation: normalizeRecipeFermentation(recipe.fermentation),
    baking: normalizeRecipeBaking(recipe.baking),
    yield: normalizeRecipeYield(recipe.yield)
  };
}

export function hasPreparation(preparation?: RecipePreparation) {
  return Boolean(preparation?.steps.length);
}

export function hasFermentation(fermentation?: RecipeFermentation) {
  return Boolean(
    fermentation &&
      (fermentation.instructions ||
        fermentation.visualCue ||
        fermentation.timeMinMinutes ||
        fermentation.timeMaxMinutes ||
        fermentation.temperatureMinC ||
        fermentation.temperatureMaxC)
  );
}

export function hasBaking(baking?: RecipeBaking) {
  return Boolean(
    baking &&
      (baking.instructions ||
        baking.timeMinMinutes ||
        baking.timeMaxMinutes ||
        baking.temperatureMinC ||
        baking.temperatureMaxC)
  );
}

function normalizeRecipeNameForDuplicate(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

export function buildDuplicateRecipeName(name: string, recipes: Recipe[]) {
  const baseName = name.trim();
  const existingNames = new Set(recipes.map((recipe) => normalizeRecipeNameForDuplicate(recipe.name)));

  const firstCandidate = `${baseName} (copia)`;
  if (!existingNames.has(normalizeRecipeNameForDuplicate(firstCandidate))) {
    return firstCandidate;
  }

  let index = 2;
  while (existingNames.has(normalizeRecipeNameForDuplicate(`${baseName} (copia ${index})`))) {
    index += 1;
  }

  return `${baseName} (copia ${index})`;
}

export function hasYieldData(yieldData?: RecipeYield) {
  return Boolean(
    yieldData &&
      (yieldData.quantity || yieldData.unit || yieldData.weightPerUnit || yieldData.weightUnit)
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatRange(
  minValue?: number,
  maxValue?: number,
  suffix = ""
) {
  if (minValue && maxValue) {
    return minValue === maxValue
      ? `${formatNumber(minValue)}${suffix}`
      : `${formatNumber(minValue)}-${formatNumber(maxValue)}${suffix}`;
  }

  if (minValue) {
    return `${formatNumber(minValue)}${suffix}`;
  }

  if (maxValue) {
    return `${formatNumber(maxValue)}${suffix}`;
  }

  return "";
}

export function formatTimeRange(minMinutes?: number, maxMinutes?: number) {
  return formatRange(minMinutes, maxMinutes, " min");
}

export function formatTemperatureRange(minC?: number, maxC?: number) {
  return formatRange(minC, maxC, " °C");
}

export function formatFermentationSummary(fermentation?: RecipeFermentation) {
  if (!hasFermentation(fermentation)) {
    return "";
  }

  const parts = [
    formatTemperatureRange(fermentation?.temperatureMinC, fermentation?.temperatureMaxC),
    formatTimeRange(fermentation?.timeMinMinutes, fermentation?.timeMaxMinutes)
  ].filter(Boolean);

  return parts.join(" · ");
}

export function formatBakingSummary(baking?: RecipeBaking) {
  if (!hasBaking(baking)) {
    return "";
  }

  const parts = [
    formatTemperatureRange(baking?.temperatureMinC, baking?.temperatureMaxC),
    formatTimeRange(baking?.timeMinMinutes, baking?.timeMaxMinutes)
  ].filter(Boolean);

  return parts.join(" · ");
}

export function formatYieldSummary(yieldData?: RecipeYield) {
  if (!hasYieldData(yieldData)) {
    return "";
  }

  const quantityPart = [
    yieldData?.quantity ? formatNumber(yieldData.quantity) : "",
    yieldData?.unit ?? ""
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const weightPart =
    yieldData?.weightPerUnit && yieldData?.weightUnit
      ? `~${formatNumber(yieldData.weightPerUnit)} ${yieldData.weightUnit} c/u`
      : "";

  return [quantityPart, weightPart].filter(Boolean).join(" · ");
}

export function cloneRecipeMetadata(recipe: Pick<
  Recipe,
  "description" | "notes" | "preparation" | "fermentation" | "baking" | "yield"
>) {
  return {
    description: recipe.description ?? "",
    notes: recipe.notes ?? "",
    preparation: recipe.preparation
      ? {
          steps: [...recipe.preparation.steps]
        }
      : undefined,
    fermentation: recipe.fermentation
      ? {
          ...recipe.fermentation
        }
      : undefined,
    baking: recipe.baking
      ? {
          ...recipe.baking
        }
      : undefined,
    yield: recipe.yield
      ? {
          ...recipe.yield
        }
      : undefined
  };
}
