import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ingredientRoleLabels } from "@/lib/ingredientLabels";
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
        <Pressable onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Quitar</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            onChange({ ...ingredient, quantity: Number(value) || 0 })
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
              style={[
                styles.unitChip,
                ingredient.unit === unit && styles.unitChipActive
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
            onChange({ ...ingredient, bakerPercentage: Number(value) || 0 })
          }
          placeholder="% panadero"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.flex]}
          value={ingredient.bakerPercentage ? String(ingredient.bakerPercentage) : ""}
        />
      </View>

      <View style={styles.roleGroup}>
        {roles.map((role) => (
          <Pressable
            key={role}
            onPress={() => onChange({ ...ingredient, role })}
            style={[
              styles.roleChip,
              ingredient.role === role && styles.roleChipActive
            ]}
          >
            <Text
              style={[
                styles.roleText,
                ingredient.role === role && styles.roleTextActive
              ]}
            >
              {ingredientRoleLabels[role]}
            </Text>
          </Pressable>
        ))}
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
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  roleChipActive: {
    backgroundColor: theme.colors.accentDeep
  },
  roleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  roleTextActive: {
    color: "#F8F5F1"
  }
});
