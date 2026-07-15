import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { RecipesProvider } from "@/store/RecipesProvider";

export default function RootLayout() {
  return (
    <RecipesProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false
        }}
      />
    </RecipesProvider>
  );
}
