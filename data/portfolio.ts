export const profile = {
  name: "Karthick S",
  role: "Software Application Engineer II",
  email: "karthic1704@gmail.com",
  github: "https://github.com/Karthick1704",
  linkedin: "https://www.linkedin.com/in/karthi1704--/",
  dribbble: "https://dribbble.com/Designer_2317",
};

export const experience = [
  { company: "Amazon", role: "Software Application Engineer II", period: "July 2025 — Present", summary: "Enhancing Amazon Stores for cross-regional flexibility, improving customer experience and API availability while reducing latency. Handling business-critical risks and customer incidents across distributed systems.", tech: ["Distributed Systems", "APIs", "Amazon Stores"] },
  { company: "Tata Consultancy Services", role: "System Engineer", period: "May 2024 — May 2025", summary: "Managed ServiceNow incidents, application enhancements and proactive log monitoring in the healthcare domain. Led database optimizations using Oracle SQL and SAS analytics.", tech: ["ServiceNow", "Oracle SQL", "SAS", "Splunk"] },
  { company: "Tata Consultancy Services", role: "Linux System Administrator", period: "January 2023 — May 2024", summary: "Administered Azure and AWS cloud platforms across services, storage and networking. Built and maintained Azure DevOps CI/CD pipelines for automated testing and deployment.", tech: ["Azure", "AWS", "Docker", "Kubernetes", "Terraform"] },
  { company: "Tata Consultancy Services", role: "Assistant System Engineer Trainee", period: "July 2022 — December 2022", summary: "Focused on resource management and workflow automation, building Excel-based tools that streamlined reporting and reduced manual work for large-scale operations.", tech: ["Excel Automation", "Resource Management"] },
] as const;

export const projects = [
  { name: "UI/UX Design Portfolio", description: "A curated collection of original and inspired mobile interfaces, dashboard concepts and interaction patterns.", problem: "Exploring clear, considered digital experiences across varied interface contexts.", contribution: "Designed interface concepts, user flows and interactive prototypes.", tech: ["Figma", "UI Design", "UX Research", "Prototyping"], link: profile.dribbble, action: "View on Dribbble", status: "Published", image: "/projects/dribbble.jpg" },
  { name: "KartChatApp", description: "A real-time chat application with authentication, live database syncing and a clean material interface.", problem: "Enabling straightforward instant messaging across devices.", contribution: "Built the application experience and Firebase-backed real-time flow.", tech: ["Flutter", "Dart", "Firebase", "Real-time DB"], link: "https://github.com/Karthick1704/Kart-ChatApp-Model-Flutter", action: "View on GitHub", status: "Repository", image: "/projects/kart.jpg" },
] as const;

export const skillGroups = {
  Cloud: ["AWS EC2", "S3", "RDS", "Lambda", "CloudFormation", "CloudWatch", "Azure VM", "AKS", "Azure Key Vault", "GCP"],
  DevOps: ["Docker", "Kubernetes", "Terraform", "Jenkins", "Git", "CI/CD Pipelines", "Azure DevOps"],
  Programming: ["Java", "Python", "Dart", "Bash", "PowerShell", "Oracle SQL", "MySQL"],
  Tools: ["ServiceNow", "Splunk", "Prometheus", "Grafana", "GitHub", "GitLab", "Firebase", "Flutter"],
  AI: ["Prompt Engineering", "LLM Integration", "ChatGPT API", "AI Automation", "NLP Basics", "Data Analysis", "ML Concepts"],
  Systems: ["Red Hat Linux", "Ubuntu", "Linux Administration", "Figma", "UI/UX Design"],
} as const;

export const credentials = [
  { name: "B.E. Mechanical Engineering", issuer: "Francis Xavier Engineering College", date: "2018 — 2022 · CGPA: 8.42", type: "Education" },
  { name: "Higher Secondary — Computer Science", issuer: "Keins Matric Hr. Sec. School", date: "Score: 85.25%", type: "Education" },
  { name: "UX Design & Graphic Design", issuer: "GrowthSchool", date: "January 2023", type: "Certification" },
  { name: "Azure Data Engineer Associate", issuer: "Microsoft", date: "Certified", type: "Certification" },
  { name: "Azure Kubernetes Services with DevOps & Terraform", issuer: "Udemy", date: "Certified", type: "Certification" },
  { name: "Postman API Fundamentals", issuer: "Postman", date: "June 2024", type: "Certification" },
  { name: "Python Basic", issuer: "HackerRank", date: "Certified", type: "Certification" },
  { name: "Introduction to Cloud Computing", issuer: "Simplilearn", date: "Certified", type: "Certification" },
] as const;
