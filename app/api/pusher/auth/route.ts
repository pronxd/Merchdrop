import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const socketId = data.get('socket_id') as string;
    const channel = data.get('channel_name') as string;

    // Generate a unique user ID based on socket ID or use a random ID
    const userId = socketId.substring(0, 10);

    const presenceData = {
      user_id: userId,
      user_info: {
        // You can add more user info here if needed
        timestamp: Date.now(),
      },
    };

    const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 403 });
  }
}
