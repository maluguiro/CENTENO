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
  header?: ReactNode;
  overlay?: ReactNode;
  padded?: boolean;
  keyboardAware?: boolean;
}>;

export function Screen({
  children,
  header,
  overlay,
  padded = true,
  keyboardAware = false
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={styles.body}>
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
  body: {
    flex: 1
  },
  content: {
    backgroundColor: theme.colors.background,
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
