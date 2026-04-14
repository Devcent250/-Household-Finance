import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, Budget } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const result = await db.query(
      `SELECT * FROM budgets WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json<ApiResponse<Budget[]>>(
      { success: true, data: result.rows as Budget[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { category_id, limit_amount, period, alert_threshold, period_start_date } = body;

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    if (!category_id || !limit_amount || !period) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly', 'weekly'].includes(period)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid period' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, category_id, limit_amount, period, alert_threshold || 80, period_start_date || new Date().toISOString().split('T')[0]]
    );

    return NextResponse.json<ApiResponse<Budget>>(
      { success: true, data: result.rows[0] as Budget, message: 'Budget created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}
