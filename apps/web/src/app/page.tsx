import Link from 'next/link';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import type { Metadata } from 'next';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const instrument = Instrument_Sans({
  variable: '--font-instrument',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MANA · Essential Ocean Foods',
  description:
    'Premium, graded fish from trusted Pacific suppliers — received, inspected, and allocated box by box to restaurant kitchens across the mainland.',
};

export default function LandingPage() {
  return (
    <div className={`landing ${fraunces.variable} ${instrument.variable}`}>
      <style>{`
        .landing{
          --deep:#07202E;
          --deep-2:#0C2C3E;
          --foam:#F3F8F7;
          --ahi:#E85C43;
          --ahi-dark:#C74430;
          --seafoam:#8FD5C6;
          --muted:#9FBFC8;
          font-family:var(--font-instrument),system-ui,sans-serif;
          background:linear-gradient(178deg,var(--deep) 0%,var(--deep-2) 60%,#0F3A4D 100%);
          color:var(--foam);
          -webkit-font-smoothing:antialiased;
          min-height:100dvh;
          overflow:hidden;
          position:relative;
        }
        .landing a{text-decoration:none;color:inherit}
        .landing :focus-visible{outline:3px solid var(--ahi);outline-offset:3px;border-radius:8px}

        .landing .screen{
          height:100dvh;
          display:flex;flex-direction:column;
          padding:28px clamp(24px,5vw,64px);
          position:relative;z-index:1;
        }

        .landing .bg{
          position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.5;
          width:100%;height:100%;
        }
        @keyframes dashflow{to{stroke-dashoffset:-26}}
        .landing .flow-line{stroke-dasharray:5 9;animation:dashflow 2s linear infinite}
        @keyframes lpulse{0%,100%{opacity:.4}50%{opacity:1}}
        .landing .pulse-dot{animation:lpulse 2.6s ease-in-out infinite}

        .landing .bar{display:flex;justify-content:space-between;align-items:center}
        .landing .logo{display:flex;align-items:baseline;gap:10px}
        .landing .logo b{font-family:var(--font-fraunces),serif;font-weight:600;font-size:1.4rem;letter-spacing:.02em}
        .landing .logo span{font-size:.68rem;text-transform:uppercase;letter-spacing:.15em;color:var(--muted)}
        .landing .signin{
          font-size:.9rem;font-weight:600;padding:10px 20px;border-radius:999px;
          border:1.5px solid rgba(243,248,247,.3);transition:.2s;
        }
        .landing .signin:hover{border-color:var(--foam);background:rgba(243,248,247,.07)}

        .landing .center{
          flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;
          text-align:center;gap:0;
        }
        .landing .eyebrow{
          font-size:.72rem;text-transform:uppercase;letter-spacing:.22em;font-weight:600;
          color:var(--seafoam);margin-bottom:20px;
        }
        .landing h1{
          font-family:var(--font-fraunces),serif;font-weight:500;letter-spacing:-.015em;line-height:1.08;
          font-size:clamp(2.3rem,5.5vw,4.2rem);max-width:17ch;margin:0 0 20px;
        }
        .landing h1 em{font-style:italic;color:#FFB39F}
        .landing .lede{
          color:#B9CFD4;font-size:clamp(.98rem,1.5vw,1.12rem);max-width:34rem;line-height:1.6;
          margin:0 0 44px;
        }

        .landing .doors{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
        .landing .door{
          display:flex;flex-direction:column;align-items:flex-start;gap:6px;
          width:min(310px,88vw);text-align:left;
          padding:24px 26px;border-radius:20px;
          transition:transform .2s ease, box-shadow .2s ease, background .2s;
        }
        .landing .door small{font-size:.7rem;text-transform:uppercase;letter-spacing:.16em;font-weight:600;opacity:.85}
        .landing .door strong{font-family:var(--font-fraunces),serif;font-weight:500;font-size:1.35rem;letter-spacing:-.01em}
        .landing .door p{font-size:.86rem;line-height:1.5;opacity:.85;margin:0}
        .landing .door .go{
          margin-top:10px;font-size:.88rem;font-weight:600;display:inline-flex;align-items:center;gap:7px;
        }
        .landing .door .go svg{transition:transform .2s}
        .landing .door:hover .go svg{transform:translateX(4px)}

        .landing .door-customer{background:var(--ahi);color:#fff;box-shadow:0 12px 34px rgba(232,92,67,.3)}
        .landing .door-customer:hover{background:var(--ahi-dark);transform:translateY(-4px)}
        .landing .door-vendor{
          background:rgba(243,248,247,.06);border:1.5px solid rgba(243,248,247,.18);
          color:var(--foam);backdrop-filter:blur(4px);
        }
        .landing .door-vendor:hover{border-color:rgba(143,213,198,.6);transform:translateY(-4px)}
        .landing .door-vendor .go{color:var(--seafoam)}

        .landing .signin-row{
          margin-top:26px;font-size:.82rem;color:var(--muted);
        }
        .landing .signin-row a{color:var(--seafoam);font-weight:600}
        .landing .signin-row a:hover{text-decoration:underline}

        .landing .foot{
          display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
          font-size:.78rem;color:var(--muted);
        }
        .landing .foot .stops{display:flex;gap:18px;letter-spacing:.1em;font-weight:600}

        @media (prefers-reduced-motion:reduce){
          .landing *{animation:none!important;transition:none!important}
        }
        @media (max-width:640px), (max-height:640px){
          .landing{overflow:auto}
          .landing .screen{height:auto;min-height:100dvh;gap:36px}
          .landing .center{padding:24px 0}
          .landing .lede{margin-bottom:32px}
        }
      `}</style>

      {/* ambient background: HNL → SFO/LAX route */}
      <svg
        className="bg"
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <path
          className="flow-line"
          d="M120 640 C 480 120, 980 80, 1320 200"
          stroke="rgba(232,92,67,.35)"
          strokeWidth="1.5"
        />
        <path
          className="flow-line"
          d="M120 640 C 520 340, 980 360, 1330 480"
          stroke="rgba(143,213,198,.3)"
          strokeWidth="1.5"
        />
        <circle className="pulse-dot" cx="120" cy="640" r="6" fill="rgba(232,92,67,.8)" />
        <circle cx="120" cy="640" r="14" stroke="rgba(232,92,67,.25)" strokeWidth="1.5" />
        <circle cx="1320" cy="200" r="5" fill="rgba(243,248,247,.6)" />
        <circle cx="1330" cy="480" r="5" fill="rgba(243,248,247,.6)" />
      </svg>

      <div className="screen">
        <header className="bar">
          <Link className="logo" href="/" aria-label="MANA by Essential Ocean Foods">
            <b>MANA</b>
            <span>by Essential Ocean Foods</span>
          </Link>
          <Link className="signin" href="/login">
            Staff sign in
          </Link>
        </header>

        <main className="center">
          <span className="eyebrow">Pacific seafood distribution</span>
          <h1>
            From the dock to your kitchen, <em>overnight.</em>
          </h1>
          <p className="lede">
            Premium, graded fish from trusted Pacific suppliers — received, inspected, and allocated
            box by box to restaurant kitchens across the mainland.
          </p>

          <div className="doors">
            <Link className="door door-customer" href="/signup">
              <small>For restaurants &amp; buyers</small>
              <strong>Order fresh fish</strong>
              <p>Browse pricing, place orders, and track deliveries in one place.</p>
              <span className="go">
                Create a customer account
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>

            <Link className="door door-vendor" href="/vendor-signup">
              <small>For suppliers &amp; partners</small>
              <strong>Ship fish to us</strong>
              <p>Submit shipments and track your orders with us in one place.</p>
              <span className="go">
                Apply as a supplier
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>

          <p className="signin-row">
            Already with us? <Link href="/login/customer">Customer sign in</Link>
            {' · '}
            <Link href="/login/vendor">Supplier sign in</Link>
          </p>
        </main>

        <footer className="foot">
          <span>© 2026 Essential Ocean Foods</span>
          <span className="stops">HNL · SFO · LAX · ORD</span>
        </footer>
      </div>
    </div>
  );
}
