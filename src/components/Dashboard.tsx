'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Trophy,
    BookOpen,
    Play,
    LogOut,
    Target,
    TrendingUp,
    Calendar,
    Award,
    CheckCircle,
    XCircle,
    Trash2,
    UserX,
    AlertTriangle
} from 'lucide-react';

interface UserProfile {
    id: string;
    username: string;
    total_score: number;
    updated_at: string;
}

interface LevelStats {
    [key: string]: {
        learned: number;
        total: number;
    };
}

interface WordProgress {
    word_id: number;
    weight: number;
    correct_streak: number;
    last_reviewed_at: string;
    words: {
        word: string;
        level: string;
    };
}

interface RecentAttempt {
    word_id: number;
    attempted_at: string;
    words: {
        word: string;
        level: string;
    };
}

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [levelStats, setLevelStats] = useState<LevelStats>({});
    const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
    const [progressStats, setProgressStats] = useState<WordProgress[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // State untuk modal konfirmasi
    const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                // Fetch progress stats after setting user
                fetchProgressStats(parsedUser.id);
            } catch (error) {
                console.error('Error parsing user data:', error);
                // Redirect to home if invalid user data
                router.push('/');
            }
        } else {
            // Redirect to home if no user data
            router.push('/');
        }
        setIsLoading(false);
    }, [router]);

    // Function to fetch word progress statistics
    const fetchProgressStats = async (userId: string) => {
        setIsLoadingStats(true);
        try {
            const response = await fetch(`/api/word-progress?user_id=${userId}`);
            const data = await response.json();

            if (data.success) {
                setProgressStats(data.progress_stats || []);
                setRecentAttempts(data.recent_attempts || []);
                setLevelStats(data.level_stats || {});
            } else {
                console.error('Failed to fetch progress stats:', data.error);
            }
        } catch (error) {
            console.error('Error fetching progress stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push('/');
    };

    const handleStartGame = () => {
        router.push('/game');
    };

    // Fungsi untuk hapus data learning progress
    const handleDeleteData = async () => {
        if (!user) return;

        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/delete-data', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: user.id })
            });

            const data = await response.json();
            if (data.success) {
                // Reset data lokal
                setLevelStats({});
                setRecentAttempts([]);
                setProgressStats([]);
                setShowDeleteDataModal(false);

                // Refresh data
                fetchProgressStats(user.id);
                alert('Learning data has been deleted successfully!');
            } else {
                alert('Failed to delete data: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('Failed to delete data. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Fungsi untuk hapus akun
    const handleDeleteAccount = async () => {
        if (!user) return;

        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/delete-account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: user.id })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.removeItem('user');
                alert('Account has been deleted successfully!');
                router.push('/');
            } else {
                alert('Failed to delete account: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper function to format relative time
    const getRelativeTime = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
            {/* Header */}
            <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">                        <div className="flex items-center space-x-2 sm:space-x-3">
                        <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                        <h1 className="text-lg sm:text-2xl font-bold text-white">
                            <span className="hidden sm:inline">Oxford 5000 Vocab</span>
                            <span className="sm:hidden">Oxford Vocab</span>
                        </h1>
                    </div><div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="flex items-center space-x-2 text-white">
                                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="font-medium text-sm sm:text-base">{user.username}</span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                            >
                                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {user.username}!
                    </h2>
                    <p className="text-blue-200">
                        Ready to continue your vocabulary learning journey?
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Total Score */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Trophy className="h-6 w-6 text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Total Score</h3>
                        </div>
                        <div className="text-3xl font-bold text-yellow-400 mb-2">
                            {user.total_score}
                        </div>
                        <p className="text-blue-200 text-sm">Points earned</p>
                    </div>

                    {/* Vocabulary Level */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Level</h3>
                        </div>
                        <div className="text-3xl font-bold text-green-400 mb-2">
                            {Math.floor(user.total_score / 10) + 1}
                        </div>
                        <p className="text-blue-200 text-sm">Current level</p>
                    </div>

                    {/* Progress */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Target className="h-6 w-6 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Progress</h3>
                        </div>
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                            {user.total_score % 10}/10
                        </div>
                        <p className="text-blue-200 text-sm">To next level</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Start Learning */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                <Play className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Continue Learning</h3>
                                <p className="text-blue-200">Practice Oxford 5000 vocabulary</p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartGame}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                        >
                            Start Learning
                        </button>
                    </div>                    {/* Level Statistics */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
                                <Award className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Learning Progress by Level</h3>
                                <p className="text-blue-200">Your vocabulary mastery</p>
                            </div>
                        </div>
                        {isLoadingStats ? (
                            <div className="text-center py-4">
                                <div className="text-blue-200">Loading statistics...</div>
                            </div>
                        ) : (<div className="space-y-3">
                            {Object.keys(levelStats).sort((a, b) => {
                                const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'];
                                return levelOrder.indexOf(a) - levelOrder.indexOf(b);
                            }).map(level => {
                                const stats = levelStats[level];
                                const percentage = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
                                return (<div key={level} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <span className="text-white font-medium text-sm w-8">{level}</span>
                                        <div className="flex-1 max-w-md bg-gray-700 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="text-sm ml-4">
                                        <span className="text-white font-medium">{percentage}%</span>
                                        <span className="text-blue-200 ml-1">({stats.learned}/{stats.total})</span>
                                    </div>
                                </div>
                                );
                            })}
                            {Object.keys(levelStats).length === 0 && (
                                <div className="text-center py-2">
                                    <span className="text-blue-200 text-sm">No learning data yet. Start learning to see your progress!</span>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>                {/* Recent Activity */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Calendar className="h-6 w-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Recent Words</h3>
                    </div>

                    {isLoadingStats ? (
                        <div className="text-center py-8">
                            <div className="text-blue-200">Loading recent activity...</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Recently Learned Words */}
                            <div>                                <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center space-x-2">
                                <CheckCircle className="h-5 w-5" />
                                <span>Recently Learned</span>
                                <span className="text-xs text-green-300 font-normal">(Latest first)</span>
                            </h4><div className="space-y-2 max-h-48 overflow-y-auto">
                                    {progressStats
                                        .filter(word => word.weight < 10 && word.correct_streak > 0)
                                        .sort((a, b) => new Date(b.last_reviewed_at).getTime() - new Date(a.last_reviewed_at).getTime())
                                        .slice(0, 5)
                                        .map((word, index) => (
                                            <div key={index} className="flex items-center justify-between py-2 px-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                                <div>
                                                    <span className="text-white font-medium">{word.words.word}</span>
                                                    <span className="text-green-400 text-sm ml-2">({word.words.level.toUpperCase()})</span>                                                    <div className="text-xs text-green-300 mt-1">
                                                        {getRelativeTime(word.last_reviewed_at)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-green-300 text-right">
                                                    <div>{word.correct_streak} streak</div>
                                                    <div className="text-green-400">Weight: {word.weight}</div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {progressStats.filter(word => word.weight < 10 && word.correct_streak > 0).length === 0 && (
                                        <div className="text-center py-4">
                                            <span className="text-blue-200 text-sm">No learned words yet</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Words That Need Practice */}
                            <div>                                <h4 className="text-lg font-semibold text-orange-400 mb-3 flex items-center space-x-2">
                                <XCircle className="h-5 w-5" />
                                <span>Need Practice</span>
                                <span className="text-xs text-orange-300 font-normal">(Recent mistakes)</span>
                            </h4><div className="space-y-2 max-h-48 overflow-y-auto">
                                    {progressStats
                                        .filter(word => word.weight >= 15)
                                        .sort((a, b) => new Date(b.last_reviewed_at).getTime() - new Date(a.last_reviewed_at).getTime())
                                        .slice(0, 5)
                                        .map((word, index) => (
                                            <div key={index} className="flex items-center justify-between py-2 px-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                                <div>
                                                    <span className="text-white font-medium">{word.words.word}</span>
                                                    <span className="text-orange-400 text-sm ml-2">({word.words.level.toUpperCase()})</span>                                                    <div className="text-xs text-orange-300 mt-1">
                                                        {getRelativeTime(word.last_reviewed_at)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-orange-300 text-right">
                                                    <div className="text-orange-400 font-medium">Weight: {word.weight}</div>
                                                    <div>{word.correct_streak} correct</div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {progressStats.filter(word => word.weight >= 15).length === 0 && (
                                        <div className="text-center py-4">
                                            <span className="text-blue-200 text-sm">Great! No difficult words</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Attempts Summary */}
                    {!isLoadingStats && recentAttempts.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h4 className="text-lg font-semibold text-blue-400 mb-3">Recent Activity</h4>
                            <div className="text-sm text-blue-200">
                                Last practice: {recentAttempts.length > 0 ? new Date(recentAttempts[0].attempted_at).toLocaleDateString() : 'Never'}
                            </div>
                        </div>
                    )}

                    {!isLoadingStats && recentAttempts.length === 0 && progressStats.length === 0 && (
                        <div className="text-center py-8">
                            <BookOpen className="h-12 w-12 text-blue-400 mx-auto mb-4 opacity-50" />
                            <p className="text-blue-200">No recent activity yet.</p>
                            <p className="text-blue-300 text-sm mt-2">Start learning to see your progress here!</p>
                        </div>
                    )}                </div>

                {/* Account Management Panel */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 mt-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 sm:p-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg">
                            <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-semibold text-white">Account Management</h3>
                            <p className="text-blue-200 text-sm">Manage your data and account settings</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <button
                            onClick={() => setShowDeleteDataModal(true)}
                            className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm sm:text-base font-medium"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Learning Data</span>
                        </button>

                        <button
                            onClick={() => setShowDeleteAccountModal(true)}
                            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base font-medium"
                        >
                            <UserX className="h-4 w-4" />
                            <span>Delete Account</span>
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs sm:text-sm text-yellow-200">
                                <p className="font-medium mb-1">Warning:</p>
                                <p>These actions are permanent and cannot be undone. Please be sure before proceeding.</p>
                            </div>
                        </div>                    </div>
                </div>
            </main>

            {/* Modal Konfirmasi Hapus Data */}
            {showDeleteDataModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <div className="text-center">
                            <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Learning Data</h3>
                            <p className="text-gray-600 mb-6">
                                This will permanently delete all your learning progress, scores, and word history.
                                Your account will remain active but all progress data will be lost.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteDataModal(false)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteData}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus Akun */}
            {showDeleteAccountModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <div className="text-center">
                            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <UserX className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Account</h3>
                            <p className="text-gray-600 mb-6">
                                This will permanently delete your account and all associated data.
                                This action cannot be undone and you will be logged out immediately.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteAccountModal(false)}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
