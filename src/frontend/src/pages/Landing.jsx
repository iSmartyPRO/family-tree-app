import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PlusCircle, Users, Share2, Infinity, Download, Lock } from 'lucide-react'

export default function Landing() {
  const { t } = useTranslation()

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)',
        color: '#fff',
        padding: '100px 24px 80px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: 20, lineHeight: 1.2 }}>
            {t('landing.hero_title')}
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', opacity: 0.92, marginBottom: 40, lineHeight: 1.6 }}>
            {t('landing.hero_subtitle')}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '14px 32px', background: '#fff', color: '#4f6ef7' }}>
              {t('landing.hero_cta')}
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ fontSize: '1.05rem', padding: '14px 32px', background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.6)' }}>
              {t('landing.hero_login')}
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 20 }}>{t('landing.about_title')}</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>{t('landing.about_text')}</p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, textAlign: 'center', marginBottom: 56 }}>{t('landing.how_title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { icon: <PlusCircle size={40} color="#4f6ef7" />, title: t('landing.how_step1_title'), text: t('landing.how_step1_text') },
              { icon: <Users size={40} color="#4f6ef7" />, title: t('landing.how_step2_title'), text: t('landing.how_step2_text') },
              { icon: <Share2 size={40} color="#4f6ef7" />, title: t('landing.how_step3_title'), text: t('landing.how_step3_text') }
            ].map((step, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
                <div style={{ marginBottom: 16 }}>{step.icon}</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, textAlign: 'center', marginBottom: 56 }}>{t('landing.benefits_title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { icon: <Infinity size={32} color="#7c3aed" />, title: t('landing.benefit1_title'), text: t('landing.benefit1_text') },
              { icon: <Users size={32} color="#7c3aed" />, title: t('landing.benefit2_title'), text: t('landing.benefit2_text') },
              { icon: <Download size={32} color="#7c3aed" />, title: t('landing.benefit3_title'), text: t('landing.benefit3_text') },
              { icon: <Lock size={32} color="#7c3aed" />, title: t('landing.benefit4_title'), text: t('landing.benefit4_text') }
            ].map((b, i) => (
              <div key={i} className="card" style={{ padding: '28px 20px' }}>
                <div style={{ marginBottom: 14 }}>{b.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{b.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Lock size={48} color="#4f6ef7" style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 20 }}>{t('landing.security_title')}</h2>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, lineHeight: 1.8 }}>{t('landing.security_text')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', background: '#0f0f1a', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
        {t('landing.footer_text')}
      </footer>
    </div>
  )
}
