
"use client";

import { useState, useEffect, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { summarizeClinicalNotes, type SummarizeClinicalNotesOutput } from '@/ai/flows/summarize-clinical-notes';
import { addHistoryEvent } from '@/lib/db'; // Importar
import { Loader2, ClipboardPenLine, Play, Trash2, Copy, SendToBack } from 'lucide-react';

interface ClinicalNoteSummarizationCardProps {
  initialText?: string;
  cardRef: RefObject<HTMLDivElement>;
  onSummaryReadyForDiagnosis: (summary: string) => void;
}

const truncateTextForHistory = (text: string, maxLength = 150) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export function ClinicalNoteSummarizationCard({ initialText, cardRef, onSummaryReadyForDiagnosis }: ClinicalNoteSummarizationCardProps) {
  const [notes, setNotes] = useState(initialText || "");
  const [summaryResult, setSummaryResult] = useState<SummarizeClinicalNotesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialText) {
      setNotes(initialText);
      setSummaryResult(null); 
      setError(null);
    }
  }, [initialText]);

  const handleAnalyze = async () => {
    if (!notes.trim()) {
      toast({
        title: "Notas vacías",
        description: "Por favor, ingresa o envía notas clínicas para analizar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummaryResult(null);

    try {
      const result = await summarizeClinicalNotes({ clinicalNotes: notes });
      setSummaryResult(result);
      toast({
        title: "Resumen Generado",
        description: "El resumen de las notas clínicas ha sido generado exitosamente.",
      });

      // Registrar evento en el historial
      await addHistoryEvent({
        module: "Comprensión de Texto Clínico",
        action: "Notas Resumidas",
        inputSummary: truncateTextForHistory(notes),
        outputSummary: result.summary ? truncateTextForHistory(result.summary) : "No se generó resumen.",
        details: { inputTextLength: notes.length, summaryTextLength: result.summary?.length || 0 }
      });

    } catch (err) {
      console.error("Error summarizing notes:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
      setError(`Análisis fallido: ${errorMessage}`);
      toast({
        title: "Error en el Análisis",
        description: `No se pudo generar el resumen. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setNotes("");
    setSummaryResult(null);
    setError(null);
  };

  const handleCopySummary = () => {
    if (summaryResult?.summary) {
      navigator.clipboard.writeText(summaryResult.summary)
        .then(() => {
          toast({ title: "Resumen Copiado", description: "El resumen ha sido copiado al portapapeles." });
        })
        .catch(err => {
          console.error("Failed to copy summary: ", err);
          toast({ title: "Error al Copiar", description: "No se pudo copiar el resumen.", variant: "destructive" });
        });
    }
  };

  const handleSendSummaryToDiagnosis = () => {
    if (summaryResult?.summary) {
      onSummaryReadyForDiagnosis(summaryResult.summary);
      toast({ title: "Resumen Enviado", description: "El resumen ha sido enviado a Diagnóstico Inteligente." });
    }
  };

  return (
    <Card ref={cardRef} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <ClipboardPenLine className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Comprensión de Texto Clínico</CardTitle>
        </div>
        <CardDescription>
          Ingresa notas clínicas, historial del paciente o el resultado de un análisis de imagen para generar un resumen con la información clave.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="clinical-notes" className="mb-2 block">Notas Clínicas e Historial del Paciente</Label>
          <Textarea
            id="clinical-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ingresa aquí las notas clínicas, historial del paciente o utiliza texto extraído de un PDF o análisis de imagen..."
            rows={8}
            className="min-h-[150px]"
            disabled={isLoading}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Analizando notas...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {summaryResult && (
          <div className="mt-4 p-4 border rounded-md bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-lg text-indigo-700 dark:text-indigo-300">Resumen de Información Clave</h4>
              <Button variant="ghost" size="sm" onClick={handleCopySummary} aria-label="Copiar resumen">
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{summaryResult.summary}</p>
            <Button 
              onClick={handleSendSummaryToDiagnosis} 
              variant="outline" 
              className="w-full mt-3"
              disabled={!summaryResult.summary}
            >
              <SendToBack className="mr-2 h-4 w-4" /> Usar Resumen para Diagnóstico Inteligente
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleAnalyze} disabled={!notes.trim() || isLoading} className="w-full sm:w-auto flex-grow">
          <Play className="mr-2 h-4 w-4" /> Analizar Notas
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={isLoading} className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" /> Limpiar Notas
        </Button>
      </CardFooter>
    </Card>
  );
}
