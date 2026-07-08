import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { getRecipeSummary, getScaledDoughWeight, scaleIngredients } from "@/lib/baker";
import { ingredientRoleLabels } from "@/lib/ingredientLabels";
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
            Vista central para revisar ingredientes, porcentajes y cantidades recalculadas.
          </Text>
        </View>
      }
    >
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
          <Text style={styles.metricLabel}>Peso total</Text>
          <Text style={styles.metricValue}>
            {getScaledDoughWeight(recipe.ingredients, Number(flourTarget) || 0)} g
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Ingredientes</Text>
          <Text style={styles.metricValue}>{summary.ingredientCount}</Text>
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
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.nameCell]}>Ingrediente</Text>
          <Text style={styles.headerCell}>Cantidad</Text>
          <Text style={styles.headerCell}>%</Text>
          <Text style={styles.headerCell}>Rol</Text>
          <Text style={styles.headerCell}>Recalc.</Text>
        </View>
        {scaledIngredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.tableRow}>
            <Text style={[styles.cellText, styles.nameCell]}>{ingredient.name}</Text>
            <Text style={styles.cellText}>
              {ingredient.quantity} {ingredient.unit}
            </Text>
            <Text style={styles.cellText}>{ingredient.bakerPercentage}%</Text>
            <Text style={styles.cellText}>{ingredientRoleLabels[ingredient.role]}</Text>
            <Text style={[styles.cellText, styles.recalcCell]}>
              {ingredient.scaledQuantity} {ingredient.unit}
            </Text>
          </View>
        ))}
        <Text style={styles.helperText}>
          Futuro: esta base permite sumar recalculo por cantidad de piezas y peso por pieza sin cambiar la persistencia actual.
        </Text>
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
  tableHeader: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingBottom: 10
  },
  tableRow: {
    borderBottomColor: "#E9DDC9",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 10
  },
  headerCell: {
    color: theme.colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: "800"
  },
  nameCell: {
    flex: 1.6
  },
  cellText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 13,
    paddingRight: 8
  },
  recalcCell: {
    color: theme.colors.accentDeep,
    fontWeight: "800"
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 8
  }
});
