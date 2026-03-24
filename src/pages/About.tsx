import SubpageLayout from '@/components/layout/SubpageLayout';

export default function About() {
  return (
    <SubpageLayout title="about" description="About this sermon search experience.">
      <section className="surface-card p-6">
        <p className="text-lg text-muted-foreground">
          the table search is a fast, modern browser for the table search.
        </p>
      </section>
    </SubpageLayout>
  );
}
