'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface AnalyticsProps {
  userId: string;
}

interface ChartData {
  name: string;
  value: number;
  amount?: number;
}

export default function Analytics({ userId }: AnalyticsProps) {
  const [expensesByCategory, setExpensesByCategory] = useState<ChartData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#235347', '#8eb69b', '#51a883', '#3a8373', '#1f6b5e'];

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const expensesRes = await fetch(`/api/expenses?month=${month}&year=${year}`, {
        headers: { 'x-user-id': userId },
      });
      const expensesData = await expensesRes.json();

      // Group expenses by category
      const categoryMap = new Map<string, number>();
      expensesData.data?.forEach((expense: any) => {
        const category = expense.category_id.toString();
        categoryMap.set(category, (categoryMap.get(category) || 0) + parseFloat(expense.amount));
      });

      const categoryChartData = Array.from(categoryMap, ([name, value]) => ({
        name: `Category ${name}`,
        value: Math.round(value * 100) / 100,
      }));

      setExpensesByCategory(categoryChartData);

      // Mock monthly trend data
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        monthlyData.push({
          name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          amount: Math.floor(Math.random() * 3000) + 500,
        });
      }
      setMonthlyTrend(monthlyData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No expense data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(163, 25%, 85%)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#235347"
                  strokeWidth={2}
                  dot={{ fill: '#235347', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Monthly Spending"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Spending Summary */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Spending Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Total This Month</div>
              <div className="text-2xl font-bold text-foreground mt-2">
                ${expensesByCategory.reduce((sum, cat) => sum + cat.value, 0).toFixed(2)}
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Average Daily</div>
              <div className="text-2xl font-bold text-foreground mt-2">
                ${(expensesByCategory.reduce((sum, cat) => sum + cat.value, 0) / 30).toFixed(2)}
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Categories Tracked</div>
              <div className="text-2xl font-bold text-foreground mt-2">
                {expensesByCategory.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
