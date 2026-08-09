import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><p>MODULE / 404</p><h1>This block isn’t in the system.</h1><Link className="button primary" href="/">Return home</Link></main>;
}
