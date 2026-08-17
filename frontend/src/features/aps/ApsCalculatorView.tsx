import React, { useState } from 'react';
import { Calculator, Award, GraduationCap, ExternalLink } from 'lucide-react';

interface SubjectEntry {
  subjectName: string;
  mark: number;
  isLifeOrientation: boolean;
}

interface QualifyingProg {
  universityName: string;
  universityShortName: string;
  programmeName: string;
  faculty: string;
  qualificationType: string;
  minimumAps: number;
  applicationClosingDate: string;
  officialUrl: string;
}

export const ApsCalculatorView: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectEntry[]>([
    { subjectName: 'Mathematics', mark: 75, isLifeOrientation: false },
    { subjectName: 'Physical Sciences', mark: 70, isLifeOrientation: false },
    { subjectName: 'English Home Language', mark: 80, isLifeOrientation: false },
    { subjectName: 'Life Sciences', mark: 72, isLifeOrientation: false },
    { subjectName: 'Geography', mark: 65, isLifeOrientation: false },
    { subjectName: 'Accounting', mark: 60, isLifeOrientation: false },
    { subjectName: 'Life Orientation', mark: 85, isLifeOrientation: true },
  ]);

  const [institution, setInstitution] = useState('generic');
  const [calculatedAps, setCalculatedAps] = useState<number | null>(null);
  const [qualifyingProgrammes, setQualifyingProgrammes] = useState<QualifyingProg[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/aps/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectMarks: subjects, institution }),
      });
      const data = await res.json();
      if (data.success) {
        setCalculatedAps(data.apsResult.totalAps);
        setQualifyingProgrammes(data.qualifyingProgrammes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (idx: number, markStr: string) => {
    const val = Math.min(100, Math.max(0, Number(markStr) || 0));
    const updated = [...subjects];
    updated[idx].mark = val;
    setSubjects(updated);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Calculator size={32} color="#1e3a8a" />
        <div>
          <h2 style={{ margin: 0 }}>SA University APS Calculator</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Calculate your Grade 11/12 Admission Point Score (APS) across South African universities</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Input Form */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Subject Marks (%)</h3>
          {subjects.map((sub, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600 }}>{sub.subjectName}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={sub.mark}
                onChange={(e) => handleMarkChange(idx, e.target.value)}
                style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>
          ))}

          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Target Institution Scoring Rule</label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="generic">Standard NSC (Excludes Life Orientation, Max 42)</option>
              <option value="wits">University of the Witwatersrand (Wits)</option>
              <option value="uct">University of Cape Town (UCT)</option>
              <option value="up">University of Pretoria (UP)</option>
              <option value="sun">Stellenbosch University (SUN)</option>
            </select>
          </div>

          <button className="btn-primary" onClick={handleCalculate} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Calculating...' : 'Calculate APS & Find Programmes'}
          </button>
        </div>

        {/* Results View */}
        <div>
          {calculatedAps !== null ? (
            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
              <Award size={48} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#64748b' }}>Your Calculated APS Score</h3>
              <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: '#1e3a8a', margin: '8px 0' }}>{calculatedAps}</div>
              <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Out of 42 Max Points
              </span>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <GraduationCap size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p>Enter your marks and click calculate to see your APS score and matching SA university programmes.</p>
            </div>
          )}

          {qualifyingProgrammes.length > 0 && (
            <div className="glass-card" style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e3a8a' }}>Qualifying University Programmes ({qualifyingProgrammes.length})</h4>
              {qualifyingProgrammes.map((prog, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ color: '#0f172a' }}>{prog.programmeName}</strong>
                    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      Min APS: {prog.minimumAps}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    {prog.universityName} • {prog.faculty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
