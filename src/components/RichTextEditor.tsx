import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle
} from "react-native";

import {
  getSelectionMarks,
  parseRichTextDocument,
  serializeRichTextDocument,
  toggleLinePrefixInDocument,
  toggleMarkInDocument,
  updateRichTextDocumentText,
  type RichTextDocument,
  type RichTextMark,
  type RichTextSelection
} from "@/lib/richText";
import { theme } from "@/theme";

type RichTextEditorProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  minHeight?: number;
};

function ToolbarButton({
  active,
  accessibilityLabel,
  label,
  onPress
}: {
  active?: boolean;
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarButton,
        active && styles.toolbarButtonActive,
        pressed && styles.toolbarButtonPressed
      ]}
    >
      <Text style={[styles.toolbarButtonText, active && styles.toolbarButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function RichTextEditor({
  value,
  onChangeText,
  placeholder,
  inputStyle,
  containerStyle,
  minHeight = 160
}: RichTextEditorProps) {
  const [document, setDocument] = useState<RichTextDocument>(() => parseRichTextDocument(value));
  const [selection, setSelection] = useState<RichTextSelection>({ start: 0, end: 0 });
  const [pendingMark, setPendingMark] = useState<RichTextMark | null>(null);

  useEffect(() => {
    const serialized = serializeRichTextDocument(document);
    if (serialized === value) {
      return;
    }

    setDocument(parseRichTextDocument(value));
    setPendingMark(null);
  }, [value]);

  const selectionMarks = useMemo(
    () => getSelectionMarks(document, selection),
    [document, selection]
  );

  function commit(nextDocument: RichTextDocument, nextSelection = selection) {
    setDocument(nextDocument);
    setSelection(nextSelection);
    onChangeText(serializeRichTextDocument(nextDocument));
  }

  function handleToggleMark(mark: RichTextMark) {
    if (selection.start === selection.end) {
      setPendingMark((current) => (current === mark ? null : mark));
      return;
    }

    commit(toggleMarkInDocument(document, selection, mark));
    setPendingMark(null);
  }

  function handleToggleList(kind: "bullet" | "numbered") {
    const next = toggleLinePrefixInDocument(document, selection, kind);
    commit(next.document, next.selection);
    setPendingMark(null);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.toolbarTitle}>Formato</Text>
      <View style={styles.toolbar}>
        <ToolbarButton
          accessibilityLabel="Negrita"
          active={selection.start === selection.end ? pendingMark === "bold" : selectionMarks.bold}
          label="B"
          onPress={() => handleToggleMark("bold")}
        />
        <ToolbarButton
          accessibilityLabel="Cursiva"
          active={selection.start === selection.end ? pendingMark === "italic" : selectionMarks.italic}
          label="I"
          onPress={() => handleToggleMark("italic")}
        />
        <ToolbarButton
          accessibilityLabel="Subrayado"
          active={
            selection.start === selection.end ? pendingMark === "underline" : selectionMarks.underline
          }
          label="U"
          onPress={() => handleToggleMark("underline")}
        />
        <ToolbarButton
          accessibilityLabel="Lista con viñetas"
          label="•"
          onPress={() => handleToggleList("bullet")}
        />
        <ToolbarButton
          accessibilityLabel="Lista numerada"
          label="1."
          onPress={() => handleToggleList("numbered")}
        />
      </View>
      <View style={styles.editorSection}>
        <Text style={styles.sectionLabel}>Editar</Text>
        <TextInput
          multiline
          onChangeText={(nextText) => {
            const next = updateRichTextDocumentText(document, nextText, selection, pendingMark);
            setDocument(next.document);
            setPendingMark(next.pendingMark ?? null);
            onChangeText(serializeRichTextDocument(next.document));
          }}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          scrollEnabled
          selection={selection}
          selectionColor="rgba(122, 160, 214, 0.28)"
          style={[styles.input, { minHeight }, inputStyle]}
          textAlignVertical="top"
          value={document.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
  },
  toolbarTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  editorSection: {
    gap: 6
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  toolbarButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 40,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  toolbarButtonActive: {
    backgroundColor: theme.colors.accentDeep,
    borderColor: theme.colors.accentDeep
  },
  toolbarButtonPressed: {
    opacity: theme.interaction.pressedOpacity
  },
  toolbarButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  toolbarButtonTextActive: {
    color: "#F8F5F1"
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12
  }
});
