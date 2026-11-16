import { Decode } from "@/components/art/fx";

export function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  const index = eyebrow.match(/^\d+/)?.[0];
  return <header className="section-heading">{index && <b className="ghost-num" aria-hidden="true">{index}</b>}<p>{eyebrow}</p><div><h2><Decode text={title} /></h2><span aria-hidden="true" /></div>{note && <p className="section-note">{note}</p>}</header>;
}
