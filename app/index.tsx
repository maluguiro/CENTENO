import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  GuideModal,
  type GuideTargetKey,
  type GuideTargetRect
} from "@/components/GuideModal";
import { setClipboardText } from "@/lib/clipboard";
import { getGuideSeen, setGuideSeen } from "@/lib/guideStorage";
import {
  pickCentenoRecipeFileContent,
  shareCentenoRecipeFile,
  shareCentenoRecipesBackupFile
} from "@/lib/recipeFileShare";
import { getClipboardText } from "@/lib/clipboard";
import {
  exportRecipeToJson,
  parseImportedCentenoFile,
  parseImportedRecipe,
  prepareImportedRecipe
} from "@/lib/recipeImportExport";
import { cloneRecipeMetadata } from "@/lib/recipeFields";
import { formatRecipeAsShareText } from "@/lib/recipeShareText";
import { Screen } from "@/components/Screen";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";
import type { Recipe, RecipeCategory } from "@/types/recipe";

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

function normalizeRecipeName(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function buildDuplicateRecipeName(name: string, recipes: Recipe[]) {
  const baseName = name.trim();
  const existingNames = new Set(recipes.map((recipe) => normalizeRecipeName(recipe.name)));

  const firstCandidate = `${baseName} (copia)`;
  if (!existingNames.has(normalizeRecipeName(firstCandidate))) {
    return firstCandidate;
  }

  let index = 2;
  while (existingNames.has(normalizeRecipeName(`${baseName} (copia ${index})`))) {
    index += 1;
  }

  return `${baseName} (copia ${index})`;
}

type HomeExportMode = "selector" | "shareText" | "centenoFile" | "importCode" | null;
type HomeImportMode = "selector" | "backupCode";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    createRecipe,
    deleteAllRecipes,
    deleteRecipe,
    importRecipe,
    importRecipes,
    isReady,
    recipes,
    restoreSampleRecipes,
    updateRecipe
  } =
    useRecipes();
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importMode, setImportMode] = useState<HomeImportMode>("selector");
  const [quickRecipeId, setQuickRecipeId] = useState<string | null>(null);
  const [quickExportMode, setQuickExportMode] = useState<HomeExportMode>(null);
  const [quickExportJson, setQuickExportJson] = useState("");
  const [quickShareText, setQuickShareText] = useState("");
  const [quickCopyFeedback, setQuickCopyFeedback] = useState<HomeExportMode>(null);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState("");
  const [importPasteFeedback, setImportPasteFeedback] = useState("");
  const [newRecipeCategory, setNewRecipeCategory] = useState<RecipeCategory>("bakery");
  const [newRecipeVisible, setNewRecipeVisible] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState("");
  const [useAsPreferment, setUseAsPreferment] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [guideChecked, setGuideChecked] = useState(false);
  const [guideTargetRects, setGuideTargetRects] = useState<
    Partial<Record<GuideTargetKey, GuideTargetRect>>
  >({});
  const brandHeaderRef = useRef<View>(null);
  const categoryFilterRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);
  const searchRef = useRef<View>(null);
  const recipeListRef = useRef<View>(null);
  const newRecipeFabRef = useRef<View>(null);

  useEffect(() => {
    if (!isReady || guideChecked) {
      return;
    }

    let isMounted = true;

    async function loadGuideState() {
      const seen = await getGuideSeen();

      if (!isMounted) {
        return;
      }

      if (!seen) {
        setGuideStepIndex(0);
        setGuideVisible(true);
      }

      setGuideChecked(true);
    }

    loadGuideState();

    return () => {
      isMounted = false;
    };
  }, [guideChecked, isReady]);

  function measureGuideTargets() {
    const refs: Array<[GuideTargetKey, typeof brandHeaderRef]> = [
      ["brandHeader", brandHeaderRef],
      ["categoryFilter", categoryFilterRef],
      ["settingsButton", settingsButtonRef],
      ["recipeList", recipeListRef],
      ["newRecipeFab", newRecipeFabRef]
    ];

    refs.forEach(([key, ref]) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setGuideTargetRects((current) => ({
            ...current,
            [key]: { x, y, width, height }
          }));
        }
      });
    });
  }

  useEffect(() => {
    if (!guideVisible) {
      return;
    }

    const timer = setTimeout(() => {
      measureGuideTargets();
    }, 60);

    return () => clearTimeout(timer);
  }, [guideStepIndex, guideVisible, recipes.length, settingsVisible]);

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
  const recipeLookup = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);

  const quickRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === quickRecipeId),
    [quickRecipeId, recipes]
  );

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
    setImportMode("selector");
    setImportError("");
    setImportInput("");
    setImportPasteFeedback("");
  }

  function closeGuideModal() {
    setGuideVisible(false);
    setGuideStepIndex(0);
  }

  async function completeGuide() {
    await setGuideSeen();
    closeGuideModal();
  }

  async function skipGuide() {
    await setGuideSeen();
    closeGuideModal();
  }

  function openGuideFromSettings() {
    setSettingsVisible(false);
    setGuideStepIndex(0);
    setGuideVisible(true);
  }

  function showImportPasteFeedback(message: string) {
    setImportPasteFeedback(message);
    setTimeout(() => {
      setImportPasteFeedback((current) => (current === message ? "" : current));
    }, 1500);
  }

  function showQuickCopyFeedback(mode: Exclude<HomeExportMode, "selector" | null>) {
    setQuickCopyFeedback(mode);
    setTimeout(() => {
      setQuickCopyFeedback((current) => (current === mode ? null : current));
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
        "No se pudo importar la receta. Asegurate de pegar el codigo completo para importar."
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
    setImportMode("selector");
    setImportVisible(true);
  }

  function openQuickActions(recipe: Recipe) {
    setQuickRecipeId(recipe.id);
  }

  function closeQuickActions() {
    setQuickRecipeId(null);
  }

  function closeQuickExport() {
    setQuickExportMode(null);
    setQuickCopyFeedback(null);
  }

  function handleToggleQuickPreferment() {
    if (!quickRecipe) {
      return;
    }

    updateRecipe(quickRecipe.id, {
      name: quickRecipe.name,
      ...cloneRecipeMetadata(quickRecipe),
      category: quickRecipe.category ?? "bakery",
      useAsPreferment: !quickRecipe.useAsPreferment,
      scalingTarget: quickRecipe.scalingTarget,
      scalingSnapshotIngredients: quickRecipe.scalingSnapshotIngredients,
      ingredients: quickRecipe.ingredients
    });

    closeQuickActions();
    Alert.alert(
      quickRecipe.useAsPreferment
        ? "La receta ya no se ofrece como prefermento."
        : "Receta marcada como prefermento."
    );
  }

  function handleDuplicateQuickRecipe() {
    if (!quickRecipe) {
      return;
    }

    createRecipe({
      name: buildDuplicateRecipeName(quickRecipe.name, recipes),
      ...cloneRecipeMetadata(quickRecipe),
      category: quickRecipe.category ?? "bakery",
      useAsPreferment: quickRecipe.useAsPreferment ?? false,
      scalingTarget: quickRecipe.scalingTarget,
      scalingSnapshotIngredients: quickRecipe.scalingSnapshotIngredients?.map((ingredient) => ({
        ...ingredient,
        id: `${ingredient.id}-snapshot-${Date.now()}`
      })),
      ingredients: quickRecipe.ingredients.map((ingredient, index) => ({
        ...ingredient,
        id: `${ingredient.id}-${Date.now()}-${index}`
      }))
    });

    closeQuickActions();
  }

  function handleOpenQuickExport() {
    if (!quickRecipe) {
      return;
    }

    setQuickExportJson(exportRecipeToJson(quickRecipe));
    setQuickShareText(formatRecipeAsShareText(quickRecipe, recipes));
    setQuickCopyFeedback(null);
    setQuickExportMode("selector");
  }

  async function handleCopyQuickExport(
    value: string,
    mode: Exclude<HomeExportMode, "selector" | null>
  ) {
    const copied = await setClipboardText(value);

    if (!copied) {
      Alert.alert("El portapapeles no esta disponible en esta build.");
      return;
    }

    showQuickCopyFeedback(mode);
  }

  async function handleShareQuickRecipeFile() {
    if (!quickRecipe) {
      return;
    }

    try {
      await shareCentenoRecipeFile(quickRecipe);
      closeQuickExport();
      closeQuickActions();
    } catch (error) {
      if (error instanceof Error && error.message === "SHARING_UNAVAILABLE") {
        Alert.alert("No se pudo abrir el menu para compartir en este dispositivo.");
        return;
      }

      Alert.alert("No se pudo crear el archivo de la receta.");
    }
  }

  async function handleImportRecipeFile() {
    try {
      const result = await pickCentenoRecipeFileContent();

      if (result.status === "cancel") {
        return;
      }

      const imported = parseImportedCentenoFile(result.content, recipes);

      if (imported.type === "backup") {
        const importedCount = importRecipes(imported.recipes);
        closeImportModal();
        Alert.alert(
          importedCount > 0 ? "Backup importado correctamente." : "El backup no agrego recetas nuevas."
        );
        return;
      }

      importRecipe(imported.recipes[0]);
      closeImportModal();
      Alert.alert("Receta importada correctamente.");
    } catch {
      setImportError(
        "No se pudo importar el archivo. Asegurate de elegir un archivo exportado desde CENTENO."
      );
    }
  }

  async function handleExportAllRecipes() {
    if (!recipes.length) {
      Alert.alert("No hay recetas para exportar.");
      return;
    }

    try {
      await shareCentenoRecipesBackupFile(recipes);
      setSettingsVisible(false);
    } catch (error) {
      if (error instanceof Error && error.message === "SHARING_UNAVAILABLE") {
        Alert.alert("No se pudo abrir el menu para compartir en este dispositivo.");
        return;
      }

      Alert.alert("No se pudo crear el backup del recetario.");
    }
  }

  function handleEditQuickRecipe() {
    if (!quickRecipe) {
      return;
    }

    closeQuickActions();
    router.push(`/recipes/form?id=${quickRecipe.id}`);
  }

  function handleDeleteQuickRecipe() {
    if (!quickRecipe) {
      return;
    }

    const recipeToDelete = quickRecipe;
    closeQuickActions();
    Alert.alert("¿Eliminar esta receta?", "Esta accion no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteRecipe(recipeToDelete.id)
      }
    ]);
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
            onLayout={measureGuideTargets}
            ref={brandHeaderRef}
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
            <View
              onLayout={measureGuideTargets}
              ref={categoryFilterRef}
              style={[styles.guideAnchor, styles.brandFilterAnchor, { top: insets.top + 40 }]}
            >
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
                  categoryFilter === "pastry" && styles.filterButtonActive,
                  pressed && styles.filterButtonPressed
                ]}
              >
                <Text style={styles.filterButtonEmoji}>
                  {categoryFilter === "pastry" ? "\u{1F35E}" : "\u{1F9C1}"}
                </Text>
              </Pressable>
            </View>
            <View
              onLayout={measureGuideTargets}
              ref={settingsButtonRef}
              style={[styles.guideAnchor, styles.brandSettingsAnchor, { top: insets.top + 92 }]}
            >
              <Pressable
                accessibilityLabel="Abrir herramientas"
                onPress={() => setSettingsVisible(true)}
                style={({ pressed }) => [
                  styles.settingsButton,
                  styles.brandSettingsButton,
                  pressed && styles.fabPressed
                ]}
              >
                <Text style={styles.settingsIcon}>{"\u2699"}</Text>
              </Pressable>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>CENTENO</Text>
              <Text style={styles.brandSubtle}>Tu libreta de formulas panaderas</Text>
            </View>
          </View>
        </View>
      }
      overlay={
        <View style={styles.overlayStack}>
          <View onLayout={measureGuideTargets} ref={newRecipeFabRef}>
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
        </View>
      }
    >
      <View onLayout={measureGuideTargets} ref={searchRef}>
        <TextInput
          onChangeText={setQuery}
          placeholder="Buscar receta..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.search}
          value={query}
        />
      </View>
      <View onLayout={measureGuideTargets} ref={recipeListRef} style={styles.list}>
        {filteredRecipes.map((recipe) => (
          <FormulaListItem
            key={recipe.id}
            recipeLookup={(recipeId) => recipeLookup.get(recipeId)}
            onLongPress={() => openQuickActions(recipe)}
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
        onRequestClose={closeQuickActions}
        transparent
        visible={Boolean(quickRecipe) && quickExportMode === null}
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
              <Text style={styles.modalTitle}>{quickRecipe?.name ?? "Receta"}</Text>
              <Pressable
                onPress={handleToggleQuickPreferment}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>
                  {quickRecipe?.useAsPreferment
                    ? "Quitar como prefermento"
                    : "Marcar como prefermento"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDuplicateQuickRecipe}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Duplicar receta</Text>
              </Pressable>
              <Pressable
                onPress={handleOpenQuickExport}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Exportar receta</Text>
              </Pressable>
              <Pressable
                onPress={handleEditQuickRecipe}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Editar datos de receta</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteQuickRecipe}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={[styles.toolActionTitle, styles.toolActionDanger]}>
                  Eliminar receta
                </Text>
              </Pressable>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeQuickActions}
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
        onRequestClose={closeQuickExport}
        transparent
        visible={quickExportMode !== null}
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
                {quickExportMode === "selector" ? (
                  <>
                    <Text style={styles.modalTitle}>Exportar receta</Text>
                    <Text style={styles.modalHelper}>
                      Elegi como queres compartir esta receta.
                  </Text>
                  <Pressable
                    onPress={() => setQuickExportMode("shareText")}
                    style={({ pressed }) => [styles.exportOption, pressed && styles.toolActionPressed]}
                  >
                    <Text style={styles.exportOptionTitle}>Compartir como texto</Text>
                      <Text style={styles.exportOptionDescription}>
                        Para WhatsApp, notas o imprimir.
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setQuickExportMode("centenoFile")}
                      style={({ pressed }) => [styles.exportOption, pressed && styles.toolActionPressed]}
                    >
                      <Text style={styles.exportOptionTitle}>Compartir archivo CENTENO</Text>
                      <Text style={styles.exportOptionDescription}>
                        Para importar en otra instalacion de CENTENO.
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setQuickExportMode("importCode")}
                      style={({ pressed }) => [styles.exportOption, pressed && styles.toolActionPressed]}
                    >
                      <Text style={styles.exportOptionTitle}>Codigo de respaldo</Text>
                      <Text style={styles.exportOptionDescription}>
                        Opcion avanzada para copiar y pegar.
                      </Text>
                    </Pressable>
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={closeQuickExport}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Cerrar</Text>
                    </Pressable>
                  </View>
                  </>
                ) : null}

                {quickExportMode === "centenoFile" ? (
                  <>
                    <Text style={styles.modalTitle}>Compartir archivo CENTENO</Text>
                    <Text style={styles.modalHelper}>
                      Se va a crear un archivo .centeno para importarlo en otra instalacion de CENTENO.
                    </Text>
                    <View style={styles.modalActions}>
                      <Pressable
                        onPress={() => setQuickExportMode("selector")}
                        style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                      >
                        <Text style={styles.textActionLabel}>Volver</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleShareQuickRecipeFile}
                        style={({ pressed }) => [
                          styles.secondaryFilledAction,
                          pressed && styles.secondaryFilledActionPressed
                        ]}
                      >
                        <Text style={styles.secondaryFilledActionLabel}>Compartir archivo</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                {quickExportMode === "shareText" ? (
                  <>
                  <Text style={styles.modalTitle}>Compartir como texto</Text>
                  <Text style={styles.modalHelper}>
                    Copia esta receta para enviarla por WhatsApp o guardarla en notas.
                  </Text>
                  <View style={styles.modalActionsStart}>
                    <Pressable
                      onPress={() => handleCopyQuickExport(quickShareText, "shareText")}
                      style={({ pressed }) => [
                        styles.secondaryFilledAction,
                        pressed && styles.secondaryFilledActionPressed
                      ]}
                    >
                      <Text style={styles.secondaryFilledActionLabel}>
                        {quickCopyFeedback === "shareText" ? "Copiado ?" : "Copiar"}
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    editable
                    multiline
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.modalInput, styles.importField]}
                    textAlignVertical="top"
                    value={quickShareText}
                  />
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setQuickExportMode("selector")}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Volver</Text>
                    </Pressable>
                    <Pressable
                      onPress={closeQuickExport}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Cerrar</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

                {quickExportMode === "importCode" ? (
                  <>
                    <Text style={styles.modalTitle}>Codigo de respaldo</Text>
                    <Text style={styles.modalHelper}>
                      Copia este codigo completo para cargar la receta en otro CENTENO.
                    </Text>
                  <View style={styles.modalActionsStart}>
                    <Pressable
                      onPress={() => handleCopyQuickExport(quickExportJson, "importCode")}
                      style={({ pressed }) => [
                        styles.secondaryFilledAction,
                        pressed && styles.secondaryFilledActionPressed
                      ]}
                    >
                      <Text style={styles.secondaryFilledActionLabel}>
                        {quickCopyFeedback === "importCode" ? "Copiado ?" : "Copiar"}
                      </Text>
                    </Pressable>
                  </View>
                  <TextInput
                    editable
                    multiline
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.modalInput, styles.importField]}
                    textAlignVertical="top"
                    value={quickExportJson}
                  />
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setQuickExportMode("selector")}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Volver</Text>
                    </Pressable>
                    <Pressable
                      onPress={closeQuickExport}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Cerrar</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                onPress={handleExportAllRecipes}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Exportar todas las recetas</Text>
                <Text style={styles.toolActionDescription}>
                  Crea un respaldo completo de tu recetario.
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSettingsVisible(false);
                  setHelpVisible(true);
                }}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Ayuda</Text>
              </Pressable>
              <Pressable
                onPress={openGuideFromSettings}
                style={({ pressed }) => [styles.toolAction, pressed && styles.toolActionPressed]}
              >
                <Text style={styles.toolActionTitle}>Ver guia de uso</Text>
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
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>Porcentajes panaderos</Text>
                  <Text style={styles.helpItem}>
                    En panaderia, la harina total siempre es el 100%.
                  </Text>
                  <Text style={styles.helpItem}>
                    Los demas ingredientes se calculan en relacion con esa harina.
                  </Text>
                  <Text style={styles.helpItem}>
                    Ejemplo: harina 1000 g = 100%, agua 650 g = 65%, sal 20 g = 2%.
                  </Text>
                  <Text style={styles.helpItem}>
                    Esto permite escalar una receta sin perder proporciones.
                  </Text>
                </View>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>Ajuste activo</Text>
                  <Text style={styles.helpItem}>
                    Cuando ajustas por harina, masa total o piezas, CENTENO puede mantener ese
                    objetivo activo.
                  </Text>
                  <Text style={styles.helpItem}>
                    Por ejemplo, si elegis 2 piezas de 900 g, la app busca conservar 1800 g de masa
                    total.
                  </Text>
                  <Text style={styles.helpItem}>
                    Si despues agregas un ingrediente por porcentaje, recalcula la formula para
                    mantener ese objetivo.
                  </Text>
                </View>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>Prefermentos</Text>
                  <Text style={styles.helpItem}>
                    Cuando usas un prefermento, parte de la harina y del agua ya vienen dentro de
                    ese prefermento.
                  </Text>
                  <Text style={styles.helpItem}>
                    Por eso CENTENO muestra el extra que tenes que agregar y el detalle [total -
                    aporte].
                  </Text>
                  <Text style={styles.helpItem}>
                    Ejemplo: [800 - 400] significa 800 g pide la formula total, 400 g ya aporta el
                    prefermento y 400 g agregas aparte.
                  </Text>
                </View>


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
              {importMode === "selector" ? (
                <>
                  <Text style={styles.modalTitle}>Importar receta</Text>
                  <Text style={styles.modalHelper}>
                    Elegi como queres importar esta receta.
                  </Text>
                  <Pressable
                    onPress={handleImportRecipeFile}
                    style={({ pressed }) => [styles.exportOption, pressed && styles.toolActionPressed]}
                  >
                    <Text style={styles.exportOptionTitle}>Importar archivo CENTENO</Text>
                    <Text style={styles.exportOptionDescription}>
                      Elegi un archivo .centeno.
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setImportError("");
                      setImportPasteFeedback("");
                      setImportMode("backupCode");
                    }}
                    style={({ pressed }) => [styles.exportOption, pressed && styles.toolActionPressed]}
                  >
                    <Text style={styles.exportOptionTitle}>Pegar codigo de respaldo</Text>
                    <Text style={styles.exportOptionDescription}>
                      Usa esta opcion si recibiste un codigo manual.
                    </Text>
                  </Pressable>
                  {importError ? <Text style={styles.importError}>{importError}</Text> : null}
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={closeImportModal}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Cerrar</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {importMode === "backupCode" ? (
                <>
                  <Text style={styles.modalTitle}>Importar receta</Text>
                  <Text style={styles.modalHelper}>
                    Pega aca el codigo para importar generado por CENTENO.
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
                      onPress={() => {
                        setImportError("");
                        setImportPasteFeedback("");
                        setImportMode("selector");
                      }}
                      style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
                    >
                      <Text style={styles.textActionLabel}>Volver</Text>
                    </Pressable>
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
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GuideModal
        onClose={closeGuideModal}
        onComplete={completeGuide}
        onSkip={skipGuide}
        onStepChange={setGuideStepIndex}
        stepIndex={guideStepIndex}
        targetRects={guideTargetRects}
        visible={guideVisible}
      />
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
  guideAnchor: {
    position: "absolute",
    zIndex: 2
  },
  brandFilterAnchor: {
    right: 24
  },
  brandSettingsAnchor: {
    right: 24
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
    zIndex: 2
  },
  brandSettingsButton: {
    backgroundColor: "#F7F2E8",
    borderColor: "rgba(107, 78, 61, 0.14)",
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
  helpSection: {
    gap: 6
  },
  helpSectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "800"
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
  toolActionDescription: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  toolActionDanger: {
    color: theme.colors.danger
  },
  exportOption: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  exportOptionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  exportOptionDescription: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18
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
