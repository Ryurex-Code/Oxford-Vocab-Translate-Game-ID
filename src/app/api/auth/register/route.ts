import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 });
    }

    // Validate username format
    if (username.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Username must be at least 3 characters long'
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 6 characters long'
      }, { status: 400 });
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Username already exists'
      }, { status: 409 });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${username}@oxford-vocab.app`, // Convert username to email format
      password: password,
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('Auth registration error:', authError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create account'
      }, { status: 500 });
    }

    // Update the automatically created profile with username
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Clean up auth user if profile update fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to create profile'
      }, { status: 500 });
    }

    // Return user data (excluding password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedProfile;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
