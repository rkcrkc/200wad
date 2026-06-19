import { getAllLeaguesAdmin } from "@/lib/queries/leaderboard";
import { LeaguesClient } from "./LeaguesClient";

export default async function AdminLeaguesPage() {
  const leagues = await getAllLeaguesAdmin();

  return (
    <div>
      <LeaguesClient leagues={leagues} />
    </div>
  );
}
