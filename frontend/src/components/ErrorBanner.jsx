export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <section className="error-banner" role="alert">
      <strong>Data unavailable</strong>
      <span>{message}</span>
    </section>
  );
}
