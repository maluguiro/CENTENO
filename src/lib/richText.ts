export type RichTextMark = "bold" | "italic" | "underline";

export type RichTextSelection = {
  start: number;
  end: number;
};

export type RichTextSpan = {
  start: number;
  end: number;
  mark: RichTextMark;
};

export type RichTextDocument = {
  text: string;
  spans: RichTextSpan[];
};

export type RichTextInlineToken = {
  text: string;
  marks: RichTextMark[];
};

export type RichTextBlock =
  | { type: "paragraph"; tokens: RichTextInlineToken[] }
  | { type: "bullet"; tokens: RichTextInlineToken[] }
  | { type: "numbered"; index: number; tokens: RichTextInlineToken[] };

const markOrder: RichTextMark[] = ["underline", "bold", "italic"];
const lineBreakPattern = /\r?\n/;
const prefixPattern = /^(\u2022\s+|\d+\.\s+)/;

function clampSelection(value: string, selection: RichTextSelection): RichTextSelection {
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));

  return { start, end };
}

function normalizeSpans(spans: RichTextSpan[]) {
  return spans
    .filter((span) => span.end > span.start)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }

      if (left.end !== right.end) {
        return left.end - right.end;
      }

      return left.mark.localeCompare(right.mark);
    });
}

function addSpan(spans: RichTextSpan[], span: RichTextSpan) {
  if (span.end <= span.start) {
    return spans;
  }

  const filtered = spans.filter((current) => {
    if (current.mark !== span.mark) {
      return true;
    }

    return current.end < span.start || current.start > span.end;
  });

  const sameMark = spans.filter((current) => current.mark === span.mark);
  let nextStart = span.start;
  let nextEnd = span.end;
  const kept: RichTextSpan[] = [];

  sameMark.forEach((current) => {
    if (current.end < span.start || current.start > span.end) {
      kept.push(current);
      return;
    }

    nextStart = Math.min(nextStart, current.start);
    nextEnd = Math.max(nextEnd, current.end);
  });

  return normalizeSpans([...filtered.filter((current) => current.mark !== span.mark), ...kept, { ...span, start: nextStart, end: nextEnd }]);
}

function removeSpan(spans: RichTextSpan[], span: RichTextSpan) {
  const next: RichTextSpan[] = [];

  spans.forEach((current) => {
    if (current.mark !== span.mark || current.end <= span.start || current.start >= span.end) {
      next.push(current);
      return;
    }

    if (current.start < span.start) {
      next.push({
        ...current,
        end: span.start
      });
    }

    if (current.end > span.end) {
      next.push({
        ...current,
        start: span.end
      });
    }
  });

  return normalizeSpans(next);
}

function hasUniformMark(document: RichTextDocument, selection: RichTextSelection, mark: RichTextMark) {
  if (selection.end <= selection.start) {
    return false;
  }

  let coveredUntil = selection.start;
  const spans = normalizeSpans(document.spans.filter((span) => span.mark === mark));

  for (const span of spans) {
    if (span.end <= coveredUntil || span.start > coveredUntil) {
      continue;
    }

    coveredUntil = Math.max(coveredUntil, Math.min(selection.end, span.end));

    if (coveredUntil >= selection.end) {
      return true;
    }
  }

  return false;
}

function getActiveMarksAt(document: RichTextDocument, index: number) {
  return markOrder.filter((mark) =>
    document.spans.some((span) => span.mark === mark && span.start <= index && span.end >= index)
  );
}

