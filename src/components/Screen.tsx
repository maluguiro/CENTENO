import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import type { PropsWithChildren, ReactNode } from "react";

import { theme } from "@/theme";

type ScreenProps = PropsWithChildren<{
  background?: ReactNode;
  header?: ReactNode;
  headerVariant?: "solid" | "bare";
  overlay?: ReactNode;
  padded?: boolean;
  keyboardAware?: boolean;
}>;

export function Screen({
  background,
  children,
  header,
  headerVariant = "solid",
  overlay,
  padded = true,
  keyboardAware = false
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={styles.body}>
      {background ? <View pointerEvents="none" style={styles.backgroundLayer}>{background}</View> : null}
      <ScrollView
        contentContainerStyle={[styles.content, padded && styles.padded]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {overlay ? <View style={[styles.overlay, { bottom: Math.max(24, insets.bottom + 24) }]}>{overlay}</View> : null}
    </View>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      {header ? (
        <View
          style={[
            styles.header,
            headerVariant === "bare" && styles.headerBare,
            {
              paddingTop: insets.top + theme.spacing.sm
            }
          ]}
        >
          {header}
        </View>
      ) : null}
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: "height" })}
          style={styles.body}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1
  },
  header: {
    backgroundColor: theme.colors.accent,
    borderBottomColor: theme.colors.borderStrong,
    borderBottomWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  headerBare: {
    backgroundColor: "transparent",
    borderBottomWidth: 0
  },
  body: {
    flex: 1
  },
  backgroundLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  content: {
    backgroundColor: "transparent",
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl
  },
  padded: {
    paddingHorizontal: theme.spacing.lg
  },
  overlay: {
    position: "absolute",
    right: 24
  }
});
