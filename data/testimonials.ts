/**
 * Testimonials shown as hanging badges.
 *
 * Every entry below is a PLACEHOLDER. Replace name, designation, company and
 * testimonial with real details (with the person's permission) before relying
 * on this section. Leave `photo` as null to show the illustrated avatar, or
 * set it to an image path under /public (e.g. "/people/jane.jpg") or a URL.
 */
export type Testimonial = {
  id: string;
  name: string;
  designation: string;
  company?: string;
  photo: string | null;
  avatarGender: "male" | "female";
  /** Soft pastel shown behind the portrait. */
  accentColor: string;
  testimonial: string;
  /** Optional project or collaboration label on the back of the badge. */
  tag?: string;
};

export const testimonials: Testimonial[] = [
  {
    id: "01",
    name: "Placeholder Name 1",
    designation: "Manager's Role",
    company: "Company Name",
    photo: null,
    avatarGender: "female",
    accentColor: "#EDE9FE",
    testimonial: "[Placeholder] Replace this with a real quote from a manager: what you were trusted with, how you handled it, and the difference it made to the team.",
    tag: "Project / Team",
  },
  {
    id: "02",
    name: "Placeholder Name 2",
    designation: "Teammate's Role",
    company: "Company Name",
    photo: null,
    avatarGender: "male",
    accentColor: "#DCFCE7",
    testimonial: "[Placeholder] Replace this with a real quote from a teammate who shared an on-call rotation or an incident with you.",
    tag: "Project / Team",
  },
  {
    id: "03",
    name: "Placeholder Name 3",
    designation: "Colleague's Role",
    company: "Company Name",
    photo: null,
    avatarGender: "female",
    accentColor: "#FFE4D6",
    testimonial: "[Placeholder] Replace this with a real quote from a cross-team partner about working with you on a release, migration or fix.",
    tag: "Project / Team",
  },
  {
    id: "04",
    name: "Placeholder Name 4",
    designation: "Mentor's Role",
    company: "Company Name",
    photo: null,
    avatarGender: "male",
    accentColor: "#DBEAFE",
    testimonial: "[Placeholder] Replace this with a real quote from a mentor or senior engineer about how you learn and grow.",
    tag: "Project / Team",
  },
  {
    id: "05",
    name: "Placeholder Name 5",
    designation: "Client's Role",
    company: "Company Name",
    photo: null,
    avatarGender: "female",
    accentColor: "#FCE7F3",
    testimonial: "[Placeholder] Replace this with a real quote from a client or stakeholder you supported.",
    tag: "Project / Team",
  },
];
