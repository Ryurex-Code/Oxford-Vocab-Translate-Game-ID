import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, word_id, is_correct } = body;

        if (!user_id || !word_id || typeof is_correct !== 'boolean') {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: user_id, word_id, is_correct'
            }, { status: 400 });
        }

        // Record the attempt
        const { error: attemptError } = await supabase
            .from('word_attempts')
            .insert({
                user_id,
                word_id,
                attempted_at: new Date().toISOString()
            });

        if (attemptError) {
            console.error('Error recording attempt:', attemptError);
            return NextResponse.json({
                success: false,
                error: 'Failed to record attempt'
            }, { status: 500 });
        }        // Get current progress or create new one
        const { data: progress, error: progressError } = await supabase
            .from('user_word_progress')
            .select('*')
            .eq('user_id', user_id)
            .eq('word_id', word_id)
            .single();

        if (progressError && progressError.code !== 'PGRST116') {
            console.error('Error fetching progress:', progressError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch progress'
            }, { status: 500 });
        }

        let newWeight: number;
        let newStreak: number;

        if (!progress) {
            // Create new progress entry
            newWeight = is_correct ? 8 : 15; // Start with 8 if correct, 15 if incorrect
            newStreak = is_correct ? 1 : 0;

            const { error: insertError } = await supabase
                .from('user_word_progress')
                .insert({
                    user_id,
                    word_id,
                    weight: newWeight,
                    correct_streak: newStreak,
                    last_reviewed_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Error creating progress:', insertError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to create progress'
                }, { status: 500 });
            }
        } else {
            // Update existing progress
            if (is_correct) {
                newStreak = progress.correct_streak + 1;
                // Reduce weight when correct (minimum 1)
                newWeight = Math.max(1, progress.weight - 2);
            } else {
                newStreak = 0; // Reset streak on incorrect
                // Increase weight when incorrect (maximum 50)
                newWeight = Math.min(50, progress.weight + 5);
            }

            const { error: updateError } = await supabase
                .from('user_word_progress')
                .update({
                    weight: newWeight,
                    correct_streak: newStreak,
                    last_reviewed_at: new Date().toISOString()
                })
                .eq('user_id', user_id)
                .eq('word_id', word_id);

            if (updateError) {
                console.error('Error updating progress:', updateError);
                return NextResponse.json({
                    success: false,
                    error: 'Failed to update progress'
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            weight: newWeight,
            correct_streak: newStreak
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({
                success: false,
                error: 'Missing user_id parameter'
            }, { status: 400 });
        }

        // Get user's word progress statistics
        const { data: progressStats, error: statsError } = await supabase
            .from('user_word_progress')
            .select(`
        word_id,
        weight,
        correct_streak,
        last_reviewed_at,
        words (word, level)
      `)
            .eq('user_id', user_id);

        if (statsError) {
            console.error('Error fetching progress stats:', statsError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch progress stats'
            }, { status: 500 });
        }

        // Get recent attempts
        const { data: recentAttempts, error: attemptsError } = await supabase
            .from('word_attempts')
            .select(`
        word_id,
        attempted_at,
        words (word, level)
      `)
            .eq('user_id', user_id)
            .order('attempted_at', { ascending: false })
            .limit(10);

        if (attemptsError) {
            console.error('Error fetching recent attempts:', attemptsError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch recent attempts'
            }, { status: 500 });
        }        // Calculate level statistics
        const levelStats: { [key: string]: { learned: number; total: number } } = {};        // Get total words per level - use count to avoid large data transfer
        const levels = ['a1', 'a2', 'b1', 'b2', 'c1'];

        for (const level of levels) {
            const { count, error: countError } = await supabase
                .from('words')
                .select('*', { count: 'exact' })
                .eq('level', level);

            if (countError) {
                console.error(`Error counting ${level} words:`, countError);
            } else if (count !== null) {
                levelStats[level.toUpperCase()] = { learned: 0, total: count };
            }
        }

        // Count learned words per level (words that user has studied and answered correctly)
        if (progressStats) {
            progressStats.forEach(progress => {
                // Check if the progress has words data and user has answered correctly at least once
                if (progress.words && progress.correct_streak > 0) {
                    // progress.words is an array due to the join query
                    const wordData = Array.isArray(progress.words)
                        ? progress.words[0] as { word: string; level: string }
                        : progress.words as { word: string; level: string }; const level = wordData?.level?.toUpperCase();
                    if (level && level.trim() !== '' && levelStats[level]) {
                        levelStats[level].learned++;
                    }
                }
            });
        }

        return NextResponse.json({
            success: true,
            progress_stats: progressStats || [],
            recent_attempts: recentAttempts || [],
            level_stats: levelStats
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
