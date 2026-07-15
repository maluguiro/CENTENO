import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PrefermentBreakdown } from "@/lib/baker";
import { ingredientRoleLabels } from "@/lib/ingredientLabels";
import { RoleMarker } from "@/components/RoleMarker";
import { theme } from "@/theme";
import type { RecipeIngredient } from "@/types/recipe";

type IngredientRowProps = {
  ingredient: RecipeIngredient & { scaledQuantity?: number };
  onPress?: () => void;
  prefermentBreakdown?: PrefermentBreakdown | null;
};

export function IngredientRow({ ingredient, onPress, prefermentBreakdown }: IngredientRowProps) {
  const isPreferment = ingredient.role === "preferment";

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <RoleMarker role={ingredient.role} />
          <Text numberOfLines={1} style={styles.name}>
            {ingredient.name}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{ingredientRoleLabels[ingredient.role]}</Text>
          <Text style={styles.metaText}>{ingredient.bakerPercentage}%</Text>
        </View>
        {isPreferment ? (
          <View style={styles.prefermentRow}>
            {prefermentBreakdown?.status === "resolved" ? (
              <>
                <Text style={styles.prefermentText}>
                  Formula: {prefermentBreakdown.linkedRecipeName}
                </Text>
                <Text style={styles.prefermentText}>
                  Hidratacion: {prefermentBreakdown.originalHydration}%
                </Text>
                <Text style={styles.prefermentText}>
                  Harina aportada: {prefermentBreakdown.contributedFlour} g
                </Text>
                <Text style={styles.prefermentText}>
                  Agua aportada: {prefermentBreakdown.contributedLiquids} g
                </Text>
                <Text style={styles.prefermentText}>
                  Peso original: {prefermentBreakdown.originalWeight} g
                </Text>
              </>
            ) : (
              <Text style={styles.prefermentText}>
                {prefermentBreakdown?.message ?? "Prefermento no disponible"}
              </Text>
            )}
          </View>
        ) : null}
      </View>
      <View style={styles.values}>
        <Text style={styles.quantity}>{ingredient.quantity} {ingredient.unit}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: 14
  },
  main: {
    flex: 1,
    gap: 4
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  name: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700"
  },
  metaRow: {
    flexDirection: "row",
    gap: 10
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500"
  },
  values: {
    alignItems: "flex-end",
    minWidth: 92
  },
  quantity: {
    color: theme.colors.accent,
    fontSize: 20,
    fontWeight: "800"
  },
  prefermentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 2
  },
  prefermentText: {
    color: theme.colors.textSoft,
    fontSize: 11
  }
});
