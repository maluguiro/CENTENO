import { router } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HydrationBar } from "@/components/HydrationBar";
import { IngredientRow } from "@/components/IngredientRow";
import { EditorialEditorSheet } from "@/components/EditorialEditorSheet";
import { RichTextContent } from "@/components/RichTextContent";
import { RichTextEditor } from "@/components/RichTextEditor";
import { setClipboardText } from "@/lib/clipboard";
import {
  applyScalingTarget,
  applyScaleByDoughWeight,
  applyScaleByTotalFlour,
  applyScaleByYield,
  buildScalingTargetLabel,
  formatDecimalInput,
  getBakerPercentageFromQuantity,
  getDoughWeight,
  getHydrationPercentage,
  getIngredientBakerPercentageFromQuantity,
  getIngredientDisplayBreakdown,
  getIngredientQuantityFromBakerPercentage,
  getMoistureIndex,
  getPrimaryFlourQuantity,
  getPrefermentBreakdown,
  getQuantityFromBakerPercentage,
  recalculateBakerPercentagesFromQuantities,
  isPrimaryFlourIngredient,
  getTotalFlour,
  getTotalLiquids,
  parseDecimalInput
} from "@/lib/baker";
import {
  cloneRecipeMetadata,
  formatBakingSummary,
  formatFermentationSummary,
  formatYieldSummary,
  buildDuplicateRecipeName
} from "@/lib/recipeFields";
import { getIngredientRoleAppearance, ingredientRoleLabels } from "@/lib/ingredientLabels";
import { getLinkedRecipeDisplayName } from "@/lib/linkedRecipeDisplayName";
import { shareCentenoRecipeFile } from "@/lib/recipeFileShare";
import { exportRecipeToJson, type RecipeShareScope } from "@/lib/recipeImportExport";
import { canMoveIngredient, moveIngredientInList } from "@/lib/recipeOrder";
import { formatRecipeAsShareText } from "@/lib/recipeShareText";
import {
  expandPreparationSection,
  getInitialPreparationSections,
  togglePreparationSection,
  type PreparationSectionKey,
  type PreparationSectionsState
} from "@/lib/preparationSections";
import {
  getDefaultRecipeViewTab,
  getRecipeCategoryIcon,
  getNotesTabSections,
  getPreparationTabSections,
  getRecipeTabSections,
  type RecipeViewTab
} from "@/lib/recipeView";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type {
  IngredientRole,
  IngredientUnit,
  Recipe,
  RecipeBaking,
  RecipeDraft,
  RecipeFermentation,
  RecipeIngredient,
  RecipeScalingTarget,
  RecipeYield
} from "@/types/recipe";

type ScaleMode = "flour" | "dough" | "yield";
type PrefermentMode = "grams" | "percent";
type IngredientField = "quantity" | "percentage" | null;
type ExportFormat = "centeno" | "text" | "json";
type ExportMode = "selector" | "scope" | "shareText" | "importCode" | null;
type PrefermentContextKind = "flour" | "water";
type PreparationEditorKind = "preparation" | "fermentation" | "baking" | "yield" | "notes";

const roles: IngredientRole[] = [
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

const scaleCopy: Record<ScaleMode, string> = {
  flour:
    "Usa esta opcion cuando queres definir cuanta harina total vas a usar. CENTENO recalcula todos los ingredientes segun sus porcentajes panaderos.",
  dough:
    "Usa esta opcion cuando queres obtener una cantidad final de masa. CENTENO escala toda la receta para aproximarse a ese peso total.",
  yield:
    "Usa esta opcion cuando queres producir una cantidad especifica de piezas. Ejemplo: 12 piezas de 180 g = 2160 g de masa total. CENTENO escala la receta a ese objetivo."
};

const ingredientFieldCopy = {
  amount: { label: "Cantidad", placeholder: "500", unit: "g" },
  percentage: { label: "Porcentaje panadero", placeholder: "100", unit: "%" }
};

type FormulaSheetProps = {
  recipe: Recipe;
};

type IngredientDraftState = {
  id: string;
  name: string;
  unit: IngredientUnit;
  role: IngredientRole;
  quantityInput: string;
  percentageInput: string;
  linkedRecipeId?: string;
  linkedRecipeName?: string;
};

type PrefermentContextItem = {
  kind: PrefermentContextKind;
  total: number;
  contributed: number;
  extra: number;
  detail: string;
};

function emptyIngredient(role: IngredientRole = "other"): IngredientDraftState {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    unit: "g",
    role,
    quantityInput: "",
    percentageInput: ""
  };
}

function toDraftIngredient(ingredient: RecipeIngredient): IngredientDraftState {
  return {
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    role: ingredient.role,
    quantityInput: formatDecimalInput(ingredient.quantity),
    percentageInput: formatDecimalInput(ingredient.bakerPercentage),
    linkedRecipeId: ingredient.linkedRecipeId,
    linkedRecipeName: ingredient.linkedRecipeName
  };
}

function getRecipeDraft(recipe: Recipe, ingredients: RecipeIngredient[], notes?: string): RecipeDraft {
  const metadata = cloneRecipeMetadata(recipe);

  return {
    name: recipe.name,
    ...metadata,
    notes: notes ?? metadata.notes,
    category: recipe.category ?? "bakery",
    useAsPreferment: recipe.useAsPreferment ?? false,
    scalingTarget: recipe.scalingTarget,
    scalingSnapshotIngredients: recipe.scalingSnapshotIngredients,
    ingredients
  };
}

function formatNumberInput(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
}

