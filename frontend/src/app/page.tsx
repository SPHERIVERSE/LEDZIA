import { redirect } from "next/navigation";

export default function Home() {
  // Instantly redirect any visits to the root URL straight to the login portal
  redirect("/auth/login");
}
