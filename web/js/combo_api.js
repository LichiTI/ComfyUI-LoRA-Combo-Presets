const API_PREFIX = "/lora-combo-presets/api";

export async function listCombos() {
  const response = await fetch(`${API_PREFIX}/combos`);
  return await response.json();
}

export async function getCombo(comboId) {
  const response = await fetch(`${API_PREFIX}/combos/${encodeURIComponent(comboId)}`);
  return await response.json();
}

export async function getComboApplyPayload(comboId) {
  const response = await fetch(`${API_PREFIX}/combos/${encodeURIComponent(comboId)}/apply`);
  return await response.json();
}

export async function createCombo(payload) {
  const response = await fetch(`${API_PREFIX}/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await response.json();
}

export async function updateCombo(comboId, payload) {
  const response = await fetch(`${API_PREFIX}/combos/${encodeURIComponent(comboId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await response.json();
}

export async function deleteCombo(comboId) {
  const response = await fetch(`${API_PREFIX}/combos/${encodeURIComponent(comboId)}`, {
    method: "DELETE",
  });
  return await response.json();
}
