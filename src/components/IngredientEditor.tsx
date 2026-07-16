import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ingredientRoleLabels, getIngredientRoleAppearance } from "@/lib/ingredientLabels";
import { parseDecimalInput } from "@/lib/baker";
import { theme } from "@/theme";
import type {
  IngredientRole,
  IngredientUnit,
  RecipeIngredient
} from "@/types/recipe";

const units: IngredientUnit[] = ["g", "kg", "ml", "l", "unit"];
const roles: IngredientRole[] = [
  "flour",
  "water",
  "salt",
  "yeast",
  "sourdough",
  "preferment",
  "sugar",
  "fat",
  "other"
];

type IngredientEditorProps = {
  ingredient: RecipeIngredient;
  onChange: (nextIngredient: RecipeIngredient) => void;
  onRemove: () => void;
};

export function IngredientEditor({
  ingredient,
  onChange,
  onRemove
}: IngredientEditorProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <TextInput
          onChangeText={(value) => onChange({ ...ingredient, name: value })}
          placeholder="Ingrediente"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.flex]}
          value={ingredient.name}
        />
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
        >
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            onChange({ ...ingredient, quantity: parseDecimalInput(value) })
          }
          placeholder="Cantidad"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.flex]}
          value={ingredient.quantity ? String(ingredient.quantity) : ""}
        />
        <View style={styles.unitGroup}>
          {units.map((unit) => (
            <Pressable
              key={unit}
              onPress={() => onChange({ ...ingredient, unit })}
              style={({ pressed }) => [
                styles.unitChip,
                ingredient.unit === unit && styles.unitChipActive,
                pressed && styles.chipPressed
              ]}
            >
              <Text
                style={[
                  styles.unitText,
                  ingredient.unit === unit && styles.unitTextActive
                ]}
              >
                {unit}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            onChange({ ...ingredient, bakerPercentage: parseDecimalInput(value) })
          }
          placeholder="% panadero"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.flex]}
          value={ingredient.bakerPercentage ? String(ingredient.bakerPercentage) : ""}
        />
      </View>

      <View style={styles.roleGroup}>
        {roles.map((role) => {
          const isSelected = ingredient.role === role;
          const appearance = getIngredientRoleAppearance(role);
          return (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange({ ...ingredient, role })}
              style={({ pressed }) => [
                styles.roleChip,
                { borderColor: isSelected ? appearance.dot : theme.colors.border },
                isSelected && { backgroundColor: appearance.background },
                pressed && styles.chipPressed
              ]}
            >
              <View style={[styles.roleDot, { backgroundColor: appearance.dot }]} />
              <Text
                style={[
                  styles.roleText,
                  { color: isSelected ? appearance.text : theme.colors.textMuted },
                  isSelected && styles.roleTextActive
                ]}
              >
                {ingredientRoleLabels[role]}
              </Text>
              {isSelected ? (
                <Text style={[styles.roleCheck, { color: appearance.text }]}>{"\u2713"}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  flex: {
    flex: 1
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 14,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 48,
    paddingHorizontal: 14
  },
  removeButton: {
    backgroundColor: "#F3E2DA",
    borderColor: "#D8B6AA",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  removeButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  removeText: {
    color: theme.colors.danger,
    fontWeight: "700"
  },
  unitGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    maxWidth: 160
  },
  unitChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  unitChipActive: {
    backgroundColor: theme.colors.accent
  },
  chipPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  unitText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  unitTextActive: {
    color: "#F8F5F1"
  },
  roleGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  roleChip: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  roleDot: {
    borderRadius: 999,
    height: 7,
    width: 7
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600"
  },
  roleTextActive: {
    fontWeight: "700"
  },
  roleCheck: {
    fontSize: 11,
    fontWeight: "800"
  }
});
