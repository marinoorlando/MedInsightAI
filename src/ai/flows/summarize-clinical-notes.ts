'use server';
/**
 * @fileOverview This file defines a Genkit flow for summarizing clinical notes in Spanish.
 *
 * - summarizeClinicalNotes - A function that takes clinical notes as input and returns a concise summary.
 * - SummarizeClinicalNotesInput - The input type for the summarizeClinicalNotes function.
 * - SummarizeClinicalNotesOutput - The return type for the summarizeClinicalNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeClinicalNotesInputSchema = z.object({
  clinicalNotes: z
    .string()
    .describe('The clinical notes to summarize, in Spanish.'),
});
export type SummarizeClinicalNotesInput = z.infer<typeof SummarizeClinicalNotesInputSchema>;

const SummarizeClinicalNotesOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the clinical notes, including key symptoms, conditions, and medications, in Spanish.'
    ),
});
export type SummarizeClinicalNotesOutput = z.infer<typeof SummarizeClinicalNotesOutputSchema>;

export async function summarizeClinicalNotes(
  input: SummarizeClinicalNotesInput
): Promise<SummarizeClinicalNotesOutput> {
  return summarizeClinicalNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeClinicalNotesPrompt',
  input: {schema: SummarizeClinicalNotesInputSchema},
  output: {schema: SummarizeClinicalNotesOutputSchema},
  prompt: `Eres un médico experto.  Tu tarea es resumir las siguientes notas clínicas en español, identificando los síntomas principales, las condiciones médicas y los medicamentos relevantes mencionados.\n\nNotas Clínicas:\n{{{clinicalNotes}}}`,
});

const summarizeClinicalNotesFlow = ai.defineFlow(
  {
    name: 'summarizeClinicalNotesFlow',
    inputSchema: SummarizeClinicalNotesInputSchema,
    outputSchema: SummarizeClinicalNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
