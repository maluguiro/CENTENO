import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { IngredientEditor } from "@/components/IngredientEditor";
import { MetricChip } from "@/components/MetricChip";
import { Screen } from "@/components/Screen";
import { getBasePercent, getDoughWeight, getHydrationPercent } from "@/lib/baker";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type { RecipeIngredient } from "@/types/recipe";

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

export default function RecipeFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { createRecipe, getRecipeById, updateRecipe } = useRecipes();
  const existingRecipe = params.id ? getRecipeById(params.id) : undefined;

  const [name, setName] = useState(existingRecipe?.name ?? "");
  const [description, setDescription] = useState(existingRecipe?.description ?? "");
  const [notes, setNotes] = useState(existingRecipe?.notes ?? "");
  const [useAsPreferment, setUseAsPreferment] = useState(existingRecipe?.useAsPreferment ?? false);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    existingRecipe?.ingredients ?? [emptyIngredient(), emptyIngredient()]
  );

  const stats = useMemo(() => {
    return {
      basePercent: getBasePercent(ingredients),
      hydration: getHydrationPercent(ingredients),
      doughWeight: getDoughWeight(ingredients)
    };
  }, [ingredients]);

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

  function saveRecipe() {
    const normalizedIngredients = ingredients.filter(
      (ingredient) => ingredient.name.trim() && ingredient.bakerPercentage > 0
    );

    if (!name.trim()) {
      Alert.alert("Falta el nombre", "La formula necesita un nombre.");
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
      useAsPreferment,
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
          <Text style={styles.title}>{isEditing ? "Editar formula" : "Crear formula"}</Text>
        </View>
      }
    >
      <View style={styles.metrics}>
        <MetricChip label="Harina base" value={`${stats.basePercent}%`} />
        <MetricChip label="Hidratacion" value={`${stats.hydration}%`} />
        <MetricChip label="Peso total" value={`${stats.doughWeight} g`} />
      </View>

      <View style={styles.section}>
        <TextInput
          onChangeText={setName}
          placeholder="Nombre de la formula"
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
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Usar como prefermento</Text>
            <Text style={styles.switchHint}>
              Permite elegir esta formula dentro de otra desde "Agregar prefermento".
            </Text>
          </View>
          <Switch
            onValueChange={setUseAsPreferment}
            trackColor={{ false: theme.colors.surfaceMuted, true: "#B7C9CE" }}
            value={useAsPreferment}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.inlineHeader}>
          <Text style={styles.sectionTitle}>Ingredientes</Text>
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Notas de trabajo"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.notesArea]}
          value={notes}
        />
      </View>

      <Pressable onPress={saveRecipe} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {isEditing ? "Guardar cambios" : "Guardar formula"}
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
    gap: theme.spacing.sm
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  inlineHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  inlineButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
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
    minHeight: 80,
    textAlignVertical: "top"
  },
  notesArea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  switchCopy: {
    flex: 1,
    gap: 4
  },
  switchTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  switchHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
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
