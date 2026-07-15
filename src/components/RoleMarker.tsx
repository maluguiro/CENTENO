import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";
import type { IngredientRole } from "@/types/recipe";

const roleColors: Record<IngredientRole, string> = {
  flour: "#6B5748",
  water: "#6FA9BD",
  fat: "#8B7564",
  salt: "#B8AA9B",
  yeast: "#7D7166",
  sugar: "#A48F7E",
  sourdough: "#6E8B61",
  preferment: "#B8793A",
  other: "#9D9186"
};

type RoleMarkerProps = {
  role: IngredientRole;
};

export function RoleMarker({ role }: RoleMarkerProps) {
  return <View style={[styles.dot, { backgroundColor: roleColors[role] ?? theme.colors.accent }]} />;
}

const styles = StyleSheet.create({
  dot: {
    borderColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderRadius: 999,
    height: 9,
    width: 9
  }
});
