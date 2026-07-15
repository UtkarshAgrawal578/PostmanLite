import { resolveVariables, resolveVariablesDeep } from "./lib/resolveVariables.js";
import { highlightJson } from "./lib/jsonHighlight.js";
import "./components/envSelector.js";
import {
  setOnLoadRequest,
  saveRequestToCollection,
  pushHistoryEntry,
} from "./components/sidebar.js";

const RELAY_URL = "http://localhost:5000/api/relay";

const methodSelect = document.getElementById("method-select");
const urlInput = document.getElementById("url-input");
const sendBtn = document.getElementById("send-btn");

const builderTabs = document.querySelectorAll(".builder-tab");
const builderPanels = document.querySelectorAll(".builder-panel");

const paramsBody = document.getElementById("params-body");
const addParamRowBtn = document.getElementById("add-param-row");
const paramsCount = document.getElementById("params-count");

const headersBody = document.getElementById("headers-body");
const addHeaderRowBtn = document.getElementById("add-header-row");
const headersCount = document.getElementById("headers-count");

const bodyModeRadios = document.querySelectorAll('input[name="body-mode"]');
const bodyJsonEl = document.getElementById("body-json");
const bodyRawEl = document.getElementById("body-raw");
const formDataTable = document.getElementById("form-data-table");
const formDataBody = document.getElementById("form-data-body");
const addFormRowBtn = document.getElementById("add-form-row");
const bodyNoneHint = document.getElementById("body-none-hint");

const authTypeSelect = document.getElementById("auth-type-select");
const authFields = document.getElementById("auth-fields");

const responseEmpty = document.getElementById("response-empty");
const responseContent = document.getElementById("response-content");
const responseStatus = document.getElementById("response-status");
const responseTime = document.getElementById("response-time");
const responseSize = document.getElementById("response-size");

const responseTabs = document.querySelectorAll(".response-tab");
const responsePanels = document.querySelectorAll(".response-panel");
const responseBodyContent = document.getElementById("response-body-content");
const responseHeadersBody = document.getElementById("response-headers-body");
const respHeadersCount = document.getElementById("resp-headers-count");

// ---------------------------------------------------------
// Generic tab-switching (works for builder tabs and response tabs)
// ---------------------------------------------------------
function setupTabs(tabButtons, panels, panelPrefix) {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const panelId = `${panelPrefix}${btn.dataset.panel}`;
      document.getElementById(panelId).classList.add("active");
    });
  });
}

setupTabs(builderTabs, builderPanels, "panel-");
setupTabs(responseTabs, responsePanels, "resp-panel-");

// ---------------------------------------------------------
// Method select — color the dropdown based on chosen method
// ---------------------------------------------------------
function updateMethodColor() {
  const method = methodSelect.value.toLowerCase();
  methodSelect.className = `method-select ${method}`;
}
methodSelect.addEventListener("change", updateMethodColor);
updateMethodColor();

