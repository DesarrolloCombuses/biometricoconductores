const config = window.APP_CONFIG || {};
const hasConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && !config.SUPABASE_URL.includes("PEGA_AQUI"));
const supabaseClient = hasConfig
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;
const BUK_OBRA_ID = 39305;
const SONAR_ASSIGN_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwjWOleTmh7hMK93tq4W7zJI_2IdpYN2NBitYLK77pswDj52B2U0W6vthkTrONFmVtWtQ/exec";
const FACE_FALLBACK_DELAY_MS = 5000;
const FACE_IMAGE_CHECK_TIMEOUT_MS = 4500;
const FACE_IDENTITY_TIMEOUT_MS = 6500;

const $ = (selector) => document.querySelector(selector);

if (window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) {
  document.documentElement.classList.add("touch-device");
}

const state = {
  user: null,
  colaborador: null,
  csvCandidate: null,
  compressedFile: null,
  faceValidated: false,
  faceWarning: "",
  currentLocation: null,
  isDriverCandidate: false,
  nextSentido: "entrada",
  currentHistory: [],
  historyPage: 1,
  historyPageSize: 10,
  historyTotal: 0,
  vehicles: [],
  vehiclesLoaded: false,
  attendanceSonarDriver: null,
  lastAttendance: null,
  cameraStream: null,
  cameraOpenedAt: 0,
  cameraFallbackTimer: null,
  liveDetectionRunning: false,
  liveFaceOk: false,
  serverClock: null,
  serverClockTimer: null,
  csvRows: [],
  csvLoaded: false,
  dniValidationTimer: null,
  visionTasks: null,
  faceDetector: null,
  faceDetectorReady: false,
  faceApiReady: false,
  isAdmin: false,
  adminMarks: [],
  adminFilteredMarks: [],
  adminPage: 1,
  adminPageSize: 15,
  sonarDrivers: [],
  cameraMode: "attendance",
  enrollCandidate: null,
  enrollColaborador: null
};

const elements = {
  loginView: $("#loginView"),
  appView: $("#appView"),
  registerTabButton: $("#registerTabButton"),
  historyTabButton: $("#historyTabButton"),
  databaseTabButton: $("#databaseTabButton"),
  adminTabButton: $("#adminTabButton"),
  registerPanel: $("#registerPanel"),
  historyPanel: $("#historyPanel"),
  databasePanel: $("#databasePanel"),
  adminPanel: $("#adminPanel"),
  loginForm: $("#loginForm"),
  loginMessage: $("#loginMessage"),
  emailInput: $("#emailInput"),
  passwordInput: $("#passwordInput"),
  userLabel: $("#userLabel"),
  connectionStatus: $("#connectionStatus"),
  logoutButton: $("#logoutButton"),
  attendanceForm: $("#attendanceForm"),
  dniInput: $("#dniInput"),
  searchButton: $("#searchButton"),
  collaboratorBox: $("#collaboratorBox"),
  reportDateInput: $("#reportDateInput"),
  reportTimeInput: $("#reportTimeInput"),
  reportTimeHint: $("#reportTimeHint"),
  driverFields: $("#driverFields"),
  vehicleInput: $("#vehicleInput"),
  baseInput: $("#baseInput"),
  attendanceDriverBox: $("#attendanceDriverBox"),
  locationStatus: $("#locationStatus"),
  locationButton: $("#locationButton"),
  locationMap: $("#locationMap"),
  locationPermissionHelp: $("#locationPermissionHelp"),
  markControls: $("#markControls"),
  nextMarkLabel: $("#nextMarkLabel"),
  stepDni: $("#stepDni"),
  stepPhoto: $("#stepPhoto"),
  stepRegister: $("#stepRegister"),
  observacionInput: $("#observacionInput"),
  cameraButton: $("#cameraButton"),
  cameraBox: $("#cameraBox"),
  cameraVideo: $("#cameraVideo"),
  liveFaceStatus: $("#liveFaceStatus"),
  faceGuide: $("#faceGuide"),
  captureButton: $("#captureButton"),
  stopCameraButton: $("#stopCameraButton"),
  previewBox: $("#previewBox"),
  photoPreview: $("#photoPreview"),
  photoName: $("#photoName"),
  photoSize: $("#photoSize"),
  submitButton: $("#submitButton"),
  nextActionNotice: $("#nextActionNotice"),
  formMessage: $("#formMessage"),
  bukResultBox: $("#bukResultBox"),
  processOverlay: $("#processOverlay"),
  processTitle: $("#processTitle"),
  processText: $("#processText"),
  alertOverlay: $("#alertOverlay"),
  alertTitle: $("#alertTitle"),
  alertText: $("#alertText"),
  alertButton: $("#alertButton"),
  confirmOverlay: $("#confirmOverlay"),
  confirmBadge: $("#confirmBadge"),
  confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"),
  confirmAcceptButton: $("#confirmAcceptButton"),
  confirmCancelButton: $("#confirmCancelButton"),
  refreshButton: $("#refreshButton"),
  historyDniInput: $("#historyDniInput"),
  historyStartDateInput: $("#historyStartDateInput"),
  historyEndDateInput: $("#historyEndDateInput"),
  historySearchButton: $("#historySearchButton"),
  historyPrevPageButton: $("#historyPrevPageButton"),
  historyNextPageButton: $("#historyNextPageButton"),
  historyPageLabel: $("#historyPageLabel"),
  historySubtitle: $("#historySubtitle"),
  historySummary: $("#historySummary"),
  historyTotal: $("#historyTotal"),
  historyLast: $("#historyLast"),
  historyNext: $("#historyNext"),
  historyList: $("#historyList"),
  csvStatus: $("#csvStatus"),
  csvSearchInput: $("#csvSearchInput"),
  reloadCsvButton: $("#reloadCsvButton"),
  csvTableBody: $("#csvTableBody"),
  manualExitForm: $("#manualExitForm"),
  manualDniInput: $("#manualDniInput"),
  manualDateInput: $("#manualDateInput"),
  manualTimeInput: $("#manualTimeInput"),
  manualReasonInput: $("#manualReasonInput"),
  manualExitButton: $("#manualExitButton"),
  manualMessage: $("#manualMessage"),
  sonarAdminForm: $("#sonarAdminForm"),
  sonarDriverSearchInput: $("#sonarDriverSearchInput"),
  loadSonarDriversButton: $("#loadSonarDriversButton"),
  sonarAdminStatus: $("#sonarAdminStatus"),
  sonarDriverSelect: $("#sonarDriverSelect"),
  sonarVehicleSelect: $("#sonarVehicleSelect"),
  sonarSelectionBox: $("#sonarSelectionBox"),
  assignSonarDriverButton: $("#assignSonarDriverButton"),
  sonarAdminMessage: $("#sonarAdminMessage"),
  adminNameSearchInput: $("#adminNameSearchInput"),
  adminDniSearchInput: $("#adminDniSearchInput"),
  adminDateSearchInput: $("#adminDateSearchInput"),
  adminCargoFilter: $("#adminCargoFilter"),
  reloadMarksButton: $("#reloadMarksButton"),
  adminMarksStatus: $("#adminMarksStatus"),
  adminMarksBody: $("#adminMarksBody"),
  adminPrevPageButton: $("#adminPrevPageButton"),
  adminNextPageButton: $("#adminNextPageButton"),
  adminPageLabel: $("#adminPageLabel"),
  enrollFaceForm: $("#enrollFaceForm"),
  enrollDniInput: $("#enrollDniInput"),
  enrollValidateButton: $("#enrollValidateButton"),
  enrollBox: $("#enrollBox"),
  enrollPreviewBox: $("#enrollPreviewBox"),
  enrollPreviewImage: $("#enrollPreviewImage"),
  enrollCameraButton: $("#enrollCameraButton"),
  deleteEnrollButton: $("#deleteEnrollButton"),
  enrollMessage: $("#enrollMessage")
};

function setMessage(target, text, type = "") {
  target.textContent = text;
  target.className = `message ${type}`.trim();
}

function setBusy(button, busy) {
  button.disabled = busy;
}

function showProcess(title, text) {
  if (!elements.processOverlay) return;
  elements.processTitle.textContent = title;
  elements.processText.textContent = text;
  elements.processOverlay.classList.remove("hidden");
}

function hideProcess() {
  elements.processOverlay?.classList.add("hidden");
}

function vibrateDevice(pattern) {
  try {
    if ("vibrate" in navigator && pattern) navigator.vibrate(pattern);
  } catch (e) {}
}

let audioCtxRef = null;
function getAudioCtx() {
  if (audioCtxRef) return audioCtxRef;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef = new Ctx();
  } catch (e) {
    audioCtxRef = null;
  }
  return audioCtxRef;
}

function beepTone({ frequency = 880, duration = 160, type = "sine", volume = 0.18 } = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => null);
  }
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (e) {}
}

function playFeedback(kind) {
  switch (kind) {
    case "error":
      vibrateDevice([90, 60, 90, 60, 160]);
      beepTone({ frequency: 220, duration: 200 });
      setTimeout(() => beepTone({ frequency: 180, duration: 260 }), 200);
      break;
    case "warning":
      vibrateDevice([80, 50, 80]);
      beepTone({ frequency: 520, duration: 160 });
      setTimeout(() => beepTone({ frequency: 420, duration: 200 }), 170);
      break;
    case "success":
      vibrateDevice([40]);
      beepTone({ frequency: 740, duration: 120 });
      setTimeout(() => beepTone({ frequency: 1040, duration: 180 }), 130);
      break;
    case "confirm":
    default:
      vibrateDevice([30, 30, 30]);
      beepTone({ frequency: 880, duration: 140 });
  }
}

let alertReopenCamera = false;

function showAlertModal(title, text, kind = "warning", { reopenCamera = false } = {}) {
  elements.alertTitle.textContent = title;
  elements.alertText.textContent = text;
  elements.alertOverlay.classList.remove("hidden");
  alertReopenCamera = reopenCamera;
  playFeedback(kind);
}

