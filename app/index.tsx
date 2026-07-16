import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormulaListItem } from "@/components/FormulaListItem";
import { Screen } from "@/components/Screen";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

const breadPattern = require("../assets/branding/bread-pattern.png");

function makeIngredient(
  id: string,
  name: string,
  quantity: number,
  bakerPercentage: number,
  role: "flour" | "water" | "salt" | "yeast"
) {
  return {
    id,
    name,
    quantity,
    unit: "g" as const,
    role,
    bakerPercentage
  };
}

function getBaseRecipeIngredients() {
  return [
    makeIngredient("base-flour", "Harina", 500, 100, "flour"),
    makeIngredient("base-water", "Agua", 300, 60, "water"),
    makeIngredient("base-salt", "Sal", 10, 2, "salt"),
    makeIngredient("base-yeast", "Levadura", 10, 2, "yeast")
  ];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { createRecipe, recipes } = useRecipes();
  const [query, setQuery] = useState("");
  const [newRecipeVisible, setNewRecipeVisible] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState("");
  const [useAsPreferment, setUseAsPreferment] = useState(false);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return recipes;
    }

    return recipes.filter((recipe) => {
      return [recipe.name, recipe.description, recipe.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, recipes]);

  function closeNewRecipeModal() {
    Keyboard.dismiss();
    setNewRecipeVisible(false);
    setNewRecipeName("");
    setUseAsPreferment(false);
  }

  function handleCreateRecipe() {
    if (!newRecipeName.trim()) {
      return;
    }

    const recipeId = createRecipe({
      name: newRecipeName,
      description: "",
      notes: "",
      useAsPreferment,
      ingredients: getBaseRecipeIngredients()
    });

    closeNewRecipeModal();
    router.push(`/recipes/${recipeId}`);
  }

  return (
    <Screen
      headerVariant="bare"
      header={
        <View style={styles.header}>
          <View
            style={[
              styles.brandCard,
              {
                marginTop: -(insets.top + theme.spacing.sm),
                paddingTop: insets.top + 58
              }
            ]}
          >
            <View pointerEvents="none" style={styles.brandPatternWrap}>
              <Image resizeMode="repeat" source={breadPattern} style={styles.brandPattern} />
            </View>
            <View style={styles.brandOverlay} />
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>CENTENO</Text>
              <Text style={styles.brandSubtle}>Formulas panaderas para obrador</Text>
            </View>
          </View>
        </View>
      }
      overlay={
        <Pressable
          onPress={() => setNewRecipeVisible(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <View pointerEvents="none" style={styles.fabPatternWrap}>
            <Image resizeMode="cover" source={breadPattern} style={styles.fabPattern} />
          </View>
          <View style={styles.fabOverlay} />
          <Text style={styles.fabText}>Nueva receta</Text>
        </Pressable>
      }
    >
      <TextInput
        onChangeText={setQuery}
        placeholder="Buscar receta..."
        placeholderTextColor={theme.colors.textMuted}
        style={styles.search}
        value={query}
      />

      <View style={styles.list}>
        {filteredRecipes.map((recipe) => (
          <FormulaListItem
            key={recipe.id}
            onPress={() => router.push(`/recipes/${recipe.id}`)}
            recipe={recipe}
          />
        ))}
        {!filteredRecipes.length ? (
          <Text style={styles.empty}>No hay recetas para mostrar.</Text>
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeNewRecipeModal}
        transparent
        visible={newRecipeVisible}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: "height" })}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Nueva receta</Text>
              <TextInput
                onChangeText={setNewRecipeName}
                placeholder="Nombre de la receta"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.modalInput}
                value={newRecipeName}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchTitle}>Usar como prefermento</Text>
                </View>
                <Switch
                  onValueChange={setUseAsPreferment}
                  trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.waterSoft }}
                  value={useAsPreferment}
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeNewRecipeModal}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreateRecipe}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
                >
                  <Text style={styles.primaryActionLabel}>Guardar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: -theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: 0
  },
  brandCard: {
    backgroundColor: theme.colors.accentDeep,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: 222,
    overflow: "hidden",
    position: "relative",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 40,
    shadowColor: "#2F241E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 5
  },
  brandPatternWrap: {
    ...StyleSheet.absoluteFill
  },
  brandPattern: {
    bottom: 0,
    height: "100%",
    left: -96,
    opacity: 0.2,
    position: "absolute",
    tintColor: "#F3E8D9",
    top: 0,
    width: "145%"
  },
  brandOverlay: {
    backgroundColor: "rgba(107, 78, 61, 0.18)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  brandCopy: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 12,
    zIndex: 1
  },
  brand: {
    color: "#FFF9EF",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  brandSubtle: {
    color: "rgba(255, 249, 239, 0.78)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 0
  },
  search: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 56,
    marginTop: 2,
    paddingHorizontal: 18,
    shadowColor: "#6B4E3D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1
  },
  list: {
    marginTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl
  },
  empty: {
    color: theme.colors.textSoft,
    fontSize: 14,
    paddingVertical: theme.spacing.lg
  },
  fab: {
    alignItems: "center",
    backgroundColor: theme.colors.accentDeep,
    borderColor: "rgba(255, 249, 239, 0.18)",
    borderWidth: 0.5,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    minWidth: 184,
    overflow: "hidden",
    paddingHorizontal: 28,
    position: "relative",
    shadowColor: "#2F241E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5
  },
  fabPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  fabPatternWrap: {
    ...StyleSheet.absoluteFill
  },
  fabPattern: {
    bottom: 0,
    height: "100%",
    left: -28,
    opacity: 0.2,
    position: "absolute",
    tintColor: "#F3E8D9",
    top: 0,
    width: "126%"
  },
  fabOverlay: {
    backgroundColor: "rgba(90, 64, 50, 0.24)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  fabText: {
    color: "#FFF9EF",
    fontSize: 15,
    fontWeight: "800",
    zIndex: 1
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(47, 42, 38, 0.28)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 6,
    maxWidth: 520,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: "90%"
  },
  modalContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  modalInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 48,
    paddingHorizontal: 14
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  switchCopy: {
    flex: 1
  },
  switchTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "flex-end"
  },
  textAction: {
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  textActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  textActionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  primaryAction: {
    backgroundColor: theme.colors.accentDeep,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  primaryActionLabel: {
    color: "#F8F5F1",
    fontSize: 13,
    fontWeight: "800"
  }
});
