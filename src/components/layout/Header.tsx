import { BrainCircuit } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-semibold text-primary">
            MedInsight AI
          </h1>
        </div>
      </div>
    </header>
  );
}
