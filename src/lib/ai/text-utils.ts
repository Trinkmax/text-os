// Utilidades de texto para grounding + consistency. Mantener acá las
// stop-words y normalizaciones para que el algoritmo sea fácil de auditar.

const STOPWORDS_ES = new Set([
  "a","ante","bajo","cabe","con","contra","de","desde","durante","en","entre",
  "hacia","hasta","mediante","para","por","según","sin","sobre","tras","el",
  "la","los","las","un","una","unos","unas","y","o","u","e","ni","que","quien",
  "cual","cuales","como","cuando","donde","porque","pues","si","no","más",
  "menos","muy","es","son","fue","fueron","ser","sea","ha","han","hay","te",
  "se","me","mi","tu","tus","mis","su","sus","yo","él","ella","nos","les",
  "lo","esta","este","ese","esa","esto","aquí","allí","ahí","ya","aún","también",
  "todo","todos","cada","sólo","solo","del","al","les","les",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS_ES.has(t));
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/** Jaccard sobre tokens significativos. */
export function tokenSimilarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Splitter de oraciones suficiente para texto conversacional en español. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[\.\?!])\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Detecta menciones de números con símbolo $ o palabras de horario. */
export function findSpecifics(text: string): string[] {
  const out: string[] = [];
  // Precios / cifras con símbolo
  const priceRe = /(?:\$\s?\d[\d\.\,]*\s?(?:pesos|usd|us\$|ars)?)/gi;
  for (const m of text.matchAll(priceRe)) out.push(m[0].trim());
  // Horarios tipo "10:00", "10-20", "9 a 18hs"
  const timeRe = /\b(?:(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}\s?(?:a|al|hasta|h(?:s|rs)?)\s?\d{1,2})\b/gi;
  for (const m of text.matchAll(timeRe)) out.push(m[0].trim());
  return Array.from(new Set(out));
}
