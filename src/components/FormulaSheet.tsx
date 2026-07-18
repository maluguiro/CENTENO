import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
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
  getIngredientDisplayBreakdown,
  getMoistureIndex,
  getPrefermentBreakdown,
  getQuantityFromBakerPercentage,
  getTotalFlour,
  getTotalLiquids,
  parseDecimalInput
} from "@/lib/baker";
import { getIngredientRoleAppearance, ingredientRoleLabels } from "@/lib/ingredientLabels";
import { exportRecipeToJson } from "@/lib/recipeImportExport";
import { formatRecipeAsShareText } from "@/lib/recipeShareText";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type {
  IngredientRole,
  IngredientUnit,
  Recipe,
  RecipeDraft,
  RecipeIngredient,
  RecipeScalingTarget
} from "@/types/recipe";

type ScaleMode = "flour" | "dough" | "yield";
type PrefermentMode = "grams" | "percent";
type IngredientField = "quantity" | "percentage" | null;
type ExportMode = "selector" | "shareText" | "importCode" | null;
type PrefermentContextKind = "flour" | "water";

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
  return {
    name: recipe.name,
    description: recipe.description ?? "",
    notes: notes ?? recipe.notes ?? "",
    category: recipe.category ?? "bakery",
    useAsPreferment: recipe.useAsPreferment ?? false,
    scalingTarget: recipe.scalingTarget,
    scalingSnapshotIngredients: recipe.scalingSnapshotIngredients,
    ingredients
  };
}

