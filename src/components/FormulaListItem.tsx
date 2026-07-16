import { Pressable, StyleSheet, Text, View } from "react-native";

import { getRecipeSummary } from "@/lib/baker";
import { theme } from "@/theme";
import type { Recipe } from "@/types/recipe";

type FormulaListItemProps = {
  recipe: Recipe;
  onPress: () => void;
};

export function FormulaListItem({ recipe, onPress }: FormulaListItemProps) {
  const summary = getRecipeSummary(recipe);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.main}>
        <Text numberOfLines={1} style={styles.name}>
          {recipe.name}
        </Text>
        {recipe.description ? (
          <Text numberOfLines={1} style={styles.description}>
            {recipe.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.value}>{summary.hydration}%</Text>
        <Text style={styles.label}>hidr.</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.value}>{summary.doughWeight} g</Text>
        <Text style={styles.label}>masa</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 76,
    paddingVertical: 16
  },
  main: {
    flex: 1,
    justifyContent: "center",
    minHeight: 44
  },
  name: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  meta: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 74
  },
  value: {
    color: theme.colors.accentDeep,
    fontSize: 16,
    fontWeight: "800"
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 3
  }
});
