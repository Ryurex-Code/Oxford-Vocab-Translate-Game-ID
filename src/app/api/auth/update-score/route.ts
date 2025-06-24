import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, scoreIncrement } = body;

    // Validate input
    if (!userId || scoreIncrement === undefined) {
      return NextResponse.json({
        success: false,
        error: 'User ID and score increment are required'
      }, { status: 400 });
    }

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabase
      .from('profiles')
      .select('total_score')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Calculate new score
    const newScore = (currentUser.total_score || 0) + scoreIncrement;

    // Update user score
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({
        total_score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Score update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update score'
      }, { status: 500 });
    }

    // Return updated user data (excluding password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Score updated successfully'
    });

  } catch (error) {
    console.error('Score update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
