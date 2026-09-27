const priorityColors = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
};

export default function TaskCard({ task, onClick, onDragStart, members }) {
  const assignee = members.find((m) => m.id === task.assignee_id);

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
    >
      <div className="task-card-top">
        <span className={`priority-dot ${priorityColors[task.priority]}`} />
        <span className="task-title">{task.title}</span>
      </div>

      {task.due_date && (
        <div className="task-due">
          Due {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}

      <div className="task-card-footer">
        {task.comments?.length > 0 && (
          <span className="task-comment-count">💬 {task.comments.length}</span>
        )}
        {assignee && (
          <span className="avatar" title={assignee.name}>
            {assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
