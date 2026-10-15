import { redirect } from "next/navigation";

// Keep old bookmarks working without displaying a password form.
export default function Login() {
  redirect("/");
}
