import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { FormulaSheet } from "@/components/FormulaSheet";
import { Screen } from "@/components/Screen";
import { useRecipes } from "@/store/RecipesProvider";
import { theme } from "@/theme";

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { getRecipeById, isReady } = useRecipes();
  const recipe = getRecipeById(params.id);

  if (!isReady) {
    return null;
  }

  if (!recipe) {
    return (
      <Screen>
        <Text style={styles.title}>Receta no encontrada</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <FormulaSheet recipe={recipe} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800"
  }
});
