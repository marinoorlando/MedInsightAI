
"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { db, clearHistory, type HistoryEvent } from '@/lib/db';
import { History, Trash2, ListChecks, FileText, Brain, ScanSearch, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

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

  const handleClearHistory = async () => {
    await clearHistory();
    toast({
      title: "Historial Limpiado",
      description: "Se han eliminado todos los eventos del historial.",
    });
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <History className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-xl">Historial de Actividad</CardTitle>
        </div>
        <CardDescription>
          Registro de las acciones y análisis realizados en la plataforma.
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
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {historyEvents && historyEvents.length > 0 && (
        <CardFooter>
          <Button variant="outline" onClick={handleClearHistory} className="w-full">
            <Trash2 className="mr-2 h-4 w-4" /> Limpiar Historial
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
