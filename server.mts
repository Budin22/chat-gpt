import { createServer} from "node:http";
import next from "next";
import {Server} from 'socket.io'
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const dev = process.env.NEXT_PUBLIC_NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();


const openai = new OpenAI({
    apiKey: process.env.KEY
});

const getHistory = (debt: string):  OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
    return [{"role": "system", "content": "You are an AI chatbot for debt negotiation. "+
            `The current outstanding debt is ${debt}$. `+
            "Suggest realistic payment plans: monthly, biweekly, or weekly. "+
            "If the user proposes an unreasonably low amount (e.g., $5 per month), "+
            "counter with fair alternatives. "+
            "Once an agreement is reached, confirm the terms and provide a payment link in this format and return the link with just a string without markdown: "+
            "https://collectwise.com/payments?termLength={termLength}&totalDebtAmount={totalDebtAmount}&termPaymentAmount={termPaymentAmount}" +
            "Here is some example: Chatbot: \"Hello! Our records show that you currently owe $2400. Are you able to resolve this debt today?\"" +
            "User: \"I just got laid off and can’t afford to pay that right now.\"" +
            "Chatbot: \"I understand. We can break this into smaller payments. Would $800 every month for the next 3 months be manageable for you?\"" +
            "User: \"That’s still a bit too high for me.\"" +
            "Chatbot: \"No worries! If we extend it to six months, your payment would be $400 per month. How does that sound?\"" +
            "User: \"That works!\"" +
            "Chatbot: \"Great! Here’s your payment link to get started: collectwise.com/payments?termLength=6&totalDebtAmount=2400&termPaymentAmount=400\"" +
            "User: \"Thanks!\"" +
            "Chatbot: \"You're welcome! Let us know if you need any adjustments. Have a great day!\"" +
            "Start Negotiation"}];
}
app.prepare().then(() => {

    const httpServer = createServer(handle)

    const io = new Server(httpServer, {
        cors: {
            origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_ORIGIN,
            methods: ["GET", "POST", "WS"],
        }
    })

    io.on('connection', (socket) => {
        let history:  OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        socket.on('start', async (debt) => {
            history = getHistory(debt);
        })

        socket.on('send-message', async (data) => {

            history.push({role: "user", content: data})
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: history,
                    stream: true,
                });

                let botReply = "";

                for await (const part of response) {
                    const delta = part.choices[0]?.delta?.content || "";
                    botReply += delta;

                    socket.emit("message", delta);
                }
                socket.emit("stop-message", botReply);
                history.push({role: "system", content: botReply})

            } catch (error) {
                console.error("Error with OpenAI API:", error);
                io.emit("message", {sender: "GPT", content: "Sorry, I encountered an error."});
            }

            socket.on('disconnect', () => {
                console.log(`${socket.id} disconnected`);
            })
        })
    })

    httpServer.listen(port, () => {
        console.log(`Listening on port ${port}`);
    })
})


