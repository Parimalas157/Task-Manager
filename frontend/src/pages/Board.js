import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import AnalyticsChart from "../components/AnalyticsChart";
import { WS_BASE_URL } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  fetchProject,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  addProjectMember,
  removeProjectMember,
} from "../api/endpoints";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function Board() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const wsRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, tasksRes] = await Promise.all([
        fetchProject(projectId),
        fetchTasks(projectId),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        navigate("/dashboard");
      }
      setError("Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/projects/${projectId}?token=${token}`
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "task_created") {
        setTasks((prev) => {
          if (prev.some((t) => t.id === msg.task.id)) return prev;
          return [...prev, msg.task];
        });
      } else if (msg.type === "task_updated") {
        setTasks((prev) =>
          prev.map((t) => (t.id === msg.task.id ? msg.task : t))
        );
      } else if (msg.type === "task_deleted") {
        setTasks((prev) => prev.filter((t) => t.id !== msg.task_id));
      }
    };

    return () => ws.close();
  }, [projectId]);

  const members = project
    ? [
        { id: project.owner_id, name: "Owner", email: "" },
        ...(project.member_ids || []).map((id) => ({ id, name: id, email: "" })),
      ]
    : [];

  // Resolve a friendlier member list including the current user's own name.
  const resolvedMembers = members.map((m) =>
    m.id === user?.id ? { ...m, name: `${user.name} (you)` } : m
  );

  const openNewTaskModal = (statusKey) => {
    setActiveTask(null);
    setNewTaskStatus(statusKey);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task) => {
    setActiveTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (data) => {
    if (activeTask) {
      const res = await updateTask(projectId, activeTask.id, data);
      setTasks((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
    } else {
      const res = await createTask(projectId, { ...data, status: newTaskStatus });
      setTasks((prev) => [...prev, res.data]);
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    await deleteTask(projectId, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setShowTaskModal(false);
  };

  const handleAddComment = async (text) => {
    const res = await addComment(projectId, activeTask.id, text);
    setActiveTask(res.data);
    setTasks((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
  };

  // --- Drag and drop (native HTML5 DnD, no extra library needed) ---
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDrop = async (e, statusKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === statusKey) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: statusKey } : t))
    );
    try {
      await updateTask(projectId, taskId, { status: statusKey });
    } catch {
      loadData(); // revert on failure
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    try {
      const res = await addProjectMember(projectId, inviteEmail);
      setProject(res.data);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err.response?.data?.detail || "Could not add member.");
    }
  };

  const handleRemoveMember = async (memberId) => {
    const res = await removeProjectMember(projectId, memberId);
    setProject(res.data);
  };

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <div className="container">
          <p>Loading board...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="page">
        <Navbar />
        <div className="container">
          <p className="alert alert-error">{error}</p>
        </div>
      </div>
    );
  }

  const isOwner = project?.owner_id === user?.id;

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <h1>{project.name}</h1>
            <p className="text-muted">{project.description}</p>
          </div>
          {isOwner && (
            <button className="btn btn-secondary" onClick={() => setShowMembers(true)}>
              👥 Manage Members
            </button>
          )}
        </div>

        <AnalyticsChart tasks={tasks} />

        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="kanban-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="kanban-column-header">
                  <h3>{col.label}</h3>
                  <span className="column-count">{columnTasks.length}</span>
                </div>

                <div className="kanban-column-body">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={openEditTaskModal}
                      onDragStart={handleDragStart}
                      members={resolvedMembers}
                    />
                  ))}
                </div>

                <button
                  className="btn btn-add-task"
                  onClick={() => openNewTaskModal(col.key)}
                >
                  + Add task
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          task={activeTask}
          members={resolvedMembers}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
        />
      )}

      {showMembers && (
        <div className="modal-overlay" onClick={() => setShowMembers(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Project Members</h2>
            <ul className="member-list">
              {resolvedMembers.map((m) => (
                <li key={m.id}>
                  {m.name}
                  {m.id !== project.owner_id && m.id !== user.id && (
                    <button
                      className="btn-icon"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {inviteError && <div className="alert alert-error">{inviteError}</div>}
            <form onSubmit={handleInvite} className="invite-form">
              <input
                type="email"
                placeholder="Invite by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                Add
              </button>
            </form>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowMembers(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
