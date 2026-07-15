import { router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
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
import {
  getPrefermentBreakdown,
  getDoughWeight,
  getHydrationPercentage,
  getMoistureIndex,
  getTotalFlour,
  getTotalLiquids,
  scaleByDoughWeight,
  scaleByTotalFlour,
  scaleByYield
} from "@/lib/baker";
import { ingredientRoleLabels } from "@/lib/ingredientLabels";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type { IngredientRole, IngredientUnit, Recipe, RecipeIngredient } from "@/types/recipe";

type ScaleMode = "flour" | "dough" | "yield";
type PrefermentMode = "grams" | "percent";

const units: IngredientUnit[] = ["g", "kg", "ml", "l", "unit"];
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

type FormulaSheetProps = {
  recipe: Recipe;
};

export function FormulaSheet({ recipe }: FormulaSheetProps) {
  const insets = useSafeAreaInsets();
  const { recipes, createRecipe, deleteRecipe, updateRecipe } = useRecipes();
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleVisible, setScaleVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [ingredientVisible, setIngredientVisible] = useState(false);
  const [prefermentVisible, setPrefermentVisible] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [mode, setMode] = useState<ScaleMode>("flour");
  const [flourTarget, setFlourTarget] = useState(String(getTotalFlour(recipe.ingredients)));
  const [doughTarget, setDoughTarget] = useState(String(getDoughWeight(recipe.ingredients)));
  const [pieceCount, setPieceCount] = useState("10");
  const [pieceWeight, setPieceWeight] = useState("350");
  const [draftIngredient, setDraftIngredient] = useState<RecipeIngredient>(emptyIngredient());
  const [selectedPrefermentId, setSelectedPrefermentId] = useState<string | null>(null);
  const [prefermentMode, setPrefermentMode] = useState<PrefermentMode>("grams");
  const [prefermentQuantity, setPrefermentQuantity] = useState("");

  const prefermentRecipes = useMemo(() => {
    return recipes.filter((item) => item.id !== recipe.id && item.useAsPreferment);
  }, [recipe.id, recipes]);

  const recipeLookup = useMemo(() => {
    return new Map(recipes.map((item) => [item.id, item]));
  }, [recipes]);

  const scaledIngredients = useMemo(() => {
    if (mode === "dough") {
      return scaleByDoughWeight(recipe.ingredients, Number(doughTarget) || 0);
    }

    if (mode === "yield") {
      return scaleByYield(recipe.ingredients, Number(pieceCount) || 0, Number(pieceWeight) || 0);
    }

    return scaleByTotalFlour(recipe.ingredients, Number(flourTarget) || 0);
  }, [doughTarget, flourTarget, mode, pieceCount, pieceWeight, recipe.ingredients]);

  const summary = useMemo(() => {
    const prefermentPercentage = recipe.ingredients
      .filter((ingredient) => ingredient.role === "preferment")
      .reduce((total, ingredient) => total + ingredient.bakerPercentage, 0);

    return {
      flour: getTotalFlour(scaledIngredients),
      liquids: getTotalLiquids(scaledIngredients),
      doughWeight: getDoughWeight(scaledIngredients),
      hydration: getHydrationPercentage(scaledIngredients),
      moisture: getMoistureIndex(scaledIngredients),
      preferment: prefermentPercentage > 0 ? `${prefermentPercentage}%` : "No"
    };
  }, [recipe.ingredients, scaledIngredients]);

  function openAddIngredient(role: IngredientRole = "other") {
    setEditingIngredientId(null);
    setDraftIngredient(emptyIngredient(role));
    setIngredientVisible(true);
    setMenuVisible(false);
  }

  function openEditIngredient(ingredientId: string) {
    const ingredient = recipe.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }

    setEditingIngredientId(ingredientId);
    setDraftIngredient({ ...ingredient });
    setIngredientVisible(true);
  }

  function saveIngredient() {
    if (!draftIngredient.name.trim()) {
      return;
    }

    const nextIngredients = editingIngredientId
      ? recipe.ingredients.map((ingredient) =>
          ingredient.id === editingIngredientId ? draftIngredient : ingredient
        )
      : [...recipe.ingredients, draftIngredient];

    updateRecipe(recipe.id, {
      name: recipe.name,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
      useAsPreferment: recipe.useAsPreferment ?? false,
      ingredients: nextIngredients
    });

    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function removeIngredient() {
    if (!editingIngredientId) {
      return;
    }

    updateRecipe(recipe.id, {
      name: recipe.name,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
      useAsPreferment: recipe.useAsPreferment ?? false,
      ingredients: recipe.ingredients.filter((ingredient) => ingredient.id !== editingIngredientId)
    });

    Keyboard.dismiss();
    setIngredientVisible(false);
  }

  function duplicateFormula() {
    createRecipe({
      name: `${recipe.name} copia`,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
      useAsPreferment: recipe.useAsPreferment ?? false,
      ingredients: recipe.ingredients.map((ingredient) => ({
        ...ingredient,
        id: `${ingredient.id}-${Date.now()}`
      }))
    });

    setMenuVisible(false);
    router.replace("/");
  }

  function openPrefermentModal() {
    setSelectedPrefermentId(null);
    setPrefermentMode("grams");
    setPrefermentQuantity("");
    setPrefermentVisible(true);
  }

  function savePrefermentIngredient() {
    const selected = prefermentRecipes.find((item) => item.id === selectedPrefermentId);
    const numericValue = Number(prefermentQuantity) || 0;
    const flourTotal = getTotalFlour(recipe.ingredients);

    if (!selected || numericValue <= 0) {
      return;
    }

    const quantity = prefermentMode === "grams" ? numericValue : (flourTotal * numericValue) / 100;

    const bakerPercentage =
      prefermentMode === "percent"
        ? numericValue
        : flourTotal > 0
          ? Math.round((quantity / flourTotal) * 1000) / 10
          : 0;

    const prefermentIngredient: RecipeIngredient = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: selected.name,
      quantity,
      unit: "g",
      role: "preferment",
      bakerPercentage,
      linkedRecipeId: selected.id,
      linkedRecipeName: selected.name
    };

    updateRecipe(recipe.id, {
      name: recipe.name,
      description: recipe.description ?? "",
      notes: recipe.notes ?? "",
      useAsPreferment: recipe.useAsPreferment ?? false,
      ingredients: [...recipe.ingredients, prefermentIngredient]
    });

    Keyboard.dismiss();
    setPrefermentVisible(false);
    setSelectedPrefermentId(null);
    setPrefermentMode("grams");
    setPrefermentQuantity("");
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top + 10 }]}>
        <View style={styles.toolbar}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Text style={styles.iconText}>{"\u2039"}</Text>
            </Pressable>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.title}>
              {recipe.name}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => openAddIngredient()} style={styles.iconButton}>
              <Text style={styles.iconText}>+</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/recipes/form?id=${recipe.id}`)}
              accessibilityLabel="Editar receta"
              style={styles.iconButton}
            >
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.iconButton}>
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

      <View style={styles.ingredientsList}>
        {scaledIngredients.map((ingredient) => (
          <IngredientRow
            ingredient={{
              ...ingredient,
              quantity: ingredient.scaledQuantity
            }}
            key={ingredient.id}
            onPress={() => openEditIngredient(ingredient.id)}
            prefermentBreakdown={getPrefermentBreakdown(
              {
                ...ingredient,
                quantity: ingredient.scaledQuantity
              },
              (linkedRecipeId) => recipeLookup.get(linkedRecipeId),
              recipe.id
            )}
          />
        ))}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIngredientVisible(false);
        }}
        transparent
        visible={ingredientVisible}
      >
        <CenteredModalSheet>
          <Text style={styles.sheetTitle}>
            {editingIngredientId ? "Editar ingrediente" : "Añadir ingrediente"}
          </Text>

          <TextInput
            onChangeText={(value) => setDraftIngredient((current) => ({ ...current, name: value }))}
            placeholder="Nombre"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.field}
            value={draftIngredient.name}
          />

          <View style={styles.inlineFields}>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setDraftIngredient((current) => ({
                  ...current,
                  quantity: Number(value) || 0
                }))
              }
              placeholder="Gramos"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.field, styles.flex]}
              value={draftIngredient.quantity ? String(draftIngredient.quantity) : ""}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) =>
                setDraftIngredient((current) => ({
                  ...current,
                  bakerPercentage: Number(value) || 0
                }))
              }
              placeholder="%"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.field, styles.percentField]}
              value={draftIngredient.bakerPercentage ? String(draftIngredient.bakerPercentage) : ""}
            />
          </View>

          <View style={styles.choiceRow}>
            {units.map((unit) => (
              <ChoiceButton
                active={draftIngredient.unit === unit}
                key={unit}
                label={unit}
                onPress={() => setDraftIngredient((current) => ({ ...current, unit }))}
              />
            ))}
          </View>

          <View style={styles.choiceRow}>
            {roles.map((role) => (
              <ChoiceButton
                active={draftIngredient.role === role}
                key={role}
                label={ingredientRoleLabels[role]}
                onPress={() => setDraftIngredient((current) => ({ ...current, role }))}
              />
            ))}
          </View>

          <View style={styles.sheetActions}>
            {editingIngredientId ? (
              <Pressable onPress={removeIngredient} style={styles.destructiveButton}>
                <Text style={styles.destructiveButtonText}>Eliminar</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setIngredientVisible(false);
              }}
              style={styles.textAction}
            >
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={saveIngredient} style={styles.primaryAction}>
              <Text style={styles.primaryActionLabel}>Guardar</Text>
            </Pressable>
          </View>
        </CenteredModalSheet>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setScaleVisible(false)}
        transparent
        visible={scaleVisible}
      >
        <ModalSheet>
          <Text style={styles.sheetTitle}>Ajustar formula</Text>

          <View style={styles.choiceRow}>
            <ChoiceButton active={mode === "flour"} label="Por harina" onPress={() => setMode("flour")} />
            <ChoiceButton active={mode === "dough"} label="Por masa" onPress={() => setMode("dough")} />
            <ChoiceButton active={mode === "yield"} label="Por piezas" onPress={() => setMode("yield")} />
          </View>

          {mode === "flour" ? (
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setFlourTarget}
              placeholder="Harina total"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={flourTarget}
            />
          ) : null}

          {mode === "dough" ? (
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setDoughTarget}
              placeholder="Peso total de masa"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.field}
              value={doughTarget}
            />
          ) : null}

          {mode === "yield" ? (
            <View style={styles.inlineFields}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setPieceCount}
                placeholder="Piezas"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.flex]}
                value={pieceCount}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setPieceWeight}
                placeholder="Peso por pieza"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.field, styles.flex]}
                value={pieceWeight}
              />
            </View>
          ) : null}

          <View style={styles.sheetActions}>
            <Pressable onPress={() => setScaleVisible(false)} style={styles.primaryAction}>
              <Text style={styles.primaryActionLabel}>Listo</Text>
            </Pressable>
          </View>
        </ModalSheet>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setPrefermentVisible(false)}
        transparent
        visible={prefermentVisible}
      >
        <ModalSheet>
          <Text style={styles.sheetTitle}>Agregar prefermento</Text>
          <View style={styles.prefermentList}>
            {prefermentRecipes.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedPrefermentId(item.id)}
                style={[
                  styles.prefermentOption,
                  selectedPrefermentId === item.id && styles.prefermentOptionActive
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
              <Text style={styles.notesText}>No hay formulas marcadas como prefermento.</Text>
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
            onChangeText={setPrefermentQuantity}
            placeholder={prefermentMode === "grams" ? "Cantidad en gramos" : "Porcentaje panadero"}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.field}
            value={prefermentQuantity}
          />

          <View style={styles.sheetActions}>
            <Pressable onPress={() => setPrefermentVisible(false)} style={styles.textAction}>
              <Text style={styles.textActionLabel}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={savePrefermentIngredient} style={styles.primaryAction}>
              <Text style={styles.primaryActionLabel}>Agregar</Text>
            </Pressable>
          </View>
        </ModalSheet>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setNotesVisible(false)}
        transparent
        visible={notesVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.menuSheet}>
            <Text style={styles.sheetTitle}>Notas</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.notesText}>{recipe.notes?.trim() || "Sin notas"}</Text>
            </ScrollView>
            <Pressable onPress={() => setNotesVisible(false)} style={styles.primaryAction}>
              <Text style={styles.primaryActionLabel}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
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
              label="Ajustar formula"
              onPress={() => {
                setMenuVisible(false);
                setScaleVisible(true);
              }}
            />
            <MenuAction
              label="Notas"
              onPress={() => {
                setMenuVisible(false);
                setNotesVisible(true);
              }}
            />
            <MenuAction
              label="Agregar prefermento"
              onPress={() => {
                setMenuVisible(false);
                openPrefermentModal();
              }}
            />
            <MenuAction label="Duplicar formula" onPress={duplicateFormula} />
            <MenuAction
              label="Eliminar formula"
              onPress={() => {
                setMenuVisible(false);
                deleteRecipe(recipe.id);
                router.replace("/");
              }}
            />
            <Pressable onPress={() => setMenuVisible(false)} style={styles.textAction}>
              <Text style={styles.textActionLabel}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ModalSheet({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: "height" })}
      style={styles.modalBackdrop}
    >
      <View style={styles.sheet}>
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
    <Pressable onPress={onPress} style={[styles.choiceButton, active && styles.choiceButtonActive]}>
      <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function MenuAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction}>
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

function emptyIngredient(role: IngredientRole = "other"): RecipeIngredient {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    quantity: 0,
    unit: "g",
    role,
    bakerPercentage: 0
  };
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md
  },
  header: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    marginBottom: theme.spacing.xs,
    marginHorizontal: 22,
    paddingHorizontal: theme.spacing.md,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.1,
    shadowRadius: 14
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64
  },
  headerLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginRight: theme.spacing.sm
  },
  title: {
    color: "#F8F5F1",
    flex: 1,
    flexShrink: 1,
    fontSize: 25,
    fontWeight: "800"
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 2
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
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
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderLeftWidth: 1,
    borderRadius: theme.radius.sm,
    borderRightWidth: 1,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 12
  },
  metric: {
    flex: 1
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase"
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  statusRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 12
  },
  ingredientsList: {
    gap: 0
  },
  modalBackdrop: {
    backgroundColor: "rgba(47, 42, 38, 0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  centeredBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(47, 42, 38, 0.28)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderTopWidth: 1,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: "88%",
    padding: theme.spacing.lg
  },
  centeredSheet: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    elevation: 6,
    maxHeight: "82%",
    maxWidth: 520,
    padding: theme.spacing.lg,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: "90%"
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
    borderColor: theme.colors.borderStrong,
    borderTopWidth: 1,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    gap: theme.spacing.xs,
    maxHeight: "70%",
    padding: theme.spacing.lg
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    paddingBottom: 8
  },
  field: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 46,
    paddingHorizontal: 14
  },
  inlineFields: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1
  },
  percentField: {
    width: 88
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choiceButton: {
    backgroundColor: theme.colors.surfaceMuted,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  choiceButtonActive: {
    backgroundColor: theme.colors.accent,
    borderBottomColor: theme.colors.accent
  },
  choiceLabel: {
    color: theme.colors.textMuted,
    fontSize: 12
  },
  choiceLabelActive: {
    color: "#F8F5F1",
    fontWeight: "700"
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
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  destructiveButtonText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  textAction: {
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  textActionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  primaryAction: {
    backgroundColor: theme.colors.accentDeep,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryActionLabel: {
    color: "#F8F5F1",
    fontSize: 13,
    fontWeight: "800"
  },
  menuAction: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  menuActionText: {
    color: theme.colors.text,
    fontSize: 15
  },
  notesText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    paddingBottom: theme.spacing.sm
  },
  prefermentList: {
    gap: 8
  },
  prefermentOption: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  prefermentOptionActive: {
    borderBottomColor: theme.colors.accent,
    borderBottomWidth: 2
  },
  prefermentName: {
    color: theme.colors.text,
    fontSize: 14
  },
  prefermentNameActive: {
    fontWeight: "800"
  }
});
