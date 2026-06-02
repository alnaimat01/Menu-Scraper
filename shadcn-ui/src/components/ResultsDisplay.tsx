import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProcessedMenuItem, ProcessedChoiceGroup } from '@/services/dataProcessor';

interface ResultsDisplayProps {
  menuItems: ProcessedMenuItem[];
  choiceGroups: ProcessedChoiceGroup[];
}

export function ResultsDisplay({ menuItems, choiceGroups }: ResultsDisplayProps) {
  if (menuItems.length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Scraping Results</CardTitle>
        <CardDescription className="text-slate-400">
          Preview of extracted menu data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            {menuItems.length} Menu Items
          </Badge>
          <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
            {new Set(choiceGroups.map(g => g.groupName)).size} Choice Groups
          </Badge>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div>
            <h4 className="text-sm font-semibold text-slate-100 mb-2">Sample Menu Items</h4>
            <div className="space-y-2">
              {menuItems.slice(0, 5).map((item, index) => (
                <div key={index} className="bg-slate-900 p-3 rounded-md border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.category} • {item.size}</p>
                    </div>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      ${item.price.toFixed(2)}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {menuItems.length > 5 && (
            <p className="text-xs text-slate-400 text-center">
              ... and {menuItems.length - 5} more items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}