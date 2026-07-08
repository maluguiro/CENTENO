import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { IngredientEditor } from "@/components/IngredientEditor";
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

    if (existingRecipe) {
      updateRecipe(existingRecipe.id, {
        name,
        description,
        notes,
        ingredients: normalizedIngredients
      });
    } else {
      createRecipe({
        name,
        description,
        notes,
        ingredients: normalizedIngredients
      });
    }

    router.replace("/");
  }

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{isEditing ? "EDITAR" : "NUEVA"}</Text>
          <Text style={styles.title}>
            {isEditing ? "Ajustar receta" : "Crear receta"}
          </Text>
          <Text style={styles.subtitle}>
            Carga formula, define base de harina y deja la receta lista para escalar.
          </Text>
        </View>
      }
    >
      <View style={styles.card}>
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
          placeholder="Descripcion opcional"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={description}
        />
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Notas"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={notes}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Chequeo rapido</Text>
        <Text style={styles.summaryText}>Base total: {stats.basePercent}%</Text>
        <Text style={styles.summaryText}>Hidratacion: {stats.hydration}%</Text>
        <Text style={styles.summaryText}>Peso total: {stats.doughWeight} g</Text>
      </View>

      {ingredients.map((ingredient, index) => (
        <IngredientEditor
          ingredient={ingredient}
          key={ingredient.id}
          onChange={(nextIngredient) => updateIngredient(index, nextIngredient)}
          onRemove={() => removeIngredient(index)}
        />
      ))}

      <Pressable
        onPress={() => setIngredients((current) => [...current, emptyIngredient()])}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Agregar ingrediente</Text>
      </Pressable>

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
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  input: {
    backgroundColor: "#FFFDF8",
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  summaryCard: {
    backgroundColor: "#F0E1CF",
    borderRadius: theme.radius.md,
    gap: 6,
    padding: theme.spacing.md
  },
  summaryTitle: {
    color: theme.colors.accentDeep,
    fontSize: 16,
    fontWeight: "800"
  },
  summaryText: {
    color: theme.colors.text,
    fontSize: 14
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "#FFF6EF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  }
});
