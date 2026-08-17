import React, { useState } from 'react';
import { BrandingStudio } from '../features/school-admin/BrandingStudio';
import { ApsCalculatorView } from '../features/aps/ApsCalculatorView';
import { SchoolMicrositeView } from '../features/microsites/SchoolMicrositeView';
import { AiTutorWidget } from '../features/ai/AiTutorWidget';
import { Palette, Calculator, Globe, Bot } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'branding' | 'aps' | 'microsite'>('aps');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Top App Bar */}
      <nav style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>EduConnectZA</h2>
          <span style={{ backgroundColor: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Production Platform
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('aps')}
            style={{
              backgroundColor: activeTab === 'aps' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <Calculator size={16} /> APS Calculator
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            style={{
              backgroundColor: activeTab === 'branding' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <Palette size={16} /> Branding Studio
          </button>
          <button
            onClick={() => setActiveTab('microsite')}
            style={{
              backgroundColor: activeTab === 'microsite' ? '#2563eb' : 'transparent',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <Globe size={16} /> Public Microsite
          </button>
        </div>
      </nav>

      {/* Main Body View */}
      <main style={{ padding: '20px 0' }}>
        {activeTab === 'aps' && <ApsCalculatorView />}
        {activeTab === 'branding' && <BrandingStudio schoolId="demo-school-id" />}
        {activeTab === 'microsite' && <SchoolMicrositeView slug="pretoria-high" />}
      </main>

      {/* Floating AI Tutor Assistant */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        <AiTutorWidget subjectName="Mathematics" grade={11} />
      </div>
    </div>
  );
}
