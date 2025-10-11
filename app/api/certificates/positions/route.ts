import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

// Save position settings for a dancer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dancerId,
      dancerName,
      nameTop,
      nameFontSize,
      percentageTop,
      percentageLeft,
      percentageFontSize,
      styleTop,
      styleLeft,
      styleFontSize,
      titleTop,
      titleLeft,
      titleFontSize,
      medallionTop,
      medallionLeft,
      medallionFontSize,
      dateTop,
      dateLeft,
      dateFontSize
    } = body;

    if (!dancerId || !dancerName) {
      return NextResponse.json(
        { error: 'Dancer ID and name are required' },
        { status: 400 }
      );
    }

    const sqlClient = getSql();
    const id = `pos_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // Upsert position settings
    await sqlClient`
      INSERT INTO certificate_positions (
        id, dancer_id, dancer_name,
        name_top, name_font_size,
        percentage_top, percentage_left, percentage_font_size,
        style_top, style_left, style_font_size,
        title_top, title_left, title_font_size,
        medallion_top, medallion_left, medallion_font_size,
        date_top, date_left, date_font_size,
        created_at, updated_at
      ) VALUES (
        ${id}, ${dancerId}, ${dancerName},
        ${nameTop}, ${nameFontSize},
        ${percentageTop}, ${percentageLeft}, ${percentageFontSize},
        ${styleTop}, ${styleLeft}, ${styleFontSize},
        ${titleTop}, ${titleLeft}, ${titleFontSize},
        ${medallionTop}, ${medallionLeft}, ${medallionFontSize},
        ${dateTop}, ${dateLeft}, ${dateFontSize},
        ${now}, ${now}
      )
      ON CONFLICT (dancer_id) DO UPDATE SET
        dancer_name = ${dancerName},
        name_top = ${nameTop},
        name_font_size = ${nameFontSize},
        percentage_top = ${percentageTop},
        percentage_left = ${percentageLeft},
        percentage_font_size = ${percentageFontSize},
        style_top = ${styleTop},
        style_left = ${styleLeft},
        style_font_size = ${styleFontSize},
        title_top = ${titleTop},
        title_left = ${titleLeft},
        title_font_size = ${titleFontSize},
        medallion_top = ${medallionTop},
        medallion_left = ${medallionLeft},
        medallion_font_size = ${medallionFontSize},
        date_top = ${dateTop},
        date_left = ${dateLeft},
        date_font_size = ${dateFontSize},
        updated_at = ${now}
    `;

    return NextResponse.json({
      success: true,
      message: 'Position settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving position settings:', error);
    return NextResponse.json(
      { error: 'Failed to save position settings' },
      { status: 500 }
    );
  }
}

// Get position settings for a dancer
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dancerId = searchParams.get('dancerId');

    if (!dancerId) {
      return NextResponse.json(
        { error: 'Dancer ID is required' },
        { status: 400 }
      );
    }

    const sqlClient = getSql();
    const result = await sqlClient`
      SELECT * FROM certificate_positions WHERE dancer_id = ${dancerId}
    ` as any[];

    if (result.length === 0) {
      return NextResponse.json({ hasCustom: false, positions: null });
    }

    return NextResponse.json({
      hasCustom: true,
      positions: result[0]
    });

  } catch (error) {
    console.error('Error fetching position settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position settings' },
      { status: 500 }
    );
  }
}


