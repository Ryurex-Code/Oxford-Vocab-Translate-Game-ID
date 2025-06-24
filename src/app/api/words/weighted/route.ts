import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const count = parseInt(searchParams.get('count') || '1');
    const levels = searchParams.getAll('levels'); // Get selected levels
    
    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing user_id parameter'
      }, { status: 400 });
    }

    // Get words with user's progress using pagination to avoid 1000 row limit
    const allWordsWithProgress: Array<{
      id: number;
      word: string;
      word_class: string;
      level: string;
      created_at: string;
      user_word_progress?: Array<{
        weight: number;
        correct_streak: number;
        last_reviewed_at: string;
      }>;
    }> = [];
    let start = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('words')
        .select(`
          *,
          user_word_progress!left (
            weight,
            correct_streak,
            last_reviewed_at
          )
        `)
        .eq('user_word_progress.user_id', user_id)
        .range(start, start + batchSize - 1);

      // Add level filtering if specified
      if (levels.length > 0) {
        const levelConditions = levels.map(level => `level.eq.${level}`).join(',');
        query = query.or(levelConditions);
      }

      const { data: wordsWithProgress, error: wordsError } = await query;

      if (wordsError) {
        console.error('Supabase error:', wordsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch words from database'
        }, { status: 500 });
      }

      if (!wordsWithProgress || wordsWithProgress.length === 0) {
        hasMore = false;
      } else {
        allWordsWithProgress.push(...wordsWithProgress);
        start += batchSize;
        hasMore = wordsWithProgress.length === batchSize;
      }
    }

    if (allWordsWithProgress.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No words found in database'
      }, { status: 404 });
    }    // Create weighted selection pool
    const weightedWords: { 
      word: typeof allWordsWithProgress[0]; 
      weight: number 
    }[] = [];
    
    allWordsWithProgress.forEach((word) => {
      // Default weight for new words is 10
      let weight = 10;
      
      if (word.user_word_progress && word.user_word_progress.length > 0) {
        // Use user's specific weight for this word
        weight = word.user_word_progress[0].weight;
      }
      
      // Add multiple copies based on weight (higher weight = more likely to be selected)
      for (let i = 0; i < weight; i++) {
        weightedWords.push({ word, weight });
      }
    });

    // Select random words from weighted pool
    const selectedWords = [];
    const usedIds = new Set();

    for (let i = 0; i < count && selectedWords.length < count; i++) {
      if (weightedWords.length === 0) break;
      
      // Select random word from weighted pool
      const randomIndex = Math.floor(Math.random() * weightedWords.length);
      const selected = weightedWords[randomIndex];
      
      // Ensure we don't select the same word twice
      if (!usedIds.has(selected.word.id)) {
        usedIds.add(selected.word.id);
        selectedWords.push({
          ...selected.word,
          current_weight: selected.weight
        });
        
        // Remove all instances of this word from the pool to avoid duplicates
        for (let j = weightedWords.length - 1; j >= 0; j--) {
          if (weightedWords[j].word.id === selected.word.id) {
            weightedWords.splice(j, 1);
          }
        }
      }
    }    // If we don't have enough words, fall back to regular random selection
    if (selectedWords.length < count) {
      const remainingWords = allWordsWithProgress.filter((word) => !usedIds.has(word.id));
      const shuffled = remainingWords.sort(() => 0.5 - Math.random());
      const additional = shuffled.slice(0, count - selectedWords.length);
      
      additional.forEach((word) => {
        selectedWords.push({
          ...word,
          current_weight: word.user_word_progress?.[0]?.weight || 10
        });
      });
    }

    return NextResponse.json({
      success: true,
      words: selectedWords,
      total: allWordsWithProgress.length,
      weighted_pool_size: weightedWords.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
