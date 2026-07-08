import { Pressable, StyleSheet, Text, View } from "react-native";

import { getRecipeSummary } from "@/lib/baker";
import { theme } from "@/theme";
import type { Recipe } from "@/types/recipe";

type RecipeCardProps = {
  recipe: Recipe;
  onPress: () => void;
};

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const summary = getRecipeSummary(recipe);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{recipe.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{summary.hydration}% hidr.</Text>
        </View>
      </View>
      {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{summary.ingredientCount} ingredientes</Text>
        <Text style={styles.meta}>Base {summary.baseQuantity} g</Text>
        <Text style={styles.meta}>Masa {summary.doughWeight} g</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: "#F0E1CF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "700"
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13
  }
});
