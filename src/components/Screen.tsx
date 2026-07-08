import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, View } from "react-native";
import type { PropsWithChildren, ReactNode } from "react";

import { theme } from "@/theme";

type ScreenProps = PropsWithChildren<{
  header?: ReactNode;
  padded?: boolean;
}>;

export function Screen({ children, header, padded = true }: ScreenProps) {
  return (
    <LinearGradient colors={["#F7F2E8", "#E7D7BC"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {header ? <View style={styles.header}>{header}</View> : null}
        <ScrollView
          contentContainerStyle={[styles.content, padded && styles.padded]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md
  },
  content: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  padded: {
    paddingHorizontal: theme.spacing.lg
  }
});