// ---------------------------------------------------------
// Key/Value row builder — shared by Params, Headers, Form Data
// ---------------------------------------------------------
function createKvRow(tbody, countEl, onChange) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="checkbox" checked /></td>
    <td><input type="text" class="kv-key" placeholder="Key" /></td>
    <td><input type="text" class="kv-value" placeholder="Value" /></td>
    <td><button type="button" class="row-delete-btn">&times;</button></td>
  `;

  const checkbox = row.querySelector('input[type="checkbox"]');
  const keyInput = row.querySelector(".kv-key");
  const valueInput = row.querySelector(".kv-value");
  const deleteBtn = row.querySelector(".row-delete-btn");

  const update = () => {
    if (onChange) onChange();
    updateKvCount(tbody, countEl);
  };

  checkbox.addEventListener("change", update);
  keyInput.addEventListener("input", update);
  valueInput.addEventListener("input", update);

  deleteBtn.addEventListener("click", () => {
    row.remove();
    update();
  });

  tbody.appendChild(row);
  return row;
}

function updateKvCount(tbody, countEl) {
  if (!countEl) return;
  const activeCount = [...tbody.querySelectorAll("tr")].filter((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const keyInput = row.querySelector(".kv-key");
    return checkbox.checked && keyInput.value.trim() !== "";
  }).length;
  countEl.textContent = activeCount > 0 ? activeCount : "";
}

// Reads all enabled, non-empty key/value rows from a tbody into an object
function readKvRows(tbody) {
  const result = {};
  tbody.querySelectorAll("tr").forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const keyInput = row.querySelector(".kv-key");
    const valueInput = row.querySelector(".kv-value");
    if (checkbox.checked && keyInput.value.trim() !== "") {
      result[keyInput.value.trim()] = valueInput.value;
    }
  });
  return result;
}

// ---------------------------------------------------------
// Params
// ---------------------------------------------------------
addParamRowBtn.addEventListener("click", () => {
  createKvRow(paramsBody, paramsCount);
});
createKvRow(paramsBody, paramsCount); // start with one empty row

// ---------------------------------------------------------
// Headers
// ---------------------------------------------------------
addHeaderRowBtn.addEventListener("click", () => {
  createKvRow(headersBody, headersCount);
});
createKvRow(headersBody, headersCount); // start with one empty row

// ---------------------------------------------------------
// Body mode switching (None / JSON / Raw / Form Data)
// ---------------------------------------------------------
function updateBodyMode() {
  const mode = document.querySelector('input[name="body-mode"]:checked').value;

  bodyJsonEl.style.display = mode === "json" ? "block" : "none";
  bodyRawEl.style.display = mode === "raw" ? "block" : "none";
  formDataTable.style.display = mode === "form" ? "table" : "none";
  addFormRowBtn.style.display = mode === "form" ? "inline-block" : "none";
  bodyNoneHint.style.display = mode === "none" ? "block" : "none";
}
bodyModeRadios.forEach((radio) => radio.addEventListener("change", updateBodyMode));
updateBodyMode();

addFormRowBtn.addEventListener("click", () => {
  createKvRow(formDataBody, null);
});
createKvRow(formDataBody, null); // start with one empty row

// ---------------------------------------------------------
// Auth panel — render fields based on selected auth type
// ---------------------------------------------------------
function renderAuthFields() {
  const type = authTypeSelect.value;

  if (type === "none") {
    authFields.innerHTML = `<p class="empty-hint">No authentication will be sent with this request.</p>`;
    return;
  }

  if (type === "bearer") {
    authFields.innerHTML = `
      <div>
        <label class="auth-field-label">Token</label>
        <input type="text" id="auth-bearer-token" class="text-input" placeholder="{{TOKEN}}" style="width:100%;" />
      </div>
    `;
    return;
  }

  if (type === "basic") {
    authFields.innerHTML = `
      <div>
        <label class="auth-field-label">Username</label>
        <input type="text" id="auth-basic-username" class="text-input" placeholder="Username" style="width:100%;" />
      </div>
      <div>
        <label class="auth-field-label">Password</label>
        <input type="password" id="auth-basic-password" class="text-input" placeholder="Password" style="width:100%;" />
      </div>
    `;
    return;
  }

  if (type === "apikey") {
    authFields.innerHTML = `
      <div>
        <label class="auth-field-label">Key</label>
        <input type="text" id="auth-apikey-key" class="text-input" placeholder="X-API-Key" style="width:100%;" />
      </div>
      <div>
        <label class="auth-field-label">Value</label>
        <input type="text" id="auth-apikey-value" class="text-input" placeholder="{{API_KEY}}" style="width:100%;" />
      </div>
    `;
    return;
  }
}
authTypeSelect.addEventListener("change", renderAuthFields);
renderAuthFields();

// Turns the selected auth type + fields into extra headers to merge in
function getAuthHeaders() {
  const type = authTypeSelect.value;

  if (type === "bearer") {
    const token = document.getElementById("auth-bearer-token")?.value || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  if (type === "basic") {
    const username = document.getElementById("auth-basic-username")?.value || "";
    const password = document.getElementById("auth-basic-password")?.value || "";
    if (!username && !password) return {};
    const encoded = btoa(`${username}:${password}`);
    return { Authorization: `Basic ${encoded}` };
  }

  if (type === "apikey") {
    const key = document.getElementById("auth-apikey-key")?.value || "";
    const value = document.getElementById("auth-apikey-value")?.value || "";
    return key ? { [key]: value } : {};
  }

  return {};
}

// ---------------------------------------------------------
// Build final URL with query params appended
// ---------------------------------------------------------
function buildFinalUrl() {
  const rawUrl = urlInput.value.trim();
  if (!rawUrl) return "";

  const baseUrl = resolveVariables(rawUrl);
  const params = resolveVariablesDeep(readKvRows(paramsBody));
  const paramEntries = Object.entries(params);
  if (paramEntries.length === 0) return baseUrl;

  try {
    const url = new URL(baseUrl);
    paramEntries.forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    // baseUrl might not be a valid absolute URL yet (e.g. still typing) — send as-is
    return baseUrl;
  }
}

// ---------------------------------------------------------
// Build request body based on selected mode
// ---------------------------------------------------------
function buildRequestBody() {
  const mode = document.querySelector('input[name="body-mode"]:checked').value;

  if (mode === "none") return undefined;

  if (mode === "json") {
    const raw = bodyJsonEl.value.trim();
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Body is not valid JSON");
    }
  }

  if (mode === "raw") {
    return bodyRawEl.value;
  }

  if (mode === "form") {
    return readKvRows(formDataBody);
  }

  return undefined;
}

// ---------------------------------------------------------
// Send request — calls the backend relay
// ---------------------------------------------------------
sendBtn.addEventListener("click", async () => {
  const url = buildFinalUrl();
  if (!url) {
    alert("Please enter a URL");
    return;
  }

  const method = methodSelect.value;
  const headers = resolveVariablesDeep({
    ...readKvRows(headersBody),
    ...getAuthHeaders(),
  });

  let body;
  try {
    body = buildRequestBody();
    body = resolveVariablesDeep(body);
  } catch (err) {
    alert(err.message);
    return;
  }

  setLoadingState(true);

  const bodyMode = document.querySelector('input[name="body-mode"]:checked').value;

  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, url, headers, body, bodyMode }),
    });

    const data = await res.json();
    renderResponse(data);

    pushHistoryEntry({
      method,
      url,
      status: data.status,
      time: data.time,
      requestSnapshot: getCurrentRequestSnapshot(),
    });
  } catch (err) {
    renderError(err.message);
  } finally {
    setLoadingState(false);
  }
});

function setLoadingState(isLoading) {
  sendBtn.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Sending..." : "Send";
  sendBtn.classList.toggle("loading", isLoading);
}

// ---------------------------------------------------------
// Render response into the Response Viewer
// ---------------------------------------------------------
function renderResponse(data) {
  responseEmpty.style.display = "none";
  responseContent.style.display = "block";

  if (data.error) {
    renderError(data.details || data.error);
    return;
  }

  // Status pill
  responseStatus.textContent = `${data.status} ${data.statusText || ""}`.trim();
  responseStatus.className = "status-pill " + statusClass(data.status);

  // Meta
  responseTime.textContent = `${data.time} ms`;
  responseSize.textContent = formatBytes(data.size);

  // Body — pretty print and syntax-highlight JSON, plain text otherwise
  if (typeof data.body === "string") {
    responseBodyContent.textContent = data.body;
  } else {
    const bodyText = JSON.stringify(data.body, null, 2);
    responseBodyContent.innerHTML = highlightJson(bodyText);
  }

  // Headers table
  responseHeadersBody.innerHTML = "";
  const headerEntries = Object.entries(data.headers || {});
  headerEntries.forEach(([key, value]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td>`;
    responseHeadersBody.appendChild(row);
  });
  respHeadersCount.textContent = headerEntries.length > 0 ? headerEntries.length : "";
}