function notifyError(message, { title = "Error en el registro", focus } = {}) {
  setMessage(elements.formMessage, message, "error");
  showAlertModal(title, message, "error");
  if (focus && focus.focus) {
    try { focus.focus(); } catch (e) {}
    if (focus.scrollIntoView) {
      try { focus.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    }
  }
}

let confirmResolver = null;
let confirmTimer = null;

function showConfirmModal({ sentido, title, text, acceptLabel, cancelLabel = "Cancelar", timeoutMs = 60000 }) {
  const isEntrada = sentido === "entrada";
  elements.confirmBadge.textContent = isEntrada ? "ENTRADA" : "SALIDA";
  elements.confirmBadge.classList.remove("entrada", "salida");
  elements.confirmBadge.classList.add(isEntrada ? "entrada" : "salida");
  elements.confirmTitle.textContent = title || (isEntrada ? "¿Confirmas la ENTRADA?" : "¿Confirmas la SALIDA?");
  elements.confirmText.textContent = text || "";
  elements.confirmAcceptButton.textContent = acceptLabel || (isEntrada ? "Registrar entrada" : "Registrar salida");
  elements.confirmCancelButton.textContent = cancelLabel;
  elements.confirmOverlay.classList.remove("hidden");
  if (confirmResolver) {
    const prev = confirmResolver;
    confirmResolver = null;
    prev(false);
  }
  if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
  if (timeoutMs > 0) {
    confirmTimer = setTimeout(() => resolveConfirmModal(false), timeoutMs);
  }
  playFeedback("confirm");
  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function resolveConfirmModal(value) {
  if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
  elements.confirmOverlay.classList.add("hidden");
  const r = confirmResolver;
  confirmResolver = null;
  if (r) r(value);
}

function hideAlertModal() {
  elements.alertOverlay.classList.add("hidden");
}

function isMobilePhotoOnlyMode() {
  return state.cameraMode === "attendance"
    && !requiresBiometric()
    && (document.documentElement.classList.contains("touch-device") || window.matchMedia?.("(max-width: 820px)").matches);
}

function isEvidenceOnlyMode() {
  return state.cameraMode === "attendance";
}

function setNextActionNotice(text = "") {
  if (!elements.nextActionNotice) return;
  elements.nextActionNotice.textContent = text;
  elements.nextActionNotice.classList.toggle("hidden", !text);
}

function clearBukResult() {
  elements.bukResultBox.textContent = "";
  elements.bukResultBox.classList.add("hidden");
}

function showBukResult(value) {
  elements.bukResultBox.textContent = JSON.stringify(value, null, 2);
  elements.bukResultBox.classList.remove("hidden");
}

function setWorkflowState(stage) {
  [elements.stepDni, elements.stepPhoto, elements.stepRegister].forEach((step) => {
    step.classList.remove("active", "done");
  });

  if (stage === "dni") {
    elements.stepDni.classList.add("active");
  }

  if (stage === "photo") {
    elements.stepDni.classList.add("done");
    elements.stepPhoto.classList.add("active");
  }

  if (stage === "register") {
    elements.stepDni.classList.add("done");
    elements.stepPhoto.classList.add("done");
    elements.stepRegister.classList.add("active");
    setTimeout(() => {
      if (!elements.submitButton) return;
      elements.submitButton.scrollIntoView({ behavior: "smooth", block: "center" });
      try { elements.submitButton.focus({ preventScroll: true }); } catch (_) {}
    }, 220);
    if (shouldRequestDriverData() && !state.currentLocation) {
      setTimeout(() => { captureCurrentLocation(); }, 350);
    }
  }

  elements.cameraButton.disabled = stage === "dni";
  elements.submitButton.disabled = stage !== "register";
  elements.submitButton.classList.toggle("attention", stage === "register");
  elements.markControls.classList.toggle("hidden", stage === "dni");
  elements.nextMarkLabel.textContent = state.nextSentido;

  if (stage === "dni") {
    setNextActionNotice("");
  } else if (stage === "photo") {
    setNextActionNotice("Paso pendiente: abre la camara y toma una foto del colaborador.");
  } else if (stage === "register") {
    setNextActionNotice("Ultimo paso: toca el boton verde Registrar asistencia para guardar la marca.");
  }
}

async function rollbackAttendanceFailure({ asistenciaId, photoPath, dni, bukData }) {
  showProcess("Reintentando envio", "Buk rechazo la marca. Limpiando para reintentar...");

  const rollbackErrors = [];

  if (asistenciaId) {
    const { error } = await supabaseClient
      .from("asistencias")
      .delete()
      .eq("id", asistenciaId);
    if (error) rollbackErrors.push(`marca: ${error.message}`);
  }

  if (photoPath) {
    const { error } = await supabaseClient.storage
      .from(config.FOTO_BUCKET)
      .remove([photoPath]);
    if (error) rollbackErrors.push(`foto: ${error.message}`);
  }

  setNextActionNotice("Buk fallo. Toca de nuevo el boton verde Registrar asistencia para reintentar.");

  const bukErrorText = bukData?.error || bukData?.respuesta?.error || "Buk/Ctrlit rechazo la marca.";
  setMessage(elements.formMessage, `Buk rechazo la marca. Toca de nuevo Registrar asistencia para reintentar. Detalle: ${bukErrorText}`, "error");

  if (rollbackErrors.length) {
    const modalText = `Buk rechazo la marca. Se intento revertir la asistencia con estos problemas: ${rollbackErrors.join(", ")}. Toca de nuevo Registrar asistencia para reintentar.`;
    showAlertModal("Reintentar registro", modalText, "warning", { reopenCamera: true });
  }

  elements.dniInput.value = dni || elements.dniInput.value;
  throw new Error("Buk rechazo la marca. Toca Registrar para reintentar.");
}

function resetCaptureState(clearHistory = true) {
  state.colaborador = null;
  state.csvCandidate = null;
  state.compressedFile = null;
  state.faceValidated = false;
  state.faceWarning = "";
  state.currentLocation = null;
  state.isDriverCandidate = false;
  state.attendanceSonarDriver = null;
  configureDriverFields(null);
  elements.previewBox.classList.add("hidden");
  elements.photoPreview.removeAttribute("src");
  setNextActionNotice("");
  setWorkflowState("dni");
  clearBukResult();
  if (clearHistory) clearHistoryPanel();
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function isOnline() {
  return navigator.onLine;
}

function updateConnectionStatus() {
  const online = isOnline();
  elements.connectionStatus.textContent = online ? "Con conexión" : "Sin conexión";
  elements.connectionStatus.classList.toggle("online", online);
  elements.connectionStatus.classList.toggle("offline", !online);

  if (!online) {
    if (elements.searchButton) elements.searchButton.disabled = true;
    if (elements.cameraButton) elements.cameraButton.disabled = true;
    if (elements.submitButton) elements.submitButton.disabled = true;
    if (elements.manualExitButton) elements.manualExitButton.disabled = true;
    setMessage(elements.formMessage, "Sin internet. No se puede validar ni registrar asistencia.", "error");
  } else {
    if (elements.searchButton) elements.searchButton.disabled = false;
    if (elements.manualExitButton) elements.manualExitButton.disabled = false;
    setWorkflowState(state.faceValidated ? "register" : (state.csvCandidate ? "photo" : "dni"));
  }
}

function requireOnline(messageTarget = elements.formMessage) {
  if (isOnline()) return true;
  updateConnectionStatus();
  setMessage(messageTarget, "Sin internet. Revisa la conexión antes de continuar.", "error");
  return false;
}

async function syncServerClock() {
  if (!requireOnline()) return null;

  const { data, error } = await supabaseClient.rpc("obtener_hora_servidor_colombia");
  if (error || !data) {
    setMessage(elements.formMessage, "No se pudo sincronizar la hora del servidor.", "error");
    return null;
  }

  state.serverClock = {
    syncedAtMs: Date.now(),
    timestamp: data.timestamp,
    fecha: data.fecha,
    hora: data.hora
  };
  renderServerClock();
  return state.serverClock;
}

function getTrustedNowParts() {
  if (!state.serverClock) return getTodayPartsFromDate(new Date());

  const base = new Date(`${state.serverClock.timestamp}-05:00`);
  const trusted = new Date(base.getTime() + (Date.now() - state.serverClock.syncedAtMs));
  return getTodayPartsFromDate(trusted);
}

function renderServerClock() {
  const now = getTrustedNowParts();
  if (!state.isAdmin || !elements.reportDateInput.value) {
    elements.reportDateInput.value = now.date;
  }
  if (!state.isAdmin || !elements.reportTimeInput.value) {
    elements.reportTimeInput.value = now.time.slice(0, 5);
  }
}

function configureReportTimeControls() {
  const editable = state.isAdmin;
  elements.reportDateInput.disabled = !editable;
  elements.reportTimeInput.disabled = !editable;
  elements.reportTimeHint.textContent = editable
    ? "Administrador: puedes modificar la fecha y hora antes de registrar."
    : "La fecha y hora vienen del servidor.";
}

function getReportParts() {
  const now = getTrustedNowParts();
  const date = state.isAdmin && elements.reportDateInput.value ? elements.reportDateInput.value : now.date;
  const timeValue = state.isAdmin && elements.reportTimeInput.value ? elements.reportTimeInput.value : now.time.slice(0, 5);
  const time = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  const [year, month, day] = date.split("-");
  return { year, month, day, date, time };
}

function startServerClock() {
  window.clearInterval(state.serverClockTimer);
  syncServerClock();
  state.serverClockTimer = window.setInterval(() => {
    if (state.serverClock) renderServerClock();
  }, 1000);
}

async function init() {
  renderIcons();
  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  if (!hasConfig) {
    setMessage(elements.loginMessage, "Falta configurar Supabase en supabase-config.js.", "error");
    elements.loginForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  setWorkflowState("dni");

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    showApp(data.session.user);
  } else {
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showApp(session.user);
    } else {
      showLogin();
    }
  });
}

function showLogin() {
  state.user = null;
  stopCamera();
  elements.loginView.classList.remove("hidden");
  elements.appView.classList.add("hidden");
  clearHistoryPanel();
}

async function showApp(user) {
  state.user = user;
  elements.userLabel.textContent = user.email || "Usuario autenticado";
  elements.loginView.classList.add("hidden");
  elements.appView.classList.remove("hidden");
  await loadProfile();
  setupManualDefaults();
  startServerClock();
  loadCollaboratorsCsv();
  clearHistoryPanel();
}

async function login(event) {
  event.preventDefault();
  setBusy(elements.loginForm.querySelector("button"), true);
  setMessage(elements.loginMessage, "");

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(elements.loginMessage, "Usuario o contrasena incorrectos.", "error");
  }

  setBusy(elements.loginForm.querySelector("button"), false);
}

async function logout() {
  await supabaseClient.auth.signOut();
}

async function loadProfile() {
  const { data } = await supabaseClient
    .from("perfiles")
    .select("rol,activo")
    .eq("user_id", state.user.id)
    .maybeSingle();

  state.isAdmin = Boolean(data?.activo && data?.rol === "admin");
  elements.adminTabButton.classList.toggle("hidden", !state.isAdmin);
  elements.databaseTabButton.classList.toggle("hidden", !state.isAdmin);
  configureReportTimeControls();
}

function showTab(tabName) {
  if ((tabName === "database" || tabName === "admin") && !state.isAdmin) {
    tabName = "register";
  }

  const isHistory = tabName === "history";
  const isDatabase = tabName === "database";
  const isAdmin = tabName === "admin";
  elements.registerPanel.classList.toggle("hidden", isHistory || isDatabase || isAdmin);
  elements.historyPanel.classList.toggle("hidden", !isHistory);
  elements.databasePanel.classList.toggle("hidden", !isDatabase);
  elements.adminPanel.classList.toggle("hidden", !isAdmin);
  elements.registerTabButton.classList.toggle("active", !isHistory && !isDatabase && !isAdmin);
  elements.historyTabButton.classList.toggle("active", isHistory);
  elements.databaseTabButton.classList.toggle("active", isDatabase);
  elements.adminTabButton.classList.toggle("active", isAdmin);

  if (isDatabase && !state.csvLoaded) {
    loadCollaboratorsCsv();
  }

  if (isAdmin) {
    syncServerClock().then(setupManualDefaults);
    loadVehicles();
    loadAdminMarks();
  }
}

