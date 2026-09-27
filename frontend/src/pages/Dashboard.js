import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchProjects, createProject, deleteProject } from "../api/endpoints";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetchProjects();
      setProjects(res.data);
    } catch (err) {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createProject({ name, description });
      setName("");
      setDescription("");
      setShowModal(false);
      loadProjects();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create project.");
    }
  };

  const handleDelete = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this project and all its tasks?")) return;
    await deleteProject(projectId);
    loadProjects();
  };

  const totalTasks = (counts) =>
    Object.values(counts || {}).reduce((sum, n) => sum + n, 0);

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1>Your Projects</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>You don't have any projects yet.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <Link to={`/projects/${project.id}`} key={project.id} className="project-card">
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <button
                    className="btn-icon"
                    title="Delete project"
                    onClick={(e) => handleDelete(e, project.id)}
                  >
                    🗑
                  </button>
                </div>
                <p className="project-description">
                  {project.description || "No description"}
                </p>
                <div className="project-meta">
                  <span className="badge badge-todo">
                    {project.task_counts?.todo || 0} To Do
                  </span>
                  <span className="badge badge-progress">
                    {project.task_counts?.in_progress || 0} In Progress
                  </span>
                  <span className="badge badge-done">
                    {project.task_counts?.done || 0} Done
                  </span>
                </div>
                <div className="project-footer">
                  {totalTasks(project.task_counts)} total tasks
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2>Create a new project</h2>
            <label>Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Website Redesign"
              autoFocus
            />
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
