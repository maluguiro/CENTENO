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
    borderRadius: 999,
    height: 8,
    width: 8
  }
});