function normalizeDni(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function isDriverCollaborator(csvCollaborator) {
  const cargo = String(csvCollaborator?.cargo || "").toLowerCase();
  return /\bconductor\b|operador|motorista/.test(cargo);
}

function requiresBiometric() {
  return state.isDriverCandidate;
}

function shouldRequestDriverData() {
  return state.isDriverCandidate && state.nextSentido === "entrada";
}

function updateDriverFieldsVisibility() {
  elements.driverFields.classList.toggle("hidden", !shouldRequestDriverData());
}

function configureDriverFields(csvCollaborator) {
  const isDriver = isDriverCollaborator(csvCollaborator);
  state.isDriverCandidate = isDriver;
  updateDriverFieldsVisibility();

  if (!isDriver) {
    elements.vehicleInput.value = "";
    elements.baseInput.value = "";
    elements.attendanceDriverBox.className = "result-box muted";
    elements.attendanceDriverBox.textContent = "Al validar la cedula del conductor se consultara Sonar y se preparara el vehiculo para la asignacion.";
    elements.locationStatus.textContent = "Pendiente por validar coordenadas.";
    return;
  }

  loadVehicles();
  elements.vehicleInput.value = "";
  elements.baseInput.value = "";
  updateVehicleHint();
  elements.attendanceDriverBox.className = "result-box muted";
  elements.attendanceDriverBox.textContent = "Selecciona el vehiculo y digita la base operativa antes de tomar la foto.";
  elements.locationStatus.textContent = "Pendiente por validar coordenadas.";
}

async function loadVehicles() {
  if (state.vehiclesLoaded) return state.vehicles;

  elements.vehicleInput.innerHTML = `<option value="">Cargando vehiculos...</option>`;
  if (elements.sonarVehicleSelect) {
    elements.sonarVehicleSelect.innerHTML = `<option value="">Cargando vehiculos...</option>`;
  }
  const { data, error } = await supabaseClient
    .from("vehiculossonar")
    .select("INTERNO,Placa,ID")
    .order("INTERNO", { ascending: true });

  if (error) {
    elements.vehicleInput.innerHTML = `<option value="">No se pudieron cargar vehiculos</option>`;
    if (elements.sonarVehicleSelect) {
      elements.sonarVehicleSelect.innerHTML = `<option value="">No se pudieron cargar vehiculos</option>`;
    }
    return [];
  }

  state.vehicles = (data || []).map((item) => ({
    interno: String(item.INTERNO ?? "").trim(),
    placa: String(item.Placa ?? "").trim(),
    id: String(item.ID ?? "").trim()
  })).filter((item) => item.interno);
  state.vehiclesLoaded = true;

  renderVehicleOptions();
  return state.vehicles;
}

function renderVehicleOptions() {
  const datalist = document.getElementById("vehiclesDatalist");
  if (datalist) {
    datalist.innerHTML = state.vehicles.map((vehicle) => {
      const label = `Interno ${escapeHtml(vehicle.interno)}${vehicle.placa ? ` - Placa ${escapeHtml(vehicle.placa)}` : ""}`;
      return `<option value="${label}"></option>`;
    }).join("");
  }
  if (elements.sonarVehicleSelect) {
    elements.sonarVehicleSelect.innerHTML = `
      <option value="">Selecciona interno</option>
      ${state.vehicles.map((vehicle) => `
        <option value="${escapeHtml(vehicle.id)}" data-placa="${escapeHtml(vehicle.placa)}" data-interno="${escapeHtml(vehicle.interno)}">
          ${escapeHtml(vehicle.interno)}${vehicle.placa ? ` - ${escapeHtml(vehicle.placa)}` : ""}
        </option>
      `).join("")}
    `;
  }
  updateVehicleHint();
}

function findVehicleFromInput(value) {
  const clean = String(value || "").trim().toUpperCase();
  if (!clean) return null;
  const normalizedSearch = clean.replace(/[^\dA-Z]/g, "");
  return state.vehicles.find((v) => {
    const interno = (v.interno || "").toUpperCase();
    const placa = (v.placa || "").toUpperCase();
    const internoNorm = interno.replace(/[^\dA-Z]/g, "");
    const placaNorm = placa.replace(/[^\dA-Z]/g, "");
    return interno === clean
      || placa === clean
      || internoNorm === normalizedSearch
      || placaNorm === normalizedSearch
      || clean.includes(interno) && interno.length > 0
      || clean.includes(placa) && placa.length > 0;
  }) || null;
}

function updateVehicleHint() {
  const hint = document.getElementById("vehicleHint");
  if (!hint) return;
  const vehicle = findVehicleFromInput(elements.vehicleInput.value);
  if (vehicle) {
    hint.textContent = `Vehiculo confirmado: Interno ${vehicle.interno}${vehicle.placa ? " - Placa " + vehicle.placa : ""}`;
    hint.style.color = "var(--primary)";
    hint.style.fontWeight = "700";
    elements.vehicleInput.classList.remove("invalid");
  } else if (elements.vehicleInput.value.trim()) {
    hint.textContent = "No encontramos ese vehiculo. Revisa interno o placa.";
    hint.style.color = "#b00020";
    hint.style.fontWeight = "700";
    elements.vehicleInput.classList.add("invalid");
  } else {
    hint.textContent = "Selecciona el interno asignado para hoy.";
    hint.style.color = "";
    hint.style.fontWeight = "";
    elements.vehicleInput.classList.remove("invalid");
  }
}

function selectVehicleFromCsv(value) {
  const clean = String(value || "").replace(/[^\dA-Za-z]/g, "").toUpperCase();
  if (!clean) return;

  const vehicle = state.vehicles.find((item) =>
    item.interno.replace(/[^\dA-Za-z]/g, "").toUpperCase() === clean
    || item.placa.replace(/[^\dA-Za-z]/g, "").toUpperCase() === clean
  );

  if (vehicle) {
    elements.vehicleInput.value = `Interno ${vehicle.interno}${vehicle.placa ? ` - Placa ${vehicle.placa}` : ""}`;
    updateVehicleHint();
  }
}

function getSelectedVehicleLabel() {
  const vehicle = findVehicleFromInput(elements.vehicleInput.value);
  if (!vehicle) return "";
  return `${vehicle.interno}${vehicle.placa ? ` - ${vehicle.placa}` : ""}`;
}

function getSelectedVehicle() {
  const vehicle = findVehicleFromInput(elements.vehicleInput.value);
  if (!vehicle) return null;
  return {
    interno: vehicle.interno || "",
    placa: vehicle.placa || "",
    m_id: vehicle.id || ""
  };
}

function renderAttendanceDriverBox(message = "") {
  if (!state.isDriverCandidate) return;

  const vehicle = getSelectedVehicle();
  const driver = state.attendanceSonarDriver;

  if (message) {
    elements.attendanceDriverBox.className = "result-box muted";
    elements.attendanceDriverBox.textContent = message;
    return;
  }

  elements.attendanceDriverBox.className = "result-box";
  elements.attendanceDriverBox.innerHTML = `
    <strong>Preparación de asignación</strong>
    <div>Conductor Sonar: ${escapeHtml(driver?.nombre || "No encontrado")}</div>
    <div>driverId: ${escapeHtml(driver?.dr_id || "Pendiente")}</div>
    <div>Vehículo Sonar: ${escapeHtml(vehicle?.interno || "Pendiente")}${vehicle?.placa ? ` - ${escapeHtml(vehicle.placa)}` : ""}</div>
    <div>mId: ${escapeHtml(vehicle?.m_id || "Pendiente")}</div>
  `;
}

async function prepareAttendanceDriverIntegration(csvCollaborator, dni) {
  if (!isDriverCollaborator(csvCollaborator)) {
    state.attendanceSonarDriver = null;
    return;
  }

  renderAttendanceDriverBox("Consultando conductor en Sonar...");
  await loadVehicles();
  state.attendanceSonarDriver = await findSonarDriverByDni(dni);
  renderAttendanceDriverBox();
}

function scheduleDniValidation() {
  if (!requireOnline()) return;
  window.clearTimeout(state.dniValidationTimer);
  resetCaptureState(true);
  stopCamera();

  const dni = normalizeDni(elements.dniInput.value);
  if (!dni) {
    elements.collaboratorBox.className = "result-box muted";
    elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
    return;
  }

  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Validando cedula...";

  state.dniValidationTimer = window.setTimeout(() => {
    buscarColaborador();
  }, 450);
}

async function buscarColaborador() {
  if (!requireOnline()) return;
  const dni = normalizeDni(elements.dniInput.value);
  resetCaptureState(false);

  if (!dni) {
    elements.collaboratorBox.className = "result-box muted";
    elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
    stopCamera();
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    elements.collaboratorBox.className = "result-box";
    elements.collaboratorBox.textContent = "Registro rechazado: la cedula no esta activa en la base de colaboradores.";
    setMessage(elements.formMessage, "Cedula no autorizada para registrar asistencia.", "error");
    configureDriverFields(null);
    stopCamera();
    return;
  }

  state.csvCandidate = csvCollaborator;
  configureDriverFields(csvCollaborator);
  if (isDriverCollaborator(csvCollaborator)) {
    await prepareAttendanceDriverIntegration(csvCollaborator, dni);
  }
  setBusy(elements.searchButton, true);
  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Consultando registro local...";

  const { data, error } = await supabaseClient
    .from("colaboradores")
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,obras(nombre,obra_id_externo)")
    .eq("dni", dni)
    .maybeSingle();

  setBusy(elements.searchButton, false);

  if (error) {
    elements.collaboratorBox.className = "result-box";
    elements.collaboratorBox.textContent = "No se pudo validar la cedula en Supabase.";
    setMessage(elements.formMessage, error.message || "Error validando cedula.", "error");
    return;
  }

  state.colaborador = data || null;
  await loadLastAttendance(dni);
  state.nextSentido = getNextSentidoFromLastAttendance();
  updateDriverFieldsVisibility();
  const faceStatus = state.isDriverCandidate
    ? (data?.rostro_enrolado ? "Conductor con rostro enrolado: se intentara validacion biometrica." : "Conductor sin rostro enrolado: se intentara detectar rostro.")
    : "Foto obligatoria como evidencia. Biometria no requerida para este cargo.";
  const openInfo = getOpenAttendanceInfo();
  elements.collaboratorBox.className = "result-box";
  elements.collaboratorBox.innerHTML = `
    <strong>${escapeHtml(csvCollaborator.nombre || "Colaborador activo")}</strong>
    <div>Cedula: ${escapeHtml(csvCollaborator.cedula)}</div>
    <div>Cargo: ${escapeHtml(csvCollaborator.cargo || "Sin cargo")}</div>
    <div>Empresa: ${escapeHtml(csvCollaborator.empresa || "Sin empresa")}</div>
    <div>Vehiculo: ${escapeHtml(csvCollaborator.vehiculo || "Sin vehiculo")}</div>
    <div>Ruta: ${escapeHtml(csvCollaborator.ruta || "Sin ruta")}</div>
    ${state.isDriverCandidate ? `<div>driverId Sonar: ${escapeHtml(state.attendanceSonarDriver?.dr_id || "No encontrado")}</div>` : ""}
    ${state.isDriverCandidate ? `<div>mId Sonar: ${escapeHtml(getSelectedVehicle()?.m_id || "No encontrado")}</div>` : ""}
    <div>${data ? "Validado localmente." : "Validado por CSV. Se creara localmente al registrar."}</div>
    <div>${escapeHtml(faceStatus)}</div>
    <div>Proxima marca permitida: ${escapeHtml(state.nextSentido)}</div>
    ${openInfo ? `<div>${escapeHtml(openInfo)}</div>` : ""}
  `;
  setWorkflowState("photo");
  setMessage(elements.formMessage, state.isDriverCandidate
    ? "Cedula activa. Ubica el rostro dentro del recuadro para la validacion biometrica."
    : "Cedula activa. Toma la foto de evidencia para continuar.", "success");
  await startCamera();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function startCamera() {
  const messageTarget = state.cameraMode === "enroll" ? elements.enrollMessage : elements.formMessage;
  if (!requireOnline(messageTarget)) return;
  if (state.cameraMode === "attendance" && !state.csvCandidate) {
    setMessage(messageTarget, "Primero valida una cedula activa.", "error");
    return;
  }
  if (state.cameraMode === "enroll" && !state.enrollCandidate) {
    setMessage(messageTarget, "Primero valida una cedula activa.", "error");
    return;
  }

  if (state.cameraStream) {
    elements.cameraBox.classList.remove("hidden");
    return;
  }

  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    elements.cameraVideo.srcObject = state.cameraStream;
    elements.cameraBox.classList.remove("hidden");
    state.liveFaceOk = false;
    state.cameraOpenedAt = Date.now();
    elements.captureButton.disabled = true;
    elements.faceGuide.classList.remove("ready", "error");
    if (isEvidenceOnlyMode()) {
      state.liveFaceOk = true;
      elements.captureButton.disabled = false;
      elements.faceGuide.classList.add("ready");
      elements.liveFaceStatus.textContent = "Toma una foto frontal como evidencia. La validacion biometrica solo aplica para conductores.";
      setMessage(elements.formMessage, "Foto de evidencia obligatoria. Biometria solo para conductores.", "success");
    } else {
      setMessage(elements.formMessage, "Ubica el rostro dentro del recuadro y captura.", "");
      scheduleAttendanceFaceFallback();
      initFaceDetector().then((ready) => {
        if (ready) {
          startLiveFaceDetection();
        } else {
          elements.liveFaceStatus.textContent = "El lector facial no cargo. Toma una foto frontal para registrar con evidencia.";
        }
      });
    }
  } catch (_error) {
    setMessage(elements.formMessage, "No se pudo abrir la camara.", "error");
  }
}

async function startEnrollCamera() {
  if (!requireOnline(elements.enrollMessage)) return;
  if (!state.enrollCandidate) {
    setMessage(elements.enrollMessage, "Primero valida una cedula activa.", "error");
    return;
  }

  state.cameraMode = "enroll";
  await startCamera();
}

function stopCamera() {
  state.liveDetectionRunning = false;
  state.liveFaceOk = false;
  state.cameraOpenedAt = 0;
  if (state.cameraFallbackTimer) {
    clearTimeout(state.cameraFallbackTimer);
    state.cameraFallbackTimer = null;
  }
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  elements.captureButton.disabled = true;
  elements.faceGuide.classList.remove("ready", "error");
  elements.cameraBox.classList.add("hidden");
}

function scheduleAttendanceFaceFallback() {
  if (state.cameraFallbackTimer) {
    clearTimeout(state.cameraFallbackTimer);
    state.cameraFallbackTimer = null;
  }

  if (state.cameraMode !== "attendance") return;

  state.cameraFallbackTimer = setTimeout(() => {
    state.cameraFallbackTimer = null;
    if (!state.cameraStream || state.liveFaceOk || state.cameraMode !== "attendance") return;
    elements.captureButton.disabled = false;
    elements.liveFaceStatus.textContent = "Puedes capturar la foto. Si el lector facial no responde, la asistencia se registra con advertencia.";
    elements.faceGuide.classList.add("error");
  }, FACE_FALLBACK_DELAY_MS);
}

async function startLiveFaceDetection() {
  if (!state.faceDetectorReady || state.liveDetectionRunning) return;

  state.liveDetectionRunning = true;
  let lastRun = 0;

  const loop = async () => {
    if (!state.liveDetectionRunning || !state.cameraStream) return;

    const now = performance.now();
    if (elements.cameraVideo.videoWidth && now - lastRun > 260) {
      lastRun = now;
      try {
        const result = state.faceDetector.detect(elements.cameraVideo);
        const status = validateDetectedFaces(
          result.detections || [],
          elements.cameraVideo.videoWidth,
          elements.cameraVideo.videoHeight
        );
        state.liveFaceOk = status.ok;
        elements.captureButton.disabled = !status.ok && !canUseAttendanceFaceFallback();
        elements.liveFaceStatus.textContent = status.ok
          ? "Rostro validado en tiempo real. Puedes capturar."
          : canUseAttendanceFaceFallback()
            ? `${status.message} Puedes capturar y registrar con advertencia.`
            : status.message;
        elements.faceGuide.classList.toggle("ready", status.ok);
        elements.faceGuide.classList.toggle("error", !status.ok);
      } catch (_error) {
        state.liveFaceOk = false;
        elements.captureButton.disabled = !canUseAttendanceFaceFallback();
        elements.liveFaceStatus.textContent = canUseAttendanceFaceFallback()
          ? "El lector facial no responde. Puedes capturar y registrar con advertencia."
          : "Validando rostro...";
      }
    }

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

function canUseAttendanceFaceFallback() {
  return state.cameraMode === "attendance"
    && state.cameraOpenedAt > 0
    && Date.now() - state.cameraOpenedAt >= FACE_FALLBACK_DELAY_MS;
}

async function capturePhoto() {
  if (!isEvidenceOnlyMode() && !state.liveFaceOk && !canUseAttendanceFaceFallback()) {
    setMessage(elements.formMessage, "Ubica un rostro claro dentro del recuadro antes de capturar.", "error");
    return;
  }

  const video = elements.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) {
    setMessage(elements.formMessage, "La camara aun no esta lista.", "error");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));

  if (state.cameraMode === "enroll") {
    await saveReferenceFace(new File([blob], "referencia.jpg", { type: "image/jpeg" }));
    return;
  }

  const ok = await prepareImageFile(new File([blob], "camara.jpg", { type: "image/jpeg" }));

  if (ok) {
    stopCamera();
    setWorkflowState("register");
  }
}

async function prepareImageFile(file) {
  setMessage(elements.formMessage, isEvidenceOnlyMode() ? "Preparando foto de evidencia..." : "Comprimiendo y validando rostro...");
  const compressed = await compressImage(file, 720, 0.72);
  const previewUrl = URL.createObjectURL(compressed);
  const evidenceOnly = isEvidenceOnlyMode();
  const faceCheck = evidenceOnly
    ? { ok: true, message: "Foto de evidencia lista. Ahora puedes registrar la asistencia." }
    : state.liveFaceOk
    ? { ok: true, message: "Rostro validado. Ya puedes registrar la asistencia." }
    : await runOptionalFaceCheck(() => validateFaceInImage(previewUrl), FACE_IMAGE_CHECK_TIMEOUT_MS, "La validacion facial tardo demasiado.");

  if (evidenceOnly) {
    state.faceWarning = "";
  } else if (!faceCheck.ok) {
    state.faceWarning = faceCheck.message;
  }

  if (!evidenceOnly && state.cameraMode === "attendance" && state.colaborador?.rostro_enrolado && state.colaborador?.foto_referencia_path) {
    setMessage(elements.formMessage, "Comparando rostro con referencia enrolada...");
    const identityCheck = await runOptionalFaceCheck(
      () => verifyFaceIdentity(previewUrl, state.colaborador.foto_referencia_path),
      FACE_IDENTITY_TIMEOUT_MS,
      "La comparacion con el rostro enrolado tardo demasiado."
    );
    if (!identityCheck.ok) {
      state.faceWarning = state.faceWarning
        ? `${state.faceWarning} ${identityCheck.message}`
        : identityCheck.message;
    }
  }

  state.compressedFile = compressed;
  state.faceValidated = true;
  elements.photoPreview.src = previewUrl;
  elements.photoName.textContent = compressed.name;
  elements.photoSize.textContent = `${Math.round(compressed.size / 1024)} KB`;
  elements.previewBox.classList.remove("hidden");
  setMessage(
    elements.formMessage,
    evidenceOnly
      ? "Foto lista. Ahora toca el boton Registrar asistencia para guardar la marca."
      : state.faceWarning
      ? `Foto lista. Advertencia facial: ${state.faceWarning} La asistencia se puede registrar con evidencia fotografica.`
      : faceCheck.message,
    evidenceOnly ? "success" : (state.faceWarning ? "error" : "success")
  );
  return true;
}

async function runOptionalFaceCheck(checkFn, timeoutMs, timeoutMessage) {
  try {
    return await withTimeout(checkFn(), timeoutMs, { ok: false, message: timeoutMessage });
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "No se pudo completar la validacion facial."
    };
  }
}

