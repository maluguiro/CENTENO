import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PrefermentBreakdown } from "@/lib/baker";
import { getIngredientRoleAppearance, ingredientRoleLabels } from "@/lib/ingredientLabels";
import { RoleMarker } from "@/components/RoleMarker";
import { theme } from "@/theme";
import type { RecipeIngredient } from "@/types/recipe";

type IngredientRowProps = {
  ingredient: RecipeIngredient & { scaledQuantity?: number };
  onPress?: () => void;
  prefermentBreakdown?: PrefermentBreakdown | null;
  quantityDetail?: string | null;
  quantityWarning?: string | null;
  quantityOverride?: number | null;
};

export function IngredientRow({
  ingredient,
  onPress,
  prefermentBreakdown,
  quantityDetail,
  quantityOverride,
  quantityWarning
}: IngredientRowProps) {
  const isPreferment = ingredient.role === "preferment";
  const roleAppearance = getIngredientRoleAppearance(ingredient.role);
  const visibleQuantity = quantityOverride ?? ingredient.quantity;

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
          <View style={[styles.roleChip, { backgroundColor: roleAppearance.background }]}>
            <Text style={[styles.roleChipText, { color: roleAppearance.text }]}>
              {ingredientRoleLabels[ingredient.role]}
            </Text>
          </View>
          <Text style={styles.metaText}>{ingredient.bakerPercentage}%</Text>
        </View>
        {isPreferment ? (
          <View style={styles.prefermentRow}>
            {prefermentBreakdown?.status === "resolved" ? (
              <>
                <Text style={styles.prefermentText}>
                  Aporta: {prefermentBreakdown.contributedFlour} g harina ·{" "}
                  {prefermentBreakdown.contributedLiquids} g agua ·{" "}
                  {prefermentBreakdown.originalHydration}% hidratacion
                </Text>
              </>
            ) : (
              <Text style={styles.prefermentText}>
                {prefermentBreakdown?.message ?? "Prefermento no disponible"}
              </Text>
            )}
          </View>
        ) : null}
        {quantityDetail ? <Text style={styles.detailText}>{quantityDetail}</Text> : null}
        {quantityWarning ? <Text style={styles.warningText}>{quantityWarning}</Text> : null}
      </View>
      <View style={styles.values}>
        <Text style={styles.quantity}>
          {visibleQuantity} {ingredient.unit}
        </Text>
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
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "700"
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
  },
  detailText: {
    color: theme.colors.textSoft,
    fontSize: 11
  },
  warningText: {
    color: theme.colors.warning,
    fontSize: 11
  }
});