export function FormulaSheet({ recipe }: FormulaSheetProps) {
  const insets = useSafeAreaInsets();
  const { recipes, clearScalingTarget, createRecipe, deleteRecipe, updateRecipe } = useRecipes();
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleVisible, setScaleVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>(null);
  const [exportJson, setExportJson] = useState("");
  const [shareText, setShareText] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"shareText" | "importCode" | null>(null);
  const [ingredientVisible, setIngredientVisible] = useState(false);
  const [prefermentVisible, setPrefermentVisible] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingredientDraft, setIngredientDraft] = useState<IngredientDraftState>(emptyIngredient());
  const [lastEditedField, setLastEditedField] = useState<IngredientField>(null);
  const [notesDraft, setNotesDraft] = useState(recipe.notes ?? "");
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
  const [doughTargetInput, setDoughTargetInput] = useState(
    formatDecimalInput(getDoughWeight(recipe.ingredients))
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

  const prefermentRecipes = useMemo(
    () => recipes.filter((item) => item.id !== recipe.id && item.useAsPreferment),
    [recipe.id, recipes]
  );
  const recipeLookup = useMemo(() => new Map(recipes.map((item) => [item.id, item])), [recipes]);
  const flourTotal = getTotalFlour(recipe.ingredients);
  const summary = useMemo(() => {
    const prefermentPercentage = recipe.ingredients
      .filter((ingredient) => ingredient.role === "preferment")
      .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

    return {
      flour: getTotalFlour(recipe.ingredients),
      liquids: getTotalLiquids(recipe.ingredients),
      doughWeight: getDoughWeight(recipe.ingredients),
      hydration: getHydrationPercentage(recipe.ingredients),
      moisture: getMoistureIndex(recipe.ingredients),
      preferment: prefermentPercentage > 0 ? `${prefermentPercentage}%` : "No"
    };
  }, [recipe.ingredients]);
  const activeScalingLabel = buildScalingTargetLabel(recipe.scalingTarget);
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
          (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
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
  }, [recipe.id, recipe.ingredients, recipeLookup]);

  function syncScaleInputs(nextIngredients: RecipeIngredient[]) {
    setFlourTargetInput(formatDecimalInput(getTotalFlour(nextIngredients)));
    setDoughTargetInput(formatDecimalInput(getDoughWeight(nextIngredients)));
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
      const percentage =
        flourTotal > 0 ? getBakerPercentageFromQuantity(parseDecimalInput(value), flourTotal) : 0;

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
      const quantity =
        flourTotal > 0 ? getQuantityFromBakerPercentage(flourTotal, parseDecimalInput(value)) : 0;

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

    if (flourTotal > 0) {
      if (lastEditedField === "percentage") {
        nextIngredient.quantity = getQuantityFromBakerPercentage(flourTotal, bakerPercentage);
      }

      if (lastEditedField === "quantity") {
        nextIngredient.bakerPercentage = getBakerPercentageFromQuantity(quantity, flourTotal);
      }
    }

    let nextIngredients = editingIngredientId
      ? recipe.ingredients.map((ingredient) =>
          ingredient.id === editingIngredientId ? nextIngredient : ingredient
        )
      : [...recipe.ingredients, nextIngredient];

    if (
      nextIngredient.role === "flour" &&
      lastEditedField === "quantity" &&
      recipe.ingredients.filter((ingredient) => ingredient.role === "flour").length === 1
    ) {
      nextIngredients = applyScaleByTotalFlour(recipe.ingredients, nextIngredient.quantity).map(
        (ingredient) =>
          ingredient.id === nextIngredient.id
            ? { ...ingredient, name: nextIngredient.name, unit: nextIngredient.unit }
            : ingredient
      );
    }

    const adjustedIngredients =
      recipe.scalingTarget && lastEditedField
        ? applyScalingTarget(nextIngredients, recipe.scalingTarget)
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
      recipe.scalingTarget ? applyScalingTarget(nextIngredients, recipe.scalingTarget) : nextIngredients
    );
    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function duplicateRecipe() {
    const duplicatedId = createRecipe({
      name: `${recipe.name} copia`,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
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

  function openNotesModal() {
    setNotesDraft(recipe.notes ?? "");
    setNotesVisible(true);
  }

  function openExportModal() {
    setExportJson(exportRecipeToJson(recipe));
    setShareText(formatRecipeAsShareText(recipe, recipes));
    setCopyFeedback(null);
    setExportMode("selector");
    setMenuVisible(false);
  }

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

  function saveNotes() {
    updateRecipeIngredients(recipe.ingredients, notesDraft);
    Keyboard.dismiss();
    setNotesVisible(false);
  }

  function applyAdjustment() {
    let nextIngredients = recipe.ingredients;

    if (mode === "flour") {
      nextIngredients = applyScaleByTotalFlour(recipe.ingredients, parseDecimalInput(flourTargetInput));
    }

    if (mode === "dough") {
      nextIngredients = applyScaleByDoughWeight(recipe.ingredients, parseDecimalInput(doughTargetInput));
    }

    if (mode === "yield") {
      nextIngredients = applyScaleByYield(
        recipe.ingredients,
        Math.max(0, Math.round(parseDecimalInput(pieceCountInput))),
        parseDecimalInput(pieceWeightInput)
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
      recipe.scalingTarget ? applyScalingTarget(nextIngredients, recipe.scalingTarget) : nextIngredients
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
              onPress={() => openAddIngredient()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.iconText}>+</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Notas de receta"
              onPress={openNotesModal}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <Text style={styles.editIcon}>{"\u270E"}</Text>
            </Pressable>
            <Pressable
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

      <HydrationBar hydration={summary.hydration} />

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>Indice de humedad {summary.moisture}%</Text>
      </View>
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
              ingredient={ingredient}
              key={ingredient.id}
              onPress={() => openEditIngredient(ingredient.id)}
              prefermentBreakdown={getPrefermentBreakdown(
                ingredient,
                (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
                recipe.id
              )}
              quantityDetail={displayBreakdown.detail}
              onBreakdownHelpPress={
                displayBreakdown.detail ? () => setPrefermentHelpVisible(true) : undefined
              }
              quantityOverride={displayBreakdown.visibleQuantity}
              quantityWarning={displayBreakdown.warning}
            />
          );
        })}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIngredientVisible(false);
        }}
        transparent
        visible={ingredientVisible}
      >
        <CenteredModalSheet>
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
        onRequestClose={() => setNotesVisible(false)}
        transparent
        visible={notesVisible}
      >
        <CenteredModalSheet>
          <Text style={styles.sheetTitle}>Notas</Text>
          <TextInput
            multiline
            onChangeText={setNotesDraft}
            placeholder="Notas de trabajo"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.field, styles.notesField]}
            textAlignVertical="top"
            value={notesDraft}
          />
          <View style={styles.sheetActions}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setNotesVisible(false);
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
            >
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={saveNotes}
              style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
            >
              <Text style={styles.primaryActionLabel}>Guardar</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setExportMode(null)}
        transparent
        visible={exportMode !== null}
      >
        <CenteredModalSheet>
          {exportMode === "selector" ? (
            <>
              <Text style={styles.sheetTitle}>Exportar receta</Text>
              <Text style={styles.helperText}>
                Elegi como queres compartir esta receta.
              </Text>
              <Pressable
                onPress={() => setExportMode("shareText")}
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
                onPress={() => setExportMode("importCode")}
                style={({ pressed }) => [
                  styles.exportOption,
                  pressed && styles.menuActionPressed
                ]}
              >
                <Text style={styles.exportOptionTitle}>Codigo para importar</Text>
                <Text style={styles.exportOptionDescription}>
                  Para cargar esta receta en otro CENTENO.
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
                    {copyFeedback === "shareText" ? "Copiado ?" : "Copiar"}
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
                  onPress={() => setExportMode("selector")}
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
              <Text style={styles.sheetTitle}>Codigo para importar</Text>
              <Text style={styles.helperText}>
                Copia este codigo para cargar la receta en otro CENTENO.
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
                    {copyFeedback === "importCode" ? "Copiado ?" : "Copiar"}
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
                  onPress={() => setExportMode("selector")}
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
        <CenteredModalSheet>
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
        <CenteredModalSheet>
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
        <CenteredModalSheet>
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
        <CenteredModalSheet>
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
        <View style={styles.modalBackdrop}>
          <View style={styles.menuSheet}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CenteredModalSheet({ children }: { children: ReactNode }) {
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
    height: 34,
    justifyContent: "center",
    width: 34
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
    height: 22,
    justifyContent: "center",
    width: 22
  },
  helpChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  ingredientsList: {
    gap: 0
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
  secondaryActionLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
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