function withTimeout(promise, timeoutMs, fallbackValue) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
    Promise.resolve(promise)
      .then((value) => resolve(value))
      .catch((error) => resolve({ ok: false, message: error?.message || fallbackValue.message }))
      .finally(() => clearTimeout(timer));
  });
}

async function initFaceDetector() {
  if (state.faceDetectorReady) return true;

  try {
    if (!state.visionTasks) {
      state.visionTasks = window.vision?.FilesetResolver
        ? window.vision
        : await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
    }

    const vision = await state.visionTasks.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    const baseOptions = {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
    };
    const taskOptions = {
      runningMode: "IMAGE",
      minDetectionConfidence: 0.85,
      minSuppressionThreshold: 0.3
    };

    try {
      state.faceDetector = await state.visionTasks.FaceDetector.createFromOptions(vision, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        ...taskOptions
      });
    } catch (_gpuError) {
      state.faceDetector = await state.visionTasks.FaceDetector.createFromOptions(vision, {
        baseOptions,
        ...taskOptions
      });
    }

    state.faceDetectorReady = true;
    return true;
  } catch (_error) {
    return false;
  }
}

async function validateFaceInImage(imageUrl) {
  const image = await loadImageFromUrl(imageUrl);

  if (await initFaceDetector()) {
    const result = state.faceDetector.detect(image);
    return validateDetectedFaces(result.detections || [], image.naturalWidth, image.naturalHeight);
  }

  if ("FaceDetector" in window) {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
    const faces = await detector.detect(image);
    return validateDetectedFaces(faces, image.naturalWidth, image.naturalHeight);
  }

  return {
    ok: false,
    message: "No se pudo cargar el validador facial. Revisa internet y recarga la pagina."
  };
}

async function initFaceApi() {
  if (state.faceApiReady) return true;
  if (!window.faceapi) return false;

  try {
    const modelUrl = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
    await Promise.all([
      window.faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      window.faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      window.faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
    ]);
    state.faceApiReady = true;
    return true;
  } catch (_error) {
    return false;
  }
}

