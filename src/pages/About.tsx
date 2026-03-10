import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-[760px] text-center">
        <h1 className="font-mono text-3xl font-medium text-foreground">about</h1>
        <p className="mt-4 text-muted-foreground">
          the table search is a fast, modern browser for the table.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block font-mono text-sm text-link underline underline-offset-4"
        >
          return to home
        </Link>
      </div>
    </div>
  );
}
