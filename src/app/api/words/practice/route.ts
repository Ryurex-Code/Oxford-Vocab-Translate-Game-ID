import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const count = parseInt(searchParams.get('count') || '20');
        const levels = searchParams.getAll('levels');

        if (!userId) {
            return NextResponse.json({ 
                success: false, 
                error: 'User ID is required for practice mode' 
            }, { status: 400 });
        }

        console.log('🎯 Practice Mode API - Fetching difficult words for user:', userId);

        // Get user's word progress for words that need practice (weight >= 15)
        const progressQuery = supabase
            .from('user_word_progress')
            .select(`
                user_id,
                word_id,
                weight,
                correct_streak,
                last_reviewed_at,
                words (
                    id,
                    word,
                    word_class,
                    level,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .gte('weight', 15)
            .order('weight', { ascending: false })
            .limit(count);

        const { data: highPriorityWords, error: highPriorityError } = await progressQuery;

        if (highPriorityError) {
            console.error('Error fetching high priority words:', highPriorityError);
        }

        let allPracticeWords = highPriorityWords || [];

        // If we don't have enough high priority words, get medium priority (weight 10-14)
        if (allPracticeWords.length < count) {
            const remainingCount = count - allPracticeWords.length;
            
            const mediumProgressQuery = supabase
                .from('user_word_progress')
                .select(`
                    user_id,
                    word_id,
                    weight,
                    correct_streak,
                    last_reviewed_at,
                    words (
                        id,
                        word,
                        word_class,
                        level,
                        created_at
                    )
                `)
                .eq('user_id', userId)
                .gte('weight', 10)
                .lt('weight', 15)
                .order('weight', { ascending: false })
                .limit(remainingCount);

            const { data: mediumPriorityWords, error: mediumPriorityError } = await mediumProgressQuery;
            
            if (!mediumPriorityError && mediumPriorityWords) {
                allPracticeWords = [...allPracticeWords, ...mediumPriorityWords];
            }
        }

        // Filter out words that don't have word data (broken references)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validWords = allPracticeWords.filter((item: any) => item.words && !Array.isArray(item.words));

        // Apply level filtering if specified
        let filteredWords = validWords;
        if (levels.length > 0 && !levels.includes('all')) {
            const levelsLower = levels.map(l => l.toLowerCase());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filteredWords = validWords.filter((item: any) => 
                levelsLower.includes(item.words.level.toLowerCase())
            );
        }

        // Transform to expected format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const words = filteredWords.map((item: any) => ({
            id: item.words.id,
            word: item.words.word,
            word_class: item.words.word_class,
            level: item.words.level,
            created_at: item.words.created_at,
            current_weight: item.weight,
            correct_streak: item.correct_streak
        }));

        // Shuffle the words
        const shuffledWords = words.sort(() => 0.5 - Math.random());

        console.log(`✅ Practice Mode: Found ${shuffledWords.length} words for practice`);
        if (shuffledWords.length > 0) {
            console.log('Sample words:', shuffledWords.slice(0, 3).map(w => ({ 
                word: w.word, 
                weight: w.current_weight 
            })));
        }

        return NextResponse.json({ 
            success: true, 
            words: shuffledWords,
            total_found: shuffledWords.length,
            practice_type: shuffledWords.length > 0 ? 'difficult_words' : 'no_practice_needed',
            high_priority_count: (highPriorityWords || []).length,
            message: shuffledWords.length === 0 ? 'You haven\'t any mistakes' : undefined
        });

    } catch (error) {
        console.error('Error in practice words API:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
