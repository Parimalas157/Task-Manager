import api from "./axios";

// ---- Auth ----
export const registerUser = (data) => api.post("/auth/register", data);

export const loginUser = (email, password) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const getCurrentUser = () => api.get("/auth/me");

// ---- Users ----
export const searchUsers = (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`);

// ---- Projects ----
export const fetchProjects = () => api.get("/projects");
export const fetchProject = (projectId) => api.get(`/projects/${projectId}`);
export const createProject = (data) => api.post("/projects", data);
export const updateProject = (projectId, data) => api.patch(`/projects/${projectId}`, data);
export const deleteProject = (projectId) => api.delete(`/projects/${projectId}`);
export const addProjectMember = (projectId, email) =>
  api.post(`/projects/${projectId}/members`, { email });
export const removeProjectMember = (projectId, memberId) =>
  api.delete(`/projects/${projectId}/members/${memberId}`);

// ---- Tasks ----
export const fetchTasks = (projectId) => api.get(`/projects/${projectId}/tasks`);
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data);
export const updateTask = (projectId, taskId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}`, data);
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`);
export const addComment = (projectId, taskId, text) =>
  api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { text });
