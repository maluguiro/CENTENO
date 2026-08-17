import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/theme";

type EditorialEditorSheetProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
};

export function EditorialEditorSheet({
  title,
  children,
  onClose,
  onCancel,
  onSave,
  saveDisabled = false
}: EditorialEditorSheetProps) {
  const insets = useSafeAreaInsets();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  return (
    <Pressable onPress={onClose} style={styles.backdrop}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
        style={styles.keyboardLayer}
      >
        <View
          pointerEvents="box-none"
          style={[
            styles.sheetRegion,
            {
              paddingTop: insets.top + theme.spacing.md,
              paddingBottom:
                theme.spacing.md +
                (Platform.OS === "android" ? keyboardInset : insets.bottom)
            }
          ]}
        >
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
              >
                <Text style={styles.textActionLabel}>Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.body}
            >
              <View style={styles.bodyInner}>{children}</View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [styles.textAction, pressed && styles.textActionPressed]}
              >
                <Text style={styles.textActionLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={saveDisabled}
                onPress={onSave}
                style={({ pressed }) => [
                  styles.primaryAction,
                  saveDisabled && styles.primaryActionDisabled,
                  pressed && !saveDisabled && styles.primaryActionPressed
                ]}
              >
                <Text style={styles.primaryActionLabel}>Guardar</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(47, 42, 38, 0.32)",
    flex: 1
  },
  keyboardLayer: {
    flex: 1
  },
  sheetRegion: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.md
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 6,
    flex: 1,
    maxHeight: "100%",
    maxWidth: 560,
    minHeight: 0,
    padding: theme.spacing.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    width: "96%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    justifyContent: "space-between",
    paddingBottom: theme.spacing.xs
  },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "800",
    paddingBottom: 6
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  bodyContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.sm
  },
  bodyInner: {
    minHeight: 0
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: theme.spacing.sm,
    justifyContent: "flex-end",
    paddingTop: theme.spacing.sm
  },
  textAction: {
    paddingHorizontal: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primaryActionDisabled: {
    opacity: 0.45
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
