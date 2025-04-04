import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_KEY!,
});

const getHistory = (
  debt: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  return [
    {
      role: "system",
      content:
        "You are an AI chatbot for debt negotiation. " +
        `The current outstanding debt is ${debt}$. ` +
        "Suggest realistic payment plans: monthly, biweekly, or weekly. " +
        "If the user proposes an unreasonably low amount (e.g., $5 per month), " +
        "counter with fair alternatives. " +
        "Once an agreement is reached, confirm the terms and provide a payment link in this format and return the link with just a string without markdown: " +
        "https://collectwise.com/payments?termLength={termLength}&totalDebtAmount={totalDebtAmount}&termPaymentAmount={termPaymentAmount}" +
        'Here is some example: Chatbot: "Hello! Our records show that you currently owe $2400. Are you able to resolve this debt today?"' +
        'User: "I just got laid off and can’t afford to pay that right now."' +
        'Chatbot: "I understand. We can break this into smaller payments. Would $800 every month for the next 3 months be manageable for you?"' +
        'User: "That’s still a bit too high for me."' +
        'Chatbot: "No worries! If we extend it to six months, your payment would be $400 per month. How does that sound?"' +
        'User: "That works!"' +
        'Chatbot: "Great! Here’s your payment link to get started: collectwise.com/payments?termLength=6&totalDebtAmount=2400&termPaymentAmount=400"' +
        'User: "Thanks!"' +
        'Chatbot: "You\'re welcome! Let us know if you need any adjustments. Have a great day!"' +
        "Start Negotiation",
    },
  ];
};

let userHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

export async function POST(req: Request) {
  try {
    const { message, debt } = await req.json();
    if (debt) {
      userHistory = getHistory(debt);
    }

    userHistory.push({ role: "user", content: message });

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: userHistory,
      stream: true,
    });

    const stream = new ReadableStream({
      start(controller) {
        (async () => {
          try {
            for await (const part of response) {
              const delta = part.choices[0]?.delta?.content || "";

              controller.enqueue(delta);
              if (part.choices[0]?.finish_reason) {
                controller.close();
              }
            }
          } catch (error) {
            console.error("Error while streaming response:", error);
            controller.close();
          }
        })();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Error fetching response: ${error}` },
      { status: 500 }
    );
  }
}
