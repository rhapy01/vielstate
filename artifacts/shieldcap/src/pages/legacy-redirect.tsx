import { Redirect } from "wouter";

export default function LegacyRedirect({ to }: { to: string }) {
  return <Redirect to={to} />;
}
