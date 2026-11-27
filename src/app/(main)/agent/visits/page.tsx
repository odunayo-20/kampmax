import { AgentVisits } from "@/components/accommodation/AgentVisits";

export default function AgentVisitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">Visits</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Students asking to see your places, and visits you have arranged. Open one to answer it.</p>
      </div>
      <AgentVisits />
    </div>
  );
}
