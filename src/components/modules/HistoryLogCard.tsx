
"use client";

import { useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, clearHistory, getAllHistoryEvents, importHistory, type HistoryEvent, deleteHistoryEvent } from '@/lib/db';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const truncateTextForDisplay = (text: string | undefined, maxLength: number = 100): string => {
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
  const [eventToDelete, setEventToDelete] = useState<HistoryEvent | null>(null);

  const handleClearHistory = async () => {
    await clearHistory();
    toast({
      title: "Historial Limpiado",
      description: "Se han eliminado todos los eventos del historial.",
    });
  };

  const handleInitiateDeleteEvent = (event: HistoryEvent) => {
    setEventToDelete(event);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !eventToDelete.id) return;
    try {
      await deleteHistoryEvent(eventToDelete.id);
      toast({
        title: "Evento Eliminado",
        description: "El evento ha sido eliminado del historial.",
      });
    } catch (error) {
      toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar el evento del historial.",
        variant: "destructive",
      });
    } finally {
      setEventToDelete(null);
    }
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

  const renderAdditionalDetails = (event: HistoryEvent) => {
    const detailsToRender: Record<string, any> = { ...event.details };

    if (event.module === "Análisis de Imágenes Médicas" || event.module === "Extracción de Datos de PDF") {
      delete detailsToRender.fileName; 
      delete detailsToRender.fileSize;
      delete detailsToRender.contentType;
    }
    if (event.module === "Diagnóstico Inteligente") {
      delete detailsToRender.suggestions; 
      delete detailsToRender.inputTextLength;
    }
     if (event.module === "Comprensión de Texto Clínico") {
      delete detailsToRender.inputTextLength;
      delete detailsToRender.summaryTextLength;
    }


    if (Object.keys(detailsToRender).length === 0) {
      return <p className="text-xs text-muted-foreground mt-1">No hay detalles adicionales.</p>;
    }

    return (
      <>
        <h6 className="font-medium text-xs mt-2 mb-1">Detalles Adicionales:</h6>
        <pre className="p-2 bg-muted/50 rounded text-xs overflow-auto max-h-48">
          {JSON.stringify(detailsToRender, null, 2)}
        </pre>
      </>
    );
  }


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
          {(!historyEvents || historyEvents.length === 0) && !isImporting && (
            <div className="text-center py-8 text-muted-foreground">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay eventos en el historial todavía.</p>
              <p className="text-sm">Realiza un análisis para ver el registro aquí.</p>
            </div>
          )}
          {isImporting && (
             <div className="text-center py-8 text-muted-foreground">
              <UploadCloud className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
              <p>Importando eventos del historial...</p>
            </div>
          )}
          {historyEvents && historyEvents.length > 0 && !isImporting && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {historyEvents.map((event) => (
                  <details key={event.id} className="p-3 border rounded-md bg-card/50 shadow-sm group relative">
                    <summary className="cursor-pointer list-none">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center flex-grow">
                          {getModuleIcon(event.module)}
                          <span className="font-semibold text-sm mr-2">{event.module} - {event.action}</span>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                          <Badge variant="outline" className="text-xs mr-2">
                            {format(new Date(event.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: es })}
                          </Badge>
                          {event.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {e.stopPropagation(); handleInitiateDeleteEvent(event)}}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar evento</span>
                                </Button>
                              </AlertDialogTrigger>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      {event.inputSummary && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Entrada:</span> {truncateTextForDisplay(event.inputSummary, 70)}
                        </p>
                      )}
                      {event.outputSummary && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Resultado:</span> {truncateTextForDisplay(event.outputSummary, 100)}
                        </p>
                      )}
                       <div className="text-xs mt-1 text-primary group-open:hidden">Mostrar Detalles</div>
                       <div className="text-xs mt-1 text-primary hidden group-open:block">Ocultar Detalles</div>
                    </summary>
                    <div className="mt-2 pt-2 border-t">
                      {event.inputSummary && (
                        <div className="mb-2">
                          <h6 className="font-medium text-xs mb-0.5">Información de Entrada Completa:</h6>
                          <div className="text-xs p-2 bg-muted/30 rounded whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                            {event.inputSummary}
                          </div>
                        </div>
                      )}
                      {event.outputSummary && (
                        <div className="mb-2">
                          <h6 className="font-medium text-xs mb-0.5">Resultado Completo:</h6>
                          {event.module === "Diagnóstico Inteligente" && event.details?.suggestions ? (
                            <div className="max-h-60 overflow-y-auto">
                              <Table className="text-xs">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="h-8 px-2">Código</TableHead>
                                    <TableHead className="h-8 px-2">Descripción</TableHead>
                                    <TableHead className="h-8 px-2 text-right">Confianza</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(event.details.suggestions as any[]).map((diag, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium py-1 px-2">{diag.code}</TableCell>
                                      <TableCell className="py-1 px-2">{diag.description}</TableCell>
                                      <TableCell className="py-1 px-2 text-right">
                                        <Badge 
                                          variant={getConfidenceBadgeVariant(diag.confidence)} 
                                          className={`${getConfidenceBadgeColor(diag.confidence)} text-xs px-1.5 py-0.5`}
                                        >
                                          {(diag.confidence * 100).toFixed(0)}%
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-xs p-2 bg-muted/30 rounded whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                              {event.outputSummary}
                            </div>
                          )}
                        </div>
                      )}
                      {renderAdditionalDetails(event)}
                    </div>
                  </details>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        {historyEvents && historyEvents.length > 0 && !isImporting &&(
          <CardFooter>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Limpiar Todo el Historial
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de que deseas limpiar todo el historial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán permanentemente todos los eventos del historial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory}>Sí, Limpiar Historial</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        )}
      </Card>

      <AlertDialog open={showImportConfirmDialog} onOpenChange={setShowImportConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importación de Historial</AlertDialogTitle>
            <AlertDialogDescription>
              Ha seleccionado un archivo para importar ({eventsToImport.length} evento(s)). ¿Cómo desea importar estos eventos?
              Al reemplazar, se eliminará permanentemente el historial actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
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

      {eventToDelete && (
         <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este evento del historial?</AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de eliminar el evento: <br />
                <span className="font-semibold">{eventToDelete.module} - {eventToDelete.action}</span> <br />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(eventToDelete.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: es })}
                </span>
                <br />
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEventToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEvent} className={buttonVariants({ variant: "destructive" })}>
                Sí, Eliminar Evento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
