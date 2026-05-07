import { redirect } from "next/navigation";

export default function CelebrationsIndex() {
  redirect("/admin/celebrations/preview");
}
