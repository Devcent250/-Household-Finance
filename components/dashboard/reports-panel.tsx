import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const reports = [
  'Monthly spending summary',
  'Category breakdown report',
  'Income vs expenses overview',
  'Savings trend report',
];

export default function ReportsPanel() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Review household financial activity with clear, easy-to-read reports.
        </p>
        <ul className="space-y-2">
          {reports.map((report) => (
            <li key={report} className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {report}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
