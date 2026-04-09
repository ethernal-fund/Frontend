import { Link } from 'react-router-dom';

const tokenStyles = `
  .nf-page       { background: var(--color-bg-page); min-height: 100vh;
                   display: flex; align-items: center; justify-content: center;
                   text-align: center; padding: var(--space-section-x); }

  .nf-code       { font-family: monospace; font-size: var(--primitive-text-6xl);
                   font-weight: 700; margin-bottom: var(--primitive-space-4);
                   background: var(--color-bg-hero); -webkit-background-clip: text;
                   -webkit-text-fill-color: transparent; background-clip: text;
                   line-height: 1; }

  .nf-title      { font-size: var(--primitive-text-xl); font-weight: 700;
                   color: var(--color-text-primary); margin-bottom: var(--primitive-space-2); }

  .nf-sub        { font-size: var(--primitive-text-sm); color: var(--color-text-secondary);
                   margin-bottom: var(--primitive-space-8); }

  .nf-btn        { display: inline-flex; align-items: center; gap: var(--primitive-space-2);
                   padding: var(--primitive-space-3) var(--primitive-space-5);
                   background: var(--color-bg-hero); color: var(--color-text-on-dark);
                   border-radius: var(--radius-button); font-weight: 700;
                   font-size: var(--primitive-text-sm); text-decoration: none;
                   transition: opacity 150ms ease; box-shadow: var(--shadow-button); }
  .nf-btn:hover  { opacity: 0.88; }
  `;


export default function NotFoundPage() {
  return (
    <>
      <style>{tokenStyles}</style>

      <div className="nf-page">
        <div>
          <div className="nf-code">404</div>
          <h1 className="nf-title">Page not found</h1>
          <p className="nf-sub">The page you're looking for doesn't exist.</p>
          <Link to="/" className="nf-btn">
            Go home
          </Link>
        </div>
      </div>
    </>
  );
}