export function FormulaSheet({ recipe }: FormulaSheetProps) {
  const insets = useSafeAreaInsets();
  const { recipes, clearScalingTarget, createRecipe, deleteRecipe, updateRecipe } = useRecipes();
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleVisible, setScaleVisible] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exportScope, setExportScope] = useState<RecipeShareScope>("complete");
  const [exportJson, setExportJson] = useState("");
  const [shareText, setShareText] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"shareText" | "importCode" | null>(null);
  const [ingredientVisible, setIngredientVisible] = useState(false);
  const [prefermentVisible, setPrefermentVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState<PreparationEditorKind | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingredientDraft, setIngredientDraft] = useState<IngredientDraftState>(emptyIngredient());
  const [lastEditedField, setLastEditedField] = useState<IngredientField>(null);
  const [activeTab, setActiveTab] = useState<RecipeViewTab>(getDefaultRecipeViewTab());
  const [preparationSections, setPreparationSections] = useState<PreparationSectionsState>(
    getInitialPreparationSections
  );
  const [notesDraft, setNotesDraft] = useState(recipe.notes ?? "");
  const [preparationDraft, setPreparationDraft] = useState<string[]>(
    recipe.preparation?.steps.length ? [...recipe.preparation.steps] : [""]
  );
  const [fermentationDraft, setFermentationDraft] = useState({
    instructions: recipe.fermentation?.instructions ?? "",
    visualCue: recipe.fermentation?.visualCue ?? "",
    timeMinMinutes: formatNumberInput(recipe.fermentation?.timeMinMinutes),
    timeMaxMinutes: formatNumberInput(recipe.fermentation?.timeMaxMinutes),
    temperatureMinC: formatNumberInput(recipe.fermentation?.temperatureMinC),
    temperatureMaxC: formatNumberInput(recipe.fermentation?.temperatureMaxC)
  });
  const [bakingDraft, setBakingDraft] = useState({
    instructions: recipe.baking?.instructions ?? "",
    timeMinMinutes: formatNumberInput(recipe.baking?.timeMinMinutes),
    timeMaxMinutes: formatNumberInput(recipe.baking?.timeMaxMinutes),
    temperatureMinC: formatNumberInput(recipe.baking?.temperatureMinC),
    temperatureMaxC: formatNumberInput(recipe.baking?.temperatureMaxC)
  });
  const [yieldDraft, setYieldDraft] = useState({
    quantity: formatNumberInput(recipe.yield?.quantity),
    unit: recipe.yield?.unit ?? "",
    weightPerUnit: formatNumberInput(recipe.yield?.weightPerUnit),
    weightUnit: recipe.yield?.weightUnit ?? "g"
  });
  const [mode, setMode] = useState<ScaleMode>(
    recipe.scalingTarget?.mode === "doughWeight"
      ? "dough"
      : recipe.scalingTarget?.mode === "pieces"
        ? "yield"
        : "flour"
  );
  const [scaleHelp, setScaleHelp] = useState<ScaleMode | null>(null);
  const [flourTargetInput, setFlourTargetInput] = useState(
    formatDecimalInput(getTotalFlour(recipe.ingredients))
  );
  const prefermentRecipes = useMemo(
    () => recipes.filter((item) => item.id !== recipe.id && item.useAsPreferment),
    [recipe.id, recipes]
  );
  const recipeLookup = useMemo(() => new Map(recipes.map((item) => [item.id, item])), [recipes]);
  const flourTotal = getTotalFlour(recipe.ingredients);
  const primaryFlourQuantity = getPrimaryFlourQuantity(recipe.ingredients);
  const lookupRecipe = (linkedRecipeId: string) => recipeLookup.get(linkedRecipeId);
  const [doughTargetInput, setDoughTargetInput] = useState(
    formatDecimalInput(getDoughWeight(recipe.ingredients, lookupRecipe, recipe.id))
  );
  const [pieceCountInput, setPieceCountInput] = useState(
    recipe.scalingTarget?.mode === "pieces" && recipe.scalingTarget.pieces
      ? formatDecimalInput(recipe.scalingTarget.pieces)
      : "10"
  );
  const [pieceWeightInput, setPieceWeightInput] = useState(
    recipe.scalingTarget?.mode === "pieces" && recipe.scalingTarget.pieceWeight
      ? formatDecimalInput(recipe.scalingTarget.pieceWeight)
      : "200"
  );
  const [selectedPrefermentId, setSelectedPrefermentId] = useState<string | null>(null);
  const [prefermentMode, setPrefermentMode] = useState<PrefermentMode>("grams");
  const [prefermentQuantityInput, setPrefermentQuantityInput] = useState("");
  const [prefermentHelpVisible, setPrefermentHelpVisible] = useState(false);
  const [scalingHelpVisible, setScalingHelpVisible] = useState(false);
  const editingIngredient = editingIngredientId
    ? recipe.ingredients.find((ingredient) => ingredient.id === editingIngredientId) ?? null
    : null;
  const canMoveUp = editingIngredientId
    ? canMoveIngredient(recipe.ingredients, editingIngredientId, "up")
    : false;
  const canMoveDown = editingIngredientId
    ? canMoveIngredient(recipe.ingredients, editingIngredientId, "down")
    : false;
  const summary = useMemo(() => {
    const prefermentPercentage = recipe.ingredients
      .filter((ingredient) => ingredient.role === "preferment")
      .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

    return {
      flour: getTotalFlour(recipe.ingredients),
      liquids: getTotalLiquids(recipe.ingredients),
      doughWeight: getDoughWeight(recipe.ingredients, lookupRecipe, recipe.id),
      hydration: getHydrationPercentage(recipe.ingredients),
      moisture: getMoistureIndex(recipe.ingredients),
      preferment: prefermentPercentage > 0 ? `${prefermentPercentage}%` : "No"
    };
  }, [lookupRecipe, recipe.id, recipe.ingredients]);
  const activeScalingLabel = buildScalingTargetLabel(recipe.scalingTarget);
  const activeTabIcon = getRecipeCategoryIcon(recipe.category);
  const recipeTabSections = getRecipeTabSections(recipe);
  const preparationTabSections = getPreparationTabSections(recipe);
  const notesTabSections = getNotesTabSections(recipe);
  const prefermentCount = useMemo(
    () => recipe.ingredients.filter((ingredient) => ingredient.role === "preferment").length,
    [recipe.ingredients]
  );
  const prefermentContextItems = useMemo(() => {
    const totals = recipe.ingredients.reduce<Partial<Record<PrefermentContextKind, PrefermentContextItem>>>(
      (current, ingredient) => {
        const kind =
          ingredient.role === "flour"
            ? "flour"
            : ingredient.role === "water"
              ? "water"
              : null;

        if (!kind) {
          return current;
        }

        const breakdown = getIngredientDisplayBreakdown(
          ingredient,
          recipe.ingredients,
          lookupRecipe,
          recipe.id
        );

        if (breakdown.contributed <= 0) {
          return current;
        }

        const existing = current[kind] ?? {
          kind,
          total: 0,
          contributed: 0,
          extra: 0,
          detail: ""
        };

        current[kind] = {
          kind,
          total: existing.total + breakdown.totalRequired,
          contributed: existing.contributed + breakdown.contributed,
          extra: existing.extra + breakdown.visibleQuantity,
          detail: ""
        };

        return current;
      },
      {}
    );

    return (["flour", "water"] as const)
      .map((kind) => totals[kind])
      .filter((item): item is PrefermentContextItem => Boolean(item))
      .map((item) => ({
        ...item,
        detail: `[${item.total} - ${item.contributed}]`
      }));
  }, [lookupRecipe, recipe.id, recipe.ingredients]);

  useEffect(() => {
    setActiveTab(getDefaultRecipeViewTab());
    setPreparationSections(getInitialPreparationSections);
  }, [recipe.id]);

  useEffect(() => {
    setNotesDraft(recipe.notes ?? "");
    setPreparationDraft(recipe.preparation?.steps.length ? [...recipe.preparation.steps] : [""]);
    setFermentationDraft({
      instructions: recipe.fermentation?.instructions ?? "",
      visualCue: recipe.fermentation?.visualCue ?? "",
      timeMinMinutes: formatNumberInput(recipe.fermentation?.timeMinMinutes),
      timeMaxMinutes: formatNumberInput(recipe.fermentation?.timeMaxMinutes),
      temperatureMinC: formatNumberInput(recipe.fermentation?.temperatureMinC),
      temperatureMaxC: formatNumberInput(recipe.fermentation?.temperatureMaxC)
    });
    setBakingDraft({
      instructions: recipe.baking?.instructions ?? "",
      timeMinMinutes: formatNumberInput(recipe.baking?.timeMinMinutes),
      timeMaxMinutes: formatNumberInput(recipe.baking?.timeMaxMinutes),
      temperatureMinC: formatNumberInput(recipe.baking?.temperatureMinC),
      temperatureMaxC: formatNumberInput(recipe.baking?.temperatureMaxC)
    });
    setYieldDraft({
      quantity: formatNumberInput(recipe.yield?.quantity),
      unit: recipe.yield?.unit ?? "",
      weightPerUnit: formatNumberInput(recipe.yield?.weightPerUnit),
      weightUnit: recipe.yield?.weightUnit ?? "g"
    });
  }, [recipe]);

  function syncScaleInputs(nextIngredients: RecipeIngredient[]) {
    setFlourTargetInput(formatDecimalInput(getTotalFlour(nextIngredients)));
    setDoughTargetInput(formatDecimalInput(getDoughWeight(nextIngredients, lookupRecipe, recipe.id)));
  }

  function syncPercentagesForMultiFlour(nextIngredients: RecipeIngredient[]) {
    return recalculateBakerPercentagesFromQuantities(nextIngredients);
  }

  function updateRecipeIngredients(
    nextIngredients: RecipeIngredient[],
    nextNotes?: string,
    nextScalingTarget: RecipeScalingTarget | null = recipe.scalingTarget ?? null,
    nextScalingSnapshotIngredients: RecipeIngredient[] | null = recipe.scalingSnapshotIngredients ?? null
  ) {
    updateRecipe(recipe.id, {
      ...getRecipeDraft(recipe, nextIngredients, nextNotes),
      scalingTarget: nextScalingTarget ?? undefined,
      scalingSnapshotIngredients: nextScalingSnapshotIngredients ?? undefined
    });
    syncScaleInputs(nextIngredients);
  }

  function updateRecipeEditorialFields(nextFields: Partial<RecipeDraft>) {
    updateRecipe(recipe.id, {
      ...getRecipeDraft(recipe, recipe.ingredients),
      ...nextFields
    });
  }

  function openAddIngredient(role: IngredientRole = "other") {
    setEditingIngredientId(null);
    setIngredientDraft(emptyIngredient(role));
    setLastEditedField(null);
    setIngredientVisible(true);
    setMenuVisible(false);
  }

  function openEditIngredient(ingredientId: string) {
    const ingredient = recipe.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }

    setEditingIngredientId(ingredientId);
    setIngredientDraft(toDraftIngredient(ingredient));
    setLastEditedField(null);
    setIngredientVisible(true);
  }

  function handleIngredientQuantityChange(value: string) {
    setLastEditedField("quantity");
    setIngredientDraft((current) => {
      const quantity = parseDecimalInput(value);
      const percentage =
        current.role === "flour"
          ? editingIngredientId && isPrimaryFlourIngredient(recipe.ingredients, editingIngredientId)
            ? quantity > 0
              ? 100
              : 0
            : primaryFlourQuantity > 0
              ? getIngredientBakerPercentageFromQuantity(
                  recipe.ingredients,
                  {
                    id: editingIngredientId ?? current.id,
                    role: current.role
                  },
                  quantity
                )
              : 0
          : flourTotal > 0
            ? getBakerPercentageFromQuantity(quantity, flourTotal)
            : 0;

      return {
        ...current,
        quantityInput: value,
        percentageInput:
          value.trim() && flourTotal > 0 ? formatDecimalInput(percentage) : current.percentageInput
      };
    });
  }

  function handleIngredientPercentageChange(value: string) {
    setLastEditedField("percentage");
    setIngredientDraft((current) => {
      const percentage = parseDecimalInput(value);
      const quantity =
        current.role === "flour"
          ? editingIngredientId && isPrimaryFlourIngredient(recipe.ingredients, editingIngredientId)
            ? parseDecimalInput(current.quantityInput)
            : primaryFlourQuantity > 0
              ? getQuantityFromBakerPercentage(primaryFlourQuantity, percentage)
              : 0
          : flourTotal > 0
            ? getQuantityFromBakerPercentage(flourTotal, percentage)
            : 0;

      return {
        ...current,
        percentageInput: value,
        quantityInput:
          value.trim() && flourTotal > 0 ? formatDecimalInput(quantity) : current.quantityInput
      };
    });
  }

  function saveIngredient() {
    const quantity = parseDecimalInput(ingredientDraft.quantityInput);
    const bakerPercentage = parseDecimalInput(ingredientDraft.percentageInput);

    if (!ingredientDraft.name.trim()) {
      return;
    }

    let nextIngredient: RecipeIngredient = {
      id: ingredientDraft.id,
      name: ingredientDraft.name.trim(),
      quantity,
      unit: ingredientDraft.unit,
      role: ingredientDraft.role,
      bakerPercentage,
      linkedRecipeId: ingredientDraft.linkedRecipeId,
      linkedRecipeName: ingredientDraft.linkedRecipeName
    };

    const currentPrimaryFlourQuantity = getPrimaryFlourQuantity(recipe.ingredients);
    const editingPrimaryFlour =
      Boolean(editingIngredientId) &&
      nextIngredient.role === "flour" &&
      isPrimaryFlourIngredient(recipe.ingredients, editingIngredientId ?? "");

    if (lastEditedField === "percentage") {
      if (!(editingPrimaryFlour && nextIngredient.role === "flour")) {
        nextIngredient.quantity = getIngredientQuantityFromBakerPercentage(
          recipe.ingredients,
          nextIngredient,
          bakerPercentage
        );
      }
    }

    let nextIngredients: RecipeIngredient[];

    if (
      editingIngredientId &&
      editingPrimaryFlour &&
      lastEditedField === "quantity" &&
      currentPrimaryFlourQuantity > 0
    ) {
      const factor = quantity / currentPrimaryFlourQuantity;
      nextIngredients = recipe.ingredients.map((ingredient) =>
        ingredient.id === editingIngredientId
          ? {
              ...ingredient,
              name: nextIngredient.name,
              unit: nextIngredient.unit,
              linkedRecipeId: nextIngredient.linkedRecipeId,
              linkedRecipeName: nextIngredient.linkedRecipeName,
              quantity: Math.round(ingredient.quantity * factor * 10) / 10
            }
          : {
              ...ingredient,
              quantity: Math.round(ingredient.quantity * factor * 10) / 10
            }
      );
    } else {
      nextIngredients = editingIngredientId
        ? recipe.ingredients.map((ingredient) =>
            ingredient.id === editingIngredientId ? nextIngredient : ingredient
          )
        : [...recipe.ingredients, nextIngredient];
    }

    nextIngredients = syncPercentagesForMultiFlour(nextIngredients);

    const adjustedIngredients =
      recipe.scalingTarget && lastEditedField
        ? applyScalingTarget(nextIngredients, recipe.scalingTarget, lookupRecipe, recipe.id)
        : nextIngredients;

    updateRecipeIngredients(adjustedIngredients);
    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function removeIngredient() {
    if (!editingIngredientId) {
      return;
    }

    const nextIngredients = recipe.ingredients.filter(
      (ingredient) => ingredient.id !== editingIngredientId
    );

    updateRecipeIngredients(
      recipe.scalingTarget
        ? applyScalingTarget(nextIngredients, recipe.scalingTarget, lookupRecipe, recipe.id)
        : syncPercentagesForMultiFlour(nextIngredients)
    );
    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function moveIngredient(direction: "up" | "down") {
    if (!editingIngredientId) {
      return;
    }

    const nextIngredients = moveIngredientInList(recipe.ingredients, editingIngredientId, direction);

    if (nextIngredients === recipe.ingredients) {
      return;
    }

    updateRecipeIngredients(
      nextIngredients,
      undefined,
      recipe.scalingTarget ?? null,
      recipe.scalingSnapshotIngredients ?? null
    );
    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function duplicateRecipe() {
    const metadata = cloneRecipeMetadata(recipe);

    const duplicatedId = createRecipe({
      name: buildDuplicateRecipeName(recipe.name, recipes),
      ...metadata,
      category: recipe.category ?? "bakery",
      useAsPreferment: recipe.useAsPreferment ?? false,
      scalingTarget: recipe.scalingTarget,
      scalingSnapshotIngredients: recipe.scalingSnapshotIngredients?.map((ingredient) => ({
        ...ingredient,
        id: `${ingredient.id}-snapshot-${Date.now()}`
      })),
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        id: `${ingredient.id}-${Date.now()}`
      }))
    });

    setMenuVisible(false);
    router.replace(`/recipes/${duplicatedId}`);
  }

  function openExportModal() {
    setExportFormat(null);
    setExportScope("complete");
    setCopyFeedback(null);
    setExportMode("selector");
    setMenuVisible(false);
  }

  function openExportScope(format: ExportFormat) {
    setExportFormat(format);
    setCopyFeedback(null);
    setExportMode("scope");
  }

  function handleShareScope(scope: RecipeShareScope) {
    setExportScope(scope);

    if (exportFormat === "centeno") {
      handleShareRecipeFile(scope);
      return;
    }

    if (exportFormat === "text") {
      setShareText(formatRecipeAsShareText(recipe, recipes, scope));
      setExportMode("shareText");
      return;
    }

    if (exportFormat === "json") {
      setExportJson(exportRecipeToJson(recipe, scope));
      setExportMode("importCode");
    }
  }

  function openEditorialEditor(kind: PreparationEditorKind) {
    if (kind === "preparation") {
      setPreparationDraft(recipe.preparation?.steps.length ? [...recipe.preparation.steps] : [""]);
    }

    if (kind === "fermentation") {
      setFermentationDraft({
        instructions: recipe.fermentation?.instructions ?? "",
        visualCue: recipe.fermentation?.visualCue ?? "",
        timeMinMinutes: formatNumberInput(recipe.fermentation?.timeMinMinutes),
        timeMaxMinutes: formatNumberInput(recipe.fermentation?.timeMaxMinutes),
        temperatureMinC: formatNumberInput(recipe.fermentation?.temperatureMinC),
        temperatureMaxC: formatNumberInput(recipe.fermentation?.temperatureMaxC)
      });
    }

    if (kind === "baking") {
      setBakingDraft({
        instructions: recipe.baking?.instructions ?? "",
        timeMinMinutes: formatNumberInput(recipe.baking?.timeMinMinutes),
        timeMaxMinutes: formatNumberInput(recipe.baking?.timeMaxMinutes),
        temperatureMinC: formatNumberInput(recipe.baking?.temperatureMinC),
        temperatureMaxC: formatNumberInput(recipe.baking?.temperatureMaxC)
      });
    }

    if (kind === "yield") {
      setYieldDraft({
        quantity: formatNumberInput(recipe.yield?.quantity),
        unit: recipe.yield?.unit ?? "",
        weightPerUnit: formatNumberInput(recipe.yield?.weightPerUnit),
        weightUnit: recipe.yield?.weightUnit ?? "g"
      });
    }

    if (kind === "notes") {
      setNotesDraft(recipe.notes ?? "");
    }

    setEditorVisible(kind);
  }

  function closeEditorialEditor() {
    Keyboard.dismiss();
    setEditorVisible(null);
  }

  function toggleSection(section: PreparationSectionKey) {
    setPreparationSections((current) => togglePreparationSection(current, section));
  }

  function expandSection(section: PreparationSectionKey) {
    setPreparationSections((current) => expandPreparationSection(current, section));
  }

  function savePreparationDraft() {
    const steps = preparationDraft.map((step) => step.trim()).filter(Boolean);
    updateRecipeEditorialFields({
      preparation: steps.length ? { steps } : undefined
    });
    expandSection("preparation");
    closeEditorialEditor();
  }

  function saveFermentationDraft() {
    const nextFermentation: RecipeFermentation | undefined =
      fermentationDraft.instructions.trim() ||
      fermentationDraft.visualCue.trim() ||
      parseOptionalNumber(fermentationDraft.timeMinMinutes) ||
      parseOptionalNumber(fermentationDraft.timeMaxMinutes) ||
      parseOptionalNumber(fermentationDraft.temperatureMinC) ||
      parseOptionalNumber(fermentationDraft.temperatureMaxC)
        ? {
            instructions: fermentationDraft.instructions,
            visualCue: fermentationDraft.visualCue,
            timeMinMinutes: parseOptionalNumber(fermentationDraft.timeMinMinutes),
            timeMaxMinutes: parseOptionalNumber(fermentationDraft.timeMaxMinutes),
            temperatureMinC: parseOptionalNumber(fermentationDraft.temperatureMinC),
            temperatureMaxC: parseOptionalNumber(fermentationDraft.temperatureMaxC)
          }
        : undefined;

    updateRecipeEditorialFields({
      fermentation: nextFermentation
    });
    expandSection("fermentation");
    closeEditorialEditor();
  }

  function saveBakingDraft() {
    const nextBaking: RecipeBaking | undefined =
      bakingDraft.instructions.trim() ||
      parseOptionalNumber(bakingDraft.timeMinMinutes) ||
      parseOptionalNumber(bakingDraft.timeMaxMinutes) ||
      parseOptionalNumber(bakingDraft.temperatureMinC) ||
      parseOptionalNumber(bakingDraft.temperatureMaxC)
        ? {
            instructions: bakingDraft.instructions,
            timeMinMinutes: parseOptionalNumber(bakingDraft.timeMinMinutes),
            timeMaxMinutes: parseOptionalNumber(bakingDraft.timeMaxMinutes),
            temperatureMinC: parseOptionalNumber(bakingDraft.temperatureMinC),
            temperatureMaxC: parseOptionalNumber(bakingDraft.temperatureMaxC)
          }
        : undefined;

    updateRecipeEditorialFields({
      baking: nextBaking
    });
    expandSection("baking");
    closeEditorialEditor();
  }

  function saveYieldDraft() {
    const nextYield: RecipeYield | undefined =
      parseOptionalNumber(yieldDraft.quantity) ||
      yieldDraft.unit.trim() ||
      parseOptionalNumber(yieldDraft.weightPerUnit)
        ? {
            quantity: parseOptionalNumber(yieldDraft.quantity),
            unit: yieldDraft.unit,
            weightPerUnit: parseOptionalNumber(yieldDraft.weightPerUnit),
            weightUnit: parseOptionalNumber(yieldDraft.weightPerUnit)
              ? (yieldDraft.weightUnit as RecipeYield["weightUnit"])
              : undefined
          }
        : undefined;

    updateRecipeEditorialFields({
      yield: nextYield
    });
    expandSection("yield");
    closeEditorialEditor();
  }

  function saveNotesDraft() {
    updateRecipeEditorialFields({
      notes: notesDraft
    });
    closeEditorialEditor();
  }

  function requestCloseEditorialEditor() {
    const preparationDirty =
      JSON.stringify(preparationDraft) !== JSON.stringify(recipe.preparation?.steps ?? [""]);
    const fermentationDirty =
      fermentationDraft.instructions !== (recipe.fermentation?.instructions ?? "") ||
      fermentationDraft.visualCue !== (recipe.fermentation?.visualCue ?? "") ||
      fermentationDraft.timeMinMinutes !== formatNumberInput(recipe.fermentation?.timeMinMinutes) ||
      fermentationDraft.timeMaxMinutes !== formatNumberInput(recipe.fermentation?.timeMaxMinutes) ||
      fermentationDraft.temperatureMinC !==
        formatNumberInput(recipe.fermentation?.temperatureMinC) ||
      fermentationDraft.temperatureMaxC !==
        formatNumberInput(recipe.fermentation?.temperatureMaxC);
    const bakingDirty =
      bakingDraft.instructions !== (recipe.baking?.instructions ?? "") ||
      bakingDraft.timeMinMinutes !== formatNumberInput(recipe.baking?.timeMinMinutes) ||
      bakingDraft.timeMaxMinutes !== formatNumberInput(recipe.baking?.timeMaxMinutes) ||
      bakingDraft.temperatureMinC !== formatNumberInput(recipe.baking?.temperatureMinC) ||
      bakingDraft.temperatureMaxC !== formatNumberInput(recipe.baking?.temperatureMaxC);
    const yieldDirty =
      yieldDraft.quantity !== formatNumberInput(recipe.yield?.quantity) ||
      yieldDraft.unit !== (recipe.yield?.unit ?? "") ||
      yieldDraft.weightPerUnit !== formatNumberInput(recipe.yield?.weightPerUnit) ||
      yieldDraft.weightUnit !== (recipe.yield?.weightUnit ?? "g");
    const notesDirty = notesDraft !== (recipe.notes ?? "");

    const dirty =
      (editorVisible === "preparation" && preparationDirty) ||
      (editorVisible === "fermentation" && fermentationDirty) ||
      (editorVisible === "baking" && bakingDirty) ||
      (editorVisible === "yield" && yieldDirty) ||
      (editorVisible === "notes" && notesDirty);

    if (!dirty) {
      closeEditorialEditor();
      return;
    }

    Alert.alert(
      "Descartar cambios",
      "Hay cambios sin guardar en esta seccion.",
      [
        { text: "Seguir editando", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: closeEditorialEditor
        }
      ]
    );
  }

  const editorialEditorSheet =
    editorVisible === "preparation" ? (
      <EditorialEditorSheet
        onCancel={requestCloseEditorialEditor}
        onClose={requestCloseEditorialEditor}
        onSave={savePreparationDraft}
        title="Preparacion"
      >
        <Text style={styles.helperText}>Carga los pasos en el orden de trabajo.</Text>
        {preparationDraft.map((step, index) => (
          <View key={`editor-step-${index}`} style={styles.editorCard}>
            <View style={styles.editorCardHeader}>
              <Text style={styles.editorCardTitle}>{`Paso ${index + 1}`}</Text>
              <View style={styles.editorRowActions}>
                <SmallEditorAction
                  disabled={index === 0}
                  label="↑"
                  onPress={() =>
                    setPreparationDraft((current) => moveListItem(current, index, "up"))
                  }
                />
                <SmallEditorAction
                  disabled={index === preparationDraft.length - 1}
                  label="↓"
                  onPress={() =>
                    setPreparationDraft((current) => moveListItem(current, index, "down"))
                  }
                />
                <SmallEditorAction
                  label="Eliminar"
                  onPress={() =>
                    setPreparationDraft((current) => {
                      const next = current.filter((_, currentIndex) => currentIndex !== index);
                      return next.length ? next : [""];
                    })
                  }
                />
              </View>
            </View>
            <TextInput
              multiline
              onChangeText={(value) =>
                setPreparationDraft((current) =>
                  current.map((stepValue, currentIndex) =>
                    currentIndex === index ? value : stepValue
                  )
                )
              }
              placeholder="Describe este paso"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.field, styles.notesField]}
              textAlignVertical="top"
              value={step}
            />
          </View>
        ))}
        <View style={styles.copyActionRow}>
          <Pressable
            onPress={() => setPreparationDraft((current) => [...current, ""])}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
          >
            <Text style={styles.secondaryActionLabel}>Agregar paso</Text>
          </Pressable>
        </View>
      </EditorialEditorSheet>
    ) : editorVisible === "fermentation" ? (
      <EditorialEditorSheet
        onCancel={requestCloseEditorialEditor}
        onClose={requestCloseEditorialEditor}
        onSave={saveFermentationDraft}
        title="Fermentacion"
      >
        <FieldLabel label="Indicaciones" />
        <TextInput
          multiline
          onChangeText={(value) =>
            setFermentationDraft((current) => ({ ...current, instructions: value }))
          }
          placeholder="Indicaciones generales de fermentacion"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.field, styles.notesField]}
          textAlignVertical="top"
          value={fermentationDraft.instructions}
        />
        <FieldLabel label="Criterio visual" />
        <TextInput
          multiline
          onChangeText={(value) =>
            setFermentationDraft((current) => ({ ...current, visualCue: value }))
          }
          placeholder="Hasta observar..."
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.field, styles.notesField]}
          textAlignVertical="top"
          value={fermentationDraft.visualCue}
        />
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Tiempo minimo" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setFermentationDraft((current) => ({ ...current, timeMinMinutes: value }))
              }
              placeholder="60"
              suffix="min"
              value={fermentationDraft.timeMinMinutes}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Tiempo maximo" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setFermentationDraft((current) => ({ ...current, timeMaxMinutes: value }))
              }
              placeholder="90"
              suffix="min"
              value={fermentationDraft.timeMaxMinutes}
            />
          </View>
        </View>
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Temperatura minima" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setFermentationDraft((current) => ({ ...current, temperatureMinC: value }))
              }
              placeholder="24"
              suffix="°C"
              value={fermentationDraft.temperatureMinC}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Temperatura maxima" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setFermentationDraft((current) => ({ ...current, temperatureMaxC: value }))
              }
              placeholder="26"
              suffix="°C"
              value={fermentationDraft.temperatureMaxC}
            />
          </View>
        </View>
      </EditorialEditorSheet>
    ) : editorVisible === "baking" ? (
      <EditorialEditorSheet
        onCancel={requestCloseEditorialEditor}
        onClose={requestCloseEditorialEditor}
        onSave={saveBakingDraft}
        title="Horneado"
      >
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Temperatura minima" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setBakingDraft((current) => ({ ...current, temperatureMinC: value }))
              }
              placeholder="220"
              suffix="°C"
              value={bakingDraft.temperatureMinC}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Temperatura maxima" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setBakingDraft((current) => ({ ...current, temperatureMaxC: value }))
              }
              placeholder="240"
              suffix="°C"
              value={bakingDraft.temperatureMaxC}
            />
          </View>
        </View>
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Tiempo minimo" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setBakingDraft((current) => ({ ...current, timeMinMinutes: value }))
              }
              placeholder="20"
              suffix="min"
              value={bakingDraft.timeMinMinutes}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Tiempo maximo" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setBakingDraft((current) => ({ ...current, timeMaxMinutes: value }))
              }
              placeholder="30"
              suffix="min"
              value={bakingDraft.timeMaxMinutes}
            />
          </View>
        </View>
        <FieldLabel label="Indicaciones" />
        <TextInput
          multiline
          onChangeText={(value) =>
            setBakingDraft((current) => ({ ...current, instructions: value }))
          }
          placeholder="Hornear hasta obtener..."
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.field, styles.notesField]}
          textAlignVertical="top"
          value={bakingDraft.instructions}
        />
      </EditorialEditorSheet>
    ) : editorVisible === "yield" ? (
      <EditorialEditorSheet
        onCancel={requestCloseEditorialEditor}
        onClose={requestCloseEditorialEditor}
        onSave={saveYieldDraft}
        title="Rendimiento"
      >
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Cantidad" />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => setYieldDraft((current) => ({ ...current, quantity: value }))}
              placeholder="3"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={yieldDraft.quantity}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Unidad" />
            <TextInput
              onChangeText={(value) => setYieldDraft((current) => ({ ...current, unit: value }))}
              placeholder="lactales"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={yieldDraft.unit}
            />
          </View>
        </View>
        <View style={styles.inlineFields}>
          <View style={styles.flex}>
            <FieldLabel label="Peso por unidad" />
            <InputWithSuffix
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setYieldDraft((current) => ({ ...current, weightPerUnit: value }))
              }
              placeholder="1000"
              suffix={yieldDraft.weightUnit}
              value={yieldDraft.weightPerUnit}
            />
          </View>
          <View style={styles.flex}>
            <FieldLabel label="Unidad de peso" />
            <View style={styles.choiceRow}>
              {(["g", "kg"] as const).map((unit) => (
                <ChoiceButton
                  active={yieldDraft.weightUnit === unit}
                  key={unit}
                  label={unit}
                  onPress={() => setYieldDraft((current) => ({ ...current, weightUnit: unit }))}
                />
              ))}
            </View>
          </View>
        </View>
      </EditorialEditorSheet>
    ) : editorVisible === "notes" ? (
      <EditorialEditorSheet
        onCancel={requestCloseEditorialEditor}
        onClose={requestCloseEditorialEditor}
        onSave={saveNotesDraft}
        title="Notas"
      >
        <RichTextEditor
          onChangeText={setNotesDraft}
          placeholder="Agrega tips, variantes o aclaraciones"
          value={notesDraft}
        />
      </EditorialEditorSheet>
    ) : null;

  async function handleCopyExport(value: string, modeValue: "shareText" | "importCode") {
    const copied = await setClipboardText(value);

    if (!copied) {
      Alert.alert("El portapapeles no esta disponible en esta build.");
      return;
    }

    setCopyFeedback(modeValue);
    setTimeout(() => {
      setCopyFeedback((current) => (current === modeValue ? null : current));
    }, 1500);
  }

  async function handleShareRecipeFile(scope: RecipeShareScope) {
    try {
      await shareCentenoRecipeFile(recipe, scope);
      setExportMode(null);
    } catch (error) {
      if (error instanceof Error && error.message === "SHARING_UNAVAILABLE") {
        Alert.alert("No se pudo abrir el menu para compartir en este dispositivo.");
        return;
      }

      Alert.alert("No se pudo crear el archivo de la receta.");
    }
  }

  function applyAdjustment() {
    let nextIngredients = recipe.ingredients;

    if (mode === "flour") {
      nextIngredients = applyScaleByTotalFlour(recipe.ingredients, parseDecimalInput(flourTargetInput));
    }

    if (mode === "dough") {
      nextIngredients = applyScaleByDoughWeight(
        recipe.ingredients,
        parseDecimalInput(doughTargetInput),
        lookupRecipe,
        recipe.id
      );
    }

    if (mode === "yield") {
      nextIngredients = applyScaleByYield(
        recipe.ingredients,
        Math.max(0, Math.round(parseDecimalInput(pieceCountInput))),
        parseDecimalInput(pieceWeightInput),
        lookupRecipe,
        recipe.id
      );
    }

    const nextScalingTarget =
      mode === "flour"
        ? {
            mode: "totalFlour" as const,
            totalFlour: parseDecimalInput(flourTargetInput)
          }
        : mode === "dough"
          ? {
              mode: "doughWeight" as const,
              doughWeight: parseDecimalInput(doughTargetInput)
            }
          : {
              mode: "pieces" as const,
              pieces: Math.max(0, Math.round(parseDecimalInput(pieceCountInput))),
              pieceWeight: parseDecimalInput(pieceWeightInput),
              doughWeight:
                Math.max(0, Math.round(parseDecimalInput(pieceCountInput))) *
                parseDecimalInput(pieceWeightInput)
            };

    updateRecipeIngredients(
      nextIngredients,
      undefined,
      nextScalingTarget,
      recipe.ingredients.map((ingredient) => ({ ...ingredient }))
    );
    Keyboard.dismiss();
    setScaleVisible(false);
  }

  function openPrefermentModal() {
    setSelectedPrefermentId(null);
    setPrefermentMode("grams");
    setPrefermentQuantityInput("");
    setPrefermentVisible(true);
    setMenuVisible(false);
  }

  function savePrefermentIngredient() {
    const selected = prefermentRecipes.find((item) => item.id === selectedPrefermentId);
    const numericValue = parseDecimalInput(prefermentQuantityInput);

    if (!selected || numericValue <= 0) {
      return;
    }

    const quantity =
      prefermentMode === "grams"
        ? numericValue
        : getQuantityFromBakerPercentage(flourTotal, numericValue);

    const bakerPercentage =
      prefermentMode === "percent"
        ? numericValue
        : getBakerPercentageFromQuantity(quantity, flourTotal);

    const nextIngredients: RecipeIngredient[] = [
      ...recipe.ingredients,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: selected.name,
        quantity,
        unit: "g" as const,
        role: "preferment" as const,
        bakerPercentage,
        linkedRecipeId: selected.id,
        linkedRecipeName: selected.name
      }
    ];

    updateRecipeIngredients(
      recipe.scalingTarget
        ? applyScalingTarget(
            syncPercentagesForMultiFlour(nextIngredients),
            recipe.scalingTarget,
            lookupRecipe,
            recipe.id
          )
        : syncPercentagesForMultiFlour(nextIngredients)
    );

    Keyboard.dismiss();
    setPrefermentVisible(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top + 10 }]}>
        <View style={styles.toolbar}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityLabel="Volver"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.iconText}>{"\u2039"}</Text>
            </Pressable>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>
              {recipe.name}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Agregar ingrediente"
              onPress={() => openAddIngredient()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.iconText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Editar receta"
              onPress={() => router.push(`/recipes/form?id=${recipe.id}`)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.editIcon}>{"\u270E"}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Menu"
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.menuIcon}>{"\u22EE"}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <CompactMetric label="Harina" value={`${summary.flour} g`} />
        <CompactMetric label="Liquido" value={`${summary.liquids} g`} />
        <CompactMetric label="Masa" value={`${summary.doughWeight} g`} />
        <CompactMetric label="Prefermento" value={summary.preferment} />
      </View>
      <View style={styles.tabRow}>
        <RecipeTabButton
          active={activeTab === "recipe"}
          icon={activeTab === "recipe" ? activeTabIcon : null}
          label="Receta"
          onPress={() => setActiveTab("recipe")}
        />
        <RecipeTabButton
          active={activeTab === "preparation"}
          icon={activeTab === "preparation" ? activeTabIcon : null}
          label="Preparacion"
          onPress={() => setActiveTab("preparation")}
        />
        <RecipeTabButton
          active={activeTab === "notes"}
          icon={activeTab === "notes" ? activeTabIcon : null}
          label="Notas"
          onPress={() => setActiveTab("notes")}
        />
      </View>

      {activeTab === "recipe" ? (
        <>
          <HydrationBar hydration={summary.hydration} />
          {activeScalingLabel ? (
            <View style={styles.activeTargetRow}>
              <View style={styles.activeTargetChip}>
                <Text style={styles.activeTargetText}>{activeScalingLabel}</Text>
              </View>
              <Pressable
                accessibilityLabel="Explicar ajuste activo"
                onPress={() => setScalingHelpVisible(true)}
                style={({ pressed }) => [styles.helpChip, pressed && styles.chipPressed]}
              >
                <Text style={styles.helpChipText}>?</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.ingredientsList}>
            {recipe.ingredients.map((ingredient) => {
              const displayBreakdown = getIngredientDisplayBreakdown(
                ingredient,
                recipe.ingredients,
                (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
                recipe.id
              );

              return (
                <IngredientRow
                  displayName={getLinkedRecipeDisplayName(ingredient, recipeLookup)}
                  ingredient={ingredient}
                  key={ingredient.id}
                  onBreakdownHelpPress={
                    displayBreakdown.detail ? () => setPrefermentHelpVisible(true) : undefined
                  }
                  onPress={() => openEditIngredient(ingredient.id)}
                  prefermentBreakdown={getPrefermentBreakdown(
                    ingredient,
                    (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
                    recipe.id
                  )}
                  quantityDetail={displayBreakdown.detail}
                  quantityOverride={displayBreakdown.visibleQuantity}
                  quantityWarning={displayBreakdown.warning}
                />
              );
            })}
          </View>
          {recipeTabSections.description ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Descripcion</Text>
              <Text style={styles.detailSectionText}>{recipe.description?.trim()}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {activeTab === "preparation" ? (
        <View style={styles.tabContent}>
          <EditorialSection
            actionLabel={preparationTabSections.preparation ? "Editar" : "Agregar"}
            expanded={preparationSections.preparation}
            onPress={() => openEditorialEditor("preparation")}
            onToggle={() => toggleSection("preparation")}
            title="Preparacion"
          >
            {preparationTabSections.preparation ? (
              <View style={styles.detailSteps}>
                {recipe.preparation?.steps.map((step, index) => (
                  <View key={`preparation-${index}`} style={styles.detailStepRow}>
                    <Text style={styles.detailStepIndex}>{`${index + 1}.`}</Text>
                    <Text style={styles.detailSectionText}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyTabText}>Todavia no agregaste pasos de preparacion.</Text>
            )}
          </EditorialSection>
          <EditorialSection
            actionLabel={preparationTabSections.fermentation ? "Editar" : "Agregar"}
            expanded={preparationSections.fermentation}
            onPress={() => openEditorialEditor("fermentation")}
            onToggle={() => toggleSection("fermentation")}
            title="Fermentacion"
          >
            {preparationTabSections.fermentation ? (
              <>
                {formatFermentationSummary(recipe.fermentation) ? (
                  <Text style={styles.detailSectionMeta}>{formatFermentationSummary(recipe.fermentation)}</Text>
                ) : null}
                {recipe.fermentation?.instructions ? (
                  <Text style={styles.detailSectionText}>{recipe.fermentation.instructions}</Text>
                ) : null}
                {recipe.fermentation?.visualCue ? (
                  <Text style={styles.detailSectionText}>{recipe.fermentation.visualCue}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.emptyTabText}>Todavia no agregaste datos de fermentacion.</Text>
            )}
          </EditorialSection>
          <EditorialSection
            actionLabel={preparationTabSections.baking ? "Editar" : "Agregar"}
            expanded={preparationSections.baking}
            onPress={() => openEditorialEditor("baking")}
            onToggle={() => toggleSection("baking")}
            title="Horneado"
          >
            {preparationTabSections.baking ? (
              <>
                {formatBakingSummary(recipe.baking) ? (
                  <Text style={styles.detailSectionMeta}>{formatBakingSummary(recipe.baking)}</Text>
                ) : null}
                {recipe.baking?.instructions ? (
                  <Text style={styles.detailSectionText}>{recipe.baking.instructions}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.emptyTabText}>Todavia no agregaste datos de horneado.</Text>
            )}
          </EditorialSection>
          <EditorialSection
            actionLabel={recipe.yield ? "Editar" : "Agregar"}
            expanded={preparationSections.yield}
            onPress={() => openEditorialEditor("yield")}
            onToggle={() => toggleSection("yield")}
            title="Rendimiento"
          >
            {recipe.yield ? (
              <Text style={styles.detailSectionMeta}>{formatYieldSummary(recipe.yield)}</Text>
            ) : (
              <Text style={styles.emptyTabText}>Todavia no agregaste datos de rendimiento.</Text>
            )}
          </EditorialSection>
        </View>
      ) : null}

      {activeTab === "notes" ? (
        <View style={styles.tabContent}>
          <EditorialSection
            actionLabel={notesTabSections.notes ? "Editar" : "Agregar nota"}
            onPress={() => openEditorialEditor("notes")}
            title="Notas"
          >
            {notesTabSections.notes ? (
              <RichTextContent value={recipe.notes} />
            ) : (
              <Text style={styles.emptyTabText}>
                Agrega tips, sustituciones o cualquier detalle adicional de la receta.
              </Text>
            )}
          </EditorialSection>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIngredientVisible(false);
        }}
        transparent
        visible={ingredientVisible}
      >
        <CenteredModalSheet
          onBackdropPress={() => {
            Keyboard.dismiss();
            setIngredientVisible(false);
          }}
        >
          <Text style={styles.sheetTitle}>
            {editingIngredientId ? "Editar ingrediente" : "Anadir ingrediente"}
          </Text>
          <FieldLabel label="Nombre del ingrediente" />
          <TextInput
            onChangeText={(value) => setIngredientDraft((current) => ({ ...current, name: value }))}
            placeholder="Nombre"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.field}
            value={ingredientDraft.name}
          />
          <FieldLabel label={ingredientFieldCopy.amount.label} />
          <InputWithSuffix
            keyboardType="decimal-pad"
            onChangeText={handleIngredientQuantityChange}
            placeholder={ingredientFieldCopy.amount.placeholder}
            suffix={ingredientFieldCopy.amount.unit}
            value={ingredientDraft.quantityInput}
          />
          <FieldLabel label={ingredientFieldCopy.percentage.label} />
          <InputWithSuffix
            keyboardType="decimal-pad"
            onChangeText={handleIngredientPercentageChange}
            placeholder={ingredientFieldCopy.percentage.placeholder}
            suffix={ingredientFieldCopy.percentage.unit}
            value={ingredientDraft.percentageInput}
          />
          <FieldLabel label="Rol del ingrediente" />
          <View style={styles.choiceRow}>
            {roles.map((role) => (
              <RoleChoiceButton
                active={ingredientDraft.role === role}
                key={role}
                label={ingredientRoleLabels[role]}
                role={role}
                onPress={() => setIngredientDraft((current) => ({ ...current, role }))}
              />
            ))}
          </View>
          {editingIngredient?.role === "flour" &&
          editingIngredientId &&
          isPrimaryFlourIngredient(recipe.ingredients, editingIngredientId) ? (
            <Text style={styles.baseFlourNote}>Esta es la harina base de la formula.</Text>
          ) : null}
          {editingIngredientId ? (
            <View style={styles.reorderActions}>
              <Pressable
                disabled={!canMoveUp}
                onPress={() => moveIngredient("up")}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  !canMoveUp && styles.secondaryActionDisabled,
                  pressed && canMoveUp && styles.secondaryActionPressed
                ]}
              >
                <Text
                  style={[
                    styles.secondaryActionLabel,
                    !canMoveUp && styles.secondaryActionLabelDisabled
                  ]}
                >
                  ↑ Subir
                </Text>
              </Pressable>
              <Pressable
                disabled={!canMoveDown}
                onPress={() => moveIngredient("down")}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  !canMoveDown && styles.secondaryActionDisabled,
                  pressed && canMoveDown && styles.secondaryActionPressed
                ]}
              >
                <Text
                  style={[
                    styles.secondaryActionLabel,
                    !canMoveDown && styles.secondaryActionLabelDisabled
                  ]}
                >
                  ↓ Bajar
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.sheetActions}>
            {editingIngredientId ? (
              <Pressable
                onPress={removeIngredient}
                style={({ pressed }) => [styles.destructiveButton, pressed && styles.destructiveButtonPressed]}
              >
                <Text style={styles.destructiveButtonText}>Eliminar</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setIngredientVisible(false);
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={saveIngredient}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Guardar</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={requestCloseEditorialEditor}
        transparent
        visible={editorVisible !== null}
      >
        {editorialEditorSheet}
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setExportMode(null)}
        transparent
        visible={exportMode !== null}
      >
        <CenteredModalSheet onBackdropPress={() => setExportMode(null)}>
          {exportMode === "selector" ? (
            <>
              <Text style={styles.sheetTitle}>Exportar receta</Text>
              <Text style={styles.helperText}>
                Elegi como queres compartir esta receta.
              </Text>
              <Pressable
                onPress={() => openExportScope("text")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Compartir como texto</Text>
                <Text style={styles.exportOptionDescription}>
                  Para WhatsApp, notas o imprimir.
                </Text>
              </Pressable>
              <Pressable
                onPress={() => openExportScope("centeno")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Compartir archivo CENTENO</Text>
                <Text style={styles.exportOptionDescription}>
                  Para importar en otra instalacion de CENTENO.
                </Text>
              </Pressable>
              <Pressable
                onPress={() => openExportScope("json")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Codigo de respaldo</Text>
                <Text style={styles.exportOptionDescription}>
                  Opcion avanzada para copiar y pegar.
                </Text>
              </Pressable>
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setExportMode(null)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cerrar</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {exportMode === "scope" ? (
            <>
              <Text style={styles.sheetTitle}>¿Que queres compartir?</Text>
              <Text style={styles.helperText}>
                Elegi cuanta informacion incluir.
              </Text>
              <Pressable
                onPress={() => handleShareScope("formula")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Solo receta</Text>
                <Text style={styles.exportOptionDescription}>
                  Ingredientes, cantidades, porcentajes y formula.
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleShareScope("complete")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Receta completa</Text>
                <Text style={styles.exportOptionDescription}>
                  Incluye preparacion, fermentacion, horneado, rendimiento y notas.
                </Text>
              </Pressable>
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setExportMode("selector")}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Volver</Text>
                </Pressable>
                <Pressable
                  onPress={() => setExportMode(null)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cancelar</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {exportMode === "shareText" ? (
            <>
              <Text style={styles.sheetTitle}>Compartir como texto</Text>
              <Text style={styles.helperText}>
                Copia esta receta para enviarla por WhatsApp o guardarla en notas.
              </Text>
              <View style={styles.copyActionRow}>
                <Pressable
                  onPress={() => handleCopyExport(shareText, "shareText")}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>
                    {copyFeedback === "shareText" ? "Copiado \u2713" : "Copiar"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                multiline
                editable
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.exportField]}
                textAlignVertical="top"
                value={shareText}
              />
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setExportMode("scope")}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Volver</Text>
                </Pressable>
                <Pressable
                  onPress={() => setExportMode(null)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cerrar</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {exportMode === "importCode" ? (
            <>
              <Text style={styles.sheetTitle}>Codigo de respaldo</Text>
              <Text style={styles.helperText}>
                Copia este codigo completo para cargar la receta en otro CENTENO.
              </Text>
              <View style={styles.copyActionRow}>
                <Pressable
                  onPress={() => handleCopyExport(exportJson, "importCode")}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.secondaryActionPressed
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>
                    {copyFeedback === "importCode" ? "Copiado \u2713" : "Copiar"}
                  </Text>
                </Pressable>
              </View>
              <TextInput
                multiline
                editable
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.exportField]}
                textAlignVertical="top"
                value={exportJson}
              />
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => setExportMode("scope")}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Volver</Text>
                </Pressable>
                <Pressable
                  onPress={() => setExportMode(null)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cerrar</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setScalingHelpVisible(false)}
        transparent
        visible={scalingHelpVisible}
      >
        <CenteredModalSheet onBackdropPress={() => setScalingHelpVisible(false)}>
          <Text style={styles.sheetTitle}>Ajuste activo</Text>
          <Text style={styles.notesText}>CENTENO puede mantener un objetivo de produccion activo.</Text>
          {recipe.scalingTarget?.mode === "pieces" ? (
            <Text style={styles.notesText}>
              En esta receta:
              {"\n"}
              {`${recipe.scalingTarget.pieces ?? 0} piezas x ${recipe.scalingTarget.pieceWeight ?? 0} g = ${recipe.scalingTarget.doughWeight ?? 0} g de masa objetivo.`}
            </Text>
          ) : null}
          {recipe.scalingTarget?.mode === "doughWeight" ? (
            <Text style={styles.notesText}>
              En esta receta:
              {"\n"}
              {`El objetivo activo es ${recipe.scalingTarget.doughWeight ?? 0} g de masa.`}
            </Text>
          ) : null}
          {recipe.scalingTarget?.mode === "totalFlour" ? (
            <Text style={styles.notesText}>
              En esta receta:
              {"\n"}
              {`El objetivo activo es ${recipe.scalingTarget.totalFlour ?? 0} g de harina total.`}
            </Text>
          ) : null}
          <Text style={styles.notesText}>
            Mientras el ajuste activo este encendido:
            {"\n"}• Si agregas un ingrediente por porcentaje, la masa total se mantiene.
            {"\n"}• Si cambias porcentajes, la formula se recalcula.
            {"\n"}• Si queres editar libremente sin mantener ese objetivo, usa "Quitar ajuste activo".
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => setScalingHelpVisible(false)}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Entendido</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPrefermentHelpVisible(false)}
        transparent
        visible={prefermentHelpVisible}
      >
        <CenteredModalSheet onBackdropPress={() => setPrefermentHelpVisible(false)}>
          <Text style={styles.sheetTitle}>Aporte del prefermento</Text>
          <Text style={styles.notesText}>
            En esta receta, CENTENO mantiene los porcentajes de la formula total, pero descuenta la
            harina y el agua que ya vienen dentro del{" "}
            {prefermentCount > 1 ? "aporte total de los prefermentos." : "prefermento."}
          </Text>
          {prefermentContextItems.map((item) => {
            const label = item.kind === "flour" ? "Harina" : "Agua";
            const source = prefermentCount > 1 ? "el total de los prefermentos" : "el prefermento";

            return (
              <Text key={item.kind} style={styles.notesText}>
                {label}:
                {"\n"}
                {`${item.total} g = ${label.toLowerCase()} total de la formula`}
                {"\n"}
                {`${item.contributed} g = ${label.toLowerCase()} que aporta ${source}`}
                {"\n"}
                {`${item.extra} g = ${label.toLowerCase()} extra que tenes que agregar`}
              </Text>
            );
          })}
          {prefermentContextItems.length ? (
            <Text style={styles.notesText}>
              Por eso ves:
              {prefermentContextItems.map((item) => `\n${item.detail}`).join("")}
            </Text>
          ) : null}
          <Text style={styles.notesText}>
            La hidratacion se calcula sobre la formula total, no solo sobre lo que agregas aparte.
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => setPrefermentHelpVisible(false)}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Entendido</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setScaleVisible(false)}
        transparent
        visible={scaleVisible}
      >
        <CenteredModalSheet
          onBackdropPress={() => {
            Keyboard.dismiss();
            setScaleVisible(false);
          }}
        >
          <Text style={styles.sheetTitle}>Ajustar receta</Text>
          <ScaleOption
            active={mode === "flour"}
            descriptionVisible={scaleHelp === "flour"}
            label="Por harina"
            onInfoPress={() => setScaleHelp((current) => (current === "flour" ? null : "flour"))}
            onPress={() => setMode("flour")}
          />
          {scaleHelp === "flour" ? <Text style={styles.helperText}>{scaleCopy.flour}</Text> : null}
          <ScaleOption
            active={mode === "dough"}
            descriptionVisible={scaleHelp === "dough"}
            label="Por masa total"
            onInfoPress={() => setScaleHelp((current) => (current === "dough" ? null : "dough"))}
            onPress={() => setMode("dough")}
          />
          {scaleHelp === "dough" ? <Text style={styles.helperText}>{scaleCopy.dough}</Text> : null}
          <ScaleOption
            active={mode === "yield"}
            descriptionVisible={scaleHelp === "yield"}
            label="Por piezas"
            onInfoPress={() => setScaleHelp((current) => (current === "yield" ? null : "yield"))}
            onPress={() => setMode("yield")}
          />
          {scaleHelp === "yield" ? <Text style={styles.helperText}>{scaleCopy.yield}</Text> : null}

          {mode === "flour" ? (
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setFlourTargetInput}
              placeholder="Harina total objetivo (g)"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={flourTargetInput}
            />
          ) : null}

          {mode === "dough" ? (
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setDoughTargetInput}
              placeholder="Masa total objetivo (g)"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={doughTargetInput}
            />
          ) : null}

          {mode === "yield" ? (
            <View style={styles.inlineFields}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setPieceCountInput}
                placeholder="Cantidad de piezas"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.flex]}
                value={pieceCountInput}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setPieceWeightInput}
                placeholder="Peso por pieza (g)"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.flex]}
                value={pieceWeightInput}
              />
            </View>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setScaleVisible(false);
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={applyAdjustment}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Aplicar ajuste</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPrefermentVisible(false)}
        transparent
        visible={prefermentVisible}
      >
        <CenteredModalSheet
          onBackdropPress={() => {
            Keyboard.dismiss();
            setPrefermentVisible(false);
          }}
        >
          <Text style={styles.sheetTitle}>Agregar prefermento</Text>
          <View style={styles.prefermentList}>
            {prefermentRecipes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedPrefermentId(item.id)}
                style={({ pressed }) => [
                  styles.prefermentOption,
                  selectedPrefermentId === item.id && styles.prefermentOptionActive,
                  pressed && styles.chipPressed
                ]}
              >
                <Text
                  style={[
                    styles.prefermentName,
                    selectedPrefermentId === item.id && styles.prefermentNameActive
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
            {!prefermentRecipes.length ? (
              <Text style={styles.notesText}>No hay recetas marcadas como prefermento.</Text>
            ) : null}
          </View>
          <View style={styles.choiceRow}>
            <ChoiceButton
              active={prefermentMode === "grams"}
              label="En gramos"
              onPress={() => setPrefermentMode("grams")}
            />
            <ChoiceButton
              active={prefermentMode === "percent"}
              label="En %"
              onPress={() => setPrefermentMode("percent")}
            />
          </View>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setPrefermentQuantityInput}
            placeholder={prefermentMode === "grams" ? "Cantidad en gramos" : "Porcentaje panadero"}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.field}
            value={prefermentQuantityInput}
          />
          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setPrefermentVisible(false);
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={savePrefermentIngredient}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Guardar</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        transparent
        visible={menuVisible}
      >
        <Pressable onPress={() => setMenuVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => {}} style={styles.menuSheet}>
            <MenuAction
              label="Ajustar receta"
              onPress={() => {
                setMenuVisible(false);
                setScaleVisible(true);
              }}
            />
            <MenuAction label="Agregar prefermento" onPress={openPrefermentModal} />
            <MenuAction label="Duplicar receta" onPress={duplicateRecipe} />
            <MenuAction label="Exportar receta" onPress={openExportModal} />
            {recipe.scalingTarget ? (
              <MenuAction
                label="Quitar ajuste activo"
                onPress={() => {
                  setMenuVisible(false);
                  if (recipe.scalingSnapshotIngredients?.length) {
                    Alert.alert(
                      "Quitar ajuste activo",
                      "Queres mantener los gramos actuales o restablecer la receta al valor anterior al ajuste?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Mantener actual",
                          onPress: () => clearScalingTarget(recipe.id, false)
                        },
                        {
                          text: "Restablecer anterior",
                          onPress: () => clearScalingTarget(recipe.id, true)
                        }
                      ]
                    );
                    return;
                  }

                  clearScalingTarget(recipe.id, false);
                }}
              />
            ) : null}
            <MenuAction
              label="Editar datos de receta"
              onPress={() => {
                setMenuVisible(false);
                router.push(`/recipes/form?id=${recipe.id}`);
              }}
            />
            <MenuAction
              label="Eliminar receta"
              onPress={() => {
                setMenuVisible(false);
                deleteRecipe(recipe.id);
                router.replace("/");
              }}
            />
            <Pressable
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <Text style={styles.textActionLabel}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CenteredModalSheet({
  children,
  onBackdropPress
}: {
  children: ReactNode;
  onBackdropPress?: () => void;
}) {
  if (!onBackdropPress) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        style={styles.centeredBackdrop}
      >
        <View style={styles.centeredSheet}>
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetContent}>{children}</View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Pressable onPress={onBackdropPress} style={styles.centeredBackdrop}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        pointerEvents="box-none"
        style={styles.centeredBackdropContent}
      >
        <Pressable onPress={() => {}} style={styles.centeredSheet}>
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetContent}>{children}</View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

function RecipeTabButton({
  active,
  icon,
  label,
  onPress
}: {
  active: boolean;
  icon: string | null;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.tabButtonActive,
        pressed && styles.chipPressed
      ]}
    >
      <View style={styles.tabButtonInner}>
        {icon ? <Text style={styles.tabButtonIcon}>{icon}</Text> : null}
        <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function EditorialSection({
  actionLabel,
  children,
  expanded,
  onPress,
  onToggle,
  title
}: {
  actionLabel: string;
  children: ReactNode;
  expanded?: boolean;
  onPress: () => void;
  onToggle?: () => void;
  title: string;
}) {
  const collapsible = onToggle !== undefined && expanded !== undefined;

  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        {collapsible ? (
          <Pressable
            accessibilityLabel={`${expanded ? "Contraer" : "Expandir"} ${title}`}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={onToggle}
            style={({ pressed }) => [styles.sectionHeaderToggle, pressed && styles.chipPressed]}
          >
            <Text style={styles.sectionChevron}>{expanded ? "▼" : "▶"}</Text>
            <Text style={styles.detailSectionTitle}>{title}</Text>
          </Pressable>
        ) : (
          <Text style={styles.detailSectionTitle}>{title}</Text>
        )}
        <Pressable
          accessibilityLabel={`${actionLabel} ${title}`}
          onPress={onPress}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.chipPressed]}
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      </View>
      {collapsible && !expanded ? null : children}
    </View>
  );
}

