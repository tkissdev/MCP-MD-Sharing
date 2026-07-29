// Splits markdown into semantically coherent chunks for embedding.
//
// Strategy: split along ## section boundaries first, then pack each section's
// content into ~1200-character chunks.
//
// Boundary rules (in priority order):
//   1. A sentence is never split across two chunks.
//   2. A paragraph is kept whole whenever it fits the budget; it is only
//      broken down (into lines, then sentences) when it is too large to fit
//      in a chunk on its own.
//   3. The section heading is prepended to every chunk for context and does
//      NOT count against the budget — otherwise a long heading would starve
//      the chunk of actual content.
//
// Each chunk after the first in a section repeats the previous chunk's last
// unit as overlap, so a hit near a boundary keeps its context — but only when
// that unit is small, to avoid duplicating whole paragraphs.
//
// Known limitation: sentence splitting is punctuation-based and doesn't
// special-case abbreviations (e.g. "e.g.", "Dr.") — acceptable for search
// chunking, not meant to be a full NLP sentence tokenizer.

const TARGET_CHARS = 1200;

// Safety valve for pathological input (a minified blob or base64 payload on a
// single line with no sentence punctuation). Prose never reaches this; without
// it a single "sentence" could exceed the embedding model's input limit.
const HARD_MAX_CHARS = 8000;

// Overlap is only carried over when the trailing unit is at most this share of
// the budget, so we never duplicate a large paragraph into the next chunk.
const MAX_OVERLAP_RATIO = 0.25;

type Joiner = "\n\n" | "\n" | " ";

interface Unit {
  text: string;
  // How this unit attaches to the one before it, so packing preserves markdown
  // structure instead of flattening lists and paragraphs into one line.
  joiner: Joiner;
}

interface Section {
  heading: string | null;
  body: string;
}

function splitByH2(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let heading: string | null = null;
  let current: string[] = [];
  let hasContent = false;

  for (const line of lines) {
    const match = /^##\s+(.*)/.exec(line);
    if (match) {
      if (hasContent || heading !== null) {
        sections.push({ heading, body: current.join("\n") });
      }
      heading = match[1].trim();
      current = [];
      hasContent = false;
    } else {
      current.push(line);
      if (line.trim().length > 0) hasContent = true;
    }
  }
  if (hasContent || heading !== null) {
    sections.push({ heading, body: current.join("\n") });
  }

  return sections;
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+(?:[.!?]+(?=\s|$))?/g);
  return (matches ?? [normalized]).map((s) => s.trim()).filter(Boolean);
}

// Last-resort split for a "sentence" with no punctuation to break on. Splits on
// whitespace so we still never cut mid-word.
function hardSplit(text: string, budget: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= budget) {
      current = candidate;
    } else {
      if (current) out.push(current);
      current = word;
    }
  }
  if (current) out.push(current);
  return out;
}

// Breaks one paragraph into the largest units that still fit the budget:
// the whole paragraph if possible, otherwise its lines, otherwise sentences.
function paragraphToUnits(paragraph: string, budget: number): Unit[] {
  if (paragraph.length <= budget) {
    return [{ text: paragraph, joiner: "\n\n" }];
  }

  const lines = paragraph
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const units: Unit[] = [];
  for (const [lineIndex, line] of lines.entries()) {
    // The first line reattaches to the previous paragraph, later lines to the
    // line above them.
    const lineJoiner: Joiner = lineIndex === 0 ? "\n\n" : "\n";

    if (line.length <= budget) {
      units.push({ text: line, joiner: lineJoiner });
      continue;
    }

    for (const [sentenceIndex, sentence] of splitIntoSentences(line).entries()) {
      const joiner: Joiner = sentenceIndex === 0 ? lineJoiner : " ";
      if (sentence.length <= HARD_MAX_CHARS) {
        units.push({ text: sentence, joiner });
        continue;
      }
      for (const [pieceIndex, piece] of hardSplit(sentence, budget).entries()) {
        units.push({ text: piece, joiner: pieceIndex === 0 ? joiner : " " });
      }
    }
  }

  return units;
}

// Greedily packs boundary-safe units into ~budget-character chunks, carrying a
// small trailing unit into the next chunk as overlap.
function packUnits(units: Unit[], budget: number): string[] {
  const maxOverlap = Math.floor(budget * MAX_OVERLAP_RATIO);
  const chunks: string[] = [];
  let current = "";
  let lastUnit: Unit | null = null;

  for (const unit of units) {
    if (current.length === 0) {
      current = unit.text;
      lastUnit = unit;
      continue;
    }

    const candidate = `${current}${unit.joiner}${unit.text}`;
    if (candidate.length <= budget) {
      current = candidate;
      lastUnit = unit;
      continue;
    }

    chunks.push(current);

    const overlap = lastUnit && lastUnit.text.length <= maxOverlap ? lastUnit : null;
    current = overlap ? `${overlap.text}${unit.joiner}${unit.text}` : unit.text;
    lastUnit = unit;
  }

  if (current) chunks.push(current);
  return chunks;
}

export function chunkMarkdown(content: string): string[] {
  const sections = splitByH2(content);
  const chunks: string[] = [];

  for (const section of sections) {
    // The heading is context, not payload: it rides along with every chunk but
    // never shrinks the room left for real content.
    const prefix = section.heading ? `## ${section.heading}\n\n` : "";

    const units = splitIntoParagraphs(section.body).flatMap((p) => paragraphToUnits(p, TARGET_CHARS));
    if (units.length === 0) continue;

    for (const piece of packUnits(units, TARGET_CHARS)) {
      chunks.push(`${prefix}${piece}`);
    }
  }

  return chunks;
}
