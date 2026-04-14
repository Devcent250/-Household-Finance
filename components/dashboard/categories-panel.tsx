import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categories = ['Food', 'Transport', 'Rent', 'Utilities', 'Education', 'Health', 'Savings'];

export default function CategoriesPanel() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Expense Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Organize household spending into clear categories for easier tracking and reporting.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category} variant="outline" className="border-border px-3 py-1 text-sm">
              {category}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
