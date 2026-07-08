import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { getRecipeSummary, getScaledDoughWeight, scaleIngredients } from "@/lib/baker";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

export default function RecipeFormulaScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(params.id);
  const summary = recipe ? getRecipeSummary(recipe) : null;
  const [flourTarget, setFlourTarget] = useState(
    summary ? String(summary.baseQuantity) : "1000"
  );

  const scaledIngredients = useMemo(() => {
    if (!recipe) {
      return [];
    }

    return scaleIngredients(recipe.ingredients, Number(flourTarget) || summary?.baseQuantity || 0);
  }, [flourTarget, recipe, summary?.baseQuantity]);

  if (!recipe || !summary) {
    return (
      <Screen>
        <Text style={styles.title}>Formula no disponible</Text>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>FORMULA</Text>
          <Text style={styles.title}>{recipe.name}</Text>
          <Text style={styles.subtitle}>
            Vista concentrada para porcentaje panadero, hidratacion y cantidades recalculadas.
          </Text>
        </View>
      }
    >
      <View style={styles.metrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Base</Text>
          <Text style={styles.metricValue}>{summary.baseQuantity} g</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Hidratacion</Text>
          <Text style={styles.metricValue}>{summary.hydration}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Masa</Text>
          <Text style={styles.metricValue}>
            {getScaledDoughWeight(recipe.ingredients, Number(flourTarget) || 0)} g
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Harina total objetivo</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setFlourTarget}
          placeholder="Harina total"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={flourTarget}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Formula recalculada</Text>
        {scaledIngredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.name}>{ingredient.name}</Text>
              <Text style={styles.meta}>
                {ingredient.role} · {ingredient.bakerPercentage}%
              </Text>
            </View>
            <Text style={styles.qty}>
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
  metrics: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: theme.spacing.md
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800"
  },
  card: {
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  rowMain: {
    flex: 1,
    gap: 4
  },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  qty: {
    color: theme.colors.accentDeep,
    fontSize: 15,
    fontWeight: "800"
  }
});
