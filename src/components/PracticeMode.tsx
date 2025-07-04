'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Loader2,
    Target,
    BookOpen,
    Languages,
    AlertCircle,
    ArrowRight,
    HelpCircle,
    CheckCircle,
    XCircle,
    BookMarked,
    RotateCw,
    Trophy,
    User,
    LogOut,
    Home
} from 'lucide-react';

interface VocabularyQuestion {
    id: number;
    word: string;
    word_class: string;
    level: string;
    created_at: string;
    indonesianTranslation: string;
    definition: string;
}

interface UserProfile {
    id: number;
    username: string;
    total_score: number;
    updated_at: string;
}

export default function PracticeMode() {
    const router = useRouter();
    const hasInitialized = useRef(false);
    // State untuk user profile
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isGuest, setIsGuest] = useState(false);  // State untuk level selection
    const [selectedLevels, setSelectedLevels] = useState<string[]>(['all']);
    const [showLevelModal, setShowLevelModal] = useState(true);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [enableSentenceTranslation, setEnableSentenceTranslation] = useState(false); // Default false to save API usage

    // State untuk data kata dari Supabase
    const [vocabularyWords, setVocabularyWords] = useState<VocabularyQuestion[]>([]);
    const [isLoadingWords, setIsLoadingWords] = useState(true); const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    // Compute currentQuestion from vocabularyWords and currentQuestionIndex
    const currentQuestion = vocabularyWords.length > 0 ? vocabularyWords[currentQuestionIndex] : null;
    const [showAnswer, setShowAnswer] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false); // Prevent multiple submits
    const [translationInput, setTranslationInput] = useState('');
    const [contextInput, setContextInput] = useState('');
    const [generatedSentence, setGeneratedSentence] = useState<string>('');
    const [isLoadingSentence, setIsLoadingSentence] = useState(false);

    // State untuk LLM results
    const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
    const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
    const [task1Status, setTask1Status] = useState<'CORRECT' | 'WRONG' | ''>('');
    const [llmTranslations, setLlmTranslations] = useState<string>('');
    const [llmDefinition, setLlmDefinition] = useState<string>('');
    const [generatedTranslation, setGeneratedTranslation] = useState<string>('');
    const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
    const [isWordBeingRemoved, setIsWordBeingRemoved] = useState(false); // State for smooth transition  // Load vocabulary words when component mounts
    useEffect(() => {
        // Prevent double execution in development mode
        if (hasInitialized.current) {
            console.log('⚠️ Preventing duplicate execution');
            return;
        }

        hasInitialized.current = true;
        console.log('🎯 PracticeMode useEffect triggered');

        // Check user authentication first - Practice mode requires login
        const userData = localStorage.getItem('user');

        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setIsGuest(false);
            } catch (error) {
                console.error('Error parsing user data:', error);
                // Redirect to login if invalid user data
                router.push('/');
                return;
            }
        } else {
            // Practice mode requires login - redirect to home
            router.push('/');
            return;
        }// Don't fetch words immediately, wait for level selection
        setIsLoadingWords(false);
    }, [router]); // Include router dependency

    // Function to fetch words based on selected levels - Practice Mode uses difficult words
    const fetchWords = async (levels: string[]) => {
        console.log('📥 Fetching practice words for levels:', levels);
        setIsLoadingWords(true);
        try {
            // Practice mode always requires user authentication
            if (!user || isGuest) {
                console.error('Practice mode requires user authentication');
                setIsLoadingWords(false);
                return;
            }

            let url = `/api/words/practice?user_id=${user.id}&count=20`;

            // Add level filtering
            if (!levels.includes('all') && levels.length > 0) {
                const levelParams = levels.map(level => `levels=${level}`).join('&');
                url += `&${levelParams}`;
            }

            console.log('🌐 API Call:', url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.words.length > 0) {
                const wordsWithLLMFields = data.words.map((word: { id: number; word: string; word_class: string; level: string; created_at: string }) => ({
                    ...word,
                    indonesianTranslation: '',
                    definition: ''
                }));
                setVocabularyWords(wordsWithLLMFields);
            } else {
                // If no practice words available, set empty array to show "no mistakes" message
                setVocabularyWords([]);
            }
        } catch (error) {
            console.error('Error fetching practice words:', error);
            setVocabularyWords([]);
        } finally {
            setIsLoadingWords(false);
        }
    };

    // Function to update user score
    const updateUserScore = async (scoreIncrement: number) => {
        if (!user || isGuest) return;

        try {
            const response = await fetch('/api/auth/update-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    scoreIncrement
                }),
            });

            const data = await response.json();
            if (data.success) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (error) {
            console.error('Error updating score:', error);
        }
    };

    // Function to update word progress and handle real-time practice filtering
    const updateWordProgress = async (wordId: number, isCorrect: boolean) => {
        if (!user || isGuest) return null;

        try {
            const response = await fetch('/api/word-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id,
                    word_id: wordId,
                    is_correct: isCorrect
                }),
            });

            const data = await response.json();
            if (data.success) {
                console.log('Word progress updated:', { wordId, isCorrect, newWeight: data.weight, streak: data.correct_streak });

                // Return the new weight so we can decide if word should be removed from practice
                return {
                    weight: data.weight,
                    correct_streak: data.correct_streak
                };
            } else {
                console.error('Failed to update word progress:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Error updating word progress:', error);
            return null;
        }
    };

    // Function to handle logout
    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsGuest(true);
        router.push('/');
    };

    // Function to go back to home
    const handleGoHome = () => {
        router.push('/');
    };

    // Generate sentence using LLM - FIXED: Only call once per word
    const generateSentence = useCallback(async (word: string) => {
        if (!word) return; // Only check if word exists

        setIsLoadingSentence(true);
        try {
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateSentence',
                    word: word
                }),
            });

            const data = await response.json();
            if (data.success) {
                setGeneratedSentence(data.sentence);
            } else {
                setGeneratedSentence('Failed to generate sentence');
            }
        } catch (error) {
            console.error('Error generating sentence:', error);
            setGeneratedSentence('Failed to generate sentence');
        } finally {
            setIsLoadingSentence(false);
        }
    }, []); // Empty dependency to prevent function recreation

    // Get multiple translations from LLM - FIXED: Avoid updating currentQuestion
    const getMultipleTranslations = useCallback(async (word: string) => {
        if (!word) return; // Only check if word exists

        setIsLoadingTranslations(true);
        try {
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'getMultipleTranslations',
                    word: word
                }),
            });

            const data = await response.json();
            if (data.success) {
                setLlmTranslations(data.translations);
                // DON'T update currentQuestion here to avoid re-render loop
            }
        } catch (error) {
            console.error('Error getting translations:', error);
        } finally {
            setIsLoadingTranslations(false);
        }
    }, []); // Empty dependency to prevent function recreation

    // Generate definition using LLM - FIXED: Avoid updating currentQuestion
    const generateDefinition = useCallback(async (word: string) => {
        if (!word) return; // Only check if word exists

        setIsLoadingDefinition(true);
        try {
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generateDefinition',
                    word: word
                }),
            });

            const data = await response.json();
            if (data.success) {
                setLlmDefinition(data.definition);
                // DON'T update currentQuestion here to avoid re-render loop
            }
        } catch (error) {
            console.error('Error getting definition:', error);
        } finally {
            setIsLoadingDefinition(false);
        }
    }, []); // Empty dependency to prevent function recreation

    // Generate translation for English sentence using LLM
    const generateSentenceTranslation = useCallback(async (englishSentence: string) => {
        if (!englishSentence.trim()) return;

        setIsLoadingTranslation(true);
        try {
            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'translateSentence',
                    sentence: englishSentence
                }),
            });

            const data = await response.json();
            if (data.success) {
                setGeneratedTranslation(data.translation);
            } else {
                setGeneratedTranslation('Gagal menerjemahkan kalimat');
            }
        } catch (error) {
            console.error('Error translating sentence:', error);
            setGeneratedTranslation('Gagal menerjemahkan kalimat');
        } finally {
            setIsLoadingTranslation(false);
        }
    }, []);    // FIXED: Only trigger when currentQuestionIndex changes, not currentQuestion object
    useEffect(() => {
        if (currentQuestion) {
            console.log('🔄 Triggering API calls for word:', currentQuestion.word);      // Reset states first
            setGeneratedSentence('');
            setLlmTranslations('');
            setLlmDefinition('');
            setGeneratedTranslation('');
            setTask1Status('');
            setIsSubmitted(false); // Reset submit state when question changes

            // Always generate translation and definition for Task 1
            getMultipleTranslations(currentQuestion.word);
            generateDefinition(currentQuestion.word);

            // Only generate sentence if Task 2 is enabled
            if (enableSentenceTranslation) {
                generateSentence(currentQuestion.word);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestionIndex, vocabularyWords.length, enableSentenceTranslation]); // Add enableSentenceTranslation dependency

    // Generate translation when sentence changes (only if Task 2 is enabled)
    useEffect(() => {
        if (enableSentenceTranslation && generatedSentence && generatedSentence !== 'Failed to generate sentence') {
            generateSentenceTranslation(generatedSentence);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generatedSentence, enableSentenceTranslation]); // Add enableSentenceTranslation dependency

    // Function to calculate Levenshtein Distance
    const calculateLevenshteinDistance = (str1: string, str2: string): number => {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    };

    // Function to normalize text for comparison
    const normalizeText = (text: string): string => {
        return text.toLowerCase().trim().replace(/[.,!?;:"'()]/g, '');
    };

    // Function to evaluate Task 1 with real-time practice filtering
    const evaluateTask1 = async () => {
        const userAnswer = normalizeText(translationInput);
        const translationsToCheck = llmTranslations || currentQuestion?.indonesianTranslation;

        if (!translationsToCheck) {
            setTask1Status('WRONG');
            return;
        }

        const correctAnswers = translationsToCheck
            .split(/[;,/]/)
            .map((answer: string) => normalizeText(answer))
            .filter((answer: string) => answer.length > 0);

        let isTranslationFound = false;
        for (const answer of correctAnswers) {
            if (userAnswer === answer) {
                isTranslationFound = true;
                break;
            }

            const distance = calculateLevenshteinDistance(userAnswer, answer);
            const lengthDifference = Math.abs(userAnswer.length - answer.length);

            if (distance === 1 && lengthDifference <= 1 && userAnswer.length >= Math.max(3, answer.length - 1)) {
                isTranslationFound = true;
                break;
            }
        }

        setTask1Status(isTranslationFound ? 'CORRECT' : 'WRONG');

        // Update word progress and get the new weight
        let progressResult = null;
        if (!isGuest && user && currentQuestion) {
            progressResult = await updateWordProgress(currentQuestion.id, isTranslationFound);
        }

        // Update score if correct and user is logged in
        if (isTranslationFound && !isGuest && user) {
            updateUserScore(1);
        }

        // If word is correct and weight has dropped below practice threshold, remove it from practice list
        // Only remove if weight drops below 10 (no longer needs practice)
        if (isTranslationFound && progressResult && progressResult.weight < 10) {
            console.log(`Word "${currentQuestion?.word}" weight dropped to ${progressResult.weight}, removing from practice`);

            // Set transition state
            setIsWordBeingRemoved(true);

            // Add a short delay for smooth user experience
            setTimeout(async () => {
                // Immediately refresh practice word list to get current state from database
                try {
                    if (!user || isGuest) {
                        console.error('Practice mode requires user authentication');
                        return;
                    }

                    let url = `/api/words/practice?user_id=${user.id}&count=20`;

                    // Add level filtering
                    if (!selectedLevels.includes('all') && selectedLevels.length > 0) {
                        const levelParams = selectedLevels.map(level => `levels=${level}`).join('&');
                        url += `&${levelParams}`;
                    }

                    console.log('🔄 Word mastered! Refreshing practice list from API:', url);
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.success && data.words.length > 0) {
                        const refreshedWordsWithLLMFields = data.words.map((word: { id: number; word: string; word_class: string; level: string; created_at: string }) => ({
                            ...word,
                            indonesianTranslation: '',
                            definition: ''
                        }));

                        console.log(`✅ Found ${refreshedWordsWithLLMFields.length} remaining practice words`);
                        setVocabularyWords(refreshedWordsWithLLMFields);

                        // Start from the first word in the refreshed list
                        setCurrentQuestionIndex(0);

                        // Reset states for next question
                        setShowAnswer(false);
                        setIsSubmitted(false);
                        setTranslationInput('');
                        setContextInput('');
                        setTask1Status('');
                        setIsWordBeingRemoved(false);
                    } else {
                        // No more practice words available - show "no mistakes" message
                        console.log('🎉 No more practice words available - all words mastered!');
                        setVocabularyWords([]);
                        setIsWordBeingRemoved(false);
                    }
                } catch (error) {
                    console.error('Error refreshing practice words after mastery:', error);
                    // On error, also show "no mistakes" message
                    setVocabularyWords([]);
                    setIsWordBeingRemoved(false);
                }
            }, 1500); // 1.5 second delay to show the correct answer before moving
        } else if (isTranslationFound && progressResult) {
            // Word is correct but still needs practice (weight >= 10), just continue normally
            console.log(`Word "${currentQuestion?.word}" weight is now ${progressResult.weight}, still needs practice`);
        }
    };
    const handleAnswerSubmit = async () => {
        // Prevent multiple submits for the same question
        if (isSubmitted) {
            return;
        }

        setIsSubmitted(true);
        setShowAnswer(true);

        // Wait a bit for LLM data to load, then evaluate
        setTimeout(async () => {
            await evaluateTask1();
        }, 500);
    };
    const handleNextQuestion = async () => {
        // Always refresh practice words from database when clicking Next Word
        console.log('🔄 Next Word clicked - refreshing practice words from database...');

        try {
            // Practice mode always requires user authentication
            if (!user || isGuest) {
                console.error('Practice mode requires user authentication');
                return;
            }

            let url = `/api/words/practice?user_id=${user.id}&count=20`;

            // Add level filtering
            if (!selectedLevels.includes('all') && selectedLevels.length > 0) {
                const levelParams = selectedLevels.map(level => `levels=${level}`).join('&');
                url += `&${levelParams}`;
            }

            console.log('🌐 Refreshing practice words API Call:', url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.words.length > 0) {
                // Map the fresh words with LLM fields
                const refreshedWordsWithLLMFields = data.words.map((word: { id: number; word: string; word_class: string; level: string; created_at: string }) => ({
                    ...word,
                    indonesianTranslation: '',
                    definition: ''
                }));

                // Update vocabulary words with fresh data
                setVocabularyWords(refreshedWordsWithLLMFields);

                // Find next word to show - prioritize different word if possible
                let nextIndex = 0;

                // Try to find a different word than current one if multiple words available
                if (refreshedWordsWithLLMFields.length > 1 && currentQuestion) {
                    const differentWordIndex = refreshedWordsWithLLMFields.findIndex(
                        (word: VocabularyQuestion) => word.id !== currentQuestion.id
                    );
                    if (differentWordIndex !== -1) {
                        nextIndex = differentWordIndex;
                    }
                }

                // Reset all states for next question
                setCurrentQuestionIndex(nextIndex);
                setShowAnswer(false);
                setIsSubmitted(false);
                setTranslationInput('');
                setContextInput('');
                setTask1Status('');
                setIsWordBeingRemoved(false); // Reset removal state

                console.log(`✅ Found ${refreshedWordsWithLLMFields.length} practice words, showing word at index ${nextIndex}`);
                console.log('Words still needing practice:', refreshedWordsWithLLMFields.map((w: VocabularyQuestion) => ({
                    word: w.word,
                    id: w.id
                })));
            } else {
                // No more practice words available - show "no mistakes" message
                console.log('🎉 No more practice words available - all words mastered!');
                setVocabularyWords([]);
                setIsWordBeingRemoved(false);
            }
        } catch (error) {
            console.error('Error refreshing practice words:', error);
            // On error, also show "no mistakes" message
            setVocabularyWords([]);
            setIsWordBeingRemoved(false);
        }
    };  // Function to handle level selection
    const handleLevelChange = (level: string) => {
        if (level === 'all') {
            setSelectedLevels(['all']);
        } else {
            setSelectedLevels(prev => {
                // If 'all' is currently selected, replace it with the clicked level
                if (prev.includes('all')) {
                    return [level];
                }

                // Normal toggle logic for individual levels
                const newLevels = prev.filter(l => l !== 'all');
                if (newLevels.includes(level)) {
                    const filtered = newLevels.filter(l => l !== level);
                    // If no levels selected, default to 'all'
                    return filtered.length === 0 ? ['all'] : filtered;
                } else {
                    return [...newLevels, level];
                }
            });
        }
    };

    // Function to start game with selected levels
    const startGame = async () => {
        setShowLevelModal(false);
        setIsGameStarted(true);
        await fetchWords(selectedLevels);
    };

    // Function to get display text for selected levels
    const getSelectedLevelsText = () => {
        if (selectedLevels.includes('all')) {
            return 'All Levels';
        }
        return selectedLevels.map(level => level.toUpperCase()).join(', ');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 p-4 sm:p-6 lg:p-8">      {/* Level Selection Modal */}
            {showLevelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 rounded-2xl shadow-2xl border border-gray-600 p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto transform animate-scale-in">            {/* Header */}
                        <div className="text-center mb-6 sm:mb-8">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-gradient">
                                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Choose Your Level</h2>
                        </div>

                        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">              {/* All Levels Option */}
                            <div
                                onClick={() => handleLevelChange('all')}
                                className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ripple ${selectedLevels.includes('all')
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-400 shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedLevels.includes('all')
                                            ? 'border-white bg-white'
                                            : 'border-gray-400'
                                            }`}>
                                            {selectedLevels.includes('all') && (
                                                <CheckCircle className="w-3 h-3 text-blue-600" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">All Levels</h3>
                                            <p className="text-xs text-blue-200">A1 to C1</p>
                                        </div>
                                    </div>
                                    <div className="text-yellow-400 font-bold">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            {/* Individual Level Options */}
                            <div className="space-y-2 sm:space-y-3">
                                <p className="text-gray-400 text-xs sm:text-sm font-medium mb-2">Or select specific levels:</p>                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                    {[
                                        { level: 'a1', name: 'A1 - Beginner', desc: 'Basic everyday words', color: 'from-green-500 to-emerald-500' },
                                        { level: 'a2', name: 'A2 - Elementary', desc: 'Common expressions', color: 'from-lime-500 to-green-500' },
                                        { level: 'b1', name: 'B1 - Intermediate', desc: 'Academic vocabulary', color: 'from-yellow-500 to-orange-500' },
                                        { level: 'b2', name: 'B2 - Upper Intermediate', desc: 'Complex topics', color: 'from-orange-500 to-red-500' },
                                        { level: 'c1', name: 'C1 - Advanced', desc: 'Professional language', color: 'from-red-500 to-pink-500' }].map(({ level, name, desc, color }) => {
                                            return (<div
                                                key={level} onClick={() => {
                                                    handleLevelChange(level);
                                                }} className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] select-none ${selectedLevels.includes('all')
                                                    ? 'bg-gray-800 border-gray-700 opacity-50 pointer-events-auto'
                                                    : selectedLevels.includes(level)
                                                        ? `bg-gradient-to-r ${color} bg-opacity-20 border-blue-400 shadow-md`
                                                        : 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${selectedLevels.includes(level) && !selectedLevels.includes('all')
                                                            ? 'border-blue-400 bg-blue-500'
                                                            : 'border-gray-400'
                                                            }`}>
                                                            {selectedLevels.includes(level) && !selectedLevels.includes('all') && (
                                                                <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                                            )}
                                                        </div>                          <div className="flex-1">
                                                            <h4 className={`text-sm sm:text-base font-semibold ${selectedLevels.includes('all') ? 'text-gray-400' : 'text-white'
                                                                }`}>
                                                                {name}
                                                            </h4>
                                                            <p className={`text-xs ${selectedLevels.includes('all') ? 'text-gray-500' : 'text-gray-300'
                                                                }`}>
                                                                {desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Level indicator */}
                                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center ml-3 ${selectedLevels.includes('all') ? 'opacity-50' : ''
                                                        }`}>
                                                        <span className="text-white text-xs sm:text-sm font-bold">{level.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>

                        {/* Task 2 Option */}
                        <div className="border-t border-gray-600 pt-4 sm:pt-6">
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Sentence Translation Game</h3>
                                        <p className="text-xs sm:text-sm text-gray-300">Translate English sentences to Indonesian</p>
                                    </div>
                                    <button
                                        onClick={() => setEnableSentenceTranslation(!enableSentenceTranslation)}
                                        className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all duration-300 ${enableSentenceTranslation
                                            ? 'bg-blue-600 border-blue-500'
                                            : 'bg-gray-600 border-gray-500'
                                            } border-2`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full transition-transform duration-300 ${enableSentenceTranslation
                                            ? 'translate-x-6 sm:translate-x-7'
                                            : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startGame}
                            disabled={selectedLevels.length === 0 || (selectedLevels.length === 1 && selectedLevels[0] === '')}
                            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300 border border-blue-500 ripple animate-gradient"
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Start Practice Session</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-full mx-auto px-4 lg:px-8 xl:px-12 2xl:px-16">        {/* User Header */}
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <button
                        onClick={handleGoHome}
                        className="flex items-center space-x-1 sm:space-x-2 text-blue-300 hover:text-blue-200 transition-colors duration-200 text-sm sm:text-base"
                    >
                        <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Home</span>
                    </button>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Selected Levels Info */}
                        {isGameStarted && (
                            <div className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 bg-opacity-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-blue-500">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" />
                                <span className="text-blue-100 text-xs sm:text-sm font-medium">{getSelectedLevelsText()}</span>
                            </div>
                        )}

                        {user && !isGuest ? (
                            <>
                                <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-800 bg-opacity-50 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-600">
                                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                    <div className="text-xs sm:text-sm">
                                        <p className="text-white font-semibold">{user.username}</p>
                                        <div className="flex items-center space-x-1 text-yellow-400">
                                            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{user.total_score} pts</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-1 sm:space-x-2 text-red-300 hover:text-red-200 transition-colors duration-200 text-sm sm:text-base"
                                >
                                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        ) : (
                            <div className="text-blue-300 text-xs sm:text-sm">
                                Playing as Guest
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Title */}
                <div className="text-center mb-8 lg:mb-12">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 animate-fade-in">
                        Practice Mode
                    </h1>
                    <p className="text-lg sm:text-xl lg:text-2xl text-blue-200 animate-fade-in-delay">
                        Practice Your Difficult Words • Latih Kata-kata Sulit Anda
                    </p>
                </div>        {/* Loading State */}
                {!isGameStarted ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center text-white">
                            <BookOpen className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                            <p className="text-xl font-semibold mb-2">Select your level to start practicing</p>
                            <p className="text-lg text-blue-200">Choose which levels you want to practice your difficult words</p>
                        </div>
                    </div>
                ) : isLoadingWords ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center text-white">
                            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" />
                            <p className="text-xl font-semibold mb-2">Loading your practice words...</p>
                            <p className="text-lg text-blue-200">Finding words that need more practice</p>
                        </div>
                    </div>
                ) : vocabularyWords.length === 0 ? (
                    // Special message for Practice Mode when no words need practice
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center text-white bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-8 shadow-2xl border border-green-500">
                            <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-200" />
                            <p className="text-2xl font-bold mb-4 text-white">Congratulations! 🎉</p>
                            <p className="text-lg font-semibold mb-2 text-green-100">You haven&apos;t any mistakes</p>
                            <p className="text-base text-green-200 mb-6">All your vocabulary words are well mastered!</p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleGoHome}
                                    className="bg-white text-green-600 px-6 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors duration-200 shadow-lg"
                                >
                                    Back to Home
                                </button>
                                <p className="text-sm text-green-200">
                                    Continue learning to add more words to practice!
                                </p>
                            </div>
                        </div>
                    </div>
                ) : !currentQuestion ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center text-white">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p className="text-xl font-semibold mb-2">Failed to load practice words</p>
                            <p className="text-lg text-blue-200">Please refresh the page to try again</p>
                        </div>
                    </div>
                ) : (
                    /* Main Content - Split Layout */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 xl:gap-16 2xl:gap-20">
                        {/* Left Panel - Questions */}
                        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden hover:shadow-green-500/10 hover:shadow-2xl transition-all duration-300 flex flex-col">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-3 lg:py-4 border-b border-green-500 flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Questions »</h2>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-gray-800">
                                <div className="space-y-6">
                                    {/* Word Display */}
                                    <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 lg:p-4 shadow-lg">
                                        <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 animate-pulse">
                                            {currentQuestion?.word || 'Loading...'}
                                        </h3>
                                        <div className="text-blue-100 text-sm lg:text-base font-medium">
                                            {currentQuestion ? (
                                                <>
                                                    {currentQuestion.word_class.toUpperCase()} • {currentQuestion.level.toUpperCase()}
                                                </>
                                            ) : (
                                                'Loading word info...'
                                            )}
                                        </div>
                                    </div>

                                    {/* Task 1: Translation */}
                                    <div className="bg-gray-900 rounded-xl p-4 sm:p-5 border-2 border-yellow-600 shadow-lg shadow-yellow-500/20">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <Target className="w-5 h-5" />
                                            <h3 className="text-lg font-bold text-yellow-400">Task 1: Terjemahan</h3>
                                        </div>

                                        <input
                                            type="text"
                                            value={translationInput}
                                            onChange={(e) => setTranslationInput(e.target.value)}
                                            placeholder="Masukkan terjemahan bahasa Indonesia..."
                                            className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-gray-800 border border-yellow-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 text-lg lg:text-xl"
                                        />
                                    </div>

                                    {/* Task 2: Context Translation - Only show if enabled */}
                                    {enableSentenceTranslation && (
                                        <div className="bg-gray-900 rounded-xl p-4 sm:p-5 border-2 border-blue-600 shadow-lg shadow-blue-500/20">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <BookOpen className="w-5 h-5" />
                                                <h3 className="text-lg font-bold text-blue-400">Task 2: Terjemahan Kalimat</h3>
                                            </div>

                                            <div className="mb-3">
                                                <div className="bg-gray-800 border-2 border-blue-600 rounded-lg p-3 min-h-[60px] flex items-center">
                                                    {isLoadingSentence ? (
                                                        <div className="flex items-center space-x-2 text-blue-300">
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            <span>Generating sentence...</span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-blue-100 text-lg leading-relaxed break-words">
                                                            {generatedSentence || 'Memuat kalimat...'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <textarea
                                                value={contextInput}
                                                onChange={(e) => setContextInput(e.target.value)}
                                                placeholder="Masukkan terjemahan kalimat..."
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-800 border border-blue-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base lg:text-lg resize-none"
                                            />
                                        </div>
                                    )}                  {/* Submit Button */}
                                    <button
                                        onClick={handleAnswerSubmit}
                                        disabled={isSubmitted}
                                        className={`w-full px-6 py-2 lg:py-3 rounded-lg font-bold text-base lg:text-lg shadow-lg transition-all duration-200 border ${isSubmitted
                                            ? 'bg-gray-600 text-gray-300 cursor-not-allowed border-gray-500'
                                            : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-green-500 hover:border-green-400 hover:shadow-xl transform hover:scale-105'}`}
                                    >
                                        {isSubmitted ? 'Submitted' : 'Submit Answers'}
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Footer */}
                            <div className="bg-gray-900 px-4 sm:px-6 py-3 lg:py-4 border-t border-gray-700 flex-shrink-0">
                                <div className="flex justify-center items-center">
                                    {isWordBeingRemoved ? (
                                        <div className="flex items-center space-x-2 px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-green-800 border border-green-500 text-green-300">
                                            <CheckCircle className="w-4 h-4 animate-pulse" />
                                            <span className="text-sm lg:text-base font-medium">Word Mastered! Moving to next...</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleNextQuestion}
                                            disabled={!showAnswer}
                                            className={`flex items-center space-x-2 px-6 lg:px-8 py-2 lg:py-3 rounded-lg transition-all duration-200 font-medium border text-sm lg:text-base ${showAnswer
                                                ? 'text-green-400 hover:text-green-300 hover:bg-gray-700 border-green-500 hover:border-green-400 cursor-pointer'
                                                : 'text-gray-500 bg-gray-800 border-gray-600 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            <span>Next Word</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Answer & Explanation */}
                        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden hover:shadow-blue-500/10 hover:shadow-2xl transition-all duration-300 flex flex-col">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 lg:py-4 border-b border-blue-500 flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    <BookMarked className="w-5 h-5 lg:w-6 lg:h-6" />
                                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold">Result »</h2>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-gray-800">
                                {showAnswer ? (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Task 1: Translation + Definition */}
                                        <div className="bg-gray-900 rounded-xl p-6 border-2 border-yellow-600 shadow-lg shadow-yellow-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <Languages className="w-5 h-5 lg:w-6 lg:h-6" />
                                                    <h3 className="text-xl lg:text-2xl font-bold text-yellow-400">Task 1: Arti & Definisi</h3>
                                                </div>

                                                {/* Task 1 Status Box */}
                                                {task1Status && (
                                                    <div className={`px-4 py-2 rounded-lg font-bold text-sm border-2 flex items-center space-x-2 ${task1Status === 'CORRECT'
                                                        ? 'bg-green-900 border-green-500 text-green-300'
                                                        : 'bg-red-900 border-red-500 text-red-300'
                                                        }`}>
                                                        {task1Status === 'CORRECT' && (
                                                            <>
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span>Correct</span>
                                                            </>
                                                        )}
                                                        {task1Status === 'WRONG' && (
                                                            <>
                                                                <XCircle className="w-4 h-4" />
                                                                <span>Wrong</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {!task1Status && showAnswer && isLoadingTranslations && (
                                                    <div className="px-4 py-2 rounded-lg font-bold text-sm border-2 bg-yellow-900 border-yellow-500 text-yellow-300 flex items-center space-x-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Evaluating...</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600">
                                                    <p className="text-sm text-yellow-400 mb-2">Terjemahan Indonesia:</p>
                                                    {isLoadingTranslations ? (
                                                        <div className="flex items-center space-x-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <p className="text-yellow-300">Mengambil terjemahan...</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-yellow-300 font-semibold text-lg break-words">
                                                            {llmTranslations || 'Belum ada terjemahan'}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600">
                                                    <p className="text-sm text-yellow-400 mb-2">Definisi Bahasa Indonesia:</p>
                                                    {isLoadingDefinition ? (
                                                        <div className="flex items-center space-x-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <p className="text-yellow-300">Mengambil definisi...</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-yellow-300 break-words">
                                                            {llmDefinition || 'Belum ada definisi'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Task 2 Answer: Translation - Only show if enabled */}
                                        {enableSentenceTranslation && (
                                            <div className="bg-gray-900 rounded-xl p-6 border-2 border-blue-600 shadow-lg shadow-blue-500/20">
                                                <div className="flex items-center space-x-2 mb-4">
                                                    <RotateCw className="w-6 h-6" />
                                                    <h3 className="text-xl font-bold text-blue-400">Task 2: Terjemahan Kalimat</h3>
                                                </div>

                                                <div className="bg-gray-800 rounded-lg p-4 border border-blue-600">
                                                    <p className="text-sm text-blue-400 mb-3 font-medium flex items-center space-x-2">
                                                        <RotateCw className="w-4 h-4" />
                                                        <span>Terjemahan Indonesia:</span>
                                                    </p>
                                                    {isLoadingTranslation ? (
                                                        <div className="flex items-center space-x-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <p className="text-blue-300">Menerjemahkan kalimat...</p>
                                                        </div>
                                                    ) : generatedTranslation ? (
                                                        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-400">
                                                            <p className="text-blue-200 leading-relaxed break-words">{generatedTranslation}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-blue-300 italic">Sistem sedang menerjemahkan kalimat...</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full min-h-[400px]">
                                        <div className="text-center text-gray-400">
                                            <HelpCircle className="w-20 h-20 mx-auto mb-6 animate-bounce text-gray-400" />
                                            <p className="text-xl font-semibold mb-2 text-gray-300">Siap untuk melihat jawabannya?</p>
                                            <p className="text-lg text-gray-400">Kirim jawaban Anda untuk melihat penjelasannya!</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