async function verifyFaceIdentity(capturedImageUrl, referencePath) {
  if (!(await initFaceApi())) {
    return {
      ok: false,
      message: "No se pudo cargar el modelo de verificacion facial. Revisa internet y recarga."
    };
  }

  const { data, error } = await supabaseClient.storage
    .from("rostros-referencia")
    .download(referencePath);

  if (error || !data) {
    return {
      ok: false,
      message: "No se pudo cargar el rostro de referencia del colaborador."
    };
  }

  const referenceUrl = URL.createObjectURL(data);
  const capturedImage = await loadImageFromUrl(capturedImageUrl);
  const referenceImage = await loadImageFromUrl(referenceUrl);

  const captured = await window.faceapi
    .detectSingleFace(capturedImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  const reference = await window.faceapi
    .detectSingleFace(referenceImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  URL.revokeObjectURL(referenceUrl);

  if (!captured) {
    return { ok: false, message: "No se pudo extraer descriptor del rostro capturado." };
  }

  if (!reference) {
    return { ok: false, message: "El rostro de referencia guardado no es valido." };
  }

  const distance = window.faceapi.euclideanDistance(captured.descriptor, reference.descriptor);
  if (distance > 0.5) {
    return {
      ok: false,
      message: `El rostro no coincide con la referencia enrolada. Distancia: ${distance.toFixed(2)}`
    };
  }

  return {
    ok: true,
    message: `Identidad facial verificada. Distancia: ${distance.toFixed(2)}`
  };
}

function validateDetectedFaces(faces, imageWidth, imageHeight) {
  if (!faces.length) {
    return { ok: false, message: "No se detecto un rostro claro. Toma una foto frontal dentro del recuadro." };
  }

  if (faces.length > 1) {
    return { ok: false, message: "Se detecto mas de un rostro. Debe aparecer solo el colaborador." };
  }

  const score = faces[0].categories?.[0]?.score ?? faces[0].score?.[0] ?? 1;
  if (score < 0.55) {
    return { ok: false, message: "El rostro no es suficientemente claro. Mejora la luz y vuelve a capturar." };
  }

  const box = faces[0].boundingBox || faces[0].box;
  const x = Array.isArray(box) ? box[0] : box.originX ?? box.x ?? 0;
  const y = Array.isArray(box) ? box[1] : box.originY ?? box.y ?? 0;
  const width = Array.isArray(box) ? box[2] : box.width;
  const height = Array.isArray(box) ? box[3] : box.height;
  const faceArea = width * height;
  const imageArea = imageWidth * imageHeight;

  const faceRatio = faceArea / imageArea;
  if (faceRatio < 0.035) {
    return { ok: false, message: "El rostro esta muy pequeno. Acerca la camara y vuelve a capturar." };
  }

  if (faceRatio > 0.78) {
    return { ok: false, message: "El rostro esta demasiado cerca. Alejate un poco de la camara." };
  }

  const faceCenterX = x + width / 2;
  const faceCenterY = y + height / 2;
  const guideLeft = imageWidth * 0.08;
  const guideRight = imageWidth * 0.92;
  const guideTop = imageHeight * 0.06;
  const guideBottom = imageHeight * 0.94;

  if (
    faceCenterX < guideLeft ||
    faceCenterX > guideRight ||
    faceCenterY < guideTop ||
    faceCenterY > guideBottom
  ) {
    return { ok: false, message: "Centra el rostro dentro del recuadro." };
  }

  const aspectRatio = width / height;
  if (aspectRatio < 0.35 || aspectRatio > 1.65) {
    return { ok: false, message: "Toma la foto de frente, sin girar demasiado el rostro." };
  }

  return { ok: true, message: "Rostro validado. Ya puedes registrar la asistencia." };
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function compressImage(file, maxSize, quality) {
  const image = await loadImage(file);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

  let currentQuality = quality;
  let blob = await canvasToBlob(canvas, currentQuality);

  while (blob.size > 650000 && currentQuality > 0.42) {
    currentQuality -= 0.08;
    blob = await canvasToBlob(canvas, currentQuality);
  }

  return new File([blob], `${Date.now()}-asistencia.webp`, { type: "image/webp" });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function getTodayParts() {
  return getTrustedNowParts();
}

function getTodayPartsFromDate(now) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return { year, month, day, date: `${year}-${month}-${day}`, time: `${hour}:${minute}:${second}` };
}

function setupManualDefaults() {
  const now = getTodayParts();
  elements.manualDateInput.value = now.date;
  elements.manualTimeInput.value = now.time.slice(0, 5);
}

function setupHistoryDefaults() {
  if (elements.historyStartDateInput.value || elements.historyEndDateInput.value) return;
  const now = getTodayParts();
  elements.historyStartDateInput.value = `${now.year}-${now.month}-01`;
  elements.historyEndDateInput.value = now.date;
}

async function getLocation() {
  if (!navigator.geolocation) {
    return { error: "unsupported", message: "Tu navegador no soporta geolocalizacion." };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
        precision: position.coords.accuracy
      }),
      (err) => {
        const code = err?.code;
        if (code === 1) resolve({ error: "denied", message: "Permiso de ubicacion denegado." });
        else if (code === 2) resolve({ error: "unavailable", message: "No se pudo determinar tu ubicacion. Activa el GPS." });
        else if (code === 3) resolve({ error: "timeout", message: "Tardamos mucho en obtener tu ubicacion. Intenta de nuevo." });
        else resolve({ error: "unknown", message: err?.message || "No se pudo obtener la ubicacion." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

function showLocationPermissionHelp(show) {
  if (!elements.locationPermissionHelp) return;
  elements.locationPermissionHelp.classList.toggle("hidden", !show);
}

function renderLocationMap(latitud, longitud, precision) {
  if (!elements.locationMap || typeof window.L === "undefined") return;
  elements.locationMap.classList.remove("is-loading");
  elements.locationMap.classList.add("is-visible");

  if (!state.locationMap) {
    state.locationMap = window.L.map(elements.locationMap, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false
    }).setView([latitud, longitud], 17);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.locationMap);
  } else {
    state.locationMap.setView([latitud, longitud], 17);
  }

  if (state.locationMarker) {
    state.locationMarker.setLatLng([latitud, longitud]);
  } else {
    state.locationMarker = window.L.marker([latitud, longitud]).addTo(state.locationMap);
  }

  if (state.locationAccuracyCircle) state.locationAccuracyCircle.remove();
  if (precision && Number.isFinite(precision)) {
    state.locationAccuracyCircle = window.L.circle([latitud, longitud], {
      radius: precision,
      color: "#0b6b3a",
      fillColor: "#0b6b3a",
      fillOpacity: 0.12,
      weight: 1
    }).addTo(state.locationMap);
  }

  setTimeout(() => state.locationMap?.invalidateSize(), 120);
}

async function captureCurrentLocation() {
  if (!requireOnline()) return null;
  elements.locationStatus.textContent = "Pidiendo permiso y validando coordenadas...";
  elements.locationButton.disabled = true;
  elements.locationMap?.classList.add("is-loading", "is-visible");
  elements.locationMap.textContent = "Cargando mapa...";
  showLocationPermissionHelp(false);

  const location = await getLocation();
  elements.locationButton.disabled = false;

  if (location.error || !location.latitud || !location.longitud) {
    state.currentLocation = null;
    elements.locationMap?.classList.remove("is-loading");
    elements.locationMap?.classList.remove("is-visible");
    elements.locationMap.textContent = "";

    if (location.error === "denied" || location.error === "unsupported") {
      elements.locationStatus.textContent = `${location.message} Sigue los pasos para habilitarlo.`;
      showLocationPermissionHelp(true);
      elements.locationButton.textContent = "Reintentar ubicación";
    } else {
      elements.locationStatus.textContent = location.message || "No se pudo obtener la ubicacion. Toca 'Activar ubicacion' para reintentar.";
    }
    return null;
  }

  const point = findNearestOperationalPoint(location);
  state.currentLocation = { ...location, punto_operativo: point?.name || "" };
  elements.locationStatus.textContent = formatLocationStatus(state.currentLocation, point);
  elements.locationMap.textContent = "";
  renderLocationMap(location.latitud, location.longitud, location.precision);
  return state.currentLocation;
}

function findNearestOperationalPoint(location) {
  const points = Array.isArray(config.PUNTOS_OPERATIVOS) ? config.PUNTOS_OPERATIVOS : [];
  const validPoints = points
    .map((point) => ({
      name: point.nombre || point.name || "",
      latitud: Number(point.latitud ?? point.lat),
      longitud: Number(point.longitud ?? point.lng),
      radio: Number(point.radio_metros ?? point.radio ?? 200)
    }))
    .filter((point) => point.name && Number.isFinite(point.latitud) && Number.isFinite(point.longitud));

  if (!validPoints.length) return null;

  return validPoints
    .map((point) => ({
      ...point,
      distance: calculateDistanceMeters(location.latitud, location.longitud, point.latitud, point.longitud)
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLocationStatus(location, point) {
  const precision = location.precision ? `Precision ${Math.round(location.precision)} m.` : "";
  const coords = `Lat ${Number(location.latitud).toFixed(6)}, Lon ${Number(location.longitud).toFixed(6)}.`;
  if (!point) return `${coords} ${precision} Sin puntos operativos configurados.`;

  const distance = Math.round(point.distance);
  const inside = distance <= point.radio;
  return `${coords} ${precision} Punto mas cercano: ${point.name} a ${distance} m (${inside ? "dentro" : "fuera"} del radio).`;
}

function bukSaysNoEntryPrev(bukData) {
  if (!bukData) return false;
  const collect = [];
  collect.push(bukData?.error);
  collect.push(bukData?.respuesta?.error);
  const intentos = Array.isArray(bukData?.intentos) ? bukData.intentos : [];
  intentos.forEach((i) => {
    collect.push(i?.error);
    collect.push(i?.respuesta?.error);
  });
  return collect.some((msg) => {
    const text = String(msg || "").toLowerCase();
    return text.includes("no existe una marca de entrada previa")
      || text.includes("no existe marca de entrada");
  });
}

function getPreviousDateString(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function detectOpenEntryFromPreviousDay(dni, todayDate) {
  const last = await loadLastAttendance(dni);
  if (!last) return null;
  if (last.sentido !== "entrada") return null;
  if (!last.fecha || last.fecha >= todayDate) return null;
  return last;
}

async function registerAutoClosureForOpenEntry({ openEntry, colaboradorId, obraId, registradoPor, colaboradorDni }) {
  const closureDate = openEntry.fecha;
  const closureTime = "23:59:00";

  let bukData = null;
  let bukOk = false;
  let bukErrorText = "";
  try {
    const { data, error } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        obra_id: BUK_OBRA_ID,
        dni_colaborador: colaboradorDni,
        jornada: closureDate,
        fecha: closureDate,
        hora: closureTime,
        sentido: "salida"
      }
    });
    bukData = data || null;
    bukOk = Boolean(data?.ok) && !error;
    if (!bukOk) bukErrorText = data?.error || error?.message || "";
  } catch (err) {
    bukData = { ok: false, error: err?.message || "Error de red al enviar el cierre automatico" };
    bukErrorText = bukData.error;
    bukOk = false;
  }

  const observacion = `Cierre automatico: no se registro salida el ${closureDate}. La salida se genero al ingresar el siguiente dia (${closureTime}).`;

  const payload = {
    colaborador_id: colaboradorId,
    obra_id: obraId,
    fecha: closureDate,
    hora: closureTime,
    jornada: closureDate,
    sentido: "salida",
    foto_path: null,
    foto_eliminar_en: null,
    latitud: null,
    longitud: null,
    vehiculo_reporte: null,
    base_operativa: null,
    punto_operativo: null,
    ubicacion_precision_m: null,
    origen: "cierre_automatico",
    registrado_por: registradoPor,
    observacion,
    enviado_buk: bukOk,
    buk_status: bukOk ? (bukData?.status ?? null) : "pendiente",
    buk_respuesta: bukData
      ? { obra_id_usado: bukData?.obra_id_usado ?? null, intentos: bukData?.intentos ?? [] }
      : null,
    buk_error: bukOk ? null : (bukErrorText || "Buk rechazo el cierre automatico"),
    buk_enviado_at: new Date().toISOString()
  };

  const { error: insertError } = await supabaseClient
    .from("asistencias")
    .insert(payload);

  if (insertError) {
    throw new Error(`No se pudo registrar el cierre automatico: ${insertError.message}`);
  }

  return { bukOk, bukErrorText, openEntry, closureDate, closureTime };
}

async function submitAttendance(event) {
  event.preventDefault();
  if (!requireOnline()) return;
  setMessage(elements.formMessage, "");
  clearBukResult();

  const dni = normalizeDni(elements.dniInput.value);
  const csvCollaborator = await findActiveCsvCollaborator(dni);

  if (!csvCollaborator) {
    setMessage(elements.formMessage, "Registro rechazado: la cedula no esta activa en la base.", "error");
    setWorkflowState("dni");
    return;
  }

  if (!state.faceValidated || !state.compressedFile) {
    setMessage(elements.formMessage, "Primero toma la foto de evidencia.", "error");
    setWorkflowState("photo");
    return;
  }

  if (!state.colaborador) {
    const ensuredCollaborator = await ensureLocalCollaborator(csvCollaborator);
    if (!ensuredCollaborator) return;
    state.colaborador = ensuredCollaborator;
  }

  if (shouldRequestDriverData()) {
    const selectedVehicle = getSelectedVehicle();
    if (!selectedVehicle?.m_id) {
      elements.vehicleInput.classList.add("invalid");
      notifyError(
        "Falta seleccionar el vehiculo. Escribe el interno o placa y elige una opcion de la lista.",
        { title: "Vehiculo no seleccionado", focus: elements.vehicleInput }
      );
      return;
    }
    if (!elements.baseInput.value.trim()) {
      elements.baseInput.classList.add("invalid");
      notifyError(
        "Falta la base operativa del conductor.",
        { title: "Base operativa requerida", focus: elements.baseInput }
      );
      return;
    }

    if (!state.attendanceSonarDriver?.dr_id) {
      notifyError(
        "No se pudo preparar el driverId de Sonar para este conductor.",
        { title: "Sonar no disponible" }
      );
      return;
    }

    if (!state.currentLocation) {
      const location = await captureCurrentLocation();
      if (!location) {
        notifyError(
          "Valida la ubicacion del conductor antes de registrar.",
          { title: "Ubicacion requerida" }
        );
        return;
      }
    }
  }

  const pendingSentido = state.nextSentido;
  const reportParts = getReportParts();
  const colaboradorNombre = state.colaborador?.nombre || state.csvCandidate?.nombre || normalizeDni(elements.dniInput.value);
  const horaPreview = reportParts.time ? String(reportParts.time).slice(0, 5) : "--:--";
  const fechaPreview = reportParts.date || "fecha del servidor";
  const driverExtra = shouldRequestDriverData()
    ? ` Vehiculo: ${getSelectedVehicleLabel() || "—"} | Base: ${elements.baseInput.value.trim() || "—"}.`
    : "";
  const confirmed = await showConfirmModal({
    sentido: pendingSentido,
    text: `${colaboradorNombre} - ${fechaPreview} ${horaPreview}. Vas a registrar ${pendingSentido.toUpperCase()}.${driverExtra}`
  });
  if (!confirmed) {
    setMessage(elements.formMessage, "Registro cancelado. Revisa la cedula y el sentido antes de continuar.", "");
    return;
  }

  setBusy(elements.submitButton, true);
  elements.submitButton.classList.remove("attention");
  showProcess("Registrando asistencia", "Guardando foto, marca y envio a Buk/Ctrlit...");

  try {
    await syncServerClock();
    let sentido = state.nextSentido;
    let sentidoCorregido = null;
    const now = getReportParts();
    if (!now.date || !now.time) {
      throw new Error("Selecciona fecha y hora de reporte.");
    }
    const colaboradorDni = state.colaborador.dni;

    let autoClosureInfo = null;
    if (sentido === "entrada") {
      showProcess("Verificando jornada anterior", "Revisando si quedo una entrada sin cerrar...");
      const openPrev = await detectOpenEntryFromPreviousDay(colaboradorDni, now.date);
      if (openPrev) {
        showProcess(
          "Cerrando jornada anterior",
          `Detectamos una entrada del ${openPrev.fecha} sin salida. Generando cierre automatico...`
        );
        autoClosureInfo = await registerAutoClosureForOpenEntry({
          openEntry: openPrev,
          colaboradorId: state.colaborador.id,
          obraId: state.colaborador.obra_id,
          registradoPor: state.user.id,
          colaboradorDni
        });
        await loadLastAttendance(colaboradorDni);
      }
    }

    showProcess("Validando con Buk/Ctrlit", "Verificando que Buk acepte la marca antes de guardar...");

    let { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        obra_id: BUK_OBRA_ID,
        dni_colaborador: colaboradorDni,
        jornada: now.date,
        fecha: now.date,
        hora: now.time,
        sentido
      }
    });

    showBukResult(bukData || bukError);

    if (bukError || !bukData?.ok) {
      if (sentido === "salida" && bukSaysNoEntryPrev(bukData)) {
        showProcess(
          "Corrigiendo sentido",
          "Buk no tiene una entrada previa. Cambiando esta marca de SALIDA a ENTRADA..."
        );
        const retry = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
          body: {
            obra_id: BUK_OBRA_ID,
            dni_colaborador: colaboradorDni,
            jornada: now.date,
            fecha: now.date,
            hora: now.time,
            sentido: "entrada"
          }
        });
        bukData = retry.data;
        bukError = retry.error;
        showBukResult(bukData || bukError);

        if (bukError || !bukData?.ok) {
          const retryErrText = bukData?.error || bukError?.message || "Buk rechazo la marca incluso al cambiarla a entrada.";
          setNextActionNotice("Buk rechazo la marca incluso al corregir el sentido. Revisa los datos.");
          throw new Error(`Buk rechazo la marca (entrada corregida): ${retryErrText}`);
        }

        sentidoCorregido = { original: "salida", corregido: "entrada" };
        sentido = "entrada";
      } else {
        const bukErrorText = bukData?.error || bukError?.message || "Buk/Ctrlit rechazo la marca.";
        setNextActionNotice("Buk rechazo la marca. Corrige los datos o toca de nuevo Registrar asistencia para reintentar.");
        throw new Error(`Buk rechazo la marca: ${bukErrorText}`);
      }
    }

    showProcess("Registrando asistencia", "Buk acepto. Guardando foto y marca...");
    const photoPath = `asistencias/${now.year}/${now.month}/${now.day}/${colaboradorDni}-${sentido}-${Date.now()}.webp`;

    const { error: uploadError } = await supabaseClient.storage
      .from(config.FOTO_BUCKET)
      .upload(photoPath, state.compressedFile, {
        contentType: "image/webp",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const location = state.currentLocation || await getLocation();
    const userObservation = elements.observacionInput.value.trim();
    const faceObservation = state.faceWarning ? `Validacion facial con advertencia: ${state.faceWarning}` : "";
    const selectedVehicle = getSelectedVehicle();
    const selectedVehicleLabel = getSelectedVehicleLabel();
    const driverObservation = shouldRequestDriverData()
      ? `Conductor: vehiculo ${selectedVehicleLabel}; base ${elements.baseInput.value.trim()}; ubicacion ${elements.locationStatus.textContent}`
      : "";
    const sentidoCorregidoObs = sentidoCorregido
      ? `Sentido corregido automaticamente: el operador intento ${sentidoCorregido.original.toUpperCase()} pero Buk no tenia entrada previa, se registro como ${sentidoCorregido.corregido.toUpperCase()}.`
      : "";
    const payload = {
      colaborador_id: state.colaborador.id,
      obra_id: state.colaborador.obra_id,
      fecha: now.date,
      hora: now.time,
      jornada: now.date,
      sentido,
      foto_path: photoPath,
      foto_eliminar_en: addDays(now.date, 15),
      latitud: location.latitud || null,
      longitud: location.longitud || null,
      vehiculo_reporte: shouldRequestDriverData() ? selectedVehicleLabel : null,
      base_operativa: shouldRequestDriverData() ? elements.baseInput.value.trim() : null,
      punto_operativo: shouldRequestDriverData() ? location.punto_operativo || null : null,
      ubicacion_precision_m: location.precision || null,
      origen: state.isAdmin ? "admin_form" : "web",
      registrado_por: state.user.id,
      observacion: [userObservation, faceObservation, driverObservation, sentidoCorregidoObs].filter(Boolean).join(" | ") || null,
      enviado_buk: true,
      buk_status: bukData.status ?? null,
      buk_respuesta: { obra_id_usado: bukData.obra_id_usado ?? null, intentos: bukData.intentos ?? [] },
      buk_error: null,
      buk_enviado_at: new Date().toISOString()
    };

    let insertedAttendance;
    if (sentidoCorregido && state.lastAttendance?.id) {
      const updatePayload = {
        fecha: now.date,
        hora: now.time,
        jornada: now.date,
        sentido,
        foto_path: photoPath,
        foto_eliminar_en: addDays(now.date, 15),
        latitud: location.latitud || null,
        longitud: location.longitud || null,
        vehiculo_reporte: shouldRequestDriverData() ? selectedVehicleLabel : null,
        base_operativa: shouldRequestDriverData() ? elements.baseInput.value.trim() : null,
        punto_operativo: shouldRequestDriverData() ? location.punto_operativo || null : null,
        ubicacion_precision_m: location.precision || null,
        observacion: payload.observacion,
        enviado_buk: true,
        buk_status: bukData.status ?? null,
        buk_respuesta: { obra_id_usado: bukData.obra_id_usado ?? null, intentos: bukData.intentos ?? [] },
        buk_error: null,
        buk_enviado_at: new Date().toISOString()
      };
      const { data: updated, error: updateError } = await supabaseClient
        .from("asistencias")
        .update(updatePayload)
        .eq("id", state.lastAttendance.id)
        .select("id")
        .single();
      if (updateError) throw updateError;
      insertedAttendance = updated;
    } else {
      const { data: inserted, error: insertError } = await supabaseClient
        .from("asistencias")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;
      insertedAttendance = inserted;
    }

    let sonarData = null;
    if (shouldRequestDriverData() && selectedVehicle?.m_id) {
      showProcess("Asignando conductor", "Enviando asignacion del conductor al vehiculo en Sonar...");
      const sonarDriver = state.attendanceSonarDriver || await findSonarDriverByDni(colaboradorDni);
      if (!sonarDriver?.dr_id) {
        sonarData = {
          ok: false,
          error: "No se encontro driverId de Sonar para esta cedula.",
          conductor: null,
          vehiculo: {
            m_id: selectedVehicle.m_id,
            interno: selectedVehicle.interno,
            placa: selectedVehicle.placa
          }
        };
      } else {
        const result = await invokeSonarAssignmentWebhook({
          mid: selectedVehicle.m_id,
          driverId: sonarDriver.dr_id
        });
        sonarData = {
          ok: result.ok,
          error: result.error,
          conductor: sonarDriver,
          vehiculo: {
            m_id: selectedVehicle.m_id,
            interno: selectedVehicle.interno,
            placa: selectedVehicle.placa
          },
          parsed: result.parsed,
          payload: result.payload
        };
      }
    }

    if (shouldRequestDriverData() && sonarData && !sonarData?.ok) {
      const sonarDebug = [
        sonarData?.error || "error sin detalle",
        sonarData?.conductor?.dr_id ? `dr_id ${sonarData.conductor.dr_id}` : "",
        sonarData?.vehiculo?.m_id ? `mId ${sonarData.vehiculo.m_id}` : ""
      ].filter(Boolean).join(" | ");
      const sonarMsg = `Asistencia guardada, pero Sonar no asigno el conductor: ${sonarDebug}`;
      setMessage(elements.formMessage, sonarMsg, "error");
      showAlertModal("Error en Sonar", sonarMsg, "error");
    } else {
      setMessage(elements.formMessage, "Asistencia registrada y enviada a Buk/Ctrlit.", "success");
      playFeedback("success");
    }

    resetAttendanceForm(true);
    elements.dniInput.value = colaboradorDni;
    await loadLastAttendance(colaboradorDni);
    state.nextSentido = getNextSentidoFromLastAttendance();
    updateDriverFieldsVisibility();

    if (autoClosureInfo) {
      const bukNote = autoClosureInfo.bukOk
        ? "La salida automatica tambien fue enviada a Buk/Ctrlit."
        : `Atencion: Buk/Ctrlit no acepto el cierre automatico (${autoClosureInfo.bukErrorText || "sin detalle"}). El admin debe revisarla.`;
      const alertText = `No registraste salida del ${autoClosureInfo.openEntry.fecha} `
        + `(ultima entrada ${String(autoClosureInfo.openEntry.hora).slice(0, 5)}). `
        + `Se genero una salida automatica a las ${autoClosureInfo.closureTime.slice(0, 5)} para mantener el orden entrada/salida. ${bukNote}`;
      showAlertModal("Cierre automatico aplicado", alertText, "warning");
    }

  } catch (error) {
    hideProcess();
    const msg = error.message || "No se pudo registrar la asistencia.";
    setMessage(elements.formMessage, msg, "error");
    showAlertModal("Error en el registro", msg, "error");
    elements.submitButton.disabled = !state.faceValidated;
  } finally {
    hideProcess();
    if (state.faceValidated) {
      elements.submitButton.disabled = false;
      elements.submitButton.classList.add("attention");
    }
  }
}

async function ensureLocalCollaborator(csvCollaborator) {
  setMessage(elements.formMessage, "Creando registro local del colaborador...");

  const { data: obra, error: obraError } = await supabaseClient
    .from("obras")
    .select("id,nombre,obra_id_externo")
    .eq("obra_id_externo", BUK_OBRA_ID)
    .maybeSingle();

  if (obraError || !obra) {
    setMessage(elements.formMessage, "No existe la obra fija 39305 en Supabase.", "error");
    return null;
  }

  const { data: created, error: createError } = await supabaseClient
    .from("colaboradores")
    .insert({
      dni: csvCollaborator.cedula,
      nombre: csvCollaborator.nombre || `Colaborador ${csvCollaborator.cedula}`,
      empresa: csvCollaborator.empresa || null,
      especialidad: csvCollaborator.cargo || null,
      estado: "vinculado",
      obra_id: obra.id,
      puede_usar_app: true
    })
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,rostro_enrolado_at,obras(nombre,obra_id_externo)")
    .single();

  if (createError) {
    setMessage(elements.formMessage, createError.message || "No se pudo crear el colaborador local.", "error");
    return null;
  }

  return created;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function resetAttendanceForm(preserveBukResult = false) {
  state.colaborador = null;
  state.csvCandidate = null;
  state.compressedFile = null;
  state.faceValidated = false;
  elements.attendanceForm.reset();
  elements.collaboratorBox.className = "result-box muted";
  elements.collaboratorBox.textContent = "Digita una cedula para validar si esta activa.";
  elements.previewBox.classList.add("hidden");
  setWorkflowState("dni");
  stopCamera();
  if (!preserveBukResult) clearBukResult();
}

async function loadTodayHistory() {
  elements.historyList.textContent = "Cargando...";

  const dni = normalizeDni(arguments[0] || elements.historyDniInput.value);
  if (!dni) {
    clearHistoryPanel();
    elements.historyList.textContent = "Digita una cedula para consultar sus registros.";
    return;
  }
  const startDate = elements.historyStartDateInput.value;
  const endDate = elements.historyEndDateInput.value;
  if (startDate && endDate && startDate > endDate) {
    elements.historyList.textContent = "La fecha inicial no puede ser mayor que la fecha final.";
    return;
  }

  const from = (state.historyPage - 1) * state.historyPageSize;
  const to = from + state.historyPageSize - 1;
  let query = supabaseClient
    .from("asistencias")
    .select(dni ? "id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores!inner(dni,nombre)" : "id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores(dni,nombre)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .range(from, to);

  let countQuery = supabaseClient
    .from("asistencias")
    .select("id,colaboradores!inner(dni)", { count: "exact", head: true });

  if (dni) {
    query = query.eq("colaboradores.dni", dni);
    countQuery = countQuery.eq("colaboradores.dni", dni);
  }

  if (startDate) {
    query = query.gte("fecha", startDate);
    countQuery = countQuery.gte("fecha", startDate);
  }

  if (endDate) {
    query = query.lte("fecha", endDate);
    countQuery = countQuery.lte("fecha", endDate);
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([query, countQuery]);

  if (error || countError) {
    elements.historyList.textContent = "No se pudieron cargar los registros.";
    return;
  }

  const resultRows = data || [];
  const rows = dni ? resultRows.filter((item) => item.colaboradores?.dni === dni) : resultRows;
  state.historyTotal = count || 0;
  state.currentHistory = rows;
  renderHistorySummary(rows, dni);
  renderHistoryPagination();

  if (!rows.length) {
    elements.historyList.textContent = "Sin registros para esta cedula en el rango consultado.";
    return;
  }

  elements.historyList.innerHTML = rows.map((item) => `
    <article class="history-item">
      <div class="history-time">${escapeHtml(String(item.hora).slice(0, 5))}</div>
      <div class="history-main">
        <strong>
          ${escapeHtml(item.colaboradores?.nombre || "Sin nombre")}
          <span class="pill ${escapeHtml(item.sentido)}">${escapeHtml(item.sentido)}</span>
        </strong>
        <div class="history-meta">
          <span>Cedula ${escapeHtml(item.colaboradores?.dni || "")}</span>
          <span>${escapeHtml(item.fecha)}</span>
          <span>${escapeHtml(item.origen || "web")}</span>
          <span>Buk ${item.enviado_buk ? "OK" : escapeHtml(item.buk_status || "pendiente")}</span>
        </div>
      </div>
    </article>
  `).join("");
}

async function refreshCurrentHistory() {
  const dni = normalizeDni(elements.historyDniInput.value);
  if (!dni) {
    clearHistoryPanel();
    elements.historyList.textContent = "Digita una cedula para consultar sus registros.";
    return;
  }
  if (arguments[0] !== "keep-page") state.historyPage = 1;
  await loadTodayHistory(dni);
  await loadLastAttendance(dni);
  renderHistorySummary(state.currentHistory, dni);
}

async function loadLastAttendance(dni) {
  const cleanDni = normalizeDni(dni);
  if (!cleanDni) {
    state.lastAttendance = null;
    return null;
  }

  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,sentido,origen,colaboradores!inner(dni,nombre)")
    .eq("colaboradores.dni", cleanDni)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(1);

  if (error) {
    state.lastAttendance = null;
    return null;
  }

  state.lastAttendance = data?.[0] || null;
  return state.lastAttendance;
}

function clearHistoryPanel() {
  state.currentHistory = [];
  state.lastAttendance = null;
  state.historyPage = 1;
  state.historyTotal = 0;
  elements.historySubtitle.textContent = "Digita una cedula para consultar";
  elements.historySummary.classList.add("hidden");
  elements.historyList.textContent = "Digita una cedula para ver sus registros de hoy.";
  renderHistoryPagination();
}

function renderHistorySummary(rows, dni) {
  if (!dni) {
    elements.historySummary.classList.add("hidden");
    elements.historySubtitle.textContent = "Digita una cedula para consultar";
    return;
  }

  const lastRecord = rows[0];
  const next = getNextSentidoFromLastAttendance();
  elements.historySubtitle.textContent = dni;
  elements.historyTotal.textContent = String(state.historyTotal || rows.length);
  elements.historyLast.textContent = lastRecord ? `${lastRecord.sentido} ${lastRecord.fecha} ${String(lastRecord.hora).slice(0, 5)}` : "--";
  elements.historyNext.textContent = next;
  elements.historySummary.classList.remove("hidden");
}

function renderHistoryPagination() {
  const totalPages = Math.max(1, Math.ceil((state.historyTotal || 0) / state.historyPageSize));
  if (state.historyPage > totalPages) state.historyPage = totalPages;
  elements.historyPageLabel.textContent = `Pagina ${state.historyPage} de ${totalPages}`;
  elements.historyPrevPageButton.disabled = state.historyPage <= 1 || state.historyTotal === 0;
  elements.historyNextPageButton.disabled = state.historyPage >= totalPages || state.historyTotal === 0;
}

function getNextSentidoFromLastAttendance() {
  const last = state.lastAttendance;
  if (!last) return "entrada";
  return last.sentido === "entrada" ? "salida" : "entrada";
}

function getOpenAttendanceInfo() {
  const last = state.lastAttendance;
  if (!last || last.sentido !== "entrada") return "";
  const today = getTodayParts().date;
  if (last.fecha === today) return "";
  return `Entrada abierta desde ${last.fecha} ${String(last.hora).slice(0, 5)}. Debe registrar salida.`;
}

async function loadCollaboratorsCsv() {
  if (!requireOnline(elements.csvStatus)) return;
  elements.csvStatus.textContent = "Cargando base...";
  elements.csvTableBody.innerHTML = "";

  try {
    const response = await fetch(config.COLABORADORES_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    state.csvRows = parseCsv(csvText)
      .map(normalizeCsvRow)
      .filter((row) => normalizeCsvHeader(row.estado) === "ACTIVO");
    state.csvLoaded = true;
    renderCsvTable();
  } catch (error) {
    elements.csvStatus.textContent = `No se pudo cargar el CSV: ${error.message}`;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const headers = rows.shift()?.map(normalizeCsvHeader) || [];
  return rows.map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || "";
    });
    return record;
  });
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getCsvValue(row, names) {
  const normalizedNames = names.map(normalizeCsvHeader);
  for (const name of normalizedNames) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name] || "";
  }
  return "";
}

function normalizeCsvText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeCsvRow(row) {
  return {
    cedula: normalizeCsvText(getCsvValue(row, ["CEDULA", "CÉDULA"])).replace(/[^\dA-Za-z]/g, ""),
    nombre: normalizeCsvText(getCsvValue(row, ["NOMBRE COMPLETO"])),
    estado: normalizeCsvText(getCsvValue(row, ["ESTADO"])),
    cargo: normalizeCsvText(getCsvValue(row, ["CARGO FUNCIONARIO", "CARGO"])),
    empresa: normalizeCsvText(getCsvValue(row, ["EMPRESA"])),
    vehiculo: normalizeCsvText(getCsvValue(row, ["VEHICULO_ASOCIADO", "VEHÍCULO_ASOCIADO", "VEHICULO ASOCIADO"])),
    ruta: normalizeCsvText(getCsvValue(row, ["RUTA"]))
  };
}

async function ensureCsvLoaded() {
  if (!state.csvLoaded) await loadCollaboratorsCsv();
}

async function findActiveCsvCollaborator(dni) {
  await ensureCsvLoaded();
  const cleanDni = normalizeDni(dni).replace(/[^\dA-Za-z]/g, "");
  return state.csvRows.find((row) => normalizeDni(row.cedula).replace(/[^\dA-Za-z]/g, "") === cleanDni) || null;
}

function renderCsvTable() {
  const query = elements.csvSearchInput.value.trim().toLowerCase();
  const filtered = state.csvRows.filter((row) => {
    if (!query) return true;
    return [row.cedula, row.nombre, row.estado, row.cargo, row.empresa, row.vehiculo, row.ruta]
      .some((value) => String(value).toLowerCase().includes(query));
  });

  elements.csvStatus.textContent = `${filtered.length} de ${state.csvRows.length} colaboradores activos`;
  elements.csvTableBody.innerHTML = filtered.slice(0, 300).map((row) => `
    <tr>
      <td>${escapeHtml(row.cedula)}</td>
      <td>${escapeHtml(row.nombre)}</td>
      <td class="status-active">${escapeHtml(row.estado)}</td>
      <td>${escapeHtml(row.cargo)}</td>
      <td>${escapeHtml(row.empresa)}</td>
      <td>${escapeHtml(row.vehiculo)}</td>
      <td>${escapeHtml(row.ruta)}</td>
      <td><button class="mini-button" type="button" data-use-dni="${escapeHtml(row.cedula)}">Usar</button></td>
    </tr>
  `).join("");

  if (filtered.length > 300) {
    elements.csvStatus.textContent += " - mostrando primeros 300";
  }
}

function useCsvDni(dni) {
  elements.dniInput.value = dni;
  showTab("register");
  buscarColaborador();
}

async function loadAdminMarks() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.adminMarksStatus)) return;

  await ensureCsvLoaded();
  elements.adminMarksStatus.textContent = "Cargando marcas...";

  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores(dni,nombre)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(500);

  if (error) {
    elements.adminMarksStatus.textContent = "No se pudieron cargar las marcas.";
    return;
  }

  state.adminMarks = data || [];
  populateAdminCargoFilter();
  state.adminPage = 1;
  renderAdminMarks();
}

function renderAdminMarks() {
  const nameQuery = elements.adminNameSearchInput.value.trim().toLowerCase();
  const dniQuery = normalizeDni(elements.adminDniSearchInput.value);
  const dateQuery = elements.adminDateSearchInput.value;
  const selectedCargos = getSelectedAdminCargos();
  const rows = buildAdminJourneys(state.adminMarks).filter((item) => {
    const dni = item.dni || "";
    const name = item.nombre || getDisplayNameForDni(dni);
    const cargo = getCargoForDni(dni);

    if (nameQuery && !name.toLowerCase().includes(nameQuery)) return false;
    if (dniQuery && !normalizeDni(dni).includes(dniQuery)) return false;
    if (dateQuery && item.fecha !== dateQuery && item.salidaFecha !== dateQuery) return false;
    if (selectedCargos.length && !selectedCargos.includes(cargo)) return false;
    return true;
  });

  state.adminFilteredMarks = rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / state.adminPageSize));
  if (state.adminPage > totalPages) state.adminPage = totalPages;
  const start = (state.adminPage - 1) * state.adminPageSize;
  const pageRows = rows.slice(start, start + state.adminPageSize);

  elements.adminMarksStatus.textContent = `${rows.length} jornadas (${state.adminMarks.length} marcas)`;
  elements.adminPageLabel.textContent = `Página ${state.adminPage} de ${totalPages}`;
  elements.adminPrevPageButton.disabled = state.adminPage <= 1;
  elements.adminNextPageButton.disabled = state.adminPage >= totalPages;
  elements.adminMarksBody.innerHTML = pageRows.map((item) => `
    <tr>
      <td>${escapeHtml(item.fecha)}</td>
      <td>${escapeHtml(item.dni || "")}</td>
      <td>${escapeHtml(item.nombre || "")}</td>
      <td>${renderJourneyMark(item.entrada, "entrada")}</td>
      <td>${renderJourneyMark(item.salida, "salida")}</td>
      <td>${escapeHtml(item.tiempo || "")}</td>
      <td>${renderJourneyBuk(item)}</td>
      <td>${escapeHtml(item.observacion || "")}</td>
    </tr>
  `).join("");
}

