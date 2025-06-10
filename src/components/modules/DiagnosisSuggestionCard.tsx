
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
import { Loader2, Brain, Lightbulb, Trash2, Star, Save } from 'lucide-react';

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
  const [hasSavedThisInteraction, setHasSavedThisInteraction] = useState(false);

  useEffect(() => {
    if (initialClinicalData) {
      setClinicalData(initialClinicalData);
      // No se reinician los resultados ni se inicia análisis automáticamente.
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
    setHasSavedThisInteraction(false); // Reiniciar estado de guardado para la nueva interacción

    try {
      const result = await suggestDiagnosis({ clinicalData });
      setDiagnosisResult(result);
      toast({
        title: "Sugerencias Generadas",
        description: "Las sugerencias de diagnóstico han sido generadas exitosamente.",
      });
      // La llamada a addHistoryEvent se elimina de aquí. Se hará manualmente.
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

  const handleSaveToHistory = async () => {
    if (!diagnosisResult || diagnosisResult.length === 0) {
      toast({
        title: "Sin sugerencias",
        description: "No hay sugerencias para guardar en el historial.",
        variant: "destructive",
      });
      return;
    }

    let historyOutputSummary = `${diagnosisResult.length} sugerencia(s) generada(s).`;
    const principalDiagnosis = diagnosisResult.find(d => d.code === selectedPrincipalCode);
    if (principalDiagnosis) {
      historyOutputSummary = `Principal: ${principalDiagnosis.description} (${principalDiagnosis.code} - ${(principalDiagnosis.confidence * 100).toFixed(0)}%). `;
    }
    historyOutputSummary += `${confirmedDiagnoses.size}/${diagnosisResult.length} diagnósticos confirmados.`;

    try {
      await addHistoryEvent({
        module: "Diagnóstico Inteligente",
        action: "Interacción de Diagnóstico Guardada",
        inputSummary: clinicalData,
        outputSummary: historyOutputSummary,
        details: { 
          inputTextLength: clinicalData.length, 
          originalSuggestions: diagnosisResult,
          selectedPrincipalCode: selectedPrincipalCode,
          confirmedDiagnoses: Array.from(confirmedDiagnoses) 
        }
      });
      setHasSavedThisInteraction(true);
      toast({
        title: "Guardado en Historial",
        description: "La interacción de diagnóstico ha sido guardada en el historial.",
      });
    } catch (err) {
      console.error("Error saving diagnosis interaction to history:", err);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la interacción en el historial.",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setClinicalData("");
    setDiagnosisResult(null);
    setError(null);
    setSelectedPrincipalCode(null);
    setConfirmedDiagnoses(new Set());
    setHasSavedThisInteraction(false);
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
      setSelectedPrincipalCode(null);
    } else {
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
    setHasSavedThisInteraction(false); // Permitir guardar de nuevo si se cambia el principal
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
    setHasSavedThisInteraction(false); // Permitir guardar de nuevo si se cambia una confirmación
  };

  return (
    <Card ref={cardRef} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Diagnóstico Inteligente</CardTitle>
        </div>
        <CardDescription>
          Ingresa datos clínicos consolidados para recibir sugerencias de diagnósticos (CIE-10). Selecciona el principal, confirma los relevantes y guarda en el historial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="clinical-data" className="mb-2 block">Datos Clínicos Consolidados</Label>
          <Textarea
            id="clinical-data"
            value={clinicalData}
            onChange={(e) => {
              setClinicalData(e.target.value);
              setHasSavedThisInteraction(false); // Si cambia el texto de entrada, permitir nuevo guardado
            }}
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
                  <TableRow 
                    key={`${diag.code}-${index}`} 
                    className={`${confirmedDiagnoses.has(diag.code) ? 'bg-green-100 dark:bg-green-900/30' : ''} ${selectedPrincipalCode === diag.code ? 'ring-2 ring-amber-500' : ''}`}
                  >
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
        <Button 
          onClick={handleSaveToHistory} 
          disabled={isLoading || !diagnosisResult || diagnosisResult.length === 0 || hasSavedThisInteraction} 
          className="w-full sm:w-auto"
          variant="outline"
        >
          <Save className="mr-2 h-4 w-4" /> Guardar en Historial
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={isLoading} className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" /> Limpiar Datos
        </Button>
      </CardFooter>
    </Card>
  );
}

