import { NextRequest, NextResponse } from 'next/server';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, productName } = await request.json();

    if (!imageUrl || !productName) {
      return NextResponse.json(
        { error: 'Missing imageUrl or productName' },
        { status: 400 }
      );
    }

    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: 'XAI API key not configured' },
        { status: 500 }
      );
    }

    // Use Grok vision to analyze the image and create design notes
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'system',
            content: `You are analyzing a cake design photo to create design notes for a customer order. The customer wants to replicate this exact design on their ${productName}.

Your job is to write clear, detailed design notes that describe:
1. The overall color scheme and palette
2. Main design elements and decorations
3. Any text or writing on the cake
4. The style and aesthetic (e.g., elegant, whimsical, modern, etc.)
5. Special details that make this design unique

Write in first person from the customer's perspective, as if they're describing what they want.
Keep it concise but detailed enough for a baker to recreate it accurately.
Maximum 400 characters.

Example format:
"I'd love to replicate this exact design - the soft pink and gold color scheme with the elegant baroque border. Please include the cherub angel on top and the delicate floral details around the sides. The cursive 'Happy Birthday' text in gold should be centered on the front."

Now analyze the image and write the design notes:`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this ${productName} design and create design notes for it.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content || '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error in analyze-image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
