import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PrefermentBreakdown } from "@/lib/baker";
import { getIngredientRoleAppearance, ingredientRoleLabels } from "@/lib/ingredientLabels";
import { RoleMarker } from "@/components/RoleMarker";
import { theme } from "@/theme";
import type { RecipeIngredient } from "@/types/recipe";

type IngredientRowProps = {
  ingredient: RecipeIngredient & { scaledQuantity?: number };
  onPress?: () => void;
  onBreakdownHelpPress?: () => void;
  prefermentBreakdown?: PrefermentBreakdown | null;
  quantityDetail?: string | null;
  quantityWarning?: string | null;
  quantityOverride?: number | null;
};

export function IngredientRow({
  ingredient,
  onPress,
  onBreakdownHelpPress,
  prefermentBreakdown,
  quantityDetail,
  quantityOverride,
  quantityWarning
}: IngredientRowProps) {
  const isPreferment = ingredient.role === "preferment";
  const roleAppearance = getIngredientRoleAppearance(ingredient.role);
  const visibleQuantity = quantityOverride ?? ingredient.quantity;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.leftCol}>
        <View style={styles.nameRow}>
          <RoleMarker role={ingredient.role} />
          <Text numberOfLines={1} style={styles.name}>
            {ingredient.name}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.roleLabel, { color: roleAppearance.text }]}>
            {ingredientRoleLabels[ingredient.role]}
          </Text>
          <Text style={styles.dotSep}>·</Text>
          <Text style={styles.percent}>{ingredient.bakerPercentage}%</Text>
        </View>
        {quantityDetail ? (
          <View style={styles.detailRow}>
            <Text style={styles.detail}>{quantityDetail}</Text>
            {onBreakdownHelpPress ? (
              <Pressable
                accessibilityLabel="Explicar aporte del prefermento"
                hitSlop={8}
                onPress={onBreakdownHelpPress}
                style={({ pressed }) => [styles.helpChip, pressed && styles.helpChipPressed]}
              >
                <Text style={styles.helpChipText}>?</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {quantityWarning ? <Text style={styles.warning}>{quantityWarning}</Text> : null}
        {isPreferment ? (
          <View style={styles.prefermentBlock}>
            {prefermentBreakdown?.status === "resolved" ? (
              <Text style={styles.prefermentText}>
                Aporta {prefermentBreakdown.contributedFlour} g harina ·{" "}
                {prefermentBreakdown.contributedLiquids} g agua ·{" "}
                {prefermentBreakdown.originalHydration}% hidratacion
              </Text>
            ) : (
              <Text style={styles.prefermentText}>
                {prefermentBreakdown?.message ?? "Prefermento no disponible"}
              </Text>
            )}
          </View>
        ) : null}
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.quantity}>
          {visibleQuantity}
        </Text>
        <Text style={styles.unit}>{ingredient.unit}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: 14
  },
  rowPressed: {
    opacity: theme.interaction.pressedOpacity,
    backgroundColor: theme.interaction.subtleBg
  },
  leftCol: {
    flex: 1,
    gap: 3
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  name: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingLeft: 16
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: "600"
  },
  dotSep: {
    color: theme.colors.textSoft,
    fontSize: 12
  },
  percent: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 80
  },
  quantity: {
    color: theme.colors.accent,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26
  },
  unit: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
    marginTop: -2
  },
  prefermentBlock: {
    paddingLeft: 16,
    paddingTop: 2
  },
  prefermentText: {
    color: theme.colors.textSoft,
    fontSize: 11,
    lineHeight: 16
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingLeft: 16,
    paddingTop: 2
  },
  detail: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  helpChip: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  helpChipPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  helpChipText: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "800"
  },
  warning: {
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: "600",
    paddingLeft: 16
  }
});
