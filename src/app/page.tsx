"use client";

import { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MedicalImageAnalysisCard } from '@/components/modules/MedicalImageAnalysisCard';
import { PdfDataExtractionCard } from '@/components/modules/PdfDataExtractionCard';
import { ClinicalNoteSummarizationCard } from '@/components/modules/ClinicalNoteSummarizationCard';
import { DiagnosisSuggestionCard } from '@/components/modules/DiagnosisSuggestionCard';

export default function HomePage() {
  const [extractedNotes, setExtractedNotes] = useState<string | undefined>(undefined);
  const [summaryForDiagnosis, setSummaryForDiagnosis] = useState<string | undefined>(undefined);

  const summarizationCardRef = useRef<HTMLDivElement>(null);
  const pdfExtractionCardRef = useRef<HTMLDivElement>(null);
  const diagnosisCardRef = useRef<HTMLDivElement>(null);


  const handleNotesExtracted = (notes: string, elementRefToScrollFrom?: React.RefObject<HTMLDivElement>) => {
    setExtractedNotes(notes);
    setTimeout(() => {
        summarizationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSummaryReadyForDiagnosis = (summary: string) => {
    setSummaryForDiagnosis(summary);
    setTimeout(() => {
      diagnosisCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <MedicalImageAnalysisCard />
          <PdfDataExtractionCard 
            onNotesExtracted={handleNotesExtracted} 
            cardRef={pdfExtractionCardRef} 
          />
          <ClinicalNoteSummarizationCard 
            initialNotes={extractedNotes} 
            cardRef={summarizationCardRef}
            onSummaryReadyForDiagnosis={handleSummaryReadyForDiagnosis}
          />
          <DiagnosisSuggestionCard 
            initialClinicalData={summaryForDiagnosis}
            cardRef={diagnosisCardRef}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
