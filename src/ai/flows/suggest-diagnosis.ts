// src/ai/flows/suggest-diagnosis.ts
'use server';

/**
 * @fileOverview Suggests potential diagnoses based on consolidated clinical data using AI.
 *
 * - suggestDiagnosis - A function that suggests diagnoses based on clinical data.
 * - SuggestDiagnosisInput - The input type for the suggestDiagnosis function.
 * - SuggestDiagnosisOutput - The return type for the suggestDiagnosis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDiagnosisInputSchema = z.object({
  clinicalData: z
    .string()
    .describe(
      'Consolidated clinical data of the patient, including symptoms, history, and relevant findings.'
    ),
});
export type SuggestDiagnosisInput = z.infer<typeof SuggestDiagnosisInputSchema>;

const SuggestDiagnosisOutputSchema = z.array(
  z.object({
    code: z.string().describe('The CIE-10 diagnostic code.'),
    description: z.string().describe('Description of the diagnosis in Spanish.'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('Confidence score (0-1) for the suggested diagnosis.'),
  })
);
export type SuggestDiagnosisOutput = z.infer<typeof SuggestDiagnosisOutputSchema>;

export async function suggestDiagnosis(input: SuggestDiagnosisInput): Promise<SuggestDiagnosisOutput> {
  return suggestDiagnosisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDiagnosisPrompt',
  input: {schema: SuggestDiagnosisInputSchema},
  output: {schema: SuggestDiagnosisOutputSchema},
  prompt: `You are an AI assistant specialized in suggesting medical diagnoses based on the CIE-10 coding system.

  Given the following clinical data, suggest a list of potential diagnoses. Provide the CIE-10 code, a description of the diagnosis in Spanish, and a confidence score (0-1) for each suggestion.

  Clinical Data: {{{clinicalData}}}

  Format your response as a JSON array of objects with the following keys:
  - code (string): The CIE-10 diagnostic code.
  - description (string): Description of the diagnosis in Spanish.
  - confidence (number): Confidence score (0-1) for the suggested diagnosis.

  Ensure that the confidence score reflects the likelihood of the diagnosis based on the provided clinical data.
  `, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestDiagnosisFlow = ai.defineFlow(
  {
    name: 'suggestDiagnosisFlow',
    inputSchema: SuggestDiagnosisInputSchema,
    outputSchema: SuggestDiagnosisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
