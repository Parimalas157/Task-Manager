import { useState } from "react";

export default function TaskModal({
  task,
  members,
  onClose,
  onSave,
  onDelete,
  onAddComment,
}) {
  const isNew = !task?.id;
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "todo");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || "");
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.substring(0, 10) : ""
  );
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onAddComment(commentText.trim());
    setCommentText("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? "New Task" : "Edit Task"}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            placeholder="Task title"
          />

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add more detail..."
          />

          <div className="form-row">
            <div>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            {!isNew && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(task.id)}
              >
                Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>

        {!isNew && (
          <div className="comments-section">
            <h3>Comments</h3>
            <div className="comments-list">
              {task.comments?.length === 0 && (
                <p className="text-muted">No comments yet.</p>
              )}
              {task.comments?.map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-header">
                    <strong>{c.author_name}</strong>
                    <span className="text-muted">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
            <form className="comment-form" onSubmit={handleAddComment}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
              />
              <button type="submit" className="btn btn-secondary">
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
