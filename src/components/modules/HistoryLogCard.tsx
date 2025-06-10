
"use client";

import { useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { db, clearHistory, getAllHistoryEvents, importHistory, type HistoryEvent } from '@/lib/db';
import { History, Trash2, ListChecks, FileText, Brain, ScanSearch, MessageSquareText, UploadCloud, DownloadCloud, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const truncateText = (text: string | undefined, maxLength: number = 100): string => {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getModuleIcon = (moduleName: string) => {
  if (moduleName.includes("Imágenes Médicas")) return <ScanSearch className="h-4 w-4 mr-2 text-green-600" />;
  if (moduleName.includes("PDF")) return <FileText className="h-4 w-4 mr-2 text-blue-600" />;
  if (moduleName.includes("Texto Clínico")) return <MessageSquareText className="h-4 w-4 mr-2 text-indigo-600" />;
  if (moduleName.includes("Diagnóstico")) return <Brain className="h-4 w-4 mr-2 text-purple-600" />;
  return <ListChecks className="h-4 w-4 mr-2" />;
}

export function HistoryLogCard() {
  const historyEvents = useLiveQuery(
    () => db.historyEvents.orderBy('timestamp').reverse().toArray(),
    []
  );
  const { toast } = useToast();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false);
  const [eventsToImport, setEventsToImport] = useState<Partial<HistoryEvent>[]>([]);

  const handleClearHistory = async () => {
    await clearHistory();
    toast({
      title: "Historial Limpiado",
      description: "Se han eliminado todos los eventos del historial.",
    });
  };

  const handleExportHistory = async () => {
    const events = await getAllHistoryEvents();
    if (events.length === 0) {
      toast({
        title: "Historial Vacío",
        description: "No hay eventos para exportar.",
        variant: "destructive"
      });
      return;
    }
    try {
      const jsonString = JSON.stringify(events, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medinsight_history_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Historial Exportado",
        description: "El historial ha sido exportado como JSON.",
      });
    } catch (error) {
      console.error("Failed to export history:", error);
      toast({
        title: "Error de Exportación",
        description: "No se pudo exportar el historial.",
        variant: "destructive"
      });
    }
  };

  const handleImportFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedEvents = JSON.parse(content);
          if (Array.isArray(parsedEvents) && parsedEvents.every(item => typeof item === 'object' && item.module && item.action && item.timestamp)) {
            setEventsToImport(parsedEvents);
            setShowImportConfirmDialog(true);
          } else {
            toast({
              title: "Archivo Inválido",
              description: "El archivo JSON no tiene el formato esperado para el historial.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Failed to parse import file:", error);
          toast({
            title: "Error de Importación",
            description: "No se pudo leer o procesar el archivo JSON.",
            variant: "destructive"
          });
        } finally {
          // Reset file input to allow re-selection of the same file
          if(importFileRef.current) importFileRef.current.value = "";
        }
      };
      reader.readAsText(file);
    }
  };

  const confirmImport = async (mode: 'replace' | 'append') => {
    setShowImportConfirmDialog(false);
    if (eventsToImport.length === 0) return;

    setIsImporting(true);
    try {
      await importHistory(eventsToImport, mode);
      toast({
        title: "Historial Importado",
        description: `Los eventos han sido ${mode === 'replace' ? 'reemplazados' : 'añadidos'} exitosamente.`,
      });
    } catch (error) {
      toast({
        title: "Error al Importar",
        description: "Ocurrió un problema al importar los eventos del historial.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setEventsToImport([]);
    }
  };


  return (
    <>
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-1 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <History className="h-8 w-8 text-primary" />
              <CardTitle className="font-headline text-xl">Historial de Actividad</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} disabled={isImporting}>
                <UploadCloud className="mr-2 h-4 w-4" /> {isImporting ? "Importando..." : "Importar"}
              </Button>
              <Input type="file" accept=".json" ref={importFileRef} onChange={handleImportFileSelect} className="hidden" />
              <Button variant="outline" size="sm" onClick={handleExportHistory} disabled={!historyEvents || historyEvents.length === 0}>
                <DownloadCloud className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </div>
          </div>
          <CardDescription>
            Registro de las acciones y análisis realizados en la plataforma. Puede importar y exportar el historial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!historyEvents || historyEvents.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay eventos en el historial todavía.</p>
              <p className="text-sm">Realiza un análisis para ver el registro aquí.</p>
            </div>
          )}
          {historyEvents && historyEvents.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {historyEvents.map((event) => (
                  <div key={event.id} className="p-3 border rounded-md bg-card/50 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center">
                        {getModuleIcon(event.module)}
                        <span className="font-semibold text-sm">{event.module} - {event.action}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(event.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: es })}
                      </Badge>
                    </div>
                    {event.inputSummary && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Entrada:</span> {truncateText(event.inputSummary, 70)}
                      </p>
                    )}
                    {event.outputSummary && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Resultado:</span> {truncateText(event.outputSummary, 100)}
                      </p>
                    )}
                     {event.details && Object.keys(event.details).length > 0 && (
                        <details className="text-xs mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Detalles</summary>
                            <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(event.details, null, 2)}
                            </pre>
                        </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        {historyEvents && historyEvents.length > 0 && (
          <CardFooter>
            <Button variant="outline" onClick={handleClearHistory} className="w-full" disabled={isImporting}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpiar Historial
            </Button>
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={showImportConfirmDialog} onOpenChange={setShowImportConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importación de Historial</AlertDialogTitle>
            <AlertDialogDescription>
              Ha seleccionado un archivo para importar ({eventsToImport.length} evento(s)). ¿Cómo desea importar estos eventos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventsToImport([])}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => confirmImport('append')}>
              Añadir al Historial Actual
            </Button>
            <Button variant="destructive" onClick={() => confirmImport('replace')}>
              Reemplazar Historial Actual
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
