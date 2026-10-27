export default function DashboardHeader() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Northstar home">
          <span className="brand-mark">N</span>
          <span>NORTHSTAR <b>ENERGY</b></span>
        </a>
        <div className="topbar-right">
          <span className="env-chip"><span className="status-dot" /> PILOT ANALYTICS</span>
          <span className="topbar-divider" />
          <span className="market-label">GB · DAY-AHEAD</span>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> RENEWABLE INTELLIGENCE</div>
          <h1>Wind forecast desk</h1>
          <p>See the wind signal that shaped tomorrow’s buying decision.</p>
        </div>
        <div className="source-badge"><span className="source-icon">↗</span> ELEXON BMRS <span className="live-tag">LIVE SOURCE</span></div>
      </section>
    </>
  );
}