function buildAdminJourneys(marks) {
  const byDni = new Map();

  marks.forEach((mark) => {
    const dni = mark.colaboradores?.dni || "";
    if (!dni) return;
    if (!byDni.has(dni)) byDni.set(dni, []);
    byDni.get(dni).push(mark);
  });

  const journeys = [];
  byDni.forEach((items, dni) => {
    const sorted = [...items].sort((a, b) => compareMarkDateTime(a, b));
    let openEntry = null;

    sorted.forEach((mark) => {
      if (mark.sentido === "entrada") {
        if (openEntry) journeys.push(createAdminJourney(dni, openEntry, null));
        openEntry = mark;
        return;
      }

      if (mark.sentido === "salida") {
        if (openEntry) {
          journeys.push(createAdminJourney(dni, openEntry, mark));
          openEntry = null;
        } else {
          journeys.push(createAdminJourney(dni, null, mark));
        }
      }
    });

    if (openEntry) journeys.push(createAdminJourney(dni, openEntry, null));
  });

  return journeys.sort((a, b) => {
    const bTime = `${b.salidaFecha || b.fecha}T${b.salida?.hora || b.entrada?.hora || "00:00:00"}`;
    const aTime = `${a.salidaFecha || a.fecha}T${a.salida?.hora || a.entrada?.hora || "00:00:00"}`;
    return bTime.localeCompare(aTime);
  });
}

