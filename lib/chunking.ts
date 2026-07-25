// Splits markdown into small, semantically coherent chunks for embedding.
//
// Strategy: split along ## section boundaries first, then pack each section's
// paragraphs/lines/sentences into ~200-character chunks. Chunks always end at
// a paragraph, line, or sentence boundary — never mid-sentence or mid-word —
// even if that means a chunk comes out shorter than the target. Each chunk
// after the first in a section repeats the previous chunk's last unit (a
// small overlap) so a search hit near a boundary doesn't lose context.
//
// Known limitation: sentence splitting is punctuation-based and doesn't
// special-case abbreviations (e.g. "e.g.", "Dr.") — acceptable for search
// chunking, not meant to be a full NLP sentence tokenizer.

const TARGET_CHARS = 200;

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

// A paragraph's lines are kept whole when they already fit the budget (so
// list items stay intact); only a line longer than that gets split further,
// by sentence.
function paragraphToUnits(paragraph: string, budget: number): string[] {
  const lines = paragraph
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const units: string[] = [];
  for (const line of lines) {
    if (line.length <= budget) {
      units.push(line);
    } else {
      units.push(...splitIntoSentences(line));
    }
  }
  return units;
}

// Greedily packs units (paragraphs/lines/sentences, already boundary-safe)
// into ~budget-character chunks, carrying the last unit of each chunk into
// the next one as overlap.
function packUnits(units: string[], budget: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let lastUnit = "";

  for (const unit of units) {
    if (current.length === 0) {
      current = unit;
      lastUnit = unit;
      continue;
    }

    const candidate = `${current} ${unit}`;
    if (candidate.length <= budget) {
      current = candidate;
      lastUnit = unit;
    } else {
      chunks.push(current);
      current = `${lastUnit} ${unit}`;
      lastUnit = unit;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

export function chunkMarkdown(content: string): string[] {
  const sections = splitByH2(content);
  const chunks: string[] = [];

  for (const section of sections) {
    const prefix = section.heading ? `## ${section.heading}\n\n` : "";
    const budget = Math.max(TARGET_CHARS - prefix.length, 50);

    const units = splitIntoParagraphs(section.body).flatMap((p) => paragraphToUnits(p, budget));
    if (units.length === 0) continue;

    for (const piece of packUnits(units, budget)) {
      chunks.push(`${prefix}${piece}`);
    }
  }

  return chunks;
}
