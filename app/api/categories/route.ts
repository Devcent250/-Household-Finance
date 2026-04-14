import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { ApiResponse, Category } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    let query = 'SELECT * FROM categories WHERE user_id = $1';
    const params: any[] = [userId];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const result = await db.query(query, params);
    return NextResponse.json<ApiResponse<Category[]>>(
      { success: true, data: result.rows as Category[] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { name, icon, color, type } = body;

    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    if (!name || !type) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['expense', 'income'].includes(type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid category type' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO categories (user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, icon || 'tag', color || '#10b981', type]
    );

    return NextResponse.json<ApiResponse<Category>>(
      { success: true, data: result.rows[0] as Category, message: 'Category created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Category already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