function findSharedPrefixLength(left: string, right: string) {
  const maxLength = Math.min(left.length, right.length);
  let index = 0;

  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function findSharedSuffixLength(left: string, right: string, prefixLength: number) {
  const maxLength = Math.min(left.length, right.length) - prefixLength;
  let index = 0;

  while (
    index < maxLength &&
    left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1;
  }

  return index;
}

function shiftSpans(
  spans: RichTextSpan[],
  changeStart: number,
  removedLength: number,
  insertedLength: number
) {
  const changeEnd = changeStart + removedLength;
  const delta = insertedLength - removedLength;
  const next: RichTextSpan[] = [];

  spans.forEach((span) => {
    if (span.end <= changeStart) {
      next.push(span);
      return;
    }

    if (span.start >= changeEnd) {
      next.push({
        ...span,
        start: span.start + delta,
        end: span.end + delta
      });
      return;
    }

    if (span.start < changeStart) {
      next.push({
        ...span,
        end: changeStart
      });
    }

    if (span.end > changeEnd) {
      next.push({
        ...span,
        start: changeStart + insertedLength,
        end: span.end + delta
      });
    }
  });

  return normalizeSpans(next);
}

function parseInlineMarkdown(line: string, lineOffset: number) {
  let index = 0;
  let text = "";
  const spans: RichTextSpan[] = [];

  while (index < line.length) {
    if (line.startsWith("__", index)) {
      const endIndex = line.indexOf("__", index + 2);
      if (endIndex > index + 2) {
        const content = line.slice(index + 2, endIndex);
        const start = text.length;
        text += content;
        spans.push({
          start: lineOffset + start,
          end: lineOffset + start + content.length,
          mark: "underline"
        });
        index = endIndex + 2;
        continue;
      }
    }

    if (line.startsWith("**", index)) {
      const endIndex = line.indexOf("**", index + 2);
      if (endIndex > index + 2) {
        const content = line.slice(index + 2, endIndex);
        const start = text.length;
        text += content;
        spans.push({
          start: lineOffset + start,
          end: lineOffset + start + content.length,
          mark: "bold"
        });
        index = endIndex + 2;
        continue;
      }
    }

    if (line.startsWith("*", index)) {
      const endIndex = line.indexOf("*", index + 1);
      if (endIndex > index + 1) {
        const content = line.slice(index + 1, endIndex);
        const start = text.length;
        text += content;
        spans.push({
          start: lineOffset + start,
          end: lineOffset + start + content.length,
          mark: "italic"
        });
        index = endIndex + 1;
        continue;
      }
    }

    text += line[index];
    index += 1;
  }

  return {
    text,
    spans
  };
}

function getLinePrefix(line: string) {
  const bulletMatch = /^\s*[-•]\s+/.exec(line);
  if (bulletMatch) {
    return "• ";
  }

  const numberedMatch = /^\s*(\d+)\.\s+/.exec(line);
  if (numberedMatch) {
    return `${numberedMatch[1]}. `;
  }

  return "";
}

function parseLineContent(line: string) {
  const prefix = getLinePrefix(line);
  const content = prefix ? line.replace(/^\s*(?:[-•]|\d+\.)\s+/, "") : line;

  return {
    prefix,
    content
  };
}

function getMarksForIndex(spans: RichTextSpan[], index: number) {
  return markOrder.filter((mark) =>
    spans.some((span) => span.mark === mark && span.start <= index && span.end > index)
  );
}

function buildTokensForSlice(
  text: string,
  spans: RichTextSpan[],
  start: number,
  end: number
) {
  if (end <= start) {
    return [];
  }

  const tokens: RichTextInlineToken[] = [];
  let currentText = "";
  let currentMarks = getMarksForIndex(spans, start);

  for (let index = start; index < end; index += 1) {
    const nextMarks = getMarksForIndex(spans, index);
    const sameMarks =
      nextMarks.length === currentMarks.length &&
      nextMarks.every((mark, markIndex) => mark === currentMarks[markIndex]);

    if (!sameMarks && currentText) {
      tokens.push({
        text: currentText,
        marks: currentMarks
      });
      currentText = "";
      currentMarks = nextMarks;
    } else if (!sameMarks) {
      currentMarks = nextMarks;
    }

    currentText += text[index];
  }

  if (currentText) {
    tokens.push({
      text: currentText,
      marks: currentMarks
    });
  }

  return tokens;
}

export function isRichTextBlank(value?: string) {
  return !value?.trim();
}

export function parseRichTextDocument(value?: string): RichTextDocument {
  if (!value) {
    return {
      text: "",
      spans: []
    };
  }

  const lines = value.split(lineBreakPattern);
  let text = "";
  let offset = 0;
  const spans: RichTextSpan[] = [];

  lines.forEach((line, lineIndex) => {
    const { prefix, content } = parseLineContent(line);
    const parsed = parseInlineMarkdown(content, offset + prefix.length);
    text += prefix + parsed.text;
    spans.push(...parsed.spans);
    offset = text.length;

    if (lineIndex < lines.length - 1) {
      text += "\n";
      offset += 1;
    }
  });

  return {
    text,
    spans: normalizeSpans(spans)
  };
}

export function serializeRichTextDocument(document: RichTextDocument) {
  const spans = normalizeSpans(document.spans);
  const markersByIndex = new Map<number, { open: string[]; close: string[] }>();

  spans.forEach((span) => {
    const marker = span.mark === "bold" ? "**" : span.mark === "underline" ? "__" : "*";
    const startBucket = markersByIndex.get(span.start) ?? { open: [], close: [] };
    startBucket.open.push(marker);
    markersByIndex.set(span.start, startBucket);

    const endBucket = markersByIndex.get(span.end) ?? { open: [], close: [] };
    endBucket.close.unshift(marker);
    markersByIndex.set(span.end, endBucket);
  });

  let result = "";

  for (let index = 0; index <= document.text.length; index += 1) {
    const markers = markersByIndex.get(index);
    if (markers?.close.length) {
      result += markers.close.join("");
    }

    if (index === document.text.length) {
      continue;
    }

    if (markers?.open.length) {
      result += markers.open.join("");
    }

    result += document.text[index];
  }

  return result
    .split("\n")
    .map((line) => {
      if (line.startsWith("• ")) {
        return `- ${line.slice(2)}`;
      }

      return line;
    })
    .join("\n");
}

export function parseRichTextBlocks(value?: string): RichTextBlock[] {
  const document = parseRichTextDocument(value);
  if (!document.text.trim()) {
    return [];
  }

  const lines = document.text.split(lineBreakPattern);
  const blocks: RichTextBlock[] = [];
  let offset = 0;

  lines.forEach((line) => {
    const lineEnd = offset + line.length;
    const prefixMatch = prefixPattern.exec(line);
    const prefix = prefixMatch?.[0] ?? "";
    const contentStart = offset + prefix.length;
    const tokens = buildTokensForSlice(document.text, document.spans, contentStart, lineEnd);

    if (!line.trim()) {
      offset = lineEnd + 1;
      return;
    }

    if (line.startsWith("• ")) {
      blocks.push({
        type: "bullet",
        tokens
      });
    } else {
      const numberedMatch = /^(\d+)\.\s+/.exec(line);
      if (numberedMatch) {
        blocks.push({
          type: "numbered",
          index: Number(numberedMatch[1]),
          tokens
        });
      } else {
        blocks.push({
          type: "paragraph",
          tokens
        });
      }
    }

    offset = lineEnd + 1;
  });

  return blocks;
}

export function richTextToPlainText(value?: string) {
  return parseRichTextBlocks(value)
    .map((block) => {
      const text = block.tokens.map((token) => token.text).join("");

      if (block.type === "bullet") {
        return `• ${text}`;
      }

      if (block.type === "numbered") {
        return `${block.index}. ${text}`;
      }

      return text;
    })
    .join("\n");
}

export function toggleMarkInDocument(
  document: RichTextDocument,
  selection: RichTextSelection,
  mark: RichTextMark
) {
  const nextSelection = clampSelection(document.text, selection);

  if (nextSelection.end <= nextSelection.start) {
    return document;
  }

  return {
    ...document,
    spans: hasUniformMark(document, nextSelection, mark)
      ? removeSpan(document.spans, {
          start: nextSelection.start,
          end: nextSelection.end,
          mark
        })
      : addSpan(document.spans, {
          start: nextSelection.start,
          end: nextSelection.end,
          mark
        })
  };
}

export function toggleLinePrefixInDocument(
  document: RichTextDocument,
  selection: RichTextSelection,
  kind: "bullet" | "numbered"
) {
  const nextSelection = clampSelection(document.text, selection);
  const blockStart = document.text.lastIndexOf("\n", Math.max(0, nextSelection.start - 1)) + 1;
  const blockEndIndex = document.text.indexOf("\n", nextSelection.end);
  const blockEnd = blockEndIndex === -1 ? document.text.length : blockEndIndex;
  const block = document.text.slice(blockStart, blockEnd);
  const lines = block.split("\n");

  let lineNumber = 1;
  const nextBlock = lines
    .map((line) => {
      if (!line.trim()) {
        return line;
      }

      const withoutPrefix = line.replace(/^(?:\u2022\s+|\d+\.\s+)/, "");

      if (kind === "bullet") {
        return `• ${withoutPrefix}`;
      }

      const nextLine = `${lineNumber}. ${withoutPrefix}`;
      lineNumber += 1;
      return nextLine;
    })
    .join("\n");

  const nextText = document.text.slice(0, blockStart) + nextBlock + document.text.slice(blockEnd);
  const nextDocument = updateRichTextDocumentText(document, nextText, {
    start: blockStart,
    end: blockEnd
  });

  return {
    document: nextDocument.document,
    selection: {
      start: blockStart,
      end: blockStart + nextBlock.length
    }
  };
}

export function getSelectionMarks(document: RichTextDocument, selection: RichTextSelection) {
  const nextSelection = clampSelection(document.text, selection);
  const point = nextSelection.start === nextSelection.end ? nextSelection.start : undefined;

  return {
    bold:
      point !== undefined
        ? getActiveMarksAt(document, point).includes("bold")
        : hasUniformMark(document, nextSelection, "bold"),
    italic:
      point !== undefined
        ? getActiveMarksAt(document, point).includes("italic")
        : hasUniformMark(document, nextSelection, "italic"),
    underline:
      point !== undefined
        ? getActiveMarksAt(document, point).includes("underline")
        : hasUniformMark(document, nextSelection, "underline")
  };
}

export function updateRichTextDocumentText(
  document: RichTextDocument,
  nextText: string,
  previousSelection: RichTextSelection,
  pendingMark?: RichTextMark | null
) {
  const prefixLength = findSharedPrefixLength(document.text, nextText);
  const suffixLength = findSharedSuffixLength(document.text, nextText, prefixLength);
  const removedLength = document.text.length - prefixLength - suffixLength;
  const insertedLength = nextText.length - prefixLength - suffixLength;
  const nextSpans = shiftSpans(document.spans, prefixLength, removedLength, insertedLength);
  const nextDocument: RichTextDocument = {
    text: nextText,
    spans: nextSpans
  };

  const insertedMark =
    pendingMark ??
    (removedLength === 0 && insertedLength > 0
      ? getActiveMarksAt(document, Math.max(0, previousSelection.start)).at(-1)
      : undefined);

  if (insertedMark && insertedLength > 0) {
    return {
      document: {
        ...nextDocument,
        spans: addSpan(nextDocument.spans, {
          start: prefixLength,
          end: prefixLength + insertedLength,
          mark: insertedMark
        })
      },
      pendingMark: pendingMark ?? null
    };
  }

  return {
    document: nextDocument,
    pendingMark: pendingMark ?? null
  };
}
