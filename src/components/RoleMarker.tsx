import { StyleSheet, View } from "react-native";

import { getIngredientRoleAppearance } from "@/lib/ingredientLabels";
import type { IngredientRole } from "@/types/recipe";

type RoleMarkerProps = {
  role: IngredientRole;
};

export function RoleMarker({ role }: RoleMarkerProps) {
  return <View style={[styles.dot, { backgroundColor: getIngredientRoleAppearance(role).dot }]} />;
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
