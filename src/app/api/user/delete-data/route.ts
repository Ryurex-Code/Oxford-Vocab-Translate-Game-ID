import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json({
                success: false,
                error: 'Missing user_id parameter'
            }, { status: 400 });
        }

        // Delete user's word progress
        const { error: progressError } = await supabase
            .from('user_word_progress')
            .delete()
            .eq('user_id', user_id);

        if (progressError) {
            console.error('Error deleting word progress:', progressError);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete word progress'
            }, { status: 500 });
        }

        // Delete user's word attempts
        const { error: attemptsError } = await supabase
            .from('word_attempts')
            .delete()
            .eq('user_id', user_id);

        if (attemptsError) {
            console.error('Error deleting word attempts:', attemptsError);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete word attempts'
            }, { status: 500 });
        }

        // Reset user's total score
        const { error: userError } = await supabase
            .from('profiles')
            .update({ total_score: 0 })
            .eq('id', user_id);

        if (userError) {
            console.error('Error resetting user score:', userError);
            return NextResponse.json({
                success: false,
                error: 'Failed to reset user score'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'User learning data deleted successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
