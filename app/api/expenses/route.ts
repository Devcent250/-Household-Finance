import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, Expense } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const categoryId = searchParams.get('categoryId');

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    let query = 'SELECT * FROM expenses WHERE user_id = $1';
    const params: any[] = [userId];

    if (month && year) {
      query += ` AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $${params.length + 1}::date)`;
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
    }

    if (categoryId) {
      query += ` AND category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    query += ' ORDER BY date DESC';

    const result = await db.query(query, params);
    return NextResponse.json<ApiResponse<Expense[]>>(
      { success: true, data: result.rows as Expense[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { category_id, amount, description, date, payment_method, notes } = body;

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    if (!amount || !category_id || !date) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO expenses (user_id, category_id, amount, description, date, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, category_id, amount, description, date, payment_method, notes]
    );

    return NextResponse.json<ApiResponse<Expense>>(
      { success: true, data: result.rows[0] as Expense, message: 'Expense created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
