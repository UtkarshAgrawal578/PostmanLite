import { uuid } from "../utils/uuid.js";
import {
  getEnvironments,
  saveEnvironments,
  getActiveEnvId,
  saveActiveEnvId,
} from "../state/storage.js";

const envSelect = document.getElementById("env-select");
const editEnvBtn = document.getElementById("edit-env-btn");

const envModal = document.getElementById("env-modal");
const closeEnvModalBtn = document.getElementById("close-env-modal");
const newEnvNameInput = document.getElementById("new-env-name");
const createEnvBtn = document.getElementById("create-env-btn");
const envVarsBody = document.getElementById("env-vars-body");
const addEnvVarRowBtn = document.getElementById("add-env-var-row");

let modalActiveEnvId = null; // which env's variables the modal is currently editing

// ---------------------------------------------------------
// Dropdown: populate + handle selection
// ---------------------------------------------------------
export function renderEnvSelect() {
  const envs = getEnvironments();
  const activeId = getActiveEnvId();

  envSelect.innerHTML = `<option value="">No Environment</option>`;
  envs.forEach((env) => {
    const opt = document.createElement("option");
    opt.value = env.id;
    opt.textContent = env.name;
    if (env.id === activeId) opt.selected = true;
    envSelect.appendChild(opt);
  });
}

envSelect.addEventListener("change", () => {
  saveActiveEnvId(envSelect.value || null);
});

// ---------------------------------------------------------
// Modal open/close
// ---------------------------------------------------------
editEnvBtn.addEventListener("click", () => {
  const envs = getEnvironments();
  const activeId = getActiveEnvId();
  modalActiveEnvId = activeId || (envs[0] && envs[0].id) || null;

  envModal.style.display = "flex";
  renderEnvVarsTable();
});

closeEnvModalBtn.addEventListener("click", () => {
  envModal.style.display = "none";
});

envModal.addEventListener("click", (e) => {
  if (e.target === envModal) envModal.style.display = "none"; // click outside closes it
});

// ---------------------------------------------------------
// Create a new environment
// ---------------------------------------------------------
createEnvBtn.addEventListener("click", () => {
  const name = newEnvNameInput.value.trim();
  if (!name) return;

  const envs = getEnvironments();
  const newEnv = { id: uuid("env"), name, variables: {} };
  envs.push(newEnv);
  saveEnvironments(envs);

  modalActiveEnvId = newEnv.id;
  newEnvNameInput.value = "";

  renderEnvSelect();
  renderEnvVarsTable();

  // if this is the first environment created, make it active automatically
  if (envs.length === 1) {
    saveActiveEnvId(newEnv.id);
    renderEnvSelect();
  }
});

// ---------------------------------------------------------
// Variable rows inside the modal
// ---------------------------------------------------------
function renderEnvVarsTable() {
  envVarsBody.innerHTML = "";

  const envs = getEnvironments();
  const env = envs.find((e) => e.id === modalActiveEnvId);

  if (!env) {
    envVarsBody.innerHTML = `<tr><td colspan="3" class="empty-hint">Create an environment above first.</td></tr>`;
    addEnvVarRowBtn.style.display = "none";
    return;
  }

  addEnvVarRowBtn.style.display = "inline-block";

  const entries = Object.entries(env.variables);
  if (entries.length === 0) {
    addVarRow("", "");
  } else {
    entries.forEach(([key, value]) => addVarRow(key, value));
  }
}

function addVarRow(key = "", value = "") {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" class="env-var-key text-input" placeholder="BASE_URL" value="${escapeHtml(key)}" /></td>
    <td><input type="text" class="env-var-value text-input" placeholder="http://localhost:5000" value="${escapeHtml(value)}" /></td>
    <td><button type="button" class="row-delete-btn">&times;</button></td>
  `;

  const keyInput = row.querySelector(".env-var-key");
  const valueInput = row.querySelector(".env-var-value");
  const deleteBtn = row.querySelector(".row-delete-btn");

  keyInput.addEventListener("input", persistEnvVars);
  valueInput.addEventListener("input", persistEnvVars);
  deleteBtn.addEventListener("click", () => {
    row.remove();
    persistEnvVars();
  });

  envVarsBody.appendChild(row);
}

addEnvVarRowBtn.addEventListener("click", () => addVarRow());

function persistEnvVars() {
  if (!modalActiveEnvId) return;

  const envs = getEnvironments();
  const env = envs.find((e) => e.id === modalActiveEnvId);
  if (!env) return;

  const variables = {};
  envVarsBody.querySelectorAll("tr").forEach((row) => {
    const key = row.querySelector(".env-var-key")?.value.trim();
    const value = row.querySelector(".env-var-value")?.value ?? "";
    if (key) variables[key] = value;
  });

  env.variables = variables;
  saveEnvironments(envs);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
renderEnvSelect();
