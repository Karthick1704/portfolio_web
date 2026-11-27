export const profile = {
  name: "Karthick S",
  role: "Software Application Engineer II",
  email: "karthic1704@gmail.com",
  github: "https://github.com/Karthick1704",
  linkedin: "https://www.linkedin.com/in/karthi1704--/",
  dribbble: "https://dribbble.com/Designer_2317",
};

export const experience = [
  { company: "Amazon", role: "Software Application Engineer II", period: "July 2025 — Present", summary: "Books / Author Stores: customer-facing APIs, retail page widgets and data pipelines for the US, EU and JP marketplaces. First-line responder on the primary and secondary on-call rotations, with 900+ production alerts and support tickets resolved across four AWS regions. Built a Sev-2 availability alarm and operational dashboard, wrote AI-assisted diagnostic tooling that automates a manual triage runbook, and expanded a production Java service into two additional regions.", tech: ["On-call", "AWS CloudWatch", "Lambda", "Java 17", "TypeScript", "Root-cause analysis", "AI tooling"] },
  { company: "Tata Consultancy Services", role: "System Engineer — Application Support, SAS & DevOps", period: "June 2024 — May 2025", summary: "Managed ServiceNow incidents and change requests under standard change and configuration management, and supported application migrations with partner teams. Built and maintained CI/CD pipelines in Azure DevOps, standardised deployments with Docker, and debugged SAS, ETL and Oracle SQL jobs for client data operations.", tech: ["ServiceNow", "Azure DevOps", "Docker", "Oracle SQL", "SAS", "ETL"] },
  { company: "Tata Consultancy Services", role: "Linux Administrator", period: "July 2022 — June 2024", summary: "Administered CentOS and Red Hat Linux servers across production and development environments: users, permissions, filesystems, services and resource usage. Diagnosed server and performance issues through to resolution, implemented automated backup and recovery, and automated repetitive operational tasks with Bash.", tech: ["Red Hat", "CentOS", "Bash", "systemd", "Backup & recovery"] },
] as const;

export const projects = [
  { name: "UI/UX Design Portfolio", description: "A curated collection of original and inspired mobile interfaces, dashboard concepts and interaction patterns.", problem: "Exploring clear, considered digital experiences across varied interface contexts.", contribution: "Designed interface concepts, user flows and interactive prototypes.", tech: ["Figma", "UI Design", "UX Research", "Prototyping"], link: profile.dribbble, action: "View on Dribbble", status: "Published", image: "/projects/dribbble.jpg" },
  { name: "KartChatApp", description: "A real-time chat application with authentication, live database syncing and a clean material interface.", problem: "Enabling straightforward instant messaging across devices.", contribution: "Built the application experience and Firebase-backed real-time flow.", tech: ["Flutter", "Dart", "Firebase", "Real-time DB"], link: "https://github.com/Karthick1704/Kart-ChatApp-Model-Flutter", action: "View on GitHub", status: "Repository", image: "/projects/kart.jpg" },
] as const;

export const skillGroups = {
  "Linux & Systems": ["Red Hat", "CentOS", "Linux Administration"],
  Programming: ["Python", "Java 17", "Bash", "SQL", "TypeScript"],
  Observability: ["AWS CloudWatch", "Splunk", "Grafana", "Prometheus"],
  Databases: ["Oracle SQL", "DynamoDB", "SAS", "ETL"],
  "Incident & Change": ["On-call Response", "Incident Triage", "Root-cause Analysis", "ServiceNow"],
  "CI/CD & Cloud": ["Git", "GitHub Actions", "Azure DevOps", "AWS EC2", "S3", "Lambda", "IAM", "VPC", "Azure", "Docker"],
  "AI Operations": ["Claude Code", "GenAI Agents", "AI-assisted Tooling"],
} as const;

export type Credential = {
  name: string;
  issuer: string;
  date: string;
  type: "Certification" | "Education";
  /** Link to the certificate, shown as "View credential". */
  url?: string;
  credentialId?: string;
};

export const credentials: Credential[] = [
  { name: "B.E. Mechanical Engineering", issuer: "Francis Xavier Engineering College", date: "2018 — 2022 · CGPA: 8.42", type: "Education" },
  { name: "Higher Secondary — Computer Science", issuer: "Keins Matric Hr. Sec. School", date: "Score: 85.25%", type: "Education" },
  { name: "Microsoft Azure Fundamentals (AZ-900)", issuer: "Microsoft", date: "Mar 2022", type: "Certification", credentialId: "wa7LS-Fa4F", url: "https://drive.google.com/file/d/1B1-GmgKSbaZCnOF_wv7XpkXd8LmN7en8/view" },
  { name: "Flutter Developer", issuer: "Besant Technologies", date: "2022", type: "Certification", url: "https://drive.google.com/file/d/1f0vyupqh3Tf4KXnnzrQtBGMUiPzxuRwN/view" },
  { name: "UX Design & Graphic Design", issuer: "GrowthSchool", date: "January 2023", type: "Certification", url: "https://api.growthschool.io/certificate/22259bfe-0ffc-4e02-a765-7fd986300aaa" },
  { name: "Azure Data Engineer Associate", issuer: "Microsoft", date: "Certified", type: "Certification", url: "https://drive.google.com/file/d/1HwgCl99hRXOc8C6sxFBe_SItNWRt1Cf8/view" },
  { name: "Azure Kubernetes Services with DevOps & Terraform", issuer: "Udemy", date: "Certified", type: "Certification", url: "https://drive.google.com/file/d/1O5tQB1wUhUtIseTwxbuxmCSGGDU_XFCH/view" },
  { name: "Postman API Fundamentals", issuer: "Postman", date: "June 2024", type: "Certification", url: "https://drive.google.com/file/d/1RnFWJczhrAEWJL2eMSOCM6fsa1i7wdYW/view" },
  { name: "Python Basic", issuer: "HackerRank", date: "Dec 2022", type: "Certification", credentialId: "B2ADA14D7F9F" },
  { name: "Introduction to Cloud Computing", issuer: "Simplilearn", date: "Certified", type: "Certification", url: "https://certificates.simplicdn.net/share/3293305_1646407962.pdf" },
];
