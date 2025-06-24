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
        }

        // Delete user's word attempts
        const { error: attemptsError } = await supabase
            .from('word_attempts')
            .delete()
            .eq('user_id', user_id);

        if (attemptsError) {
            console.error('Error deleting word attempts:', attemptsError);
        }

        // Delete user profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user_id);

        if (profileError) {
            console.error('Error deleting profile:', profileError);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete user profile'
            }, { status: 500 });
        }

        // Delete from auth.users (this will cascade delete related data)
        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

        if (authError) {
            console.error('Error deleting auth user:', authError);
            return NextResponse.json({
                success: false,
                error: 'Failed to delete user account'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'User account deleted successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
