import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RecipeCard } from "@/components/RecipeCard";
import { Screen } from "@/components/Screen";
import { theme } from "@/theme";
import { useRecipes } from "@/store/RecipesProvider";

export default function HomeScreen() {
  const { recipes } = useRecipes();

  return (
    <Screen
      header={
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CENTENO</Text>
          <Text style={styles.title}>Formulas panaderas con porcentaje panadero</Text>
          <Text style={styles.subtitle}>
            Base simple para guardar formulas, recalcular harina y revisar hidratacion.
          </Text>
        </View>
      }
    >
      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/recipes/form")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Nueva formula</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/calculator")} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Calculadora</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Tus formulas</Text>
        <Text style={styles.listMeta}>{recipes.length} guardadas</Text>
      </View>

      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          onPress={() => router.push(`/recipes/${recipe.id}`)}
          recipe={recipe}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  eyebrow: {
    color: theme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    maxWidth: 300
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  primaryButtonText: {
    color: "#FFF6EF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  secondaryButton: {
    backgroundColor: "#F0E1CF",
    borderRadius: 18,
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  secondaryButtonText: {
    color: theme.colors.accentDeep,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  listHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm
  },
  listTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700"
  },
  listMeta: {
    color: theme.colors.textMuted,
    fontSize: 13
  }
});
