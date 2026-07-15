import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
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

import { FormulaListItem } from "@/components/FormulaListItem";
import { Screen } from "@/components/Screen";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

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
      header={
        <View style={styles.header}>
          <ImageBackground
            imageStyle={styles.brandPatternImage}
            resizeMode="repeat"
            source={require("../assets/branding/bread-pattern.png")}
            style={styles.brandCard}
          >
            <View style={styles.brandOverlay} />
            <Text style={styles.brand}>CENTENO</Text>
          </ImageBackground>
        </View>
      }
      overlay={
        <Pressable onPress={() => setNewRecipeVisible(true)} style={styles.fab}>
          <Text style={styles.fabText}>Nueva receta</Text>
        </Pressable>
      }
    >
      <Image
        resizeMode="repeat"
        source={require("../assets/branding/bread-pattern.png")}
        style={styles.backgroundPattern}
      />

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
          <Text style={styles.empty}>No hay formulas para mostrar.</Text>
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
                <Pressable onPress={closeNewRecipeModal} style={styles.textAction}>
                  <Text style={styles.textActionLabel}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={handleCreateRecipe} style={styles.primaryAction}>
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
    paddingBottom: theme.spacing.md
  },
  brandCard: {
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: 88,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md
  },
  brandPatternImage: {
    opacity: 0.11
  },
  brandOverlay: {
    backgroundColor: "rgba(90, 74, 63, 0.88)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  brand: {
    color: "#F8F5F1",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5
  },
  backgroundPattern: {
    bottom: 0,
    left: 0,
    opacity: 0.05,
    position: "absolute",
    right: 0,
    top: 0
  },
  search: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 48,
    marginTop: theme.spacing.xs,
    paddingHorizontal: 14
  },
  list: {
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
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: 999,
    minWidth: 172,
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  fabText: {
    color: "#F8F5F1",
    fontSize: 15,
    fontWeight: "800"
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
    borderRadius: theme.radius.lg,
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
  primaryActionLabel: {
    color: "#F8F5F1",
    fontSize: 13,
    fontWeight: "800"
  }
});
