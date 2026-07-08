import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import {
  getDoughWeight,
  getHydrationPercentage,
  getMoistureIndex,
  getTotalFats,
  getTotalFlour,
  getRecipeSummary,
  scaleByDoughWeight,
  scaleByTotalFlour,
  scaleByYield
} from "@/lib/baker";
import { ingredientRoleLabels } from "@/lib/ingredientLabels";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

type ScaleMode = "flour" | "dough" | "yield";

export default function RecipeFormulaScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { getRecipeById } = useRecipes();
  const recipe = getRecipeById(params.id);
  const summary = recipe ? getRecipeSummary(recipe) : null;
  const [mode, setMode] = useState<ScaleMode>("flour");
  const [flourTarget, setFlourTarget] = useState(
    summary ? String(summary.baseQuantity) : "1000"
  );
  const [doughTarget, setDoughTarget] = useState(
    summary ? String(summary.doughWeight) : "1800"
  );
  const [pieceCount, setPieceCount] = useState("10");
  const [pieceWeight, setPieceWeight] = useState("350");

  const scaledIngredients = useMemo(() => {
    if (!recipe) {
      return [];
    }

    if (mode === "dough") {
      return scaleByDoughWeight(
        recipe.ingredients,
        Number(doughTarget) || summary?.doughWeight || 0
      );
    }

    if (mode === "yield") {
      return scaleByYield(
        recipe.ingredients,
        Number(pieceCount) || 0,
        Number(pieceWeight) || 0
      );
    }

    return scaleByTotalFlour(
      recipe.ingredients,
      Number(flourTarget) || summary?.baseQuantity || 0
    );
  }, [
    doughTarget,
    flourTarget,
    mode,
    pieceCount,
    pieceWeight,
    recipe,
    summary?.baseQuantity,
    summary?.doughWeight
  ]);

  if (!recipe || !summary) {
    return (
      <Screen>
        <Text style={styles.title}>Formula no disponible</Text>
      </Screen>
    );
  }

  const scaledSummary = {
    flour: getTotalFlour(scaledIngredients),
    doughWeight: getDoughWeight(scaledIngredients),
    hydration: getHydrationPercentage(scaledIngredients),
    moistureIndex: getMoistureIndex(scaledIngredients),
    fats: getTotalFats(scaledIngredients)
  };

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
          <Text style={styles.metricValue}>{scaledSummary.flour} g</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Hidratacion</Text>
          <Text style={styles.metricValue}>{scaledSummary.hydration}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Indice de humedad</Text>
          <Text style={styles.metricValue}>{scaledSummary.moistureIndex}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Grasas</Text>
          <Text style={styles.metricValue}>{scaledSummary.fats} g</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Peso total</Text>
          <Text style={styles.metricValue}>{scaledSummary.doughWeight} g</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Modo de recálculo</Text>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode("flour")}
            style={[styles.modeChip, mode === "flour" && styles.modeChipActive]}
          >
            <Text style={[styles.modeChipText, mode === "flour" && styles.modeChipTextActive]}>
              Por harina
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("dough")}
            style={[styles.modeChip, mode === "dough" && styles.modeChipActive]}
          >
            <Text style={[styles.modeChipText, mode === "dough" && styles.modeChipTextActive]}>
              Por masa
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("yield")}
            style={[styles.modeChip, mode === "yield" && styles.modeChipActive]}
          >
            <Text style={[styles.modeChipText, mode === "yield" && styles.modeChipTextActive]}>
              Por piezas
            </Text>
          </Pressable>
        </View>

        {mode === "flour" ? (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setFlourTarget}
            placeholder="Harina total"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={flourTarget}
          />
        ) : null}

        {mode === "dough" ? (
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setDoughTarget}
            placeholder="Peso total de masa"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={doughTarget}
          />
        ) : null}

        {mode === "yield" ? (
          <View style={styles.yieldRow}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setPieceCount}
              placeholder="Piezas"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.yieldInput]}
              value={pieceCount}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setPieceWeight}
              placeholder="Peso por pieza"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.yieldInput]}
              value={pieceWeight}
            />
          </View>
        ) : null}
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
          La formula mantiene hidratacion e indice de humedad, y cambia la escala segun el modo elegido.
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
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  modeChip: {
    backgroundColor: "#F0E1CF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  modeChipActive: {
    backgroundColor: theme.colors.accent
  },
  modeChipText: {
    color: theme.colors.accentDeep,
    fontSize: 13,
    fontWeight: "700"
  },
  modeChipTextActive: {
    color: "#FFF6EF"
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
  yieldRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  yieldInput: {
    flex: 1
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
