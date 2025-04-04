'use client';

import { useState, useEffect } from 'react';
import { socket } from "@/lib/soketClient";
import { useSearchParams} from "next/navigation";

interface Message {
    sender: string;
    content: string;
}

const Chat = () => {
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [answer, setAnswer] = useState<string>('');

    useEffect(() => {
        socket.emit('start', searchParams.get('debt') || "2000");
        socket.emit('send-message', 'Hi');

        socket.on('message', (msg: string) => {
            setAnswer((prev) => prev + msg);
        });

        socket.on('stop-message', (msg: string) => {
            setMessages((prev) => [...prev, {
                sender: 'GPT',
                content: msg,
            }]);
            setAnswer('');
        });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'User', content: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        socket.emit('send-message', input);
        setInput('');
    };

    return (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2em' }}>
            <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)', width: '90%', margin: 'auto', backgroundColor:'#32343D' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Real-Time Chat with GPT</h1>
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
                    {answer && <div style={{ color: '#555' }}>GPT is typing...</div>}
                </div>
                <form onSubmit={handleSubmit} style={{ marginTop: '8px', display: 'flex' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message"
                        style={{ flexGrow: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px' }}
                    />
                    <button type="submit" style={{ padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>Send</button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
