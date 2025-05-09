import { NextRequest, NextResponse } from "next/server";
import { clients, broadcastEvent, type EventData } from "@/lib/eventUtils";

// GET handler: Sets up a Server-Sent Events (SSE) connection
export async function GET(req: NextRequest) {
  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set for later broadcasting
      clients.add(controller);

      // Send an initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Remove the client when they disconnect
      req.signal.addEventListener('abort', () => {
        clients.delete(controller);
      });
    }
  });

  return new NextResponse(stream, { headers });
}

// POST handler: Receives an event and broadcasts it to connected clients
export async function POST(req: NextRequest) {
  try {
    // In production, add robust authentication to restrict who can broadcast events.
    const eventData = await req.json() as EventData;
    
    if (!eventData || !eventData.type) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }
    
    // Broadcast the event using the utility function
    broadcastEvent(eventData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting event:', error);
    return NextResponse.json({ error: 'Failed to broadcast event' }, { status: 500 });
  }
}
