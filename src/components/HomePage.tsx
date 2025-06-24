'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, User, Play, GraduationCap } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                if (parsedUser && parsedUser.username) {
                    // User is logged in, redirect to dashboard
                    router.push('/dashboard');
                    return;
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                // Clear invalid user data
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, [router]);

    const handleLogin = () => {
        router.push('/login');
    };

    const handlePlayAsGuest = () => {
        router.push('/game');
    };    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-6">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full shadow-lg">
                            <GraduationCap className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                        Oxford 5000
                    </h1>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-blue-200 mb-6">
                        Vocabulary Learning Platform
                    </h2>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        Master essential English vocabulary with our interactive learning system.
                        Practice translations, definitions, and context usage with AI-powered feedback.
                    </p>
                </div>

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-8 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 border border-blue-500 hover:border-blue-400"
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className="bg-blue-500 bg-opacity-20 p-4 rounded-full group-hover:bg-opacity-30 transition-all duration-300">
                                <User className="w-8 h-8 text-blue-200" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2">Login</h3>
                                <p className="text-blue-200 text-sm">
                                    Track your progress and compete with others
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Play as Guest Button */}
                    <button
                        onClick={handlePlayAsGuest}
                        className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-8 rounded-2xl shadow-2xl hover:shadow-green-500/25 transform hover:scale-105 transition-all duration-300 border border-green-500 hover:border-green-400"
                    >
                        <div className="flex flex-col items-center space-y-4">
                            <div className="bg-green-500 bg-opacity-20 p-4 rounded-full group-hover:bg-opacity-30 transition-all duration-300">
                                <Play className="w-8 h-8 text-green-200" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold mb-2">Play as Guest</h3>
                                <p className="text-green-200 text-sm">
                                    Start learning immediately without registration
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Features Section */}
                <div className="bg-gray-800 bg-opacity-50 rounded-2xl p-8 border border-gray-700">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">
                        Why Choose Oxford 5000?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">
                                Comprehensive Vocabulary
                            </h4>              <p className="text-gray-300 text-sm">
                                Learn from Oxford&apos;s most essential 5000 English words
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <GraduationCap className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">
                                AI-Powered Learning
                            </h4>
                            <p className="text-gray-300 text-sm">
                                Get intelligent feedback and personalized explanations
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">
                                Track Progress
                            </h4>
                            <p className="text-gray-300 text-sm">
                                Monitor your improvement and compete with friends
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
