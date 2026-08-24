import {
  getSelectionMarks,
  parseRichTextDocument,
  type RichTextDocument,
  type RichTextSpan
} from "@/lib/richText";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeDocument(text: string, spans: RichTextSpan[]): RichTextDocument {
  return { text, spans };
}

const boldDoc = makeDocument("hello world", [
  { start: 0, end: 5, mark: "bold" }
]);

assert(
  getSelectionMarks(boldDoc, { start: 0, end: 0 }).bold === true,
  "Cursor at span start (0) should show bold active."
);
assert(
  getSelectionMarks(boldDoc, { start: 2, end: 2 }).bold === true,
  "Cursor inside span (2) should show bold active."
);
assert(
  getSelectionMarks(boldDoc, { start: 4, end: 4 }).bold === true,
  "Cursor at last char inside span (4) should show bold active."
);
assert(
  getSelectionMarks(boldDoc, { start: 5, end: 5 }).bold === false,
  "Cursor at span.end (5) should NOT show bold active (end-exclusive)."
);
assert(
  getSelectionMarks(boldDoc, { start: 7, end: 7 }).bold === false,
  "Cursor after span (7) should NOT show bold active."
);

const italicDoc = makeDocument("abc def", [
  { start: 0, end: 3, mark: "italic" }
]);

assert(
  getSelectionMarks(italicDoc, { start: 2, end: 2 }).italic === true,
  "Italic: cursor at last char inside span (2) should be active."
);
assert(
  getSelectionMarks(italicDoc, { start: 3, end: 3 }).italic === false,
  "Italic: cursor at span.end (3) should NOT be active."
);

const underlineDoc = makeDocument("xyz 123", [
  { start: 4, end: 7, mark: "underline" }
]);

assert(
  getSelectionMarks(underlineDoc, { start: 4, end: 4 }).underline === true,
  "Underline: cursor at span start (4) should be active."
);
assert(
  getSelectionMarks(underlineDoc, { start: 6, end: 6 }).underline === true,
  "Underline: cursor at last char inside span (6) should be active."
);
assert(
  getSelectionMarks(underlineDoc, { start: 7, end: 7 }).underline === false,
  "Underline: cursor at span.end (7) should NOT be active."
);

const multiMarkDoc = makeDocument("abcdefgh", [
  { start: 0, end: 4, mark: "bold" },
  { start: 2, end: 6, mark: "italic" }
]);

assert(
  getSelectionMarks(multiMarkDoc, { start: 3, end: 3 }).bold === true,
  "Multi-mark: cursor at 3 should show bold (inside 0-4)."
);
assert(
  getSelectionMarks(multiMarkDoc, { start: 3, end: 3 }).italic === true,
  "Multi-mark: cursor at 3 should show italic (inside 2-6)."
);
assert(
  getSelectionMarks(multiMarkDoc, { start: 4, end: 4 }).bold === false,
  "Multi-mark: cursor at 4 should NOT show bold (span.end)."
);
assert(
  getSelectionMarks(multiMarkDoc, { start: 4, end: 4 }).italic === true,
  "Multi-mark: cursor at 4 should show italic (inside 2-6)."
);

const parsed = parseRichTextDocument("**bold** normal *italic*");
assert(parsed.spans.length > 0, "parseRichTextDocument should produce spans.");

console.log("richText validation passed");
