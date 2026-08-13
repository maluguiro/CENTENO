import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { IngredientEditor } from "@/components/IngredientEditor";
import { MetricChip } from "@/components/MetricChip";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Screen } from "@/components/Screen";
import { getBasePercent, getDoughWeight, getHydrationPercent } from "@/lib/baker";
import { formatYieldSummary } from "@/lib/recipeFields";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type {
  RecipeCategory,
  RecipeIngredient,
  RecipeYieldWeightUnit
} from "@/types/recipe";

function emptyIngredient(): RecipeIngredient {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    quantity: 0,
    unit: "g",
    role: "other",
    bakerPercentage: 0
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

function moveItem<T>(items: T[], index: number, direction: "up" | "down") {
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const clone = [...items];
  const [current] = clone.splice(index, 1);
  clone.splice(nextIndex, 0, current);
  return clone;
}

function Section({
  children,
  title
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SmallAction({
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
        styles.smallAction,
        disabled && styles.smallActionDisabled,
        pressed && !disabled && styles.smallActionPressed
      ]}
    >
      <Text style={[styles.smallActionText, disabled && styles.smallActionTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChangeText
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.flex}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export default function RecipeFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { createRecipe, getRecipeById, recipes, updateRecipe } = useRecipes();
  const existingRecipe = params.id ? getRecipeById(params.id) : undefined;
  const recipeLookup = (recipeId: string) => recipes.find((recipe) => recipe.id === recipeId);

  const [name, setName] = useState(existingRecipe?.name ?? "");
  const [description, setDescription] = useState(existingRecipe?.description ?? "");
  const [notes, setNotes] = useState(existingRecipe?.notes ?? "");
  const [category, setCategory] = useState<RecipeCategory>(existingRecipe?.category ?? "bakery");
  const [useAsPreferment, setUseAsPreferment] = useState(existingRecipe?.useAsPreferment ?? false);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    existingRecipe?.ingredients ?? [emptyIngredient(), emptyIngredient()]
  );
  const [preparationSteps, setPreparationSteps] = useState<string[]>(
    existingRecipe?.preparation?.steps?.length ? [...existingRecipe.preparation.steps] : [""]
  );
  const [fermentationInstructions, setFermentationInstructions] = useState(
    existingRecipe?.fermentation?.instructions ?? ""
  );
  const [fermentationVisualCue, setFermentationVisualCue] = useState(
    existingRecipe?.fermentation?.visualCue ?? ""
  );
  const [fermentationTimeMin, setFermentationTimeMin] = useState(
    formatNumberInput(existingRecipe?.fermentation?.timeMinMinutes)
  );
  const [fermentationTimeMax, setFermentationTimeMax] = useState(
    formatNumberInput(existingRecipe?.fermentation?.timeMaxMinutes)
  );
  const [fermentationTemperatureMin, setFermentationTemperatureMin] = useState(
    formatNumberInput(existingRecipe?.fermentation?.temperatureMinC)
  );
  const [fermentationTemperatureMax, setFermentationTemperatureMax] = useState(
    formatNumberInput(existingRecipe?.fermentation?.temperatureMaxC)
  );
  const [bakingInstructions, setBakingInstructions] = useState(
    existingRecipe?.baking?.instructions ?? ""
  );
  const [bakingTimeMin, setBakingTimeMin] = useState(
    formatNumberInput(existingRecipe?.baking?.timeMinMinutes)
  );
  const [bakingTimeMax, setBakingTimeMax] = useState(
    formatNumberInput(existingRecipe?.baking?.timeMaxMinutes)
  );
  const [bakingTemperatureMin, setBakingTemperatureMin] = useState(
    formatNumberInput(existingRecipe?.baking?.temperatureMinC)
  );
  const [bakingTemperatureMax, setBakingTemperatureMax] = useState(
    formatNumberInput(existingRecipe?.baking?.temperatureMaxC)
  );
  const [yieldQuantity, setYieldQuantity] = useState(
    formatNumberInput(existingRecipe?.yield?.quantity)
  );
  const [yieldUnit, setYieldUnit] = useState(existingRecipe?.yield?.unit ?? "");
  const [yieldWeightPerUnit, setYieldWeightPerUnit] = useState(
    formatNumberInput(existingRecipe?.yield?.weightPerUnit)
  );
  const [yieldWeightUnit, setYieldWeightUnit] = useState<RecipeYieldWeightUnit>(
    existingRecipe?.yield?.weightUnit ?? "g"
  );
  const scalingTarget = existingRecipe?.scalingTarget;
  const scalingSnapshotIngredients = existingRecipe?.scalingSnapshotIngredients;

  const stats = useMemo(() => {
    return {
      basePercent: getBasePercent(ingredients),
      hydration: getHydrationPercent(ingredients),
      doughWeight:
        existingRecipe
          ? getDoughWeight(ingredients, recipeLookup, existingRecipe.id)
          : getDoughWeight(ingredients)
    };
  }, [existingRecipe, ingredients, recipes]);

  const yieldPreview = useMemo(
    () =>
      formatYieldSummary({
        quantity: parseOptionalNumber(yieldQuantity),
        unit: yieldUnit.trim() || undefined,
        weightPerUnit: parseOptionalNumber(yieldWeightPerUnit),
        weightUnit: yieldWeightPerUnit.trim() ? yieldWeightUnit : undefined
      }),
    [yieldQuantity, yieldUnit, yieldWeightPerUnit, yieldWeightUnit]
  );
  const isEditing = Boolean(existingRecipe);

  function updateIngredient(index: number, nextIngredient: RecipeIngredient) {
    setIngredients((current) =>
      current.map((ingredient, currentIndex) =>
        currentIndex === index ? nextIngredient : ingredient
      )
    );
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function updatePreparationStep(index: number, value: string) {
    setPreparationSteps((current) =>
      current.map((step, currentIndex) => (currentIndex === index ? value : step))
    );
  }

  function removePreparationStep(index: number) {
    setPreparationSteps((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      return next.length ? next : [""];
    });
  }

  function saveRecipe() {
    const normalizedIngredients = ingredients.filter(
      (ingredient) => ingredient.name.trim() && ingredient.bakerPercentage > 0
    );
    const normalizedPreparationSteps = preparationSteps
      .map((step) => step.trim())
      .filter(Boolean);

    if (!name.trim()) {
      Alert.alert("Falta el nombre", "La receta necesita un nombre.");
      return;
    }

    if (!normalizedIngredients.length) {
      Alert.alert(
        "Faltan ingredientes",
        "Agrega al menos un ingrediente con porcentaje panadero."
      );
      return;
    }

    if (!normalizedIngredients.some((ingredient) => ingredient.role === "flour")) {
      Alert.alert(
        "Falta la harina base",
        "Agrega al menos un ingrediente con rol harina para que el calculo tenga referencia."
      );
      return;
    }

    const draft = {
      name,
      description,
      notes,
      preparation: normalizedPreparationSteps.length
        ? {
            steps: normalizedPreparationSteps
          }
        : undefined,
      fermentation: {
        instructions: fermentationInstructions,
        visualCue: fermentationVisualCue,
        timeMinMinutes: parseOptionalNumber(fermentationTimeMin),
        timeMaxMinutes: parseOptionalNumber(fermentationTimeMax),
        temperatureMinC: parseOptionalNumber(fermentationTemperatureMin),
        temperatureMaxC: parseOptionalNumber(fermentationTemperatureMax)
      },
      baking: {
        instructions: bakingInstructions,
        timeMinMinutes: parseOptionalNumber(bakingTimeMin),
        timeMaxMinutes: parseOptionalNumber(bakingTimeMax),
        temperatureMinC: parseOptionalNumber(bakingTemperatureMin),
        temperatureMaxC: parseOptionalNumber(bakingTemperatureMax)
      },
      yield: {
        quantity: parseOptionalNumber(yieldQuantity),
        unit: yieldUnit,
        weightPerUnit: parseOptionalNumber(yieldWeightPerUnit),
        weightUnit: parseOptionalNumber(yieldWeightPerUnit) ? yieldWeightUnit : undefined
      },
      category,
      useAsPreferment,
      scalingTarget,
      scalingSnapshotIngredients,
      ingredients: normalizedIngredients
    };

    if (existingRecipe) {
      updateRecipe(existingRecipe.id, draft);
    } else {
      createRecipe(draft);
    }

    router.replace("/");
  }

  return (
    <Screen
      keyboardAware
      header={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{isEditing ? "EDITAR" : "NUEVA"}</Text>
          <Text style={styles.title}>{isEditing ? "Editar receta" : "Crear receta"}</Text>
        </View>
      }
    >
      <View style={styles.metrics}>
        <MetricChip label="Harina base" value={`${stats.basePercent}%`} />
        <MetricChip label="Hidratacion" value={`${stats.hydration}%`} />
        <MetricChip label="Peso total" value={`${stats.doughWeight} g`} />
      </View>

      <Section title="Informacion general">
        <TextInput
          onChangeText={setName}
          placeholder="Nombre de la receta"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={name}
        />
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Descripcion"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={description}
        />
        <View style={styles.categoryGroup}>
          <Text style={styles.fieldLabel}>Tipo de receta</Text>
          <View style={styles.categoryRow}>
            {[
              { key: "bakery" as const, label: "Panaderia" },
              { key: "pastry" as const, label: "Pasteleria" }
            ].map((option) => {
              const selected = category === option.key;

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setCategory(option.key)}
                  style={({ pressed }) => [
                    styles.categoryButton,
                    selected && styles.categoryButtonActive,
                    pressed && styles.categoryButtonPressed
                  ]}
                >
                  <Text
                    style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.prefermentGroup}>
          <Text style={styles.fieldLabel}>Usar como prefermento</Text>
          <Text style={styles.switchHint}>
            Permite usar esta receta dentro de otra formula, por ejemplo como poolish, biga o masa madre.
          </Text>
          <View style={styles.categoryRow}>
            {[
              { value: false, label: "No" },
              { value: true, label: "Si" }
            ].map((option) => {
              const selected = useAsPreferment === option.value;

              return (
                <Pressable
                  key={option.label}
                  onPress={() => setUseAsPreferment(option.value)}
                  style={({ pressed }) => [
                    styles.categoryButton,
                    selected && styles.categoryButtonActive,
                    pressed && styles.categoryButtonPressed
                  ]}
                >
                  <Text
                    style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Section>

      <Section title="Ingredientes">
        <View style={styles.inlineHeader}>
          <Text style={styles.sectionHint}>Agrega la harina base primero y luego el resto.</Text>
          <Pressable
            onPress={() => setIngredients((current) => [...current, emptyIngredient()])}
            style={styles.inlineButton}
          >
            <Text style={styles.inlineButtonText}>Agregar</Text>
          </Pressable>
        </View>
        {ingredients.map((ingredient, index) => (
          <IngredientEditor
            ingredient={ingredient}
            key={ingredient.id}
            onChange={(nextIngredient) => updateIngredient(index, nextIngredient)}
            onRemove={() => removeIngredient(index)}
          />
        ))}
      </Section>

      <Section title="Preparacion">
        <Text style={styles.sectionHint}>Carga los pasos en el orden de trabajo.</Text>
        {preparationSteps.map((step, index) => (
          <View key={`step-${index}`} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{`Paso ${index + 1}`}</Text>
              <View style={styles.stepActions}>
                <SmallAction
                  disabled={index === 0}
                  label="↑"
                  onPress={() =>
                    setPreparationSteps((current) => moveItem(current, index, "up"))
                  }
                />
                <SmallAction
                  disabled={index === preparationSteps.length - 1}
                  label="↓"
                  onPress={() =>
                    setPreparationSteps((current) => moveItem(current, index, "down"))
                  }
                />
                <SmallAction label="Eliminar" onPress={() => removePreparationStep(index)} />
              </View>
            </View>
            <TextInput
              multiline
              onChangeText={(value) => updatePreparationStep(index, value)}
              placeholder="Describe este paso"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.stepInput]}
              value={step}
            />
          </View>
        ))}
        <Pressable
          onPress={() => setPreparationSteps((current) => [...current, ""])}
          style={styles.inlineButton}
        >
          <Text style={styles.inlineButtonText}>Agregar paso</Text>
        </Pressable>
      </Section>

      <Section title="Fermentacion">
        <TextInput
          multiline
          onChangeText={setFermentationInstructions}
          placeholder="Indicaciones generales de fermentacion"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={fermentationInstructions}
        />
        <TextInput
          multiline
          onChangeText={setFermentationVisualCue}
          placeholder="Criterio visual o desarrollo esperado"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={fermentationVisualCue}
        />
        <View style={styles.rangeRow}>
          <NumberField
            label="Tiempo minimo"
            onChangeText={setFermentationTimeMin}
            placeholder="60"
            value={fermentationTimeMin}
          />
          <NumberField
            label="Tiempo maximo"
            onChangeText={setFermentationTimeMax}
            placeholder="90"
            value={fermentationTimeMax}
          />
        </View>
        <View style={styles.rangeRow}>
          <NumberField
            label="Temperatura minima"
            onChangeText={setFermentationTemperatureMin}
            placeholder="24"
            value={fermentationTemperatureMin}
          />
          <NumberField
            label="Temperatura maxima"
            onChangeText={setFermentationTemperatureMax}
            placeholder="26"
            value={fermentationTemperatureMax}
          />
        </View>
      </Section>

      <Section title="Horneado">
        <View style={styles.rangeRow}>
          <NumberField
            label="Temperatura minima"
            onChangeText={setBakingTemperatureMin}
            placeholder="180"
            value={bakingTemperatureMin}
          />
          <NumberField
            label="Temperatura maxima"
            onChangeText={setBakingTemperatureMax}
            placeholder="190"
            value={bakingTemperatureMax}
          />
        </View>
        <View style={styles.rangeRow}>
          <NumberField
            label="Tiempo minimo"
            onChangeText={setBakingTimeMin}
            placeholder="35"
            value={bakingTimeMin}
          />
          <NumberField
            label="Tiempo maximo"
            onChangeText={setBakingTimeMax}
            placeholder="45"
            value={bakingTimeMax}
          />
        </View>
        <TextInput
          multiline
          onChangeText={setBakingInstructions}
          placeholder="Observaciones de horneado"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={bakingInstructions}
        />
      </Section>

      <Section title="Rendimiento">
        <View style={styles.rangeRow}>
          <NumberField
            label="Cantidad"
            onChangeText={setYieldQuantity}
            placeholder="3"
            value={yieldQuantity}
          />
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>Unidad</Text>
            <TextInput
              onChangeText={setYieldUnit}
              placeholder="lactales"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={yieldUnit}
            />
          </View>
        </View>
        <View style={styles.rangeRow}>
          <NumberField
            label="Peso por unidad"
            onChangeText={setYieldWeightPerUnit}
            placeholder="1000"
            value={yieldWeightPerUnit}
          />
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>Unidad de peso</Text>
            <View style={styles.categoryRow}>
              {(["g", "kg"] as const).map((option) => {
                const selected = yieldWeightUnit === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setYieldWeightUnit(option)}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      selected && styles.categoryButtonActive,
                      pressed && styles.categoryButtonPressed
                    ]}
                  >
                    <Text
                      style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {yieldPreview ? <Text style={styles.previewText}>{yieldPreview}</Text> : null}
      </Section>

      <Section title="Notas">
        <Text style={styles.sectionHint}>Formato disponible: negrita, cursiva, subrayado y listas.</Text>
        <RichTextEditor
          minHeight={160}
          onChangeText={setNotes}
          placeholder="Notas de trabajo"
          value={notes}
        />
      </Section>

      <Pressable onPress={saveRecipe} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {isEditing ? "Guardar cambios" : "Guardar receta"}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
    paddingBottom: theme.spacing.sm
  },
  eyebrow: {
    color: "#D9CEC2",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2
  },
  title: {
    color: "#F8F5F1",
    fontSize: theme.typography.display,
    fontWeight: "800"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  sectionHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  inlineHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  inlineButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  inlineButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: "top"
  },
  categoryGroup: {
    gap: theme.spacing.xs
  },
  prefermentGroup: {
    gap: theme.spacing.xs
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  categoryRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  categoryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.accentDeep,
    borderColor: theme.colors.accentDeep
  },
  categoryButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  categoryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  categoryButtonTextActive: {
    color: "#F8F5F1"
  },
  switchHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  rangeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1,
    gap: theme.spacing.xs
  },
  stepCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  stepHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  stepTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  stepActions: {
    flexDirection: "row",
    gap: 8
  },
  smallAction: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 30,
    paddingHorizontal: 10
  },
  smallActionDisabled: {
    opacity: 0.45
  },
  smallActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  smallActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  smallActionTextDisabled: {
    color: theme.colors.textSoft
  },
  stepInput: {
    minHeight: 76,
    textAlignVertical: "top"
  },
  previewText: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    fontWeight: "700"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.accentDeep,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "#F8F5F1",
    fontSize: 15,
    fontWeight: "800"
  }
});
