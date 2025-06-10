'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting information from PDF documents,
 * specifically tailored for medical records in Spanish.
 *
 * - extractInformationFromPdf - A function that handles the PDF extraction process.
 * - ExtractInformationFromPdfInput - The input type for the extractInformationFromPdf function.
 * - ExtractInformationFromPdfOutput - The return type for the extractInformationFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInformationFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInformationFromPdfInput = z.infer<typeof ExtractInformationFromPdfInputSchema>;

const ExtractInformationFromPdfOutputSchema = z.object({
  medications: z.array(z.string()).describe('A list of medications mentioned in the PDF.'),
  allergies: z.array(z.string()).describe('A list of allergies mentioned in the PDF.'),
  diagnoses: z.array(z.string()).describe('A list of previous diagnoses mentioned in the PDF.'),
  clinicalNotes: z.string().describe('The extracted clinical notes from the PDF.'),
});
export type ExtractInformationFromPdfOutput = z.infer<typeof ExtractInformationFromPdfOutputSchema>;

export async function extractInformationFromPdf(input: ExtractInformationFromPdfInput): Promise<ExtractInformationFromPdfOutput> {
  return extractInformationFromPdfFlow(input);
}

const extractInformationFromPdfPrompt = ai.definePrompt({
  name: 'extractInformationFromPdfPrompt',
  input: {schema: ExtractInformationFromPdfInputSchema},
  output: {schema: ExtractInformationFromPdfOutputSchema},
  prompt: `You are an AI assistant specialized in extracting information from medical PDF documents in Spanish.

  Given a PDF document, extract the following information:

  - Medications: A list of all medications mentioned in the document.
  - Allergies: A list of all allergies mentioned in the document.
  - Diagnoses: A list of all previous diagnoses mentioned in the document.
  - Clinical Notes: Extract the main clinical notes, including patient history, symptoms, and treatment plans.

  Ensure that all extracted information is in Spanish.

  PDF Document: {{media url=pdfDataUri}}
  `,
});

const extractInformationFromPdfFlow = ai.defineFlow(
  {
    name: 'extractInformationFromPdfFlow',
    inputSchema: ExtractInformationFromPdfInputSchema,
    outputSchema: ExtractInformationFromPdfOutputSchema,
  },
  async input => {
    const {output} = await extractInformationFromPdfPrompt(input);
    return output!;
  }
);
