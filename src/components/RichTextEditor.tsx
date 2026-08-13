import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
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
  parseRichTextBlocks,
  parseRichTextDocument,
  serializeRichTextDocument,
  toggleLinePrefixInDocument,
  toggleMarkInDocument,
  updateRichTextDocumentText,
  type RichTextBlock,
  type RichTextDocument,
  type RichTextInlineToken,
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

function InlineTokens({ tokens }: { tokens: RichTextInlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => (
        <Text
          key={`${token.text}-${index}`}
          style={[
            styles.previewText,
            token.marks.includes("bold") && styles.bold,
            token.marks.includes("italic") && styles.italic,
            token.marks.includes("underline") && styles.underline
          ]}
        >
          {token.text}
        </Text>
      ))}
    </>
  );
}

function PreviewBlock({ block }: { block: RichTextBlock }) {
  if (block.type === "bullet") {
    return (
      <View style={styles.previewRow}>
        <Text style={styles.previewPrefix}>•</Text>
        <Text style={styles.previewParagraph}>
          <InlineTokens tokens={block.tokens} />
        </Text>
      </View>
    );
  }

  if (block.type === "numbered") {
    return (
      <View style={styles.previewRow}>
        <Text style={styles.previewPrefix}>{`${block.index}.`}</Text>
        <Text style={styles.previewParagraph}>
          <InlineTokens tokens={block.tokens} />
        </Text>
      </View>
    );
  }

  return (
    <Text style={styles.previewParagraph}>
      <InlineTokens tokens={block.tokens} />
    </Text>
  );
}

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

  const previewBlocks = useMemo(
    () => parseRichTextBlocks(serializeRichTextDocument(document)),
    [document]
  );
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
      <View style={styles.toolbarHeader}>
        <Text style={styles.toolbarTitle}>Formato</Text>
        {pendingMark ? <Text style={styles.toolbarHint}>Siguiente texto: activo</Text> : null}
      </View>
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
      <View style={styles.editorStack}>
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
            selection={selection}
            selectionColor="rgba(122, 160, 214, 0.28)"
            style={[styles.input, { minHeight }, inputStyle]}
            textAlignVertical="top"
            value={document.text}
          />
        </View>
        <View style={styles.previewSection}>
          <Text style={styles.sectionLabel}>Vista previa</Text>
          <ScrollView
            nestedScrollEnabled
            style={[styles.previewCard, { maxHeight: Math.max(140, minHeight - 32) }]}
          >
            <View style={styles.previewContent}>
              {previewBlocks.length ? (
                previewBlocks.map((block, index) => (
                  <PreviewBlock block={block} key={`block-${index}`} />
                ))
              ) : (
                <Text style={styles.placeholder}>{placeholder ?? "Sin contenido"}</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
  },
  toolbarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  toolbarTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  toolbarHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600"
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  editorStack: {
    gap: theme.spacing.sm
  },
  editorSection: {
    gap: 6
  },
  previewSection: {
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
  previewCard: {
    backgroundColor: "#FFFDF8",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    minHeight: 120,
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  previewContent: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  previewRow: {
    flexDirection: "row",
    gap: 8
  },
  previewPrefix: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    minWidth: 18
  },
  previewParagraph: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 22
  },
  previewText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22
  },
  bold: {
    fontWeight: "800"
  },
  italic: {
    fontStyle: "italic"
  },
  underline: {
    textDecorationLine: "underline"
  },
  placeholder: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22
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
