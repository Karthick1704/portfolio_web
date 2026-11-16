import Link from "next/link";
import { ArrowLeft, Code2, Download, ExternalLink } from "lucide-react";
import { profile } from "@/data/portfolio";
import { withBasePath } from "@/lib/deployment";
import { NameGraph } from "@/components/art/NameGraph";
import { ShaderBackdrop } from "@/components/art/ShaderBackdrop";
import { PointerFx, ScrollProgress } from "@/components/art/fx";

export const metadata = { title: "About" };

export default function AboutPage() {
  return <main className="bio-page"><ShaderBackdrop /><ScrollProgress /><PointerFx /><Link className="bio-back" href="/"><ArrowLeft /> Back to portfolio</Link><p className="system-label">PROFILE / KARTHICK S</p><NameGraph /><h1>Keeping production healthy, with a learner’s mindset.</h1><div className="bio-grid"><div><p>I started in mechanical engineering at Francis Xavier Engineering College, where I learned to think in systems: how individual parts connect, how processes stay reliable, and how small improvements strengthen the whole.</p><p>That interest led me to Tata Consultancy Services. I started as a Linux administrator, running CentOS and Red Hat servers across production and development, diagnosing performance issues and automating routine operations with Bash. I then moved into application support and DevOps: ServiceNow incidents and change requests, Azure DevOps pipelines, Docker deployments, and SAS, ETL and Oracle SQL jobs.</p><p>As a Software Application Engineer II at Amazon, I work on Books and Author Stores: customer-facing APIs, retail page widgets and data pipelines serving the US, EU and JP marketplaces. I’m a first-line responder on the on-call rotation and have resolved 900+ production alerts and support tickets across four AWS regions, from availability and latency breaches to Lambda error spikes and blocked deployments.</p><p>I like removing toil as much as fixing incidents. I built a Sev-2 availability alarm and operational dashboard, wrote AI-assisted diagnostic tooling that runs a multi-system triage runbook in one command, and ship Java 17 and TypeScript changes, including expanding a production service into two more regions.</p></div><aside><h2>Connect</h2><a href={profile.github} target="_blank" rel="noreferrer"><Code2 /> GitHub</a><a href={profile.linkedin} target="_blank" rel="noreferrer"><ExternalLink /> LinkedIn</a><a href={withBasePath("/documents/Karthick_Resume.pdf")} download><Download /> Download résumé</a></aside></div></main>;
}
