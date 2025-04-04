'use client';

import {useState, useEffect, useRef} from 'react';
import { useSearchParams} from "next/navigation";
import OpenAI from "openai";
import './style.css'

interface Message {
    sender: string;
    content: string;
}

const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: process.env.NEXT_PUBLIC_KEY,
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
            "Chatbot: \"Great! Here’s your payment link to get started: https://collectwise.com/payments?termLength=6&totalDebtAmount=2400&termPaymentAmount=400\"" +
            "User: \"Thanks!\"" +
            "Chatbot: \"You're welcome! Let us know if you need any adjustments. Have a great day!\"" +
            "Start Negotiation"}];
}

let history:  OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

const Chat = () => {
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [answer, setAnswer] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, answer]);

    useEffect(() => {
        history = getHistory(searchParams.get('debt') || "2000");
        sendMessage('Hi', true);
    }, [searchParams]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const sendMessage = async (input: string, firstMessage?: boolean ) => {
        const userMessage: Message = { sender: 'User', content: input };

        if (!firstMessage) setMessages((prevMessages) => [...prevMessages, userMessage]);

        setInput('');

        history.push({role: "user", content: input})
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

                setAnswer(prev => prev + delta);
            }
            history.push({role: "system", content: botReply})
            const extractPaymentUrl = (message: string): string | null => {
                const urlRegex = /(https?:\/\/[^\s]+)/; // Matches any URL
                const match = message.match(urlRegex);
                return match ? match[0] : null;
            };
            const link = extractPaymentUrl(botReply);
            if(link){
                setUrl(link);
            }

            setMessages((prev) => [...prev, {
                sender: 'GPT',
                content: botReply,
            }]);
            setAnswer('');


        } catch (error) {
            console.error("Error with OpenAI API:", error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input)
    };

    return (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2em' }}>
            <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)', width: '800px', margin: 'auto', backgroundColor:'#32343D' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Payment Negotiation</h1>
                <div style={{ height: '600px',  overflowY: 'auto', border: '1px solid #ddd', padding: '8px', borderRadius: '6px', backgroundColor: '#f9f9f9' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            padding: '6px',
                            borderRadius: '4px',
                            margin: '4px 0',
                            textAlign: msg.sender === 'User' ? 'right' : 'left',
                            backgroundColor: msg.sender === 'User' ? '#add8e6' : '#d3d3d3'
                        }}>
                            <strong>{msg.sender}: </strong>{msg.content}
                        </div>
                    ))}
                    {answer && (<div style={{
                        padding: '6px',
                        borderRadius: '4px',
                        margin: '4px 0',
                        textAlign: 'left',
                        backgroundColor:  '#d3d3d3'
                    }}>
                        <strong>GPT: </strong>{answer}
                    </div>)}
                    {url && <a href={url} className='link'>Use this link to pay</a>}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSubmit} style={{ marginTop: '8px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message"
                        style={{ flexGrow: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px' }}
                    />
                    <button disabled={!!answer} type="submit" style={{ padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', minWidth: '100px' }}>Send</button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
