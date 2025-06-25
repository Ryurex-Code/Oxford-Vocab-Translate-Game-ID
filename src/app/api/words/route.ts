import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '1');
    const levels = searchParams.getAll('levels'); // Get selected levels    // First, get the total count of words (with level filter)
    let countQuery = supabase.from('words').select('*', { count: 'exact' });
    
    if (levels.length > 0) {
      // Use 'or' queries for multiple levels
      const levelConditions = levels.map(level => `level.eq.${level}`).join(',');
      countQuery = countQuery.or(levelConditions);
    }
    
    const { count: totalWords, error: countError } = await countQuery;

    if (countError) {
      console.error('Supabase count error:', countError);
      return NextResponse.json({
        success: false,
        error: 'Failed to count words in database'
      }, { status: 500 });
    }

    if (!totalWords || totalWords === 0) {
      return NextResponse.json({
        success: false,
        error: 'No words found in database for selected levels'
      }, { status: 404 });
    }    // Generate random words using a simpler approach with level filtering
    let wordsQuery = supabase
      .from('words')
      .select('*');
    
    if (levels.length > 0) {
      const levelConditions = levels.map(level => `level.eq.${level}`).join(',');
      wordsQuery = wordsQuery.or(levelConditions);
    }
    
    // Get all words from the database (no artificial limit)
    // We'll shuffle and select from the full dataset for true randomness
    const { data: wordsPool, error: poolError } = await wordsQuery;

    if (poolError) {
      console.error('Supabase pool error:', poolError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch words pool'
      }, { status: 500 });
    }

    if (!wordsPool || wordsPool.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No words found for selected levels'
      }, { status: 404 });
    }

    // Randomly select from the pool
    const shuffled = wordsPool.sort(() => 0.5 - Math.random());
    const randomWords = shuffled.slice(0, Math.min(count, wordsPool.length));

    return NextResponse.json({
      success: true,
      words: randomWords,
      total: totalWords
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
