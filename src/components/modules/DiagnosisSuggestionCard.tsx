
"use client";

import { useState, useEffect, type RefObject } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { suggestDiagnosis, type SuggestDiagnosisOutput } from '@/ai/flows/suggest-diagnosis';
import { addHistoryEvent } from '@/lib/db';
import { Loader2, Brain, Lightbulb, Trash2, Star } from 'lucide-react';

interface DiagnosisSuggestionCardProps {
  initialClinicalData?: string;
  cardRef: RefObject<HTMLDivElement>;
}

export function DiagnosisSuggestionCard({ initialClinicalData, cardRef }: DiagnosisSuggestionCardProps) {
  const [clinicalData, setClinicalData] = useState(initialClinicalData || "");
  const [diagnosisResult, setDiagnosisResult] = useState<SuggestDiagnosisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedPrincipalCode, setSelectedPrincipalCode] = useState<string | null>(null);
  const [confirmedDiagnoses, setConfirmedDiagnoses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialClinicalData) {
      setClinicalData(initialClinicalData);
    }
  }, [initialClinicalData]);

  const handleSuggest = async () => {
    if (!clinicalData.trim()) {
      toast({
        title: "Datos vacíos",
        description: "Por favor, ingresa los datos clínicos consolidados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnosisResult(null); 
    setSelectedPrincipalCode(null); 
    setConfirmedDiagnoses(new Set()); 

    try {
      const result = await suggestDiagnosis({ clinicalData });
      setDiagnosisResult(result);
      toast({
        title: "Sugerencias Generadas",
        description: "Las sugerencias de diagnóstico han sido generadas exitosamente.",
      });

      let historyOutputSummary = "No se generaron sugerencias.";
      if (result && result.length > 0) {
        const mainDiagnosis = result.sort((a,b) => b.confidence - a.confidence)[0];
        historyOutputSummary = `${result.length} sugerencia(s) generada(s). Principal: ${mainDiagnosis.description} (${mainDiagnosis.code} - ${(mainDiagnosis.confidence * 100).toFixed(0)}%).`;
      }

      await addHistoryEvent({
        module: "Diagnóstico Inteligente",
        action: "Diagnósticos Sugeridos",
        inputSummary: clinicalData,
        outputSummary: historyOutputSummary,
        details: { 
          inputTextLength: clinicalData.length, 
          suggestions: result 
        }
      });

    } catch (err) {
      console.error("Error suggesting diagnosis:", err);
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
      setError(`Sugerencia fallida: ${errorMessage}`);
      toast({
        title: "Error en la Sugerencia",
        description: `No se pudieron generar las sugerencias. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setClinicalData("");
    setDiagnosisResult(null);
    setError(null);
    setSelectedPrincipalCode(null);
    setConfirmedDiagnoses(new Set());
  };

  const getConfidenceBadgeVariant = (confidence: number): "destructive" | "secondary" | "default" => {
    if (confidence < 0.4) return "destructive";
    if (confidence < 0.7) return "secondary";
    return "default";
  };
  
  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence < 0.4) return 'bg-red-500 hover:bg-red-600'; 
    if (confidence < 0.7) return 'bg-yellow-500 hover:bg-yellow-600'; 
    return 'bg-green-500 hover:bg-green-600'; 
  };

  const handleSetPrincipal = (code: string) => {
    if (selectedPrincipalCode === code) {
      // Desmarcando el principal actual
      setSelectedPrincipalCode(null);
      // No se reordena al desmarcar, el orden se mantiene como está.
    } else {
      // Marcando un nuevo principal (o cambiando de principal)
      setSelectedPrincipalCode(code);
      if (diagnosisResult) {
        const newOrderedResults = [...diagnosisResult];
        const selectedIndex = newOrderedResults.findIndex(diag => diag.code === code);
        if (selectedIndex > -1) {
          const [selectedItem] = newOrderedResults.splice(selectedIndex, 1);
          newOrderedResults.unshift(selectedItem);
          setDiagnosisResult(newOrderedResults);
        }
      }
    }
  };

  const handleToggleConfirmed = (code: string) => {
    setConfirmedDiagnoses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  return (
    <Card ref={cardRef} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Diagnóstico Inteligente</CardTitle>
        </div>
        <CardDescription>
          Ingresa datos clínicos consolidados para recibir sugerencias de diagnósticos (CIE-10) con puntajes de confianza. Selecciona el principal y confirma los relevantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="clinical-data" className="mb-2 block">Datos Clínicos Consolidados</Label>
          <Textarea
            id="clinical-data"
            value={clinicalData}
            onChange={(e) => setClinicalData(e.target.value)}
            placeholder="Ingresa aquí el resumen de notas, síntomas clave, historial relevante, etc."
            rows={8}
            className="min-h-[150px]"
            disabled={isLoading}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Generando sugerencias...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {diagnosisResult && diagnosisResult.length > 0 && (
          <div className="mt-4 p-4 border rounded-md bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
            <h4 className="font-semibold text-lg mb-2 text-purple-700 dark:text-purple-300">Sugerencias de Diagnóstico (CIE-10)</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Principal</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Confianza</TableHead>
                  <TableHead className="w-[100px] text-center">Confirmar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnosisResult.map((diag, index) => (
                  <TableRow key={`${diag.code}-${index}`} className={confirmedDiagnoses.has(diag.code) ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetPrincipal(diag.code)}
                        aria-label={`Marcar ${diag.code} como principal`}
                        className={`hover:text-amber-500 ${selectedPrincipalCode === diag.code ? 'text-amber-500' : 'text-muted-foreground'}`}
                      >
                        <Star className={selectedPrincipalCode === diag.code ? 'fill-amber-500' : ''} />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{diag.code}</TableCell>
                    <TableCell>{diag.description}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant={getConfidenceBadgeVariant(diag.confidence)} className={getConfidenceBadgeColor(diag.confidence)}>
                        {(diag.confidence * 100).toFixed(0)}%
                       </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={confirmedDiagnoses.has(diag.code)}
                        onCheckedChange={() => handleToggleConfirmed(diag.code)}
                        id={`confirmed-${diag.code}-${index}`}
                        aria-label={`Confirmar diagnóstico ${diag.code}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {diagnosisResult && diagnosisResult.length === 0 && !isLoading && (
           <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-yellow-700 dark:text-yellow-300">
            <p className="font-medium">No se encontraron sugerencias.</p>
            <p className="text-sm">La IA no pudo generar diagnósticos con los datos proporcionados o los datos no fueron suficientes.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleSuggest} disabled={!clinicalData.trim() || isLoading} className="w-full sm:w-auto flex-grow">
          <Lightbulb className="mr-2 h-4 w-4" /> Sugerir Diagnósticos
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={isLoading} className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" /> Limpiar Datos
        </Button>
      </CardFooter>
    </Card>
  );
}
