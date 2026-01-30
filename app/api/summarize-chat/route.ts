import { NextRequest, NextResponse } from 'next/server';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { messages, productName, selectedAddOns, selectedSize, selectedShape } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: 'XAI API key not configured' },
        { status: 500 }
      );
    }

    // Create add-ons list
    const addOnsList = selectedAddOns && selectedAddOns.length > 0
      ? selectedAddOns.join(', ')
      : 'none';

    // Filter out common non-design-related messages
    const designRelevantMessages = messages.filter((msg: any) => {
      const content = msg.content?.toLowerCase() || '';

      // Skip greetings and introductions
      if (content.includes('hi there') || content.includes('so excited to help')) {
        return false;
      }

      // Skip generic policy questions that don't affect this order's design
      const genericQuestions = [
        'how much', 'what\'s the price', 'do you charge',
        'minimum order', 'do you take deposits', 'refund policy'
      ];

      if (genericQuestions.some(q => content.includes(q)) && content.length < 100) {
        return false; // Skip if it's a short generic question
      }

      return true; // Keep everything else
    });

    // Use Grok to summarize the conversation into concise design notes
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
        messages: [
          {
            role: 'system',
            content: `You are writing order notes for Kassy (the baker) - like a waitress writing on a notepad.

CRITICAL: DO NOT include greetings, introductions, general questions, or unrelated conversation. ONLY extract the actual cake order and customization details.

IGNORE these types of messages completely:
- Greetings ("Hi there!", "So excited to help")
- General questions about pricing, deposits, minimums, policies
- Questions NOT related to THIS specific order's design
- Small talk or unrelated conversation

EXTRACT ONLY:
1. Design customizations (colors, text, add-ons, special requests)
2. Pickup/delivery date if mentioned

DO NOT include the cake name or size (that's already in the order details).

Format:
- For simple orders with NO customizations: "No customizations (make exactly as shown)"
- For orders WITH changes, list each bullet point (3-7 words):
  • [specific change]
  • [specific change]
- If date mentioned: "Needed: [date]"

Examples:
GOOD (no customizations):
No customizations (make exactly as shown)

GOOD (with customizations):
• Pink background instead of blue
• Add "Happy Birthday Sarah" text
• Cherry topper instead of strawberry
Needed: November 15th

GOOD (with date only):
No customizations (make exactly as shown)
Needed: November 20th

BAD (includes unrelated conversation):
Kassy: Hi there! So excited to help!
Customer: How much does this cost?
Kassy: It's $235...
Customer: I want 8" Silver Chrome
Kassy: Perfect! Is there anything else?
Customer: nope

Remember: ONLY the cake order details - no greetings, no general Q&A, no fluff!`
          },
          {
            role: 'user',
            content: `Summarize this conversation about ordering a ${productName}:

${designRelevantMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

Add-ons selected: ${addOnsList}

Write concise order notes for the baker:`
          }
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to summarize conversation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    let summary = data.choices[0]?.message?.content?.trim() || 'No customizations (make exactly as shown)';

    // Clean up the summary - remove any extra quotes, formatting, or conversational text
    summary = summary.replace(/^["']|["']$/g, '').trim();

    // Remove any remaining "Kassy:" or "Customer:" labels that might have slipped through
    summary = summary.replace(/^(Kassy|Customer|AI|User):\s*/gim, '').trim();

    // If the summary is too long (more than 500 chars), it probably includes unwanted conversation - use default
    if (summary.length > 500) {
      console.warn('Summary too long, using default');
      summary = 'No customizations (make exactly as shown)';
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in summarize-chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