function renderError(message) {
  responseEmpty.style.display = "none";
  responseContent.style.display = "block";

  responseStatus.textContent = "Error";
  responseStatus.className = "status-pill status-err";
  responseTime.textContent = "—";
  responseSize.textContent = "—";
  responseBodyContent.textContent = message;
  responseHeadersBody.innerHTML = "";
  respHeadersCount.textContent = "";
}

function statusClass(status) {
  if (status >= 200 && status < 300) return "status-2xx";
  if (status >= 300 && status < 400) return "status-3xx";
  if (status >= 400 && status < 500) return "status-4xx";
  if (status >= 500) return "status-5xx";
  return "status-err";
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// Snapshot of the current builder state — used by Save + History
// ---------------------------------------------------------
function getCurrentRequestSnapshot() {
  return {
    method: methodSelect.value,
    url: urlInput.value.trim(),
    params: readKvRows(paramsBody),
    headers: readKvRows(headersBody),
    bodyMode: document.querySelector('input[name="body-mode"]:checked').value,
    body: {
      json: bodyJsonEl.value,
      raw: bodyRawEl.value,
      form: readKvRows(formDataBody),
    },
    auth: {
      type: authTypeSelect.value,
      bearerToken: document.getElementById("auth-bearer-token")?.value || "",
      basicUsername: document.getElementById("auth-basic-username")?.value || "",
      basicPassword: document.getElementById("auth-basic-password")?.value || "",
      apiKeyKey: document.getElementById("auth-apikey-key")?.value || "",
      apiKeyValue: document.getElementById("auth-apikey-value")?.value || "",
    },
  };
}

// Loads a saved snapshot (from a collection or history) back into the builder
function loadRequestSnapshot(snapshot) {
  if (!snapshot) return;

  methodSelect.value = snapshot.method || "GET";
  updateMethodColor();
  urlInput.value = snapshot.url || "";

  fillKvTable(paramsBody, snapshot.params, paramsCount);
  fillKvTable(headersBody, snapshot.headers, headersCount);

  const modeRadio = document.querySelector(`input[name="body-mode"][value="${snapshot.bodyMode || "none"}"]`);
  if (modeRadio) modeRadio.checked = true;
  bodyJsonEl.value = snapshot.body?.json || "";
  bodyRawEl.value = snapshot.body?.raw || "";
  fillKvTable(formDataBody, snapshot.body?.form, null);
  updateBodyMode();

  authTypeSelect.value = snapshot.auth?.type || "none";
  renderAuthFields();
  if (snapshot.auth?.type === "bearer") {
    document.getElementById("auth-bearer-token").value = snapshot.auth.bearerToken || "";
  } else if (snapshot.auth?.type === "basic") {
    document.getElementById("auth-basic-username").value = snapshot.auth.basicUsername || "";
    document.getElementById("auth-basic-password").value = snapshot.auth.basicPassword || "";
  } else if (snapshot.auth?.type === "apikey") {
    document.getElementById("auth-apikey-key").value = snapshot.auth.apiKeyKey || "";
    document.getElementById("auth-apikey-value").value = snapshot.auth.apiKeyValue || "";
  }
}

function fillKvTable(tbody, dataObj, countEl) {
  tbody.innerHTML = "";
  const entries = Object.entries(dataObj || {});
  if (entries.length === 0) {
    createKvRow(tbody, countEl);
    return;
  }
  entries.forEach(([key, value]) => {
    const row = createKvRow(tbody, countEl);
    row.querySelector(".kv-key").value = key;
    row.querySelector(".kv-value").value = value;
  });
  updateKvCount(tbody, countEl);
}

setOnLoadRequest(loadRequestSnapshot);

// ---------------------------------------------------------
// Save button — saves the current request into a collection
// ---------------------------------------------------------
const saveBtn = document.getElementById("save-btn");
saveBtn.addEventListener("click", () => {
  const snapshot = getCurrentRequestSnapshot();
  if (!snapshot.url) {
    alert("Enter a URL before saving");
    return;
  }
  saveRequestToCollection(snapshot);
});
