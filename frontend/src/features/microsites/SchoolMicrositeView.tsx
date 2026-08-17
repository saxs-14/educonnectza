import React, { useEffect, useState } from 'react';
import { School, Phone, Mail, Globe, MapPin, Award, BookOpen } from 'lucide-react';

interface MicrositeData {
  schoolName: string;
  district: string;
  province: string;
  slug: string;
  heroText: string;
  aboutUs: string;
  principalMessage: string;
  achievements: Array<{ title: string; year: string; description?: string }>;
  contactInfo: { email?: string; phone?: string; address?: string; websiteUrl?: string };
  publicAnnouncements: Array<{ title: string; content: string; date: string }>;
}

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  motto: string;
  logoUrl: string;
  bannerUrl: string;
}

export const SchoolMicrositeView: React.FC<{ slug: string }> = ({ slug }) => {
  const [microsite, setMicrosite] = useState<MicrositeData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/microsites/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMicrosite(data.microsite);
          setBranding(data.branding);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading School Microsite...</div>;
  if (!microsite || !branding) return <div style={{ padding: '40px', textAlign: 'center' }}>School Microsite Not Available</div>;

  return (
    <div style={{ backgroundColor: branding.backgroundColor, color: branding.textColor, minHeight: '100vh' }}>
      {/* Header Bar */}
      <header style={{ backgroundColor: branding.primaryColor, color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <School size={32} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>{microsite.schoolName}</h1>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{microsite.district}, {microsite.province}</span>
          </div>
        </div>
        <a href="/login.html" style={{ backgroundColor: branding.accentColor, color: '#000', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
          Portal Login
        </a>
      </header>

      {/* Hero Banner */}
      <div style={{ backgroundColor: branding.secondaryColor, color: '#fff', padding: '60px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '12px' }}>{microsite.heroText}</h2>
        <p style={{ fontSize: '1.2rem', fontStyle: 'italic', opacity: 0.95 }}>"{branding.motto}"</p>
      </div>

      {/* Main Content Sections */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div>
          {/* About Us */}
          <section className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: branding.primaryColor, marginTop: 0 }}>About Our School</h3>
            <p style={{ lineHeight: '1.6' }}>{microsite.aboutUs}</p>
          </section>

          {/* Principal Message */}
          <section className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: branding.primaryColor, marginTop: 0 }}>Principal's Welcome</h3>
            <p style={{ lineHeight: '1.6' }}>{microsite.principalMessage}</p>
          </section>

          {/* Achievements */}
          {microsite.achievements.length > 0 && (
            <section className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ color: branding.primaryColor, marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} /> Academic & Extracurricular Excellence
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                {microsite.achievements.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.year} - {item.title}:</strong> {item.description}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar: Public Announcements & Contact Info */}
        <div>
          {/* Contact Details */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ color: branding.primaryColor, marginTop: 0 }}>Contact Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
              {microsite.contactInfo.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} color={branding.secondaryColor} />
                  <span>{microsite.contactInfo.email}</span>
                </div>
              )}
              {microsite.contactInfo.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={16} color={branding.secondaryColor} />
                  <span>{microsite.contactInfo.phone}</span>
                </div>
              )}
              {microsite.contactInfo.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color={branding.secondaryColor} />
                  <span>{microsite.contactInfo.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Public Announcements */}
          {microsite.publicAnnouncements.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ color: branding.primaryColor, marginTop: 0 }}>School Announcements</h4>
              {microsite.publicAnnouncements.map((ann, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{ann.title}</strong>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0' }}>{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer style={{ backgroundColor: branding.primaryColor, color: '#fff', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>
        Powered by <strong>EduConnectZA</strong> — South African Learner Success Platform
      </footer>
    </div>
  );
};
