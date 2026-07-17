import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
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
import { getClipboardText } from "@/lib/clipboard";
import {
  parseImportedRecipe,
  prepareImportedRecipe
} from "@/lib/recipeImportExport";
import { Screen } from "@/components/Screen";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type { RecipeCategory } from "@/types/recipe";

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
  const { createRecipe, deleteAllRecipes, importRecipe, recipes, restoreSampleRecipes } =
    useRecipes();
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState("");
  const [importPasteFeedback, setImportPasteFeedback] = useState("");
  const [newRecipeCategory, setNewRecipeCategory] = useState<RecipeCategory>("bakery");
  const [newRecipeVisible, setNewRecipeVisible] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState("");
  const [useAsPreferment, setUseAsPreferment] = useState(false);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return recipes
      .filter((recipe) => {
        const recipeCategory = recipe.category ?? "bakery";
        if (categoryFilter === "pastry" && recipeCategory !== "pastry") {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [recipe.name, recipe.description, recipe.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [categoryFilter, query, recipes]);

  function closeNewRecipeModal() {
    Keyboard.dismiss();
    setNewRecipeVisible(false);
    setNewRecipeCategory("bakery");
    setNewRecipeName("");
    setUseAsPreferment(false);
  }

  function closeImportModal() {
    Keyboard.dismiss();
    setImportVisible(false);
    setImportError("");
    setImportInput("");
    setImportPasteFeedback("");
  }

  function showImportPasteFeedback(message: string) {
    setImportPasteFeedback(message);
    setTimeout(() => {
      setImportPasteFeedback((current) => (current === message ? "" : current));
    }, 1500);
  }

  function handleCreateRecipe() {
    if (!newRecipeName.trim()) {
      return;
    }

    const recipeId = createRecipe({
      name: newRecipeName,
      description: "",
      notes: "",
      category: newRecipeCategory,
      useAsPreferment,
      ingredients: getBaseRecipeIngredients()
    });

    closeNewRecipeModal();
    router.push(`/recipes/${recipeId}`);
  }

  function handleImportRecipe() {
    try {
      const parsedRecipe = parseImportedRecipe(importInput);
      const preparedRecipe = prepareImportedRecipe(parsedRecipe, recipes);

      importRecipe(preparedRecipe);
      closeImportModal();
      Alert.alert("Receta importada correctamente.");
    } catch {
      setImportError(
        "No se pudo importar la receta. Asegurate de pegar el codigo para importar, no el texto compartido."
      );
    }
  }

  async function handlePasteImport() {
    const clipboardText = await getClipboardText();

    if (clipboardText === null) {
      setImportError("El portapapeles no esta disponible en esta build.");
      return;
    }

    if (!clipboardText.trim()) {
      showImportPasteFeedback("No hay texto para pegar.");
      return;
    }

    setImportInput(clipboardText);
    setImportError("");
    showImportPasteFeedback("Texto pegado.");
  }

  function openImportFromSettings() {
    setSettingsVisible(false);
    setImportVisible(true);
  }

  function handleRestoreSamples() {
    setSettingsVisible(false);
    Alert.alert(
      "Restablecer recetas iniciales",
      "Esto va a restaurar las recetas iniciales de CENTENO. No elimina tus recetas actuales.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restablecer",
          onPress: () => {
            restoreSampleRecipes();
            Alert.alert("Recetas iniciales restauradas.");
          }
        }
      ]
    );
  }

  function handleDeleteAllRecipes() {
    setSettingsVisible(false);
    Alert.alert(
      "Eliminar todas las recetas",
      "Esto eliminara todas tus recetas guardadas en este dispositivo. Esta accion no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: () => {
            deleteAllRecipes();
            Alert.alert("Todas las recetas fueron eliminadas.");
          }
        }
      ]
    );
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
            <Pressable
              accessibilityLabel={
                categoryFilter === "pastry" ? "Ver todas las recetas" : "Ver pasteleria"
              }
              onPress={() =>
                setCategoryFilter((current) => (current === "pastry" ? "all" : "pastry"))
              }
              style={({ pressed }) => [
                styles.filterButton,
                styles.brandFilterButton,
                { top: insets.top + 40 },
                categoryFilter === "pastry" && styles.filterButtonActive,
                pressed && styles.filterButtonPressed
              ]}
            >
              <Text style={styles.filterButtonEmoji}>
                {categoryFilter === "pastry" ? "\u{1F35E}" : "\u{1F9C1}"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Abrir herramientas"
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [
                styles.settingsButton,
                styles.brandSettingsButton,
                { top: insets.top + 92 },
                pressed && styles.fabPressed
              ]}
            >
              <Text style={styles.settingsIcon}>{"\u2699"}</Text>
            </Pressable>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>CENTENO</Text>
              <Text style={styles.brandSubtle}>Formulas panaderas para obrador</Text>
            </View>
          </View>
        </View>
      }
      overlay={
        <View style={styles.overlayStack}>
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
        </View>
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
          <Text style={styles.empty}>
            {categoryFilter === "pastry"
              ? "No hay recetas de pasteleria todavia."
              : "No hay recetas para mostrar."}
          </Text>
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
        transparent
        visible={settingsVisible}
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
              <Text style={styles.modalTitle}>Herramientas</Text>
              <Pressable
                onPress={openImportFromSettings}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Importar receta</Text>
              </Pressable>
              <Pressable
                onPress={handleRestoreSamples}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Restablecer recetas iniciales</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAllRecipes}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={[styles.toolActionTitle, styles.toolActionDanger]}>
                  Eliminar todas las recetas
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSettingsVisible(false);
                  setHelpVisible(true);
                  return;
                  Alert.alert(
                    "Ayuda",
                    "CENTENO es una libreta de formulas panaderas.\n\nConceptos basicos:\n• La harina es la base 100%.\n• La hidratacion indica cuanta agua hay respecto de la harina.\n• Los porcentajes panaderos permiten escalar recetas sin perder proporciones.\n• Podes marcar recetas como Panaderia o Pasteleria.\n• Podes usar una receta como prefermento dentro de otra.\n• El detalle [total - aporte] muestra cuanto pide la formula total menos lo que ya aporta el prefermento.\n• Para guardar o compartir una receta, usa Exportar receta.\n• Para recuperar una receta o cargar una receta enviada por otra persona, usa Importar receta."
                  );
                }}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Ayuda</Text>
              </Pressable>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setSettingsVisible(false)}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cerrar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
        transparent
        visible={helpVisible}
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
              <Text style={styles.modalTitle}>Ayuda</Text>
              <Text style={styles.modalHelper}>
                CENTENO es una libreta de formulas panaderas.
              </Text>
              <View style={styles.helpList}>
                <Text style={styles.helpItem}>• La harina es la base 100%.</Text>
                <Text style={styles.helpItem}>
                  • La hidratacion indica cuanta agua hay respecto de la harina.
                </Text>
                <Text style={styles.helpItem}>
                  • Los porcentajes panaderos permiten escalar recetas sin perder proporciones.
                </Text>
                <Text style={styles.helpItem}>
                  • Podes marcar recetas como Panaderia o Pasteleria.
                </Text>
                <Text style={styles.helpItem}>
                  • Podes usar una receta como prefermento dentro de otra.
                </Text>
                <Text style={styles.helpItem}>
                  • El detalle [total - aporte] muestra cuanto pide la formula total menos lo que
                  ya aporta el prefermento.
                </Text>
                <Text style={styles.helpItem}>
                  • Para guardar o compartir una receta, usa Exportar receta.
                </Text>
                <Text style={styles.helpItem}>
                  • Para recuperar una receta o cargar una receta enviada por otra persona, usa
                  Importar receta.
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setHelpVisible(false)}
                  style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}
                >
                  <Text style={styles.primaryActionLabel}>Cerrar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
              <View style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>Tipo de receta</Text>
                <View style={styles.categoryRow}>
                  {[
                    { key: "bakery" as const, label: "Panaderia" },
                    { key: "pastry" as const, label: "Pasteleria" }
                  ].map((option) => {
                    const selected = newRecipeCategory === option.key;

                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => setNewRecipeCategory(option.key)}
                        style={({ pressed }) => [
                          styles.categoryButton,
                          selected && styles.categoryButtonActive,
                          pressed && styles.categoryButtonPressed
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            selected && styles.categoryButtonTextActive
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
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
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed && styles.primaryActionPressed
                  ]}
                >
                  <Text style={styles.primaryActionLabel}>Guardar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={closeImportModal}
        transparent
        visible={importVisible}
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
              <Text style={styles.modalTitle}>Importar receta</Text>
              <Text style={styles.modalHelper}>
                Pega aca el codigo completo para importar generado por CENTENO.
              </Text>
              <View style={styles.modalActionsStart}>
                <Pressable
                  onPress={handlePasteImport}
                  style={({ pressed }) => [
                    styles.secondaryFilledAction,
                    pressed && styles.secondaryFilledActionPressed
                  ]}
                >
                  <Text style={styles.secondaryFilledActionLabel}>Pegar</Text>
                </Pressable>
              </View>
              <TextInput
                multiline
                onChangeText={(value) => {
                  setImportInput(value);
                  if (importError) {
                    setImportError("");
                  }
                }}
                placeholder="Pega aqui el codigo para importar"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.modalInput, styles.importField]}
                textAlignVertical="top"
                value={importInput}
              />
              {importPasteFeedback ? (
                <Text style={styles.modalHelper}>{importPasteFeedback}</Text>
              ) : null}
              {importError ? <Text style={styles.importError}>{importError}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeImportModal}
                  style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                >
                  <Text style={styles.textActionLabel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleImportRecipe}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed && styles.primaryActionPressed
                  ]}
                >
                  <Text style={styles.primaryActionLabel}>Importar</Text>
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
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 40,
    position: "relative",
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
  filterButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  brandFilterButton: {
    backgroundColor: "rgba(247, 242, 231, 0.16)",
    borderColor: "rgba(247, 242, 231, 0.28)",
    position: "absolute",
    right: 24,
    zIndex: 2
  },
  brandSettingsButton: {
    backgroundColor: "#F7F2E8",
    borderColor: "rgba(107, 78, 61, 0.14)",
    position: "absolute",
    right: 24,
    zIndex: 2
  },
  filterButtonActive: {
    backgroundColor: theme.colors.surfaceMuted
  },
  filterButtonPressed: {
    opacity: 0.82
  },
  filterButtonEmoji: {
    fontSize: 18
  },
  empty: {
    color: theme.colors.textSoft,
    fontSize: 14,
    paddingVertical: theme.spacing.lg
  },
  overlayStack: {
    alignItems: "flex-end",
    gap: theme.spacing.sm
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  settingsIcon: {
    color: theme.colors.accentDeep,
    fontSize: 18,
    fontWeight: "700"
  },
  secondaryAction: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  secondaryActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  secondaryActionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
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
  modalHelper: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  helpList: {
    gap: 8
  },
  helpItem: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  toolAction: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  toolActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  toolActionTitle: {
    color: theme.colors.text,
    fontSize: 15
  },
  toolActionDanger: {
    color: theme.colors.danger
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
  importField: {
    minHeight: 180,
    paddingVertical: 14
  },
  categoryGroup: {
    gap: theme.spacing.xs
  },
  categoryLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  categoryRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  categoryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.accentDeep,
    borderColor: theme.colors.accentDeep
  },
  categoryButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  categoryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  categoryButtonTextActive: {
    color: "#F8F5F1"
  },
  importError: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 20
  },
  modalActionsStart: {
    alignItems: "flex-start"
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
  secondaryFilledAction: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  secondaryFilledActionPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  disabledAction: {
    opacity: 0.45
  },
  secondaryFilledActionLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700"
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
