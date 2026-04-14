import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, FinancialGoal } from '@/lib/types';

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
      `SELECT * FROM financial_goals WHERE user_id = $1 ORDER BY deadline ASC`,
      [userId]
    );

    return NextResponse.json<ApiResponse<FinancialGoal[]>>(
      { success: true, data: result.rows as FinancialGoal[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { name, target_amount, deadline, category, priority, current_amount } = body;

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    if (!name || !target_amount) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO financial_goals (user_id, name, target_amount, current_amount, deadline, category, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, name, target_amount, current_amount || 0, deadline, category, priority || 'medium']
    );

    return NextResponse.json<ApiResponse<FinancialGoal>>(
      { success: true, data: result.rows[0] as FinancialGoal, message: 'Goal created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
