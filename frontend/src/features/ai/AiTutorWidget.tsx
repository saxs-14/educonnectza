import React, { useState } from 'react';
import { Bot, Send, HelpCircle, BookOpen, Lightbulb } from 'lucide-react';

export const AiTutorWidget: React.FC<{ subjectName?: string; grade?: number }> = ({
  subjectName = 'Mathematics',
  grade = 10,
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'explain' | 'hint' | 'worked_example'>('explain');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'tutor'; text: string; mode?: string }>>([
    {
      sender: 'tutor',
      text: `Hello! I'm your CAPS-aligned AI Tutor for Grade ${grade} ${subjectName}. How can I assist with your revision today?`,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai-tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, mode, subjectName, grade }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { sender: 'tutor', text: data.response.content, mode: data.response.mode },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'tutor', text: 'Sorry, I ran into an issue connecting. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ width: '380px', height: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bot size={24} />
        <div>
          <h4 style={{ margin: 0 }}>CAPS AI Tutor Assistant</h4>
          <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Grade {grade} • {subjectName}</span>
        </div>
      </div>

      {/* Mode Selector Toggles */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', padding: '4px' }}>
        <button
          onClick={() => setMode('explain')}
          style={{
            flex: 1,
            padding: '6px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: mode === 'explain' ? '#ffffff' : 'transparent',
            fontWeight: mode === 'explain' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <BookOpen size={14} /> Explain
        </button>
        <button
          onClick={() => setMode('hint')}
          style={{
            flex: 1,
            padding: '6px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: mode === 'hint' ? '#ffffff' : 'transparent',
            fontWeight: mode === 'hint' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <Lightbulb size={14} /> Give Hint
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: msg.sender === 'user' ? '#1e3a8a' : '#f1f5f9',
              color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
              padding: '10px 14px',
              borderRadius: '12px',
              maxWidth: '85%',
              fontSize: '0.9rem',
              whiteSpace: 'pre-line',
            }}
          >
            {msg.text}
          </div>
        ))}
        {loading && <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>Tutor is thinking...</div>}
      </div>

      {/* Input Box */}
      <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask a ${subjectName} question...`}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <button className="btn-primary" onClick={handleSend} style={{ padding: '8px 12px' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
