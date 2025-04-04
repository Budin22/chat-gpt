'use client';

import {useState, useEffect, useRef} from 'react';
import { useSearchParams} from "next/navigation";
import './style.css';

interface Message {
    sender: string;
    content: string;
}

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
        sendMessages('Hi!', searchParams.get('debt') || '2000');
    }, [searchParams]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || url) return;
        sendMessages(input);
    };

    const extractPaymentUrl = (message: string): string | null => {
        const urlRegex = /(https?:\/\/[^\s]+)/; // Matches any URL
        const match = message.match(urlRegex);
        return match ? match[0] : null;
    };

    async function sendMessages(input:string, debt?: string) {
        const userMessage: Message = { sender: "User", content: input };
        if (!debt) setMessages((prev) => [...prev, userMessage]);
        setInput("");

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input, debt }),
        });

        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let text = "";

        const readStream = async () => {
            let done = false;
            while (!done) {
                const { done: isDone, value } = await reader.read();
                done = isDone;
                if (value) {
                    text += decoder.decode(value, { stream: true });
                    setAnswer(text);
                }
            }
        };

        await readStream();

        const url = extractPaymentUrl(text);
        if(url) setUrl(url);

        const newBotMessage: Message = { sender: "GPT", content: text };
        setAnswer('');
        setMessages((prev) => [...prev, newBotMessage]);
    }

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
                    {url && <a className='link' href={url}>Go to pay</a>}
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
                    <button type="submit" style={{ padding: '8px', backgroundColor: url ? '#7f888d' : '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: url ? 'auto' : 'pointer', minWidth: '100px' }}>Send</button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
