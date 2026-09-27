import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = {
  "To Do": "#94a3b8",
  "In Progress": "#f59e0b",
  Done: "#22c55e",
};

export default function AnalyticsChart({ tasks }) {
  const data = [
    { name: "To Do", count: tasks.filter((t) => t.status === "todo").length },
    {
      name: "In Progress",
      count: tasks.filter((t) => t.status === "in_progress").length,
    },
    { name: "Done", count: tasks.filter((t) => t.status === "done").length },
  ];

  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  ).length;

  return (
    <div className="analytics-panel">
      <div className="analytics-chart">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="analytics-stats">
        <div className="stat">
          <span className="stat-value">{tasks.length}</span>
          <span className="stat-label">Total tasks</span>
        </div>
        <div className="stat">
          <span className="stat-value">{overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>
    </div>
  );
}
