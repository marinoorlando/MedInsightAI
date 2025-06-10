"use client";

import { useState, useRef, type ChangeEvent, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { extractInformationFromPdf, type ExtractInformationFromPdfOutput } from '@/ai/flows/extract-information-from-pdf';
import { fileToDataUri, getFileSize } from '@/lib/utils';
import { Upload, Trash2, Loader2, FileText, Send } from 'lucide-react';

interface PdfDataExtractionCardProps {
  onNotesExtracted: (notes: string, elementRef: RefObject<HTMLDivElement>) => void;
  cardRef: RefObject<HTMLDivElement>;
}

export function PdfDataExtractionCard({ onNotesExtracted, cardRef }: PdfDataExtractionCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractInformationFromPdfOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Archivo inválido",
          description: "Por favor, selecciona un archivo PDF.",
          variant: "destructive",
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      setExtractionResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, selecciona un PDF para analizar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractionResult(null);

    try {
      const dataUri = await fileToDataUri(selectedFile);
      const result = await extractInformationFromPdf({ pdfDataUri: dataUri });
      setExtractionResult(result);
      toast({
        title: "Extracción Completa",
        description: "Los datos del PDF han sido extraídos exitosamente.",
      });
    } catch (err) {
      console.error("Error extracting from PDF:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
      setError(`Extracción fallida: ${errorMessage}`);
      toast({
        title: "Error en la Extracción",
        description: `No se pudo extraer datos del PDF. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setExtractionResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendNotes = () => {
    if (extractionResult?.clinicalNotes) {
      onNotesExtracted(extractionResult.clinicalNotes, cardRef);
      toast({ title: "Notas enviadas", description: "Las notas clínicas han sido enviadas al módulo de resumen." });
    }
  };
  
  const renderList = (title: string, items: string[] | undefined) => {
    if (!items || items.length === 0) {
      return <p className="text-sm text-muted-foreground">No se encontraron {title.toLowerCase()}.</p>;
    }
    return (
      <div>
        <h5 className="font-semibold mb-1">{title}</h5>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    );
  };


  return (
    <Card ref={cardRef} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Extracción de Datos de PDF</CardTitle>
        </div>
        <CardDescription>
          Carga un documento PDF (historial clínico, informe) para extraer medicamentos, alergias, diagnósticos y notas clínicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="pdf-upload" className="mb-2 block">Cargar Documento PDF</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
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
        
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            Archivo: {selectedFile.name} ({getFileSize(selectedFile.size)})
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Extrayendo datos del PDF...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {extractionResult && (
          <div className="mt-4 space-y-4 p-4 border rounded-md bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-lg mb-2 text-blue-700 dark:text-blue-300">Resultados de la Extracción</h4>
            {renderList("Medicamentos", extractionResult.medications)}
            {renderList("Alergias", extractionResult.allergies)}
            {renderList("Diagnósticos Anteriores", extractionResult.diagnoses)}
            <div>
              <h5 className="font-semibold mb-1">Notas Clínicas Extraídas</h5>
              <Textarea
                value={extractionResult.clinicalNotes}
                readOnly
                rows={6}
                className="bg-background/50"
              />
            </div>
            <Button onClick={handleSendNotes} variant="outline" className="w-full mt-2" disabled={!extractionResult.clinicalNotes}>
              <Send className="mr-2 h-4 w-4" /> Usar Notas para Comprensión de Texto
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={!selectedFile || isLoading} className="w-full">
          <Upload className="mr-2 h-4 w-4" /> Analizar Documento
        </Button>
      </CardFooter>
    </Card>
  );
}
