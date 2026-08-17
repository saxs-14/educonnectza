import React, { useState } from 'react';
import { Palette, Upload, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface BrandingStudioProps {
  schoolId: string;
  initialPrimaryColor?: string;
  initialSecondaryColor?: string;
  initialAccentColor?: string;
  initialBgColor?: string;
  initialTextColor?: string;
  initialMotto?: string;
}

export const BrandingStudio: React.FC<BrandingStudioProps> = ({
  schoolId,
  initialPrimaryColor = '#1e3a8a',
  initialSecondaryColor = '#0d9488',
  initialAccentColor = '#f59e0b',
  initialBgColor = '#f8fafc',
  initialTextColor = '#0f172a',
  initialMotto = 'Excellence in Education',
}) => {
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [bgColor, setBgColor] = useState(initialBgColor);
  const [textColor, setTextColor] = useState(initialTextColor);
  const [motto, setMotto] = useState(initialMotto);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [contrastWarning, setContrastWarning] = useState<string | null>(null);

  // Client-side contrast check helper
  const checkContrast = (bgHex: string, textHex: string) => {
    // Basic luminance calculation for live preview
    const hexToLum = (hex: string) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    const l1 = hexToLum(bgHex);
    const l2 = hexToLum(textHex);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return Math.round(ratio * 100) / 100;
  };

  const currentRatio = checkContrast(bgColor, textColor);
  const isAccessible = currentRatio >= 4.5;

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/v1/branding/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor: bgColor,
          textColor,
          motto,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Branding updated successfully!');
        if (!data.accessibility.isAccessible) {
          setContrastWarning(data.accessibility.warning);
        } else {
          setContrastWarning(null);
        }
      }
    } catch (err) {
      setStatusMsg('Failed to save branding settings');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Palette size={28} color={primaryColor} />
        <h2 style={{ margin: 0 }}>School Branding Studio</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Editor Controls */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3>Theme Colors & Motto</h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Primary Brand Color</label>
            <input type="color" value={primaryColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Secondary Color</label>
            <input type="color" value={secondaryColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondaryColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Accent Color</label>
            <input type="color" value={accentColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccentColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Background Color</label>
            <input type="color" value={bgColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBgColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Text Color</label>
            <input type="color" value={textColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>School Motto</label>
            <input type="text" value={motto} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotto(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          <button className="btn-primary" onClick={handleSave} style={{ width: '100%', marginTop: '12px' }}>
            Publish Branding Changes
          </button>
        </div>

        {/* Live Preview & WCAG Verification */}
        <div>
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h4 style={{ margin: 0, marginBottom: '12px' }}>WCAG 2.1 AA Contrast Status</h4>
            {isAccessible ? (
              <div className="badge-wcag-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>Contrast Ratio {currentRatio}:1 (Passes WCAG AA 4.5:1)</span>
              </div>
            ) : (
              <div className="badge-wcag-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>Contrast Ratio {currentRatio}:1 (Fails WCAG AA 4.5:1 requirement)</span>
              </div>
            )}
          </div>

          {/* Live Mobile/Desktop Portal Preview */}
          <div
            style={{
              backgroundColor: bgColor,
              color: textColor,
              borderRadius: '12px',
              padding: '24px',
              border: `3px solid ${primaryColor}`,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ backgroundColor: primaryColor, color: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>Demo High School</span>
              <span style={{ backgroundColor: accentColor, color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                Learner Portal
              </span>
            </div>
            <p style={{ fontStyle: 'italic', color: secondaryColor }}>"{motto}"</p>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a' }}>
              <h5 style={{ margin: 0, color: primaryColor }}>Today's Announcements</h5>
              <p style={{ fontSize: '0.9rem', margin: '6px 0 0 0' }}>Term 3 CAPS examinations start next Monday. Make sure to check your revision plan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