function createAdminJourney(dni, entrada, salida) {
  const nombre = getDisplayNameForDni(dni, entrada?.colaboradores?.nombre || salida?.colaboradores?.nombre);
  const fecha = entrada?.fecha || salida?.fecha || "";
  const salidaFecha = salida?.fecha || "";
  const observacion = [formatMarkNote(entrada), formatMarkNote(salida)].filter(Boolean).join(" | ");

  return {
    dni,
    nombre,
    fecha,
    salidaFecha,
    entrada,
    salida,
    tiempo: calculateJourneyDuration(entrada, salida),
    observacion
  };
}

function compareMarkDateTime(a, b) {
  return `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`);
}

function renderJourneyMark(mark, type) {
  if (!mark) {
    return `<span class="journey-missing">${type === "entrada" ? "Sin entrada" : "Pendiente"}</span>`;
  }

  const date = type === "salida" && mark.fecha ? ` · ${escapeHtml(mark.fecha)}` : "";
  const origin = mark.origen ? ` · ${escapeHtml(mark.origen)}` : "";
  return `
    <div class="journey-mark">
      <span class="pill ${escapeHtml(type)}">${escapeHtml(String(mark.hora).slice(0, 5))}</span>
      <small>${date}${origin}</small>
    </div>
  `;
}

function renderJourneyBuk(item) {
  const statuses = [item.entrada, item.salida]
    .filter(Boolean)
    .map((mark) => mark.enviado_buk ? "OK" : String(mark.buk_status || "Pendiente"));
  return escapeHtml(statuses.length ? Array.from(new Set(statuses)).join(" / ") : "Pendiente");
}

function formatMarkNote(mark) {
  if (!mark?.observacion) return "";
  return `${mark.sentido}: ${mark.observacion}`;
}

function calculateJourneyDuration(entrada, salida) {
  if (!entrada || !salida) return salida ? "Sin entrada" : "Pendiente";

  const start = new Date(`${entrada.fecha}T${String(entrada.hora).slice(0, 8)}`);
  const end = new Date(`${salida.fecha}T${String(salida.hora).slice(0, 8)}`);
  const minutes = Math.round((end - start) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return "";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

function populateAdminCargoFilter() {
  const current = new Set(getSelectedAdminCargos());
  const cargos = Array.from(new Set(state.adminMarks
    .map((item) => getCargoForDni(item.colaboradores?.dni))
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  elements.adminCargoFilter.innerHTML = cargos.map((cargo) => `
    <option value="${escapeHtml(cargo)}" ${current.has(cargo) ? "selected" : ""}>${escapeHtml(cargo)}</option>
  `).join("");
}

function getSelectedAdminCargos() {
  return Array.from(elements.adminCargoFilter.selectedOptions || []).map((option) => option.value);
}

function getCargoForDni(dni) {
  const csvRow = state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni));
  return csvRow?.cargo || "";
}

function getDisplayNameForDni(dni, localName = "") {
  const cleanLocalName = String(localName || "").trim();
  if (cleanLocalName && !cleanLocalName.toLowerCase().startsWith("colaborador ")) {
    return cleanLocalName;
  }

  const csvRow = state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni));
  return csvRow?.nombre || cleanLocalName || "";
}

function renderSonarDriverOptions() {
  const query = elements.sonarDriverSearchInput.value.trim().toLowerCase();
  const drivers = state.sonarDrivers.filter((driver) => {
    if (!query) return true;
    return [driver.cedula, driver.nombre, driver.dr_id]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  elements.sonarDriverSelect.innerHTML = `
    <option value="">${drivers.length ? "Selecciona conductor Sonar" : "Sin coincidencias"}</option>
    ${drivers.map((driver) => `
      <option
        value="${escapeHtml(driver.dr_id)}"
        data-cedula="${escapeHtml(driver.cedula || "")}"
        data-nombre="${escapeHtml(driver.nombre || "")}"
      >
        ${escapeHtml(driver.cedula || "Sin cédula")} - ${escapeHtml(driver.nombre || "Sin nombre")} (${escapeHtml(driver.dr_id)})
      </option>
    `).join("")}
  `;

  elements.sonarAdminStatus.className = "result-box";
  elements.sonarAdminStatus.innerHTML = drivers.length
    ? `<strong>${drivers.length}</strong> conductores listos para selección.`
    : "No hay conductores para mostrar con ese filtro.";
}

function updateSonarSelectionBox() {
  const driverOption = elements.sonarDriverSelect.selectedOptions?.[0];
  const vehicleOption = elements.sonarVehicleSelect.selectedOptions?.[0];
  const driverId = driverOption?.value || "";
  const driverName = driverOption?.dataset.nombre || "";
  const driverDni = driverOption?.dataset.cedula || "";
  const mId = vehicleOption?.value || "";
  const interno = vehicleOption?.dataset.interno || "";
  const placa = vehicleOption?.dataset.placa || "";

  if (!driverId && !mId) {
    elements.sonarSelectionBox.className = "result-box muted";
    elements.sonarSelectionBox.textContent = "Selecciona conductor y vehículo para ver el dr_id y el mId que se enviarán a Sonar.";
    return;
  }

  elements.sonarSelectionBox.className = "result-box";
  elements.sonarSelectionBox.innerHTML = `
    <strong>Datos que se enviarán a Sonar</strong>
    <div>Conductor: ${escapeHtml(driverDni || "Sin cédula")} - ${escapeHtml(driverName || "Sin nombre")}</div>
    <div>dr_id del conductor: ${escapeHtml(driverId || "Pendiente")}</div>
    <div>Vehículo: ${escapeHtml(interno || "Pendiente")}${placa ? ` - ${escapeHtml(placa)}` : ""}</div>
    <div>mId del vehículo: ${escapeHtml(mId || "Pendiente")}</div>
  `;
}

function parseSonarAssignmentResponse(rawXml = "") {
  const xml = String(rawXml || "").trim();
  if (!xml) {
    return {
      status: "",
      description: "",
      errorCode: "",
      ok: false
    };
  }

  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const resultNode = doc.querySelector("SET_DriverAssignResult");
    const status = resultNode?.querySelector("status")?.textContent?.trim() || "";
    const description = resultNode?.querySelector("description")?.textContent?.trim() || "";
    const errorCode = resultNode?.querySelector("error_code")?.textContent?.trim() || "";
    const statusUpper = status.toUpperCase();
    const descriptionLower = description.toLowerCase();
    const ok = statusUpper === "OK" && (
      !errorCode
      || errorCode === "0"
      || errorCode === "255"
      || descriptionLower.includes("se ha asignado el vehiculo")
    );

    return { status, description, errorCode, ok };
  } catch (_error) {
    return {
      status: "",
      description: "",
      errorCode: "",
      ok: false
    };
  }
}

async function invokeSonarAssignmentWebhook({ mid, driverId }) {
  const url = new URL(SONAR_ASSIGN_WEBHOOK_URL);
  url.searchParams.set("mid", mid);
  url.searchParams.set("driverId", driverId);
  url.searchParams.set("_ts", String(Date.now()));

  await new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };

    img.src = url.toString();

    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    }, 4000);
  });

  return {
    ok: true,
    httpStatus: 200,
    payload: {
      sent: true,
      mid,
      driverId,
      url: url.toString()
    },
    parsed: null,
    error: null
  };
}

async function ensureSonarDriversLoaded() {
  if (state.sonarDrivers.length) return state.sonarDrivers;

  const { data, error } = await supabaseClient.functions.invoke("asignar-conductor-sonar-v2", {
    body: { accion: "listar_conductores" }
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "No se pudieron consultar conductores Sonar.");
  state.sonarDrivers = Array.isArray(data.conductores) ? data.conductores : [];
  return state.sonarDrivers;
}

async function findSonarDriverByDni(dni) {
  const drivers = await ensureSonarDriversLoaded();
  return drivers.find((driver) => normalizeDni(driver.cedula) === normalizeDni(dni)) || null;
}

async function loadSonarDrivers() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.sonarAdminMessage)) return;

  setBusy(elements.loadSonarDriversButton, true);
  setMessage(elements.sonarAdminMessage, "Consultando conductores en Sonar...");
  elements.sonarAdminStatus.className = "result-box muted";
  elements.sonarAdminStatus.textContent = "Consumiento conductores desde Sonar...";

  try {
    state.sonarDrivers = await ensureSonarDriversLoaded();
    renderSonarDriverOptions();
    updateSonarSelectionBox();
    setMessage(elements.sonarAdminMessage, `Conductores cargados desde Sonar: ${state.sonarDrivers.length}.`, "success");
  } catch (error) {
    state.sonarDrivers = [];
    elements.sonarDriverSelect.innerHTML = `<option value="">No se pudieron cargar conductores</option>`;
    elements.sonarAdminStatus.className = "result-box";
    elements.sonarAdminStatus.textContent = "No se pudieron consumir los conductores de Sonar.";
    setMessage(elements.sonarAdminMessage, error.message || "Error consultando conductores en Sonar.", "error");
  } finally {
    setBusy(elements.loadSonarDriversButton, false);
  }
}

async function assignSonarDriverManually(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  if (!requireOnline(elements.sonarAdminMessage)) return;

  const driverOption = elements.sonarDriverSelect.selectedOptions?.[0];
  const vehicleOption = elements.sonarVehicleSelect.selectedOptions?.[0];
  const driverId = driverOption?.value || "";
  const mId = vehicleOption?.value || "";
  const interno = vehicleOption?.dataset.interno || "";
  const placa = vehicleOption?.dataset.placa || "";
  const dni = driverOption?.dataset.cedula || "";

  if (!driverId) {
    setMessage(elements.sonarAdminMessage, "Selecciona un conductor de Sonar.", "error");
    return;
  }

  if (!mId || !interno) {
    setMessage(elements.sonarAdminMessage, "Selecciona un vehículo para asignar.", "error");
    return;
  }

  setBusy(elements.assignSonarDriverButton, true);
  setMessage(elements.sonarAdminMessage, "Asignando conductor al vehículo...");
  updateSonarSelectionBox();

  try {
    const result = await invokeSonarAssignmentWebhook({
      mid: mId,
      driverId
    });

    if (!result.ok) {
      const detail = [
        result.error || "Sonar rechazó la asignación.",
        `dr_id ${driverId}`,
        `mId ${mId}`
      ].join(" | ");
      throw new Error(detail);
    }

    elements.sonarAdminStatus.className = "result-box";
    elements.sonarAdminStatus.innerHTML = `
      <strong>Solicitud enviada</strong>
      <div>Conductor: ${escapeHtml(driverOption.dataset.nombre || driverId)}</div>
      <div>Vehículo: ${escapeHtml(interno)}${placa ? ` - ${escapeHtml(placa)}` : ""}</div>
      <div>mId enviado: ${escapeHtml(mId)}</div>
      <div>driverId enviado: ${escapeHtml(driverId)}</div>
      <div>Destino: Google Apps Script</div>
    `;
    setMessage(elements.sonarAdminMessage, "Solicitud enviada a Google Apps Script para asignar conductor.", "success");
  } catch (error) {
    setMessage(elements.sonarAdminMessage, error.message || "No se pudo asignar el conductor en Sonar.", "error");
  } finally {
    setBusy(elements.assignSonarDriverButton, false);
  }
}

