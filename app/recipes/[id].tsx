import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { getRecipeSummary, getScaledDoughWeight, scaleIngredients } from "@/lib/baker";
import { ingredientRoleLabels } from "@/lib/ingredientLabels";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { deleteRecipe, getRecipeById } = useRecipes();
  const recipe = getRecipeById(params.id);

  const defaultFlour = recipe ? getRecipeSummary(recipe).baseQuantity : 0;
  const [flourTarget, setFlourTarget] = useState(defaultFlour ? String(defaultFlour) : "1000");

  const scaledIngredients = useMemo(() => {
    if (!recipe) {
      return [];
    }

    return scaleIngredients(recipe.ingredients, Number(flourTarget) || defaultFlour || 0);
  }, [defaultFlour, flourTarget, recipe]);

  if (!recipe) {
    return (
      <Screen>
        <Text style={styles.title}>Formula no encontrada</Text>
      </Screen>
    );
  }

  const summary = getRecipeSummary(recipe);

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FORMULA</Text>
          <Text style={styles.title}>{recipe.name}</Text>
          {recipe.description ? <Text style={styles.subtitle}>{recipe.description}</Text> : null}
        </View>
      }
    >
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push(`/recipes/${recipe.id}/formula`)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Ver formula</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/recipes/form?id=${recipe.id}`)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Editar</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            deleteRecipe(recipe.id);
            router.replace("/");
          }}
          style={styles.dangerButton}
        >
          <Text style={styles.dangerButtonText}>Eliminar</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Harina total</Text>
          <Text style={styles.metricValue}>{summary.baseQuantity} g</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Hidratacion</Text>
          <Text style={styles.metricValue}>{summary.hydration}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Indice de humedad</Text>
          <Text style={styles.metricValue}>{summary.moistureIndex}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Grasas</Text>
          <Text style={styles.metricValue}>{summary.fats} g</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Peso total de masa</Text>
          <Text style={styles.metricValue}>{summary.doughWeight} g</Text>
        </View>
      </View>

      {recipe.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.helperText}>{recipe.notes}</Text>
        </View>
      ) : null}

      <View style={styles.calculatorCard}>
        <Text style={styles.sectionTitle}>Recalcular formula</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setFlourTarget}
          placeholder="Harina total"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={flourTarget}
        />
        <Text style={styles.helperText}>
          Cambia la harina total y la formula recalcula las cantidades desde el porcentaje panadero.
        </Text>
        <Text style={styles.helperText}>
          Peso recalculado: {getScaledDoughWeight(recipe.ingredients, Number(flourTarget) || 0)} g
        </Text>
      </View>

      <View style={styles.ingredientsCard}>
        <Text style={styles.sectionTitle}>Ingredientes recalculados</Text>
        {scaledIngredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.ingredientRow}>
            <View style={styles.ingredientMain}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              <Text style={styles.ingredientMeta}>
                {ingredientRoleLabels[ingredient.role]} - {ingredient.bakerPercentage}%
              </Text>
            </View>
            <Text style={styles.ingredientQty}>
              {ingredient.scaledQuantity} {ingredient.unit}
            </Text>
          </View>
        ))}
      </View>
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
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "#FFF6EF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  secondaryButton: {
    backgroundColor: "#F0E1CF",
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  secondaryButtonText: {
    color: theme.colors.accentDeep,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  dangerButton: {
    backgroundColor: "#F3D4CD",
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  dangerButtonText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    minWidth: "47%",
    padding: theme.spacing.md
  },
  notesCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800"
  },
  calculatorCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  input: {
    backgroundColor: "#FFFDF8",
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 50,
    paddingHorizontal: 14
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  ingredientsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  ingredientRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  ingredientMain: {
    gap: 4
  },
  ingredientName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  ingredientMeta: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  ingredientQty: {
    color: theme.colors.accentDeep,
    fontSize: 15,
    fontWeight: "800"
  }
});
