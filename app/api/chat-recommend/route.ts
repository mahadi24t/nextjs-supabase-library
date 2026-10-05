import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getAiCatalogContext } from '@/app/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          reply:
            'দুঃখিত, এআই অ্যাসিস্ট্যান্ট কনফিগারেশনে GROQ_API_KEY পাওয়া যায়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।',
        },
        { status: 200 },
      );
    }

    const body = await req.json();
    const messages = body?.messages;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const lastUserMessage =
      [...messages]
        .reverse()
        .find((m: { role: string; content?: string }) => m.role === 'user')?.content || '';

    const catalogContext = await getAiCatalogContext(lastUserMessage);
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are "LibStack এআই সহকারী", an expert, polite, and enthusiastic Bengali librarian at LibStack.

STRICT INSTRUCTIONS & GUARDRAILS:
1. GREETING RULE: When greeting the user, ALWAYS say 'আসসালামু আলাইকুম' or 'আসসালামু আলাইকুম ও স্বাগতম!'. NEVER use 'নমস্কার' or any other regional religious greetings.
2. ZERO-HALLUCINATION: You MUST ONLY recommend books that are explicitly listed in the CATALOG CONTEXT below. NEVER suggest or invent books or authors not in this catalog.
3. NO MARKDOWN TABLES RULE: STRICT RULE: DO NOT use markdown tables (| শিরোনাম | লেখক | ... |) to list books. For EVERY book you recommend or mention, you MUST use the token format: [[BOOK:<id>]] directly in your text with a 1-2 sentence Bengali explanation of why it fits.
   Example: "মুক্তিযুদ্ধের ইতিহাস ও পটভূমি নিয়ে আপনি পড়তে পারেন: [[BOOK:f144b722-3892-4b3e-a1dc-e29ee015554d]]। এই বইটিতে বাংলাদেশের মুক্তিযুদ্ধের কারণ ও পটভূমি বিস্তারিত তুলে ধরা হয়েছে।"
4. RELEVANCE & SEMANTIC MATCHING: Pay close attention to topics like 'মুক্তিযুদ্ধ', 'ইতিহাস', 'বিজ্ঞান', 'উপন্যাস'. For example, if asked about 'মুক্তিযুদ্ধের ইতিহাস', recommend titles containing 'মুক্তিযুদ্ধ' such as 'মুক্তিযুদ্ধ কেন অনিবার্য ছিল' ([[BOOK:f144b722-3892-4b3e-a1dc-e29ee015554d]]).
5. STOCK STATUS: Mention if copies are currently available on the shelf. If available stock is 0, mention that all copies are currently loaned out, but the member can check back soon.
6. MISSING TOPICS: If the user searches for a title, author, or topic not in our library, politely state in Bengali that it is not currently in our collection, and then suggest the closest matching alternative genre/book that IS in the catalog.
7. LANGUAGE & STYLE: Converse in warm, natural, and fluent Bengali (মার্জিত ও প্রমিত বাংলা). Keep recommendations crisp, engaging, and well-structured using bullet points or paragraphs. NEVER output markdown tables under any circumstances.

CATALOG CONTEXT:
${catalogContext}`;

    const conversation: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content || '',
      })),
    ];

    const candidateModels = [
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
    ];

    let reply = 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
    let completionSucceeded = false;

    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: conversation,
          temperature: 0.4,
          max_tokens: 1024,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          reply = content;
          completionSucceeded = true;
          break;
        }
      } catch (modelErr: unknown) {
        const errMsg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        console.warn(`Groq model '${model}' error: ${errMsg}. Trying next candidate model...`);
        continue;
      }
    }

    if (!completionSucceeded && reply === 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।') {
      console.error('All Groq candidate models failed to produce a response');
    }

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Groq API Error:', error);
    return NextResponse.json(
      { reply: 'সার্ভারে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' },
      { status: 200 },
    );
  }
}