async function registerManualExit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  if (!requireOnline(elements.manualMessage)) return;

  const dni = normalizeDni(elements.manualDniInput.value);
  const fecha = elements.manualDateInput.value;
  const hora = elements.manualTimeInput.value;
  const motivo = elements.manualReasonInput.value.trim();

  if (!dni || !fecha || !hora || !motivo) {
    setMessage(elements.manualMessage, "Completa cedula, fecha, hora y motivo.", "error");
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    setMessage(elements.manualMessage, "La cedula no esta activa en la base de colaboradores.", "error");
    return;
  }

  setBusy(elements.manualExitButton, true);
  setMessage(elements.manualMessage, "Validando ultima marca...");

  try {
    const colaborador = await ensureExistingCollaborator(csvCollaborator);
    if (!colaborador) return;

    const { data: lastRows, error: lastError } = await supabaseClient
      .from("asistencias")
      .select("sentido,hora")
      .eq("colaborador_id", colaborador.id)
      .eq("fecha", fecha)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    const last = lastRows?.[0];
    if (!last || last.sentido !== "entrada") {
      setMessage(elements.manualMessage, "No se puede registrar salida manual: primero debe existir una entrada abierta.", "error");
      return;
    }

    const observacion = `Salida manual. Motivo: ${motivo}`;
    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert({
        colaborador_id: colaborador.id,
        obra_id: colaborador.obra_id,
        fecha,
        hora,
        jornada: fecha,
        sentido: "salida",
        origen: "manual",
        registrado_por: state.user.id,
        observacion
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        asistencia_id: insertedAttendance.id,
        obra_id: BUK_OBRA_ID,
        dni_colaborador: colaborador.dni,
        jornada: fecha,
        fecha,
        hora,
        sentido: "salida"
      }
    });

    if (bukError || !bukData?.ok) {
      setMessage(elements.manualMessage, "Salida guardada, pero no se pudo enviar a Buk/Ctrlit.", "error");
    } else {
      setMessage(elements.manualMessage, "Salida manual registrada y enviada a Buk/Ctrlit.", "success");
    }

    elements.manualReasonInput.value = "";
    await loadAdminMarks();
  } catch (error) {
    setMessage(elements.manualMessage, error.message || "No se pudo registrar la salida manual.", "error");
  } finally {
    setBusy(elements.manualExitButton, false);
  }
}

async function ensureExistingCollaborator(csvCollaborator) {
  const { data } = await supabaseClient
    .from("colaboradores")
    .select("id,dni,nombre,empresa,contrato,especialidad,estado,obra_id,foto_referencia_path,rostro_enrolado,rostro_enrolado_at,obras(nombre,obra_id_externo)")
    .eq("dni", csvCollaborator.cedula)
    .maybeSingle();

  if (data) return data;
  return await ensureLocalCollaborator(csvCollaborator);
}

async function validateEnrollCollaborator() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.enrollMessage)) return;

  const dni = normalizeDni(elements.enrollDniInput.value);
  state.enrollCandidate = null;
  state.enrollColaborador = null;
  elements.enrollCameraButton.disabled = true;
  elements.deleteEnrollButton.disabled = true;
  elements.enrollPreviewBox.classList.add("hidden");
  elements.enrollPreviewImage.removeAttribute("src");

  if (!dni) {
    elements.enrollBox.className = "result-box muted";
    elements.enrollBox.textContent = "Digita la cedula del colaborador.";
    return;
  }

  const csvCollaborator = await findActiveCsvCollaborator(dni);
  if (!csvCollaborator) {
    elements.enrollBox.className = "result-box";
    elements.enrollBox.textContent = "La cedula no esta activa en la base de colaboradores.";
    setMessage(elements.enrollMessage, "No se puede enrolar un colaborador inactivo o inexistente.", "error");
    return;
  }

  const colaborador = await ensureExistingCollaborator(csvCollaborator);
  if (!colaborador) return;

  state.enrollCandidate = csvCollaborator;
  state.enrollColaborador = colaborador;
  elements.deleteEnrollButton.disabled = !colaborador.rostro_enrolado || !colaborador.foto_referencia_path;
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML = `
    <strong>${escapeHtml(csvCollaborator.nombre || colaborador.nombre || "Colaborador")}</strong>
    <div>Cedula: ${escapeHtml(csvCollaborator.cedula)}</div>
    <div>Cargo: ${escapeHtml(csvCollaborator.cargo || "Sin cargo")}</div>
    <div>Rostro: ${colaborador.rostro_enrolado ? "enrolado" : "sin enrolar"}</div>
    <div>Estado: listo para capturar rostro de referencia.</div>
  `;
  elements.enrollCameraButton.disabled = false;
  await showEnrollReferencePreview(colaborador);
  setMessage(elements.enrollMessage, "Colaborador validado. Captura el rostro de referencia.", "success");
}

async function showEnrollReferencePreview(colaborador) {
  if (!colaborador.rostro_enrolado || !colaborador.foto_referencia_path) {
    elements.enrollPreviewBox.classList.add("hidden");
    elements.enrollPreviewImage.removeAttribute("src");
    return;
  }

  const { data, error } = await supabaseClient.storage
    .from("rostros-referencia")
    .createSignedUrl(colaborador.foto_referencia_path, 300);

  if (error || !data?.signedUrl) {
    elements.enrollPreviewBox.classList.add("hidden");
    return;
  }

  elements.enrollPreviewImage.src = data.signedUrl;
  elements.enrollPreviewBox.classList.remove("hidden");
}

async function saveReferenceFace(file) {
  if (!state.enrollColaborador || !state.enrollCandidate) {
    setMessage(elements.enrollMessage, "No hay colaborador validado para enrolar.", "error");
    return;
  }

  setMessage(elements.enrollMessage, "Guardando rostro de referencia...");

  const compressed = await compressImage(file, 720, 0.72);
  const path = `rostros/${state.enrollCandidate.cedula}/referencia-${Date.now()}.webp`;

  if (state.enrollColaborador.foto_referencia_path) {
    await supabaseClient.storage
      .from("rostros-referencia")
      .remove([state.enrollColaborador.foto_referencia_path]);
  }

  const { error: uploadError } = await supabaseClient.storage
    .from("rostros-referencia")
    .upload(path, compressed, {
      contentType: "image/webp",
      upsert: true
    });

  if (uploadError) {
    setMessage(elements.enrollMessage, uploadError.message || "No se pudo subir el rostro.", "error");
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("colaboradores")
    .update({
      foto_referencia_path: path,
      rostro_enrolado: true,
      rostro_enrolado_at: new Date().toISOString()
    })
    .eq("id", state.enrollColaborador.id);

  if (updateError) {
    setMessage(elements.enrollMessage, updateError.message || "No se pudo actualizar el colaborador.", "error");
    return;
  }

  stopCamera();
  state.cameraMode = "attendance";
  elements.enrollCameraButton.disabled = true;
  elements.deleteEnrollButton.disabled = false;
  state.enrollColaborador = {
    ...state.enrollColaborador,
    foto_referencia_path: path,
    rostro_enrolado: true
  };
  await showEnrollReferencePreview(state.enrollColaborador);
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML += "<div>Rostro de referencia enrolado correctamente.</div>";
  setMessage(elements.enrollMessage, "Rostro de referencia guardado correctamente.", "success");
}

async function deleteReferenceFace() {
  if (!state.isAdmin || !state.enrollColaborador) return;
  if (!state.enrollColaborador.rostro_enrolado || !state.enrollColaborador.foto_referencia_path) {
    setMessage(elements.enrollMessage, "Este colaborador no tiene rostro enrolado.", "error");
    return;
  }

  const ok = window.confirm("¿Eliminar el rostro enrolado de este colaborador?");
  if (!ok) return;

  setMessage(elements.enrollMessage, "Eliminando rostro enrolado...");
  elements.deleteEnrollButton.disabled = true;

  const path = state.enrollColaborador.foto_referencia_path;
  const { error: removeError } = await supabaseClient.storage
    .from("rostros-referencia")
    .remove([path]);

  if (removeError) {
    setMessage(elements.enrollMessage, removeError.message || "No se pudo eliminar la foto.", "error");
    elements.deleteEnrollButton.disabled = false;
    return;
  }

  const { error: updateError } = await supabaseClient
    .from("colaboradores")
    .update({
      foto_referencia_path: null,
      rostro_enrolado: false,
      rostro_enrolado_at: null
    })
    .eq("id", state.enrollColaborador.id);

  if (updateError) {
    setMessage(elements.enrollMessage, updateError.message || "No se pudo actualizar el colaborador.", "error");
    return;
  }

  state.enrollColaborador = {
    ...state.enrollColaborador,
    foto_referencia_path: null,
    rostro_enrolado: false,
    rostro_enrolado_at: null
  };
  elements.enrollPreviewBox.classList.add("hidden");
  elements.enrollPreviewImage.removeAttribute("src");
  elements.enrollBox.className = "result-box";
  elements.enrollBox.innerHTML += "<div>Rostro enrolado eliminado.</div>";
  setMessage(elements.enrollMessage, "Rostro enrolado eliminado correctamente.", "success");
}

elements.loginForm.addEventListener("submit", login);
elements.logoutButton.addEventListener("click", logout);
elements.registerTabButton.addEventListener("click", () => showTab("register"));
elements.historyTabButton.addEventListener("click", () => {
  showTab("history");
  setupHistoryDefaults();
  if (!normalizeDni(elements.historyDniInput.value)) clearHistoryPanel();
});
elements.databaseTabButton.addEventListener("click", () => showTab("database"));
elements.adminTabButton.addEventListener("click", () => showTab("admin"));
elements.searchButton.addEventListener("click", buscarColaborador);
elements.dniInput.addEventListener("input", scheduleDniValidation);
elements.dniInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    buscarColaborador();
  }
});
elements.cameraButton.addEventListener("click", startCamera);
elements.locationButton.addEventListener("click", captureCurrentLocation);
elements.vehicleInput.addEventListener("input", () => {
  updateVehicleHint();
  if (state.isDriverCandidate) renderAttendanceDriverBox();
});
elements.baseInput.addEventListener("input", () => {
  if (elements.baseInput.value.trim()) elements.baseInput.classList.remove("invalid");
});
elements.vehicleInput.addEventListener("change", () => {
  updateVehicleHint();
  if (state.isDriverCandidate) renderAttendanceDriverBox();
});
elements.captureButton.addEventListener("click", capturePhoto);
elements.stopCameraButton.addEventListener("click", stopCamera);
elements.attendanceForm.addEventListener("submit", submitAttendance);
elements.refreshButton.addEventListener("click", refreshCurrentHistory);
elements.historySearchButton.addEventListener("click", refreshCurrentHistory);
elements.historyDniInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    refreshCurrentHistory();
  }
});
elements.historyStartDateInput.addEventListener("change", () => {
  state.historyPage = 1;
});
elements.historyEndDateInput.addEventListener("change", () => {
  state.historyPage = 1;
});
elements.historyPrevPageButton.addEventListener("click", () => {
  state.historyPage = Math.max(1, state.historyPage - 1);
  refreshCurrentHistory("keep-page");
});
elements.historyNextPageButton.addEventListener("click", () => {
  state.historyPage += 1;
  refreshCurrentHistory("keep-page");
});
elements.alertButton.addEventListener("click", async () => {
  const shouldReopenCamera = alertReopenCamera;
  alertReopenCamera = false;
  hideAlertModal();
  if (shouldReopenCamera && state.csvCandidate) {
    await startCamera();
  }
});
elements.reloadCsvButton.addEventListener("click", loadCollaboratorsCsv);
elements.csvSearchInput.addEventListener("input", renderCsvTable);
elements.manualExitForm.addEventListener("submit", registerManualExit);
elements.sonarAdminForm.addEventListener("submit", assignSonarDriverManually);
elements.loadSonarDriversButton.addEventListener("click", loadSonarDrivers);
elements.sonarDriverSearchInput.addEventListener("input", renderSonarDriverOptions);
elements.sonarDriverSelect.addEventListener("change", updateSonarSelectionBox);
elements.sonarVehicleSelect.addEventListener("change", updateSonarSelectionBox);
elements.reloadMarksButton.addEventListener("click", loadAdminMarks);
elements.adminDniSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminDateSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminNameSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminCargoFilter.addEventListener("change", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminPrevPageButton.addEventListener("click", () => {
  state.adminPage = Math.max(1, state.adminPage - 1);
  renderAdminMarks();
});
elements.adminNextPageButton.addEventListener("click", () => {
  state.adminPage += 1;
  renderAdminMarks();
});
elements.enrollValidateButton.addEventListener("click", validateEnrollCollaborator);
elements.enrollCameraButton.addEventListener("click", startEnrollCamera);
elements.deleteEnrollButton.addEventListener("click", deleteReferenceFace);
elements.csvTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-use-dni]");
  if (button) useCsvDni(button.dataset.useDni);
});

elements.confirmAcceptButton.addEventListener("click", () => resolveConfirmModal(true));
elements.confirmCancelButton.addEventListener("click", () => resolveConfirmModal(false));
elements.confirmOverlay.addEventListener("click", (event) => {
  if (event.target === elements.confirmOverlay) resolveConfirmModal(false);
});

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        reg.update().catch(() => null);
        setInterval(() => reg.update().catch(() => null), 60 * 60 * 1000);
      })
      .catch(() => null);

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

registerServiceWorker();

init();
