import { AppError } from '../middleware/errorHandler';

const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

export type ImportedQuestion = { text: string; options: { optionId: string; text: string }[]; correctOptionId?: string; marks?: number };

function parseText(text: string): ImportedQuestion[] {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n');
  const answerKey = new Map<string, string>();
  for (const match of normalized.matchAll(/(?:answer\s*key\s*[:\-]?\s*)?(\d+)\s*[-.:]\s*([A-D])\b/gi)) answerKey.set(match[1], match[2].toUpperCase());
  // Start blocks only at genuine numbered question headings. Everything before
  // the first heading is document metadata/instructions, not a question.
  const blocks = normalized.split(/(?=^\s*(?:Q(?:uestion)?\s*)?\d+[.)]\s+)/im).filter(block => /^\s*(?:Q(?:uestion)?\s*)?\d+[.)]\s+/i.test(block));
  return blocks.map((block) => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    const firstOption = lines.findIndex(line => /^[A-D][.):]\s+/i.test(line));
    const textLines = firstOption >= 0 ? lines.slice(0, firstOption) : lines;
    const options = lines.filter(line => /^[A-D][.):]\s+/i.test(line)).map(line => ({ optionId: line[0].toUpperCase(), text: line.replace(/^[A-D][.):]\s+/i, '').trim() }));
    const answerLine = lines.find(line => /^(?:correct\s+answer|answer\s+key|answer|correct)\s*:/i.test(line));
    const answerMatch = answerLine?.match(/(?:^|\b)([A-D])\b/i);
    const marksMatch = lines.join(' ').match(/marks?\s*:\s*(\d+(?:\.\d+)?)/i);
    const numberMatch = lines[0]?.match(/\d+/);
    return { text: textLines.join(' ').replace(/^\s*(?:Q(?:uestion)?\s*)?\d+[.):]\s*/i, '').trim(), options, correctOptionId: answerMatch?.[1].toUpperCase() || (numberMatch ? answerKey.get(numberMatch[0]) : undefined), marks: marksMatch ? Number(marksMatch[1]) : undefined };
  });
}

export async function extractQuestions(buffer: Buffer, filename: string): Promise<{ questions: ImportedQuestion[]; ocrRequired: boolean }> {
  const lower = filename.toLowerCase();
  let text = '';
  if (lower.endsWith('.pdf')) {
    if (buffer.subarray(0, 4).toString() !== '%PDF') throw new AppError('The uploaded file is not a valid PDF', 400);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
    if (!text.trim()) return { questions: [], ocrRequired: true };
  } else if (lower.endsWith('.docx')) {
    if (buffer.subarray(0, 2).toString() !== 'PK') throw new AppError('The uploaded file is not a valid DOCX document', 400);
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (lower.endsWith('.doc')) {
    throw new AppError('Legacy .doc files are not supported by the configured safe parser. Convert to .docx and retry.', 415);
  } else throw new AppError('Only PDF and DOCX files are supported', 415);
  return { questions: parseText(text), ocrRequired: false };
}
