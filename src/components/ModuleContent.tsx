import { FileText } from 'lucide-react';

interface ModuleContentProps {
  moduleId: string;
}

function formatModuleTitle(moduleId: string) {
  return moduleId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ModuleContent({ moduleId }: ModuleContentProps) {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center">
        <FileText className="mx-auto mb-4 text-gray-400" size={64} />
        <h3 className="mb-2 text-xl font-semibold text-gray-900">{formatModuleTitle(moduleId)}</h3>
        <p className="text-gray-600">This module is under development.</p>
      </div>
    </div>
  );
}
