import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-diagnosis.ts';
import '@/ai/flows/extract-information-from-pdf.ts';
import '@/ai/flows/analyze-medical-image.ts';
import '@/ai/flows/summarize-clinical-notes.ts';