function SmallEditorAction({
  disabled,
  label,
  onPress
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallEditorAction,
        disabled && styles.smallEditorActionDisabled,
        pressed && !disabled && styles.chipPressed
      ]}
    >
      <Text style={[styles.smallEditorActionText, disabled && styles.smallEditorActionTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function moveListItem<T>(items: T[], index: number, direction: "up" | "down") {
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const clone = [...items];
  const [current] = clone.splice(index, 1);
  clone.splice(nextIndex, 0, current);
  return clone;
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ChoiceButton({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceButton,
        active && styles.choiceButtonActive,
        pressed && styles.chipPressed
      ]}
    >
      <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function RoleChoiceButton({
  active,
  label,
  onPress,
  role
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  role: IngredientRole;
}) {
  const appearance = getIngredientRoleAppearance(role);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleChoiceButton,
        { borderColor: active ? appearance.dot : theme.colors.border },
        active && { backgroundColor: appearance.background },
        pressed && styles.chipPressed
      ]}
    >
      <View style={[styles.roleChoiceDot, { backgroundColor: appearance.dot }]} />
      <Text style={[styles.roleChoiceLabel, { color: active ? appearance.text : theme.colors.textMuted }]}>
        {label}
      </Text>
      {active ? <Text style={[styles.roleCheck, { color: appearance.text }]}>{"\u2713"}</Text> : null}
    </Pressable>
  );
}

function MenuAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuAction,
        pressed && styles.menuActionPressed
      ]}
    >
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

function ScaleOption({
  active,
  descriptionVisible,
  label,
  onInfoPress,
  onPress
}: {
  active: boolean;
  descriptionVisible: boolean;
  label: string;
  onInfoPress: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.scaleOptionRow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.scaleOption,
          active && styles.scaleOptionActive,
          pressed && styles.chipPressed
        ]}
      >
        <Text style={[styles.scaleOptionLabel, active && styles.scaleOptionLabelActive]}>{label}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Ayuda sobre ${label}`}
        onPress={onInfoPress}
        style={({ pressed }) => [
          styles.helpButton,
          descriptionVisible && styles.helpButtonActive,
          pressed && styles.chipPressed
        ]}
      >
        <Text style={[styles.helpButtonText, descriptionVisible && styles.helpButtonTextActive]}>?</Text>
      </Pressable>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function InputWithSuffix({
  keyboardType,
  onChangeText,
  placeholder,
  suffix,
  value
}: {
  keyboardType: "decimal-pad" | "number-pad";
  onChangeText: (value: string) => void;
  placeholder: string;
  suffix: string;
  value: string;
}) {
  return (
    <View style={styles.inputWithSuffix}>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.field, styles.inputWithSuffixField]}
        value={value}
      />
      <View style={styles.inputSuffix}>
        <Text style={styles.inputSuffixText}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm
  },
  header: {
    backgroundColor: theme.colors.accentDeep,
    borderColor: "rgba(255, 249, 239, 0.18)",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    marginBottom: theme.spacing.xs,
    marginHorizontal: 20,
    paddingHorizontal: theme.spacing.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56
  },
  headerLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginRight: theme.spacing.xs
  },
  title: {
    color: "#F8F5F1",
    flex: 1,
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "800"
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 4
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  iconButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  iconText: {
    color: "#F8F5F1",
    fontSize: 22,
    fontWeight: "700"
  },
  menuIcon: {
    color: "#F8F5F1",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1
  },
  editIcon: {
    color: "#F8F5F1",
    fontSize: 17,
    fontWeight: "700"
  },
  metrics: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2
  },
  tabButton: {
    alignItems: "center",
    borderBottomWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  tabButtonInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center"
  },
  tabButtonIcon: {
    fontSize: 12
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.accentDeep
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  tabButtonTextActive: {
    color: theme.colors.accentDeep
  },
  tabContent: {
    gap: theme.spacing.sm
  },
  emptyTabText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20
  },
  metric: {
    flex: 1
  },
  metricLabel: {
    color: theme.colors.textSoft,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2
  },
  statusRow: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs
  },
  activeTargetRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs
  },
  activeTargetChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  activeTargetText: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "700"
  },
  breakdownHelpRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs
  },
  statusText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "500"
  },
  helpChip: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  helpChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  ingredientsList: {
    gap: 0
  },
  detailSection: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md
  },
  detailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionHeaderToggle: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-start",
    minHeight: 34,
    paddingVertical: 4
  },
  sectionChevron: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 2
  },
  detailSectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  sectionAction: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  sectionActionText: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "700"
  },
  detailSectionMeta: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    fontWeight: "700"
  },
  detailSectionText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 22
  },
  detailSteps: {
    gap: 8
  },
  detailStepRow: {
    flexDirection: "row",
    gap: 8
  },
  detailStepIndex: {
    color: theme.colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 22,
    minWidth: 18
  },
  editorCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  editorCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  editorCardTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  editorRowActions: {
    flexDirection: "row",
    gap: 6
  },
  smallEditorAction: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 28,
    minWidth: 28,
    paddingHorizontal: 8
  },
  smallEditorActionDisabled: {
    opacity: 0.45
  },
  smallEditorActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  smallEditorActionTextDisabled: {
    color: theme.colors.textSoft
  },
  modalBackdrop: {
    backgroundColor: "rgba(47, 42, 38, 0.32)",
    flex: 1,
    justifyContent: "flex-end"
  },
  centeredBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(47, 42, 38, 0.32)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  centeredBackdropContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%"
  },
  centeredSheet: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 6,
    maxHeight: "82%",
    maxWidth: 480,
    padding: theme.spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    width: "92%"
  },
  sheetScrollContent: {
    flexGrow: 1
  },
  sheetContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg
  },
  menuSheet: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: theme.spacing.xs,
    maxHeight: "70%",
    padding: theme.spacing.lg
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "800",
    paddingBottom: 6
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  field: {
    backgroundColor: "#FFFDF8",
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 44,
    paddingHorizontal: 14
  },
  inputWithSuffix: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  inputWithSuffixField: {
    flex: 1
  },
  inputSuffix: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 10
  },
  inputSuffixText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "700"
  },
  notesField: {
    minHeight: 120,
    paddingVertical: 12
  },
  exportField: {
    minHeight: 220,
    paddingVertical: 12
  },
  exportOption: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  exportOptionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  exportOptionDescription: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  helperText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18
  },
  copyActionRow: {
    alignItems: "flex-start"
  },
  inlineFields: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choiceButton: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  choiceButtonActive: {
    backgroundColor: theme.colors.accent
  },
  choiceLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  choiceLabelActive: {
    color: "#F8F5F1",
    fontWeight: "700"
  },
  chipPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  roleChoiceButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  roleChoiceDot: {
    borderRadius: 999,
    height: 7,
    width: 7
  },
  roleChoiceLabel: {
    fontSize: 11,
    fontWeight: "700"
  },
  roleCheck: {
    fontSize: 11,
    fontWeight: "800"
  },
  scaleOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  scaleOption: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  scaleOptionActive: {
    backgroundColor: theme.colors.accent
  },
  scaleOptionLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  scaleOptionLabelActive: {
    color: "#F8F5F1",
    fontWeight: "700"
  },
  helpButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  helpButtonActive: {
    backgroundColor: theme.colors.surfaceMuted
  },
  helpButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "800"
  },
  helpButtonTextActive: {
    color: theme.colors.text
  },
  reorderActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "flex-start"
  },
  baseFlourNote: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.spacing.sm
  },
  sheetActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "flex-end",
    paddingTop: theme.spacing.sm
  },
  destructiveButton: {
    marginRight: "auto",
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  destructiveButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  destructiveButtonText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  textAction: {
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  textActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  textActionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  secondaryAction: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  secondaryActionDisabled: {
    opacity: 0.45
  },
  secondaryActionLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  secondaryActionLabelDisabled: {
    color: theme.colors.textSoft
  },
  primaryAction: {
    backgroundColor: theme.colors.accentDeep,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primaryActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  primaryActionLabel: {
    color: "#F8F5F1",
    fontSize: 13,
    fontWeight: "800"
  },
  menuAction: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 13
  },
  menuActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  menuActionText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600"
  },
  notesText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    paddingBottom: theme.spacing.sm
  },
  prefermentList: {
    gap: 8
  },
  prefermentOption: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 11
  },
  prefermentOptionActive: {
    borderBottomColor: theme.colors.accent,
    borderBottomWidth: 2
  },
  prefermentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  prefermentNameActive: {
    fontWeight: "800"
  }
});


