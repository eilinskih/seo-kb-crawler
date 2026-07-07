import {
  ChunkTypeClassification,
} from './chunking-types';

export function classifyChunk(input: {
  text: string;
  headingPath: string[];
  chunkIndex: number;
  totalChunks: number;
}): ChunkTypeClassification {
  const haystack = `${input.headingPath.join(' ')} ${input.text}`.toLowerCase();

  if (/\?/.test(input.text) || /\b(faq|questions|q&a)\b/u.test(haystack)) {
    return { type: 'faq', confidence: 'medium' };
  }
  if (/^\s*\|.+\|\s*$/mu.test(input.text)) {
    return { type: 'table', confidence: 'high' };
  }
  if (/^\s*([-*]|\d+\.)\s+/mu.test(input.text)) {
    return { type: 'list', confidence: 'medium' };
  }
  if (/\b(compare|comparison|versus| vs\.? )\b/u.test(haystack)) {
    return { type: 'comparison', confidence: 'medium' };
  }
  if (/\b(review|rating|pros|cons)\b/u.test(haystack)) {
    return { type: 'review', confidence: 'medium' };
  }
  if (input.chunkIndex === 0) {
    return { type: 'intro', confidence: 'medium' };
  }
  if (input.totalChunks > 1 && input.chunkIndex === input.totalChunks - 1) {
    if (/\b(conclusion|summary|final thoughts)\b/u.test(haystack)) {
      return { type: 'conclusion', confidence: 'high' };
    }
  }
  if (/\b(city|near me|local|address|location)\b/u.test(haystack)) {
    return { type: 'local_section', confidence: 'low' };
  }
  if (input.headingPath.length > 0) {
    return { type: 'section', confidence: 'medium' };
  }
  return { type: 'unknown', confidence: 'unknown' };
}
