import { uuid } from "../utils/uuid.js";
import {
  getCollections,
  saveCollections,
  getHistory,
  addHistoryEntry,
} from "../state/storage.js";

const collectionsTree = document.getElementById("collections-tree");
const newCollectionBtn = document.getElementById("new-collection-btn");
const historyList = document.getElementById("history-list");

// A callback the main app can register so clicking a saved request
// or history row loads it back into the builder.
let onLoadRequest = () => {};
export function setOnLoadRequest(fn) {
  onLoadRequest = fn;
}

// ---------------------------------------------------------
// Collections tree
// ---------------------------------------------------------
export function renderCollections() {
  const collections = getCollections();

  if (collections.length === 0) {
    collectionsTree.innerHTML = `<p class="empty-hint">No collections yet. Create one to organize requests.</p>`;
    return;
  }

  collectionsTree.innerHTML = "";

  collections.forEach((collection) => {
    const item = document.createElement("div");
    item.className = "collection-item";

    const header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML = `
      <span class="collection-caret">&#9656;</span>
      <span>${escapeHtml(collection.name)}</span>
    `;
    header.addEventListener("click", () => item.classList.toggle("open"));

    const requestsWrap = document.createElement("div");
    requestsWrap.className = "collection-requests";

    if (collection.requests.length === 0) {
      requestsWrap.innerHTML = `<p class="empty-hint">No saved requests yet.</p>`;
    } else {
      collection.requests.forEach((req) => {
        const row = document.createElement("div");
        row.className = "saved-request-row";
        row.innerHTML = `
          <span class="req-method m-${req.method}">${req.method}</span>
          <span class="req-name">${escapeHtml(req.name || req.url)}</span>
        `;
        row.addEventListener("click", () => onLoadRequest(req));
        requestsWrap.appendChild(row);
      });
    }

    item.appendChild(header);
    item.appendChild(requestsWrap);
    collectionsTree.appendChild(item);
  });
}

newCollectionBtn.addEventListener("click", () => {
  const name = prompt("Collection name:");
  if (!name || !name.trim()) return;

  const collections = getCollections();
  collections.push({ id: uuid("col"), name: name.trim(), requests: [] });
  saveCollections(collections);
  renderCollections();
});

// Saves a request snapshot into a collection (creates one if none exist yet).
// requestData shape: { method, url, params, headers, auth, body }
export function saveRequestToCollection(requestData) {
  const collections = getCollections();

  let collectionId;
  if (collections.length === 0) {
    const name = prompt("No collections yet. Name your first collection:");
    if (!name || !name.trim()) return;
    const newCollection = { id: uuid("col"), name: name.trim(), requests: [] };
    collections.push(newCollection);
    collectionId = newCollection.id;
  } else {
    const names = collections.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    const choice = prompt(`Save to which collection?\n${names}\n\nEnter a number:`, "1");
    const index = parseInt(choice, 10) - 1;
    if (isNaN(index) || !collections[index]) return;
    collectionId = collections[index].id;
  }

  const requestName = prompt("Request name:", requestData.url) || requestData.url;

  const collection = collections.find((c) => c.id === collectionId);
  collection.requests.push({
    id: uuid("req"),
    name: requestName,
    ...requestData,
  });

  saveCollections(collections);
  renderCollections();
}

// ---------------------------------------------------------
// History
// ---------------------------------------------------------
export function renderHistory() {
  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML = `<p class="empty-hint">Requests you send will show up here.</p>`;
    return;
  }

  historyList.innerHTML = "";

  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "history-row";
    const statusClass = entry.status && entry.status < 400 ? "ok" : "err";
    row.innerHTML = `
      <span class="req-method m-${entry.method}">${entry.method}</span>
      <span class="req-url">${escapeHtml(entry.url)}</span>
      <span class="req-status ${statusClass}">${entry.status ?? "ERR"}</span>
    `;
    row.addEventListener("click", () => onLoadRequest(entry.requestSnapshot));
    historyList.appendChild(row);
  });
}

// Called by main.js right after a response comes back
export function pushHistoryEntry({ method, url, status, time, requestSnapshot }) {
  addHistoryEntry({
    id: uuid("hist"),
    method,
    url,
    status,
    time,
    timestamp: Date.now(),
    requestSnapshot,
  });
  renderHistory();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
renderCollections();
renderHistory();
