export function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <header className="section-heading"><p>{eyebrow}</p><div><h2>{title}</h2><span aria-hidden="true" /></div>{note && <p className="section-note">{note}</p>}</header>;
}
