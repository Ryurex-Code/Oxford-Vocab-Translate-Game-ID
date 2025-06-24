import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, word, sentence } = body;

        if (action === 'generateSentence') {
            // Generate English sentence using the vocabulary word
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Kamu adalah sebuah AI. Buat kalimat bahasa Inggris yang menarik dan kontekstual menggunakan kata yang diberikan. Kalimat harus natural, mudah dipahami, dan membantu siswa memahami penggunaan kata tersebut dalam situasi nyata."
                    },
                    {
                        role: "user",
                        content: `Buat sebuah kalimat bahasa Inggris yang menarik menggunakan kata "${word}". 

Kriteria kalimat:
- Natural dan seperti percakapan sehari-hari
- Maksimal hanya satu kalimat
- Tidak terlalu panjang atau rumit
- Membantu pemahaman makna kata
- Bisa tentang aktivitas sehari-hari, hobi, sekolah, atau situasi umum

Berikan hanya kalimatnya saja, tanpa penjelasan tambahan.`
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.7,
                max_tokens: 100,
            });

            const sentence = completion.choices[0]?.message?.content?.trim();
            return NextResponse.json({
                success: true,
                sentence: sentence
            });
        }

        if (action === 'getMultipleTranslations') {
            // Generate multiple Indonesian translations for an English word
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Kamu adalah AI translator ahli bahasa Inggris-Indonesia. Tugasmu adalah memberikan berbagai terjemahan yang akurat untuk kata bahasa Inggris ke bahasa Indonesia, karena satu kata bahasa Inggris bisa memiliki beberapa arti dalam bahasa Indonesia tergantung konteks."
                    },
                    {
                        role: "user",                        content: `Berikan berbagai terjemahan untuk kata bahasa Inggris "${word}" ke bahasa Indonesia.

INSTRUKSI:
1. Berikan 3-5 terjemahan yang paling umum dan akurat
2. Urutkan dari yang paling sering digunakan
3. Pisahkan dengan titik koma (;)
4. Berikan hanya terjemahannya saja, tanpa penjelasan tambahan
5. Hindari terjemahan yang terlalu teknis atau jarang digunakan
6. Gunakan kata-kata yang sederhana dan mudah dipahami
7. Jangan gunakan tanda baca atau karakter khusus dalam terjemahan

Contoh format:
menghindari; mencegah; menghindar; menjauhi; mengelak

Berikan terjemahan untuk "${word}":`
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.3,
                max_tokens: 150,
            });

            const translations = completion.choices[0]?.message?.content?.trim();
            return NextResponse.json({
                success: true,
                translations: translations
            });
        }

        if (action === 'generateDefinition') {
            // Generate Indonesian definition for an English word
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Kamu adalah ahli bahasa Indonesia yang bertugas memberikan definisi kata bahasa Inggris dalam bahasa Indonesia yang mudah dipahami."
                    },
                    {
                        role: "user",
                        content: `Berikan definisi bahasa Indonesia untuk kata bahasa Inggris "${word}".

Kriteria definisi:
1. Gunakan bahasa Indonesia yang baik dan benar
2. Penjelasan mudah dipahami oleh siswa
3. Tidak terlalu panjang namun jelas dan informatif
4. Fokus pada makna utama kata tersebut
5. Berikan hanya definisinya saja, tanpa penjelasan tambahan

Contoh format:
Kemampuan atau keterampilan untuk melakukan sesuatu dengan baik.

Berikan definisi untuk "${word}":`
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.3,
                max_tokens: 150,
            });

            const definition = completion.choices[0]?.message?.content?.trim();
            return NextResponse.json({
                success: true,
                definition: definition
            });
        }        if (action === 'translateSentence') {
            // Translate English sentence to Indonesian
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "Kamu adalah penerjemah profesional yang bertugas menerjemahkan kalimat bahasa Inggris ke bahasa Indonesia dengan akurat dan natural."
                    },
                    {
                        role: "user",
                        content: `Terjemahkan kalimat bahasa Inggris berikut ke bahasa Indonesia:

"${sentence}"

Kriteria terjemahan:
1. Gunakan bahasa Indonesia yang baik dan benar
2. Terjemahan harus natural dan mudah dipahami
3. Pertahankan makna asli dari kalimat bahasa Inggris
4. Sesuaikan dengan konteks kalimat
5. Berikan hanya hasil terjemahannya saja, tanpa penjelasan tambahan

Berikan terjemahan yang akurat:`
                    }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.3,
                max_tokens: 200,
            });

            const translation = completion.choices[0]?.message?.content?.trim();
            return NextResponse.json({
                success: true,
                translation: translation
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action'
        }, { status: 400 });

    } catch (error) {
        console.error('Groq API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to process request'
        }, { status: 500 });
    }
}
