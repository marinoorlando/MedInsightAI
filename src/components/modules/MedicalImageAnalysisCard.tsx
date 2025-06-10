
"use client";

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { analyzeMedicalImage, type AnalyzeMedicalImageOutput } from '@/ai/flows/analyze-medical-image';
import { fileToDataUri, getFileSize } from '@/lib/utils';
import { addHistoryEvent } from '@/lib/db'; // Importar
import { Upload, Trash2, Loader2, ScanSearch, FileImage, Send } from 'lucide-react';

interface MedicalImageAnalysisCardProps {
  onAnalysisReady: (summary: string) => void;
}

const truncateSummary = (summary: string, maxLength = 150) => {
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength) + "...";
};

export function MedicalImageAnalysisCard({ onAnalysisReady }: MedicalImageAnalysisCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMedicalImageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Archivo inválido",
          description: "Por favor, selecciona un archivo de imagen.",
          variant: "destructive",
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, selecciona una imagen para analizar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const dataUri = await fileToDataUri(selectedFile);
      const result = await analyzeMedicalImage({ photoDataUri: dataUri });
      setAnalysisResult(result);
      toast({
        title: "Análisis Completo",
        description: "La imagen médica ha sido analizada exitosamente.",
      });

      // Registrar evento en el historial
      await addHistoryEvent({
        module: "Análisis de Imágenes Médicas",
        action: "Imagen Analizada",
        inputSummary: selectedFile.name,
        outputSummary: result.summary ? truncateSummary(result.summary) : "No se generó resumen.",
        details: { fileName: selectedFile.name, resultSummary: result.summary }
      });

    } catch (err) {
      console.error("Error analyzing image:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
      setError(`Análisis fallido: ${errorMessage}`);
      toast({
        title: "Error en el Análisis",
        description: `No se pudo analizar la imagen. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendAnalysisToSummarization = () => {
    if (analysisResult?.summary) {
      onAnalysisReady(analysisResult.summary);
      toast({ title: "Análisis Enviado", description: "El resumen del análisis ha sido enviado a Comprensión de Texto Clínico." });
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <ScanSearch className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Análisis de Imágenes Médicas</CardTitle>
        </div>
        <CardDescription>
          Carga una imagen médica (radiografía, tomografía, etc.) para que la IA identifique posibles anomalías.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="image-upload" className="mb-2 block">Cargar Imagen</Label>
          <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="flex-grow"
              disabled={isLoading}
            />
            {selectedFile && (
              <Button variant="outline" size="icon" onClick={handleClear} disabled={isLoading} aria-label="Limpiar selección">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {selectedFile && !previewUrl && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
             <FileImage className="h-5 w-5" />
            <span>{selectedFile.name} ({getFileSize(selectedFile.size)})</span>
          </div>
        )}

        {previewUrl && (
          <div className="mt-4 p-2 border rounded-md bg-muted/30">
             <div className="text-sm text-muted-foreground mb-2">
              Vista previa: {selectedFile?.name} ({selectedFile && getFileSize(selectedFile.size)})
            </div>
            <Image 
              src={previewUrl} 
              alt="Vista previa de imagen médica" 
              width={500} 
              height={300} 
              className="rounded-md object-contain max-h-[300px] w-full"
              data-ai-hint="medical scan" 
            />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Analizando imagen...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analysisResult && (
          <div className="mt-4 p-4 border rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <h4 className="font-semibold text-lg mb-2 text-green-700 dark:text-green-300">Resumen del Análisis</h4>
            <p className="text-sm whitespace-pre-wrap">{analysisResult.summary}</p>
            <Button 
              onClick={handleSendAnalysisToSummarization} 
              variant="outline" 
              className="w-full mt-3"
              disabled={!analysisResult.summary}
            >
              <Send className="mr-2 h-4 w-4" /> Usar Análisis para Notas Clínicas
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={!selectedFile || isLoading} className="w-full">
          <Upload className="mr-2 h-4 w-4" /> Analizar Imagen
        </Button>
      </CardFooter>
    </Card>
  );
}
