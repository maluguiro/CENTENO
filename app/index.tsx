import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FormulaListItem } from "@/components/FormulaListItem";
import { Screen } from "@/components/Screen";
import { theme } from "@/theme";
import { useRecipes } from "@/store/RecipesProvider";

export default function HomeScreen() {
  const { recipes } = useRecipes();
  const [query, setQuery] = useState("");

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

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={styles.brand}>CENTENO</Text>
        </View>
      }
      overlay={
        <Pressable onPress={() => router.push("/recipes/form")} style={styles.fab}>
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
          <Text style={styles.empty}>No hay formulas para mostrar.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: theme.spacing.md
  },
  brand: {
    color: "#F8F5F1",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5
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
  }
});
