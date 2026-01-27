import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import Tesseract from 'tesseract.js';

export const extractTextSchema = z.object({
  image_path: z.string()
    .describe('Path to the screenshot file to extract text from.'),
  language: z.string().optional().default('eng')
    .describe('Language code for OCR. Default "eng". Other options: "chi_sim" (Chinese), "jpn" (Japanese), "spa" (Spanish), etc.')
});

export const extractTextDescription =
  'Extract readable text from a screenshot using OCR (Optical Character Recognition). ' +
  'Useful for reading error messages, terminal output, or any text visible in an image. ' +
  'First take a screenshot, then use this tool with the file path.';

export type ExtractTextParams = z.infer<typeof extractTextSchema>;

export async function extractText(params: ExtractTextParams) {
  try {
    const { image_path, language } = params;

    // Verify file exists
    if (!existsSync(image_path)) {
      return {
        content: [{
          type: 'text' as const,
          text: `File not found: ${image_path}\n\nTake a screenshot first using the screenshot or screenshot_active tool.`
        }],
        isError: true
      };
    }

    // Read the image
    const imageBuffer = readFileSync(image_path);

    // Perform OCR
    const result = await Tesseract.recognize(imageBuffer, language, {
      logger: () => {} // Suppress progress logs
    });

    const text = result.data.text.trim();

    if (!text) {
      return {
        content: [{
          type: 'text' as const,
          text: 'No text detected in the image. The image may contain:\n' +
                '- Non-text content (graphics, icons)\n' +
                '- Text in a language not supported by the current setting\n' +
                '- Very small or stylized text\n\n' +
                'Try using a different language parameter if needed.'
        }]
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: `Extracted text from ${image_path}:\n\n${text}`
      }],
      extractedText: text,
      confidence: result.data.confidence
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to extract text: ${message}`
      }],
      isError: true
    };
  }
}
