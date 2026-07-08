import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { getRecipeSummary, getScaledDoughWeight, scaleIngredients } from "@/lib/baker";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

export default function CalculatorScreen() {
  const { recipes } = useRecipes();
  const [selectedId, setSelectedId] = useState(recipes[0]?.id ?? "");
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0];
  const [flourTarget, setFlourTarget] = useState(
    selectedRecipe ? String(getRecipeSummary(selectedRecipe).baseQuantity) : "1000"
  );

  const scaled = selectedRecipe
    ? scaleIngredients(selectedRecipe.ingredients, Number(flourTarget) || 0)
    : [];

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CALCULADORA</Text>
          <Text style={styles.title}>Reescalar formulas rapido</Text>
          <Text style={styles.subtitle}>
            Pantalla minima para comparar recetas y recalcular desde la harina base.
          </Text>
        </View>
      }
    >
      <View style={styles.recipePicker}>
        {recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() => {
              setSelectedId(recipe.id);
              setFlourTarget(String(getRecipeSummary(recipe).baseQuantity));
            }}
            style={[
              styles.recipeChip,
              recipe.id === selectedRecipe?.id && styles.recipeChipActive
            ]}
          >
            <Text
              style={[
                styles.recipeChipText,
                recipe.id === selectedRecipe?.id && styles.recipeChipTextActive
              ]}
            >
              {recipe.name}
            </Text>
          </Pressable>
        ))}
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
        <Text style={styles.sectionTitle}>Resultado</Text>
        {selectedRecipe ? (
          <Text style={styles.helperText}>
            Hidratacion {getRecipeSummary(selectedRecipe).hydration}% · Masa{" "}
            {getScaledDoughWeight(selectedRecipe.ingredients, Number(flourTarget) || 0)} g
          </Text>
        ) : null}
        {selectedRecipe ? (
          scaled.map((ingredient) => (
            <View key={ingredient.id} style={styles.resultRow}>
              <Text style={styles.resultName}>
                {ingredient.name} ({ingredient.role} · {ingredient.bakerPercentage}%)
              </Text>
              <Text style={styles.resultQty}>
                {ingredient.scaledQuantity} {ingredient.unit}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay recetas para calcular.</Text>
        )}
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
  recipePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  recipeChip: {
    backgroundColor: "#F0E1CF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  recipeChipActive: {
    backgroundColor: theme.colors.accent
  },
  recipeChipText: {
    color: theme.colors.accentDeep,
    fontWeight: "700"
  },
  recipeChipTextActive: {
    color: "#FFF6EF"
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
  resultRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  resultName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingRight: 12
  },
  resultQty: {
    color: theme.colors.accentDeep,
    fontSize: 15,
    fontWeight: "800"
  },
  emptyText: {
    color: theme.colors.textMuted
  }
});
