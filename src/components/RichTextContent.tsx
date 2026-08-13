import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { parseRichTextBlocks, type RichTextInlineToken } from "@/lib/richText";
import { theme } from "@/theme";

function InlineTokens({ tokens }: { tokens: RichTextInlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => (
        <Text
          key={`${token.text}-${index}`}
          style={[
            styles.inlineText,
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

export function RichTextContent({ value }: { value?: string }) {
  const blocks = parseRichTextBlocks(value);

  if (!blocks.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        if (block.type === "bullet") {
          return (
            <View key={`bullet-${index}`} style={styles.listRow}>
              <Text style={styles.listPrefix}>•</Text>
              <Text style={styles.blockText}>
                <InlineTokens tokens={block.tokens} />
              </Text>
            </View>
          );
        }

        if (block.type === "numbered") {
          return (
            <View key={`numbered-${index}`} style={styles.listRow}>
              <Text style={styles.listPrefix}>{`${block.index}.`}</Text>
              <Text style={styles.blockText}>
                <InlineTokens tokens={block.tokens} />
              </Text>
            </View>
          );
        }

        return (
          <Text key={`paragraph-${index}`} style={styles.blockText}>
            <InlineTokens tokens={block.tokens} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8
  },
  listRow: {
    flexDirection: "row",
    gap: 8
  },
  listPrefix: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    minWidth: 18
  },
  blockText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 22
  },
  inlineText: {
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
  }
});
