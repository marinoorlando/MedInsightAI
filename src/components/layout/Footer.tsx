export function Footer() {
  return (
    <footer className="bg-card text-center p-6 mt-auto border-t">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} MedInsight AI. Todos los derechos reservados.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        Descargo de Responsabilidad: MedInsight AI es una herramienta de apoyo y experimentación.
        La información proporcionada es solo con fines informativos y de investigación.
        No sustituye el juicio clínico, diagnóstico, ni la consulta con un profesional de la salud calificado.
        Utilice esta herramienta de manera responsable.
      </p>
    </footer>
  );
}
