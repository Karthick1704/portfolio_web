import Link from "next/link";
import { ArrowLeft, Code2, Download, ExternalLink } from "lucide-react";
import { profile } from "@/data/portfolio";
import { withBasePath } from "@/lib/deployment";

export const metadata = { title: "About" };

export default function AboutPage() {
  return <main className="bio-page"><Link className="bio-back" href="/"><ArrowLeft /> Back to portfolio</Link><p className="system-label">PROFILE / KARTHICK S</p><h1>Building practical systems with a learner’s mindset.</h1><div className="bio-grid"><div><p>I started in mechanical engineering at Francis Xavier Engineering College, where I learned to think in systems: how individual parts connect, how processes stay reliable, and how small improvements strengthen the whole.</p><p>That interest led me to Tata Consultancy Services. I began with operational workflow automation, moved into Linux and cloud administration across Azure and AWS, and later worked on application support, incident management, monitoring and database optimization.</p><p>As a Software Application Engineer II at Amazon, I work on systems supporting Amazon Stores. My current work includes cross-regional flexibility, API availability, reducing latency, business-critical risks and customer incidents across distributed systems.</p><p>I’m continuing to grow across cloud engineering, automation, artificial intelligence and interface design—areas that help me build useful, understandable and dependable software.</p></div><aside><h2>Connect</h2><a href={profile.github} target="_blank" rel="noreferrer"><Code2 /> GitHub</a><a href={profile.linkedin} target="_blank" rel="noreferrer"><ExternalLink /> LinkedIn</a><a href={withBasePath("/documents/Karthick_Resume.pdf")} download><Download /> Download résumé</a></aside></div></main>;
}
