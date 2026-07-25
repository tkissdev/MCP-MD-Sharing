import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Mirrors lib/chunking.ts (kept in sync manually since this script runs
// standalone via plain Node, without a TypeScript build step).
const TARGET_CHARS = 200;

function splitByH2(content) {
  const lines = content.split("\n");
  const sections = [];
  let heading = null;
  let current = [];
  let hasContent = false;

  for (const line of lines) {
    const match = /^##\s+(.*)/.exec(line);
    if (match) {
      if (hasContent || heading !== null) sections.push({ heading, body: current.join("\n") });
      heading = match[1].trim();
      current = [];
      hasContent = false;
    } else {
      current.push(line);
      if (line.trim().length > 0) hasContent = true;
    }
  }
  if (hasContent || heading !== null) sections.push({ heading, body: current.join("\n") });
  return sections;
}

function splitIntoParagraphs(text) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function splitIntoSentences(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+(?:[.!?]+(?=\s|$))?/g);
  return (matches ?? [normalized]).map((s) => s.trim()).filter(Boolean);
}

function paragraphToUnits(paragraph, budget) {
  const lines = paragraph.split("\n").map((l) => l.trim()).filter(Boolean);
  const units = [];
  for (const line of lines) {
    if (line.length <= budget) {
      units.push(line);
    } else {
      units.push(...splitIntoSentences(line));
    }
  }
  return units;
}

function packUnits(units, budget) {
  const chunks = [];
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

function chunkMarkdown(content) {
  const sections = splitByH2(content);
  const chunks = [];

  for (const section of sections) {
    const prefix = section.heading ? `## ${section.heading}\n\n` : "";
    const budget = Math.max(TARGET_CHARS - prefix.length, 50);

    const units = splitIntoParagraphs(section.body).flatMap((p) => paragraphToUnits(p, budget));
    if (units.length === 0) continue;

    for (const piece of packUnits(units, budget)) chunks.push(`${prefix}${piece}`);
  }

  return chunks;
}

const { data: documents, error: docsError } = await supabase
  .from("documents")
  .select("id, path, current_version, project_id");
if (docsError) throw docsError;

for (const doc of documents) {
  try {
    const { data: version, error: versionError } = await supabase
      .from("versions")
      .select("content")
      .eq("document_id", doc.id)
      .eq("version_number", doc.current_version)
      .single();
    if (versionError) throw versionError;

    const pieces = chunkMarkdown(version.content);
    await supabase.from("chunks").delete().eq("document_id", doc.id);

    if (pieces.length === 0) {
      console.log(`skip (empty): ${doc.path}`);
      continue;
    }

    const { data: embedData, error: embedError } = await supabase.functions.invoke("embed", {
      body: { texts: pieces },
    });
    if (embedError) throw new Error(embedError.message);
    if (embedData.error) throw new Error(embedData.error);

    const rows = pieces.map((text, i) => ({
      document_id: doc.id,
      version_number: doc.current_version,
      chunk_index: i,
      content: text,
      embedding: embedData.embeddings[i],
    }));

    const { error: insertError } = await supabase.from("chunks").insert(rows);
    if (insertError) throw new Error(insertError.message);

    console.log(`indexed: ${doc.path} (${pieces.length} chunks)`);
  } catch (err) {
    console.error(`failed: ${doc.path}: ${err.message}`);
  }
}

console.log("Done.");
