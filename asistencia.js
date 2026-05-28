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

function detectDeviceMode() {
  const ancho = window.innerWidth || document.documentElement.clientWidth || 0;
  const ua = navigator.userAgent || "";
  const punteroGrueso = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const tieneTouch = (navigator.maxTouchPoints || 0) > 0 || punteroGrueso;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const esEstrecho = ancho < 820;

  if (uaMobile || (tieneTouch && esEstrecho)) return "mobile";
  if (esEstrecho) return "narrow";
  return "desktop";
}

function applyDeviceMode() {
  const modo = detectDeviceMode();
  const root = document.documentElement;
  root.dataset.deviceMode = modo;
  root.classList.toggle("is-mobile", modo === "mobile");
  root.classList.toggle("is-narrow", modo === "narrow");
  root.classList.toggle("is-desktop", modo === "desktop");
  root.classList.toggle("touch-device", modo === "mobile" || modo === "narrow");
  try { state.deviceMode = modo; } catch (_) { /* state aun no definido en el primer call */ }
  updateDeviceModeBadge(modo);
  return modo;
}

function updateDeviceModeBadge(modo) {
  const badge = document.getElementById("deviceModeBadge");
  if (!badge) return;
  const label = modo === "mobile" ? "Movil" : modo === "narrow" ? "Web compacta" : "Web";
  const icon = modo === "mobile" ? "smartphone" : "monitor";
  badge.dataset.mode = modo;
  badge.title = `Modo de visualizacion: ${label} (${window.innerWidth}px)`;
  badge.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
  if (window.lucide?.createIcons) {
    try { window.lucide.createIcons({ icons: window.lucide.icons }); } catch (_) {}
  }
}

applyDeviceMode();
window.addEventListener("resize", () => { applyDeviceMode(); });
window.addEventListener("orientationchange", () => { applyDeviceMode(); });

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
  lastEntrada: null,
  openEntrada: null,
  submittingMark: false,
  overdueToastDismissed: false,
  overdueToastDismissedIds: [],
  adminSubtab: "alerts",
  openTurns: [],
  selectedSonarDriverId: null,
  cameraStream: null,
  cameraOpenedAt: 0,
  cameraFallbackTimer: null,
  liveDetectionRunning: false,
  liveFaceOk: false,
  serverClock: null,
  serverClockTimer: null,
  serverClockResyncTimer: null,
  reportDateTouched: false,
  reportTimeTouched: false,
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
  adminTabBadge: $("#adminTabBadge"),
  adminSubtabs: $("#adminSubtabs"),
  adminSubtabAlertsBadge: $("#adminSubtabAlertsBadge"),
  overdueDriversToast: $("#overdueDriversToast"),
  overdueDriversToastTitle: $("#overdueDriversToastTitle"),
  overdueDriversToastList: $("#overdueDriversToastList"),
  overdueDriversToastClose: $("#overdueDriversToastClose"),
  overdueDriversToastGo: $("#overdueDriversToastGo"),
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
  sentidoEntradaButton: $("#sentidoEntradaButton"),
  sentidoSalidaButton: $("#sentidoSalidaButton"),
  sentidoSuggestion: $("#sentidoSuggestion"),
  jornadaHint: $("#jornadaHint"),
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
  confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"),
  confirmCancel: $("#confirmCancel"),
  confirmAccept: $("#confirmAccept"),
  openTurnsStatus: $("#openTurnsStatus"),
  openTurnsBody: $("#openTurnsBody"),
  openTurnsReloadButton: $("#openTurnsReloadButton"),
  openTurnsExportButton: $("#openTurnsExportButton"),
  openTurnsSearchInput: $("#openTurnsSearchInput"),
  openTurnsCargoFilter: $("#openTurnsCargoFilter"),
  overdueTurnsStatus: $("#overdueTurnsStatus"),
  overdueTurnsBody: $("#overdueTurnsBody"),
  overdueTurnsExportButton: $("#overdueTurnsExportButton"),
  pendingExitOverlay: $("#pendingExitOverlay"),
  pendingExitForm: $("#pendingExitForm"),
  pendingExitContext: $("#pendingExitContext"),
  pendingExitDate: $("#pendingExitDate"),
  pendingExitTime: $("#pendingExitTime"),
  pendingExitReason: $("#pendingExitReason"),
  pendingExitMessage: $("#pendingExitMessage"),
  pendingExitCancel: $("#pendingExitCancel"),
  pendingExitSubmit: $("#pendingExitSubmit"),
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
  sonarDriverList: $("#sonarDriverList"),
  sonarDriverSelected: $("#sonarDriverSelected"),
  sonarVehicleSelect: $("#sonarVehicleSelect"),
  sonarSelectionBox: $("#sonarSelectionBox"),
  assignSonarDriverButton: $("#assignSonarDriverButton"),
  sonarAdminMessage: $("#sonarAdminMessage"),
  adminNameSearchInput: $("#adminNameSearchInput"),
  adminDniSearchInput: $("#adminDniSearchInput"),
  adminDateFromInput: $("#adminDateFromInput"),
  adminDateToInput: $("#adminDateToInput"),
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

function showAlertModal(title, text) {
  elements.alertTitle.textContent = title;
  elements.alertText.textContent = text;
  elements.alertOverlay.classList.remove("hidden");
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
    if (state.isDriverCandidate && !state.currentLocation) {
      setTimeout(() => { captureCurrentLocation(); }, 350);
    }
  }

  elements.cameraButton.disabled = stage === "dni";
  elements.submitButton.disabled = stage !== "register";
  elements.submitButton.classList.toggle("attention", stage === "register");
  elements.markControls.classList.toggle("hidden", stage === "dni");
  renderSentidoSelector();
  renderJornadaHint();

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
    showAlertModal("Reintentar registro", modalText);
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

async function syncServerClock({ silent = false } = {}) {
  if (!requireOnline()) return null;

  const { data, error } = await supabaseClient.rpc("obtener_hora_servidor_colombia");
  if (error || !data) {
    if (!silent) {
      setMessage(elements.formMessage, "No se pudo sincronizar la hora del servidor.", "error");
    }
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
  elements.reportDateInput.value = now.date;
  elements.reportTimeInput.value = now.time.slice(0, 5);
}

function configureReportTimeControls() {
  elements.reportDateInput.disabled = true;
  elements.reportTimeInput.disabled = true;
  elements.reportDateInput.readOnly = true;
  elements.reportTimeInput.readOnly = true;
  elements.reportTimeHint.textContent = "La fecha y hora vienen del servidor y no se pueden modificar.";
}

function getReportParts() {
  const now = getTrustedNowParts();
  const date = now.date;
  const time = now.time;
  const [year, month, day] = date.split("-");
  return { year, month, day, date, time };
}

const SERVER_CLOCK_RESYNC_MS = 3 * 60 * 1000;

function startServerClock() {
  window.clearInterval(state.serverClockTimer);
  window.clearInterval(state.serverClockResyncTimer);
  syncServerClock();
  state.serverClockTimer = window.setInterval(() => {
    if (state.serverClock) renderServerClock();
  }, 1000);
  state.serverClockResyncTimer = window.setInterval(() => {
    syncServerClock({ silent: true });
  }, SERVER_CLOCK_RESYNC_MS);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.user) {
    syncServerClock({ silent: true });
  }
});
window.addEventListener("online", () => {
  if (state.user) {
    syncServerClock({ silent: true });
  }
});

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

function getDisplayNameForUser(user) {
  if (!user) return "Usuario autenticado";
  const meta = user.user_metadata || {};
  return meta.display_name || meta.full_name || meta.name || user.email || "Usuario autenticado";
}

async function showApp(user) {
  state.user = user;
  elements.userLabel.textContent = getDisplayNameForUser(user);
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

  if (state.isAdmin) {
    loadOpenTurns().catch(() => {});
  } else {
    updateOverdueBadge(0);
  }
}

function updateOverdueBadge(count) {
  const label = !count || count <= 0 ? "" : (count > 99 ? "99+" : String(count));
  [elements.adminTabBadge, elements.adminSubtabAlertsBadge].forEach((badge) => {
    if (!badge) return;
    if (!label) {
      badge.classList.add("hidden");
      badge.textContent = "0";
    } else {
      badge.textContent = label;
      badge.classList.remove("hidden");
    }
  });
}

function showAdminSubtab(name) {
  const valid = ["alerts", "abiertos", "marcas", "rostros", "sonar"];
  const target = valid.includes(name) ? name : "alerts";
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.adminTab === target);
    btn.setAttribute("aria-selected", btn.dataset.adminTab === target ? "true" : "false");
  });
  document.querySelectorAll("[data-admin-content]").forEach((node) => {
    node.classList.toggle("hidden", node.dataset.adminContent !== target);
  });
  state.adminSubtab = target;
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
    showAdminSubtab(state.adminSubtab || "alerts");
    syncServerClock().then(setupManualDefaults);
    loadVehicles();
    loadAdminMarks();
    loadOpenTurns();
  }
}

function normalizeDni(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function isDriverCargo(cargo) {
  return /\bconductor\b|operador|motorista/.test(String(cargo || "").toLowerCase());
}

function isDriverCollaborator(csvCollaborator) {
  return isDriverCargo(csvCollaborator?.cargo);
}

function requiresBiometric() {
  return state.isDriverCandidate;
}

function configureDriverFields(csvCollaborator) {
  const isDriver = isDriverCollaborator(csvCollaborator);
  state.isDriverCandidate = isDriver;
  elements.driverFields.classList.toggle("hidden", !isDriver);

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
  await loadLastEntradaForDni(dni);
  computeOpenEntrada();
  state.nextSentido = state.openEntrada ? "salida" : "entrada";
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
    <div>${renderLastEntradaLabel(state.lastEntrada)}</div>
    <div>${renderTurnoEstadoLabel()}</div>
    <div>${escapeHtml(faceStatus)}</div>
    <div>Proxima marca permitida: ${escapeHtml(state.nextSentido)}</div>
    ${openInfo ? `<div>${escapeHtml(openInfo)}</div>` : ""}
  `;
  setWorkflowState("photo");
  setMessage(elements.formMessage, state.isDriverCandidate
    ? "Cedula activa. Ubica el rostro dentro del recuadro para la validacion biometrica."
    : "Cedula activa. Toma la foto de evidencia para continuar.", "success");

  if (openInfo) {
    openPendingExitModal();
  } else if (state.nextSentido === "entrada" && state.lastAttendance?.sentido === "salida") {
    const last = state.lastAttendance;
    const today = getTodayParts().date;
    if (last.fecha && last.fecha < today) {
      const diffDias = diffDaysBetween(last.fecha, today);
      if (diffDias >= 2) {
        showAlertModal(
          "Verifica tus marcas",
          `Tu ultima marca fue una salida el ${last.fecha} (${diffDias} dias atras). Si olvidaste registrar una entrada o salida intermedia, avisa al administrador antes de continuar.`
        );
      }
    }
  }

  await startCamera();
}

function diffDaysBetween(fromDate, toDate) {
  const a = new Date(`${fromDate}T00:00:00`);
  const b = new Date(`${toDate}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
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
  const baseLabel = formatLocationStatus(state.currentLocation, point);
  const esMovil = state.deviceMode === "mobile";
  elements.locationStatus.textContent = esMovil
    ? `${baseLabel} (validada en el dispositivo, no se almacena)`
    : baseLabel;
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

async function submitAttendance(event) {
  event.preventDefault();
  if (state.submittingMark) {
    return;
  }
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

  if (state.isDriverCandidate) {
    const selectedVehicle = getSelectedVehicle();
    if (!selectedVehicle?.m_id) {
      setMessage(elements.formMessage, "Falta seleccionar el vehiculo. Escribe el interno o placa y elige una opcion de la lista.", "error");
      elements.vehicleInput.classList.add("invalid");
      elements.vehicleInput.focus();
      elements.vehicleInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!elements.baseInput.value.trim()) {
      setMessage(elements.formMessage, "Falta la base operativa del conductor.", "error");
      elements.baseInput.classList.add("invalid");
      elements.baseInput.focus();
      elements.baseInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!state.attendanceSonarDriver?.dr_id) {
      setMessage(elements.formMessage, "No se pudo preparar el driverId de Sonar para este conductor.", "error");
      return;
    }

    if (!state.currentLocation) {
      const location = await captureCurrentLocation();
      if (!location) {
        setMessage(elements.formMessage, "Valida la ubicacion del conductor antes de registrar.", "error");
        return;
      }
    }
  }

  state.submittingMark = true;
  setBusy(elements.submitButton, true);
  elements.submitButton.classList.remove("attention");
  showProcess("Registrando asistencia", "Guardando foto, marca y envio a Buk/Ctrlit...");

  try {
    await syncServerClock();
    const sentido = state.nextSentido;
    const now = getReportParts();
    if (!now.date || !now.time) {
      throw new Error("Selecciona fecha y hora de reporte.");
    }
    const colaboradorDni = state.colaborador.dni;

    showProcess("Validando con Buk/Ctrlit", "Verificando que Buk acepte la marca antes de guardar...");

    let entradaParaCierre = null;
    let jornadaBuk;
    if (sentido === "salida") {
      if (state.openEntrada) {
        const openFecha = state.openEntrada.fecha;
        const diaAnterior = addDays(now.date, -1);
        if (openFecha === now.date || openFecha === diaAnterior) {
          entradaParaCierre = state.openEntrada;
          jornadaBuk = state.openEntrada.jornada || state.openEntrada.fecha;
          console.log("[BUK] cerrando turno abierto", { entradaParaCierre, jornadaBuk });
        } else {
          throw new Error(`La entrada abierta del ${openFecha} es mas vieja que el dia anterior; Buk no aceptara esta salida. Cierra esa entrada primero.`);
        }
      } else {
        throw new Error("No hay turno abierto: no se puede registrar una salida sin una entrada previa.");
      }
    } else {
      if (state.openEntrada) {
        throw new Error(`El colaborador ya tiene una entrada abierta del ${state.openEntrada.fecha} ${String(state.openEntrada.hora).slice(0,5)}. Registra primero la salida.`);
      }
      jornadaBuk = now.date;
    }

    showProcess("Validando con Buk/Ctrlit", "Consultando obra real del colaborador en Buk...");
    const { obraId: obraIdReal, lookup: colaboradorLookup } = await lookupObraIdDeColaborador(colaboradorDni);
    console.log("[BUK] lookup colaborador", { obraIdReal, colaboradorLookup });
    const obraIdAUsar = obraIdReal || BUK_OBRA_ID;

    const trazaBuk = [{ paso: "lookup_colaborador", lookup: colaboradorLookup, obra_id_resuelto: obraIdAUsar }];
    const payloadSalida = {
      obra_id: obraIdAUsar,
      dni_colaborador: colaboradorDni,
      jornada: jornadaBuk,
      fecha: now.date,
      hora: now.time,
      sentido
    };

    console.log("[BUK] enviando salida (intento 1)", payloadSalida);
    let { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: payloadSalida
    });
    console.log("[BUK] respuesta salida (intento 1)", { data: bukData, error: bukError });
    trazaBuk.push({ paso: "salida_intento_1", payload: payloadSalida, respuesta: bukData ?? null, transportError: bukError?.message ?? null });

    const debeReintentar =
      (bukError || !bukData?.ok) &&
      sentido === "salida" &&
      bukRespuestaMencionaEntradaPrevia(bukData) &&
      entradaParaCierre;

    console.log("[BUK] retry? ", {
      debeReintentar,
      bukOk: bukData?.ok,
      sentido,
      mencionaEntradaPrevia: bukRespuestaMencionaEntradaPrevia(bukData),
      entradaParaCierre
    });

    if (debeReintentar) {
      const entrada = entradaParaCierre;
      const horaEntrada = String(entrada.hora || "").slice(0, 8);
      const jornadaEntrada = entrada.jornada || entrada.fecha;
      showProcess(
        "Reenviando entrada a Buk",
        `Buk no tiene la entrada del ${entrada.fecha} ${horaEntrada.slice(0, 5)} (jornada ${jornadaEntrada}). Reenviandola antes de la salida...`
      );

      const payloadEntrada = {
        asistencia_id: entrada.id,
        obra_id: obraIdAUsar,
        dni_colaborador: colaboradorDni,
        jornada: jornadaEntrada,
        fecha: entrada.fecha,
        hora: horaEntrada,
        sentido: "entrada"
      };
      console.log("[BUK] reenviando entrada", payloadEntrada);
      const { data: entradaBuk, error: entradaBukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
        body: payloadEntrada
      });
      console.log("[BUK] respuesta entrada", { data: entradaBuk, error: entradaBukError });
      trazaBuk.push({ paso: "reenvio_entrada", payload: payloadEntrada, respuesta: entradaBuk ?? null, transportError: entradaBukError?.message ?? null });

      if (entradaBukError || !entradaBuk?.ok) {
        const detalle = entradaBuk?.error || entradaBukError?.message || "Buk no acepto la entrada.";
        showBukResult({ trazaBuk });
        setNextActionNotice(`No se pudo reenviar la entrada a Buk: ${detalle}`);
        throw new Error(`Buk rechazo la entrada al reintentar: ${detalle}`);
      }

      showProcess("Reintentando salida en Buk", "Entrada aceptada. Enviando la salida nuevamente...");

      console.log("[BUK] enviando salida (intento 2 tras entrada OK)", payloadSalida);
      const reintento = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
        body: payloadSalida
      });
      console.log("[BUK] respuesta salida (intento 2)", reintento);
      trazaBuk.push({ paso: "salida_intento_2", payload: payloadSalida, respuesta: reintento.data ?? null, transportError: reintento.error?.message ?? null });
      bukData = reintento.data;
      bukError = reintento.error;
    }

    showBukResult({ resultado_final: bukData || bukError, trazaBuk });

    if (bukError || !bukData?.ok) {
      const bukErrorText = bukData?.error || bukError?.message || "Buk/Ctrlit rechazo la marca.";
      setNextActionNotice("Buk rechazo la marca. Corrige los datos o toca de nuevo Registrar asistencia para reintentar.");
      throw new Error(`Buk rechazo la marca: ${bukErrorText}`);
    }

    const esMovil = state.deviceMode === "mobile";
    let photoPath = null;
    let fotoEliminarEn = null;

    if (esMovil) {
      showProcess("Registrando asistencia", "Buk acepto. Guardando marca (sin foto, modo movil para ahorrar datos)...");
    } else {
      showProcess("Registrando asistencia", "Buk acepto. Guardando foto y marca...");
      photoPath = `asistencias/${now.year}/${now.month}/${now.day}/${colaboradorDni}-${sentido}-${Date.now()}.webp`;
      fotoEliminarEn = addDays(now.date, 15);

      const { error: uploadError } = await supabaseClient.storage
        .from(config.FOTO_BUCKET)
        .upload(photoPath, state.compressedFile, {
          contentType: "image/webp",
          upsert: false
        });

      if (uploadError) throw uploadError;
    }

    const location = state.currentLocation || await getLocation();
    const userObservation = elements.observacionInput.value.trim();
    const faceObservation = state.faceWarning ? `Validacion facial con advertencia: ${state.faceWarning}` : "";
    const mobileObservation = esMovil ? "Marca desde movil (foto y geolocalizacion validadas localmente, no almacenadas)" : "";
    const selectedVehicle = getSelectedVehicle();
    const selectedVehicleLabel = getSelectedVehicleLabel();
    const driverObservation = state.isDriverCandidate
      ? (esMovil
        ? `Conductor: vehiculo ${selectedVehicleLabel}; base ${elements.baseInput.value.trim()}; ubicacion validada en sitio (no guardada)`
        : `Conductor: vehiculo ${selectedVehicleLabel}; base ${elements.baseInput.value.trim()}; ubicacion ${elements.locationStatus.textContent}`)
      : "";
    const origen = state.isAdmin
      ? "admin_form"
      : (esMovil ? "movil_sin_foto" : "web");
    const payload = {
      colaborador_id: state.colaborador.id,
      obra_id: state.colaborador.obra_id,
      fecha: now.date,
      hora: now.time,
      jornada: jornadaBuk,
      sentido,
      foto_path: photoPath,
      foto_eliminar_en: fotoEliminarEn,
      latitud: esMovil ? null : (location.latitud || null),
      longitud: esMovil ? null : (location.longitud || null),
      vehiculo_reporte: state.isDriverCandidate ? selectedVehicleLabel : null,
      base_operativa: state.isDriverCandidate && !esMovil ? elements.baseInput.value.trim() : null,
      punto_operativo: state.isDriverCandidate && !esMovil ? (location.punto_operativo || null) : null,
      ubicacion_precision_m: esMovil ? null : (location.precision || null),
      origen,
      registrado_por: state.user.id,
      observacion: [userObservation, faceObservation, driverObservation, mobileObservation].filter(Boolean).join(" | ") || null,
      enviado_buk: true,
      buk_status: bukData.status ?? null,
      buk_respuesta: { obra_id_usado: bukData.obra_id_usado ?? null, intentos: bukData.intentos ?? [] },
      buk_error: null,
      buk_enviado_at: new Date().toISOString()
    };

    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error(
          "Ya existe una marca identica para este colaborador en la misma hora. No se duplico."
        );
      }
      throw insertError;
    }

    let sonarData = null;
    if (state.isDriverCandidate && selectedVehicle?.m_id) {
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

    if (state.isDriverCandidate && sonarData && !sonarData?.ok) {
      const sonarDebug = [
        sonarData?.error || "error sin detalle",
        sonarData?.conductor?.dr_id ? `dr_id ${sonarData.conductor.dr_id}` : "",
        sonarData?.vehiculo?.m_id ? `mId ${sonarData.vehiculo.m_id}` : ""
      ].filter(Boolean).join(" | ");
      setMessage(elements.formMessage, `Asistencia guardada, pero Sonar no asigno el conductor: ${sonarDebug}`, "error");
    } else {
      setMessage(elements.formMessage, "Asistencia registrada y enviada a Buk/Ctrlit.", "success");
      if (sentido === "salida" && jornadaBuk !== now.date) {
        showAlertModal(
          "Turno nocturno cerrado",
          `Se cerro la jornada ${jornadaBuk}. Buk recibio la salida con la fecha real ${now.date} ${now.time.slice(0, 5)}.`
        );
      }
    }

    resetAttendanceForm(true);
    elements.dniInput.value = colaboradorDni;
    await loadLastAttendance(colaboradorDni);
    state.nextSentido = getNextSentidoFromLastAttendance();
  } catch (error) {
    setMessage(elements.formMessage, error.message || "No se pudo registrar la asistencia.", "error");
    elements.submitButton.disabled = !state.faceValidated;
  } finally {
    state.submittingMark = false;
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
  state.reportDateTouched = false;
  state.reportTimeTouched = false;
  state.lastEntrada = null;
  state.openEntrada = null;
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
    .select("id,fecha,hora,jornada,sentido,origen,enviado_buk,buk_status,colaboradores!inner(dni,nombre)")
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

function renderSentidoSelector() {
  if (!elements.sentidoEntradaButton || !elements.sentidoSalidaButton) return;
  elements.sentidoEntradaButton.classList.toggle("active", state.nextSentido === "entrada");
  elements.sentidoSalidaButton.classList.toggle("active", state.nextSentido === "salida");

  const suggested = getNextSentidoFromLastAttendance();
  if (!elements.sentidoSuggestion) return;
  if (!state.colaborador && !state.csvCandidate) {
    elements.sentidoSuggestion.textContent = "";
    return;
  }
  if (state.nextSentido === suggested) {
    elements.sentidoSuggestion.textContent = `Sugerido por la ultima marca: ${suggested}.`;
  } else {
    elements.sentidoSuggestion.textContent = `Estas registrando ${state.nextSentido} (sugerido era ${suggested}).`;
  }
}

function setSentido(sentido) {
  if (sentido !== "entrada" && sentido !== "salida") return;
  state.nextSentido = sentido;
  renderSentidoSelector();
  renderJornadaHint();
}

function renderJornadaHint() {
  if (!elements.jornadaHint) return;
  if (state.nextSentido !== "salida" || !state.lastAttendance || state.lastAttendance.sentido !== "entrada") {
    elements.jornadaHint.classList.add("hidden");
    elements.jornadaHint.textContent = "";
    return;
  }
  const today = getTodayParts().date;
  const entradaFecha = state.lastAttendance.fecha;
  if (!entradaFecha || entradaFecha >= today) {
    elements.jornadaHint.classList.add("hidden");
    elements.jornadaHint.textContent = "";
    return;
  }
  const horaEntrada = String(state.lastAttendance.hora || "").slice(0, 5);
  elements.jornadaHint.textContent = `Cerrando turno nocturno: jornada ${entradaFecha} (entrada ${horaEntrada}).`;
  elements.jornadaHint.classList.remove("hidden");
}

function openPendingExitModal() {
  const last = state.lastAttendance;
  if (!last || last.sentido !== "entrada") return;
  const colaborador = state.csvCandidate || state.colaborador;
  if (!colaborador) return;

  const horaEntrada = String(last.hora || "").slice(0, 5);
  elements.pendingExitContext.textContent =
    `Entrada registrada el ${last.fecha} a las ${horaEntrada}. Indica la fecha y hora reales en que el colaborador termino la jornada.`;
  elements.pendingExitDate.value = "";
  elements.pendingExitDate.min = last.fecha;
  elements.pendingExitTime.value = "";
  elements.pendingExitReason.value = "";
  setMessage(elements.pendingExitMessage, "");
  elements.pendingExitOverlay.classList.remove("hidden");
  setTimeout(() => { try { elements.pendingExitDate.focus(); } catch (_) {} }, 50);
}

function closePendingExitModal() {
  elements.pendingExitOverlay.classList.add("hidden");
  setMessage(elements.pendingExitMessage, "");
}

async function submitPendingExitFromModal(event) {
  event.preventDefault();
  if (!requireOnline(elements.pendingExitMessage)) return;

  const last = state.lastAttendance;
  const colaboradorCsv = state.csvCandidate;
  if (!last || last.sentido !== "entrada" || !colaboradorCsv) {
    setMessage(elements.pendingExitMessage, "No se encontro la entrada pendiente. Vuelve a validar la cedula.", "error");
    return;
  }

  const fecha = elements.pendingExitDate.value;
  const hora = elements.pendingExitTime.value;
  const motivo = elements.pendingExitReason.value.trim();
  if (!fecha || !hora || !motivo) {
    setMessage(elements.pendingExitMessage, "Completa fecha, hora y motivo.", "error");
    return;
  }

  const horaConSegundos = hora.length === 5 ? `${hora}:00` : hora;
  const entradaTs = new Date(`${last.fecha}T${String(last.hora).slice(0, 8)}`);
  const salidaTs = new Date(`${fecha}T${horaConSegundos}`);
  if (Number.isNaN(salidaTs.getTime()) || salidaTs <= entradaTs) {
    setMessage(elements.pendingExitMessage, "La fecha y hora de salida deben ser posteriores a la entrada.", "error");
    return;
  }

  setBusy(elements.pendingExitSubmit, true);
  setMessage(elements.pendingExitMessage, "Registrando salida pendiente...");

  try {
    const colaborador = await ensureExistingCollaborator(colaboradorCsv);
    if (!colaborador) {
      setMessage(elements.pendingExitMessage, "No se pudo localizar el colaborador en la base.", "error");
      return;
    }

    const jornadaBuk = computeJornadaForMark("salida", fecha, last.fecha);
    const observacion = `Salida manual (entrada pendiente del ${last.fecha} ${String(last.hora).slice(0, 5)}). Motivo: ${motivo}`;

    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert({
        colaborador_id: colaborador.id,
        obra_id: colaborador.obra_id,
        fecha,
        hora: horaConSegundos,
        jornada: jornadaBuk,
        sentido: "salida",
        origen: "manual_pendiente",
        registrado_por: state.user.id,
        observacion
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    setMessage(elements.pendingExitMessage, "Consultando obra real del colaborador en Buk...");
    const { obraId: obraIdReal } = await lookupObraIdDeColaborador(colaborador.dni);
    const obraIdAUsar = obraIdReal || BUK_OBRA_ID;

    let { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        asistencia_id: insertedAttendance.id,
        obra_id: obraIdAUsar,
        dni_colaborador: colaborador.dni,
        jornada: jornadaBuk,
        fecha,
        hora: horaConSegundos,
        sentido: "salida"
      }
    });

    if ((bukError || !bukData?.ok) && bukRespuestaMencionaEntradaPrevia(bukData)) {
      const horaEntrada = String(last.hora || "").slice(0, 8);
      const jornadaEntrada = last.jornada || last.fecha;
      setMessage(elements.pendingExitMessage, `Reenviando entrada del ${last.fecha} ${horaEntrada.slice(0, 5)} (jornada ${jornadaEntrada}) a Buk...`);

      const { data: entradaBuk, error: entradaBukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
        body: {
          asistencia_id: last.id,
          obra_id: obraIdAUsar,
          dni_colaborador: colaborador.dni,
          jornada: jornadaEntrada,
          fecha: last.fecha,
          hora: horaEntrada,
          sentido: "entrada"
        }
      });

      if (!entradaBukError && entradaBuk?.ok) {
        setMessage(elements.pendingExitMessage, "Entrada reenviada. Reintentando la salida...");
        const reintento = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
          body: {
            asistencia_id: insertedAttendance.id,
            obra_id: obraIdAUsar,
            dni_colaborador: colaborador.dni,
            jornada: jornadaBuk,
            fecha,
            hora: horaConSegundos,
            sentido: "salida"
          }
        });
        bukData = reintento.data;
        bukError = reintento.error;
      } else {
        setMessage(
          elements.pendingExitMessage,
          `Buk no acepto la entrada al reenviarla: ${entradaBuk?.error || entradaBukError?.message || "sin detalle"}`,
          "error"
        );
      }
    }

    const bukOk = !bukError && bukData?.ok;
    await notifyManualExitWebhook({
      colaborador,
      colaboradorCsv,
      entrada: last,
      salida: { fecha, hora: horaConSegundos, jornada: jornadaBuk },
      motivo,
      bukOk,
      bukResultado: bukData ?? { error: bukError?.message || "sin respuesta" },
      asistenciaId: insertedAttendance.id
    });

    if (!bukOk) {
      setMessage(elements.pendingExitMessage, "Salida guardada localmente, pero Buk/Ctrlit no acepto. Administracion fue notificada.", "error");
    } else {
      setMessage(elements.pendingExitMessage, "Salida registrada y enviada a Buk/Ctrlit.", "success");
    }

    resetAttendanceForm(true);

    setTimeout(() => {
      closePendingExitModal();
      showAlertModal(
        bukOk ? "Salida pendiente registrada" : "Salida registrada con observacion",
        bukOk
          ? `Se cerro la jornada ${jornadaBuk} con la salida ${fecha} ${hora}. Buk/Ctrlit recibio la marca y se notifico a administracion.`
          : `Se guardo la salida ${fecha} ${hora} (jornada ${jornadaBuk}), pero Buk/Ctrlit no acepto. Administracion fue notificada para revisar.`
      );
    }, 600);
  } catch (error) {
    setMessage(elements.pendingExitMessage, error.message || "No se pudo registrar la salida pendiente.", "error");
  } finally {
    setBusy(elements.pendingExitSubmit, false);
  }
}

async function notifyManualAdminExitWebhook(payload) {
  const url = config.MANUAL_ADMIN_EXIT_WEBHOOK_URL;
  if (!url) return;

  const explicacion =
    "Un administrador registro una salida manual desde el panel de administracion para cerrar el turno de un colaborador. " +
    "La salida se envio a Buk/Ctrlit usando la fecha real ingresada y la jornada del dia de la entrada.";

  const ahora = new Date();
  const horaAccion = ahora.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  let horasTurnoAbierto = null;
  try {
    const tsEntrada = new Date(`${payload.entrada.fecha}T${String(payload.entrada.hora || "00:00:00").slice(0, 8)}`);
    const tsSalida = new Date(`${payload.salida.fecha}T${String(payload.salida.hora || "00:00:00").slice(0, 8)}`);
    const diffMs = tsSalida.getTime() - tsEntrada.getTime();
    if (Number.isFinite(diffMs) && diffMs > 0) {
      const totalMin = Math.round(diffMs / 60000);
      const dias = Math.floor(totalMin / 1440);
      const horas = Math.floor((totalMin % 1440) / 60);
      const minutos = totalMin % 60;
      horasTurnoAbierto = dias >= 1
        ? `${dias}d ${horas}h ${minutos}m`
        : `${horas}h ${minutos}m`;
    }
  } catch (_) { /* ignorar */ }

  const nombre = payload.colaboradorCsv?.nombre || payload.colaborador.nombre || null;
  const dni = payload.colaborador.dni;
  const novedad = `[ADMIN] Cierre manual del turno de ${nombre || "(sin nombre)"} (cedula ${dni}) | Turno abierto: ${horasTurnoAbierto || "n/d"} | Motivo: ${payload.motivo}`;

  const body = {
    tipo: "salida_manual_admin",
    explicacion,
    novedad,
    hora_accion: horaAccion,
    enviado_en: ahora.toISOString(),
    registrado_por: {
      user_id: state.user?.id ?? null,
      email: state.user?.email ?? null
    },
    colaborador: {
      id: payload.colaborador.id,
      dni,
      nombre,
      cargo: payload.colaboradorCsv?.cargo || null,
      empresa: payload.colaboradorCsv?.empresa || payload.colaborador.empresa || null,
      obra_id: payload.colaborador.obra_id || null
    },
    entrada_pendiente: {
      fecha: payload.entrada.fecha,
      hora: String(payload.entrada.hora || "").slice(0, 8)
    },
    salida_registrada: {
      asistencia_id: payload.asistenciaId,
      fecha: payload.salida.fecha,
      hora: payload.salida.hora,
      jornada_buk: payload.salida.jornada
    },
    horas_turno_abierto: horasTurnoAbierto,
    motivo: payload.motivo,
    buk: {
      ok: payload.bukOk,
      resultado: payload.bukResultado
    }
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "no-cors"
    });
  } catch (error) {
    console.warn("No se pudo notificar webhook de salida manual del admin", error);
  }
}

async function notifyManualExitWebhook(payload) {
  const url = config.MANUAL_EXIT_WEBHOOK_URL;
  if (!url) return;

  const explicacion =
    "Se registro una salida manual porque el colaborador tenia una entrada abierta sin cerrar. " +
    "La salida se envio a Buk/Ctrlit usando la fecha real ingresada por el usuario y la jornada del dia de la entrada, " +
    "de modo que el turno nocturno quede cerrado en el sistema de nomina. Este aviso permite a administracion auditar el caso.";

  const ahora = new Date();
  const horaAccion = ahora.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  let horasTurnoAbierto = null;
  try {
    const tsEntrada = new Date(`${payload.entrada.fecha}T${String(payload.entrada.hora || "00:00:00").slice(0, 8)}`);
    const tsSalida = new Date(`${payload.salida.fecha}T${String(payload.salida.hora || "00:00:00").slice(0, 8)}`);
    const diffMs = tsSalida.getTime() - tsEntrada.getTime();
    if (Number.isFinite(diffMs) && diffMs > 0) {
      const totalMin = Math.round(diffMs / 60000);
      const dias = Math.floor(totalMin / 1440);
      const horas = Math.floor((totalMin % 1440) / 60);
      const minutos = totalMin % 60;
      horasTurnoAbierto = dias >= 1
        ? `${dias}d ${horas}h ${minutos}m`
        : `${horas}h ${minutos}m`;
    }
  } catch (_) { /* ignorar */ }

  const nombre = payload.colaboradorCsv?.nombre || payload.colaborador.nombre || null;
  const dni = payload.colaborador.dni;
  const novedad = `Conductor ${nombre || "(sin nombre)"} (cedula ${dni}) | Turno abierto: ${horasTurnoAbierto || "n/d"} | Motivo: ${payload.motivo}`;

  const body = {
    tipo: "salida_manual_entrada_pendiente",
    explicacion,
    novedad,
    hora_accion: horaAccion,
    enviado_en: ahora.toISOString(),
    registrado_por: {
      user_id: state.user?.id ?? null,
      email: state.user?.email ?? null
    },
    colaborador: {
      id: payload.colaborador.id,
      dni,
      nombre,
      cargo: payload.colaboradorCsv?.cargo || null,
      empresa: payload.colaboradorCsv?.empresa || payload.colaborador.empresa || null,
      obra_id: payload.colaborador.obra_id || null
    },
    entrada_pendiente: {
      asistencia_id: payload.entrada.id,
      fecha: payload.entrada.fecha,
      hora: String(payload.entrada.hora || "").slice(0, 8)
    },
    salida_registrada: {
      asistencia_id: payload.asistenciaId,
      fecha: payload.salida.fecha,
      hora: payload.salida.hora,
      jornada_buk: payload.salida.jornada
    },
    horas_turno_abierto: horasTurnoAbierto,
    motivo: payload.motivo,
    buk: {
      ok: payload.bukOk,
      resultado: payload.bukResultado
    }
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "no-cors"
    });
  } catch (error) {
    console.warn("No se pudo notificar webhook de salida manual", error);
  }
}

function renderLastEntradaLabel(entrada) {
  if (!entrada) return 'Ultima entrada: <em>sin registros</em>';
  const hora = String(entrada.hora || "").slice(0, 5);
  const jornada = entrada.jornada && entrada.jornada !== entrada.fecha
    ? ` (jornada ${escapeHtml(entrada.jornada)})`
    : "";
  const bukTag = entrada.enviado_buk
    ? '<span style="color:#0a6b3b;font-weight:700">Buk OK</span>'
    : `<span style="color:#b3261e;font-weight:700">Buk rechazo (${escapeHtml(String(entrada.buk_status || "sin enviar"))})</span>`;
  return `Ultima entrada: <strong>${escapeHtml(entrada.fecha)} ${escapeHtml(hora)}</strong>${jornada} &middot; ${bukTag}`;
}

function renderTurnoEstadoLabel() {
  if (!state.openEntrada && !state.lastEntrada) {
    return 'Turno: <strong>sin marcas previas</strong>';
  }
  if (state.openEntrada) {
    const hora = String(state.openEntrada.hora || "").slice(0, 5);
    return `Turno: <strong style="color:#b35400">ABIERTO</strong> desde ${escapeHtml(state.openEntrada.fecha)} ${escapeHtml(hora)} - la proxima marca debe ser SALIDA`;
  }
  return 'Turno: <strong style="color:#0a6b3b">CERRADO</strong> - la proxima marca debe ser ENTRADA (jornada de hoy)';
}

function computeOpenEntrada() {
  if (state.lastAttendance?.sentido === "entrada") {
    state.openEntrada = state.lastAttendance;
  } else {
    state.openEntrada = null;
  }
}

async function loadOpenTurns() {
  if (!state.isAdmin) return;
  if (!requireOnline(elements.openTurnsStatus)) return;

  setBusy(elements.openTurnsReloadButton, true);
  elements.openTurnsStatus.textContent = "Cargando turnos abiertos...";
  elements.openTurnsBody.innerHTML = "";

  try {
    await ensureCsvLoaded();
    const { data, error } = await supabaseClient
      .from("asistencias")
      .select("id,fecha,hora,jornada,sentido,enviado_buk,buk_status,colaborador_id,colaboradores(dni,nombre)")
      .order("colaborador_id", { ascending: true })
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(2000);

    if (error) throw error;

    const latestPorColaborador = new Map();
    (data || []).forEach((mark) => {
      if (!latestPorColaborador.has(mark.colaborador_id)) {
        latestPorColaborador.set(mark.colaborador_id, mark);
      }
    });

    const abiertos = Array.from(latestPorColaborador.values())
      .filter((mark) => mark.sentido === "entrada")
      .sort((a, b) => {
        const tsA = new Date(`${a.fecha}T${String(a.hora).slice(0,8)}`).getTime();
        const tsB = new Date(`${b.fecha}T${String(b.hora).slice(0,8)}`).getTime();
        return tsA - tsB;
      });

    state.openTurns = abiertos;
    populateOpenTurnsCargoFilter();
    renderOpenTurns();
    renderOverdueTurns();
  } catch (error) {
    elements.openTurnsStatus.textContent = error.message || "No se pudieron cargar los turnos abiertos.";
  } finally {
    setBusy(elements.openTurnsReloadButton, false);
  }
}

const OVERDUE_HORAS = 15;

function getOverdueTurns() {
  const limite = Date.now() - OVERDUE_HORAS * 3600 * 1000;
  return (state.openTurns || []).filter((mark) => {
    const ts = new Date(`${mark.fecha}T${String(mark.hora).slice(0, 8)}`).getTime();
    return !Number.isNaN(ts) && ts < limite;
  });
}

function getOverdueDriverTurns() {
  return getOverdueTurns().filter((mark) => {
    const dni = mark.colaboradores?.dni || "";
    return isDriverCargo(getCargoForDni(dni));
  });
}

function renderOverdueTurns() {
  const rows = getOverdueTurns();
  const drivers = getOverdueDriverTurns();
  updateOverdueBadge(drivers.length);
  refreshOverdueDriversToast(drivers);
  if (!rows.length) {
    elements.overdueTurnsStatus.textContent = `Sin turnos abiertos hace mas de ${OVERDUE_HORAS} horas. Excelente.`;
    elements.overdueTurnsBody.innerHTML = "";
    return;
  }
  elements.overdueTurnsStatus.textContent = `${rows.length} colaborador(es) con turno vencido (>${OVERDUE_HORAS}h). Estos seguro necesitan cierre manual.`;

  const ahora = Date.now();
  elements.overdueTurnsBody.innerHTML = rows.map((mark) => {
    const entradaTs = new Date(`${mark.fecha}T${String(mark.hora).slice(0, 8)}`).getTime();
    const diffMs = ahora - entradaTs;
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const dias = Math.floor(horas / 24);
    const tiempoLabel = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h ${minutos}m`;
    const claseTiempo = dias >= 1 ? "turno-alerta-critica" : "turno-alerta-media";
    const dni = mark.colaboradores?.dni || "";
    const nombre = mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "Sin nombre";
    const cargo = getCargoForDni(dni) || "Sin cargo";

    return `
      <tr data-mark-id="${escapeHtml(mark.id)}" data-dni="${escapeHtml(dni)}">
        <td>${escapeHtml(dni)}</td>
        <td>${escapeHtml(nombre)}</td>
        <td>${escapeHtml(cargo)}</td>
        <td>${escapeHtml(mark.fecha)} ${escapeHtml(String(mark.hora).slice(0, 5))}</td>
        <td class="${claseTiempo}">${escapeHtml(tiempoLabel)}</td>
        <td>
          <button type="button" class="secondary" data-close-turn="${escapeHtml(dni)}">
            <i data-lucide="log-out"></i>
            Cerrar turno
          </button>
        </td>
      </tr>
    `;
  }).join("");
  renderIcons();
}

function refreshOverdueDriversToast(drivers) {
  const toast = elements.overdueDriversToast;
  if (!toast) return;
  if (!state.isAdmin || !Array.isArray(drivers) || drivers.length === 0) {
    toast.classList.add("hidden");
    return;
  }

  const idsActuales = drivers.map((mark) => mark.id).sort().join("|");
  if (state.overdueToastDismissed && idsActuales === state.overdueToastDismissedIds.join("|")) {
    toast.classList.add("hidden");
    return;
  }
  if (idsActuales !== state.overdueToastDismissedIds.join("|")) {
    state.overdueToastDismissed = false;
    state.overdueToastDismissedIds = [];
  }

  const ahora = Date.now();
  const items = drivers.slice(0, 8).map((mark) => {
    const ts = new Date(`${mark.fecha}T${String(mark.hora).slice(0, 8)}`).getTime();
    const diffMs = ahora - ts;
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const dias = Math.floor(horas / 24);
    const tiempoLabel = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h ${minutos}m`;
    const dni = mark.colaboradores?.dni || "";
    const nombre = mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "Sin nombre";
    return `
      <li>
        <span class="overdue-toast-driver">${escapeHtml(nombre)}</span>
        <span class="overdue-toast-meta">${escapeHtml(dni)} &middot; entrada ${escapeHtml(mark.fecha)} ${escapeHtml(String(mark.hora).slice(0, 5))}</span>
        <span class="overdue-toast-time">${escapeHtml(tiempoLabel)}</span>
      </li>
    `;
  }).join("");

  const restantes = drivers.length - Math.min(drivers.length, 8);
  elements.overdueDriversToastTitle.textContent =
    `${drivers.length} conductor(es) con turno > ${OVERDUE_HORAS} h`;
  elements.overdueDriversToastList.innerHTML = items + (restantes > 0
    ? `<li class="overdue-toast-more">+${restantes} mas</li>`
    : "");
  toast.classList.remove("hidden");
  renderIcons();
}

function dismissOverdueDriversToast() {
  state.overdueToastDismissed = true;
  state.overdueToastDismissedIds = getOverdueDriverTurns().map((mark) => mark.id).sort();
  elements.overdueDriversToast?.classList.add("hidden");
}

function exportOverdueTurnsToCSV() {
  const rows = getOverdueTurns();
  if (!rows.length) {
    setMessage(elements.overdueTurnsStatus, "No hay turnos vencidos para exportar.", "error");
    return;
  }
  exportTurnsToCsv(rows, `turnos-vencidos-${stampForFile()}.csv`);
  setMessage(elements.overdueTurnsStatus, `${rows.length} fila(s) exportadas a CSV.`, "success");
}

function stampForFile() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function exportTurnsToCsv(rows, filename) {
  const ahora = Date.now();
  const header = ["Cedula", "Nombre", "Cargo", "Empresa", "Fecha entrada", "Hora entrada", "Jornada", "Tiempo abierto", "Buk"];
  const escapeCsv = (val) => {
    const s = String(val ?? "");
    if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lineas = [header.join(";")];
  rows.forEach((mark) => {
    const dni = mark.colaboradores?.dni || "";
    const nombre = mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "";
    const entradaTs = new Date(`${mark.fecha}T${String(mark.hora).slice(0, 8)}`).getTime();
    const diffMs = ahora - entradaTs;
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const dias = Math.floor(horas / 24);
    const tiempoLabel = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h ${minutos}m`;
    const buk = mark.enviado_buk ? "Buk OK" : `Buk: ${mark.buk_status || "sin enviar"}`;
    lineas.push([
      dni,
      nombre,
      getCargoForDni(dni) || "",
      getEmpresaForDni(dni) || "",
      mark.fecha,
      String(mark.hora).slice(0, 5),
      mark.jornada || mark.fecha,
      tiempoLabel,
      buk
    ].map(escapeCsv).join(";"));
  });
  triggerCsvDownload(lineas.join("\r\n"), filename);
}

function triggerCsvDownload(contenido, filename) {
  const csv = "﻿" + contenido;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function populateOpenTurnsCargoFilter() {
  const seleccionadosPrevios = new Set(
    Array.from(elements.openTurnsCargoFilter.selectedOptions || []).map((o) => o.value)
  );
  const cargos = Array.from(new Set(
    (state.openTurns || [])
      .map((mark) => getCargoForDni(mark.colaboradores?.dni))
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  elements.openTurnsCargoFilter.innerHTML = cargos.map((cargo) => `
    <option value="${escapeHtml(cargo)}" ${seleccionadosPrevios.has(cargo) ? "selected" : ""}>${escapeHtml(cargo)}</option>
  `).join("");
}

function getSelectedOpenTurnsCargos() {
  return Array.from(elements.openTurnsCargoFilter.selectedOptions || []).map((o) => o.value);
}

function renderOpenTurns() {
  const all = state.openTurns || [];
  if (!all.length) {
    elements.openTurnsStatus.textContent = "No hay turnos abiertos. Todos los colaboradores cerraron su entrada.";
    elements.openTurnsBody.innerHTML = "";
    return;
  }

  const query = (elements.openTurnsSearchInput?.value || "").trim().toLowerCase();
  const queryDni = normalizeDni(elements.openTurnsSearchInput?.value || "");
  const cargosSeleccionados = getSelectedOpenTurnsCargos();

  const rows = all.filter((mark) => {
    const dni = mark.colaboradores?.dni || "";
    const nombre = (mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "").toLowerCase();
    const cargo = getCargoForDni(dni);

    if (cargosSeleccionados.length && !cargosSeleccionados.includes(cargo)) return false;
    if (query) {
      const matchTexto = nombre.includes(query);
      const matchDni = queryDni && normalizeDni(dni).includes(queryDni);
      if (!matchTexto && !matchDni) return false;
    }
    return true;
  });

  elements.openTurnsStatus.textContent = rows.length === all.length
    ? `${rows.length} colaborador(es) con turno abierto.`
    : `${rows.length} de ${all.length} turnos abiertos (filtrado).`;

  const ahora = Date.now();
  elements.openTurnsBody.innerHTML = rows.map((mark) => {
    const entradaTs = new Date(`${mark.fecha}T${String(mark.hora).slice(0,8)}`).getTime();
    const diffMs = ahora - entradaTs;
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const dias = Math.floor(horas / 24);
    let tiempoLabel;
    let claseTiempo;
    if (dias >= 1) {
      tiempoLabel = `${dias}d ${horas % 24}h`;
      claseTiempo = "turno-alerta-critica";
    } else if (horas >= 12) {
      tiempoLabel = `${horas}h ${minutos}m`;
      claseTiempo = "turno-alerta-media";
    } else {
      tiempoLabel = `${horas}h ${minutos}m`;
      claseTiempo = "turno-alerta-ok";
    }

    const dni = mark.colaboradores?.dni || "";
    const nombre = mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "Sin nombre";
    const cargo = getCargoForDni(dni) || "Sin cargo";

    return `
      <tr data-mark-id="${escapeHtml(mark.id)}" data-dni="${escapeHtml(dni)}">
        <td>${escapeHtml(dni)}</td>
        <td>${escapeHtml(nombre)}</td>
        <td>${escapeHtml(cargo)}</td>
        <td>${escapeHtml(mark.fecha)} ${escapeHtml(String(mark.hora).slice(0,5))}</td>
        <td class="${claseTiempo}">${escapeHtml(tiempoLabel)}</td>
        <td>
          <button type="button" class="secondary" data-close-turn="${escapeHtml(dni)}">
            <i data-lucide="log-out"></i>
            Cerrar turno
          </button>
        </td>
      </tr>
    `;
  }).join("");
  renderIcons();
}

function getEmpresaForDni(dni) {
  const csvRow = state.csvRows.find((row) => normalizeDni(row.cedula) === normalizeDni(dni));
  return csvRow?.empresa || "";
}

function exportOpenTurnsToCSV() {
  const all = state.openTurns || [];
  if (!all.length) {
    setMessage(elements.openTurnsStatus, "No hay turnos abiertos para exportar.", "error");
    return;
  }

  const query = (elements.openTurnsSearchInput?.value || "").trim().toLowerCase();
  const queryDni = normalizeDni(elements.openTurnsSearchInput?.value || "");
  const cargosSeleccionados = getSelectedOpenTurnsCargos();

  const rows = all.filter((mark) => {
    const dni = mark.colaboradores?.dni || "";
    const nombre = (mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "").toLowerCase();
    const cargo = getCargoForDni(dni);
    if (cargosSeleccionados.length && !cargosSeleccionados.includes(cargo)) return false;
    if (query) {
      const matchTexto = nombre.includes(query);
      const matchDni = queryDni && normalizeDni(dni).includes(queryDni);
      if (!matchTexto && !matchDni) return false;
    }
    return true;
  });

  if (!rows.length) {
    setMessage(elements.openTurnsStatus, "El filtro actual no tiene resultados para exportar.", "error");
    return;
  }

  const ahora = Date.now();
  const header = [
    "Cedula",
    "Nombre",
    "Cargo",
    "Empresa",
    "Fecha entrada",
    "Hora entrada",
    "Jornada",
    "Tiempo abierto",
    "Buk"
  ];

  const escapeCsv = (val) => {
    const s = String(val ?? "");
    if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lineas = [header.join(";")];
  rows.forEach((mark) => {
    const dni = mark.colaboradores?.dni || "";
    const nombre = mark.colaboradores?.nombre || getDisplayNameForDni(dni) || "";
    const cargo = getCargoForDni(dni) || "";
    const empresa = getEmpresaForDni(dni) || "";
    const entradaTs = new Date(`${mark.fecha}T${String(mark.hora).slice(0, 8)}`).getTime();
    const diffMs = ahora - entradaTs;
    const horas = Math.floor(diffMs / 3600000);
    const minutos = Math.floor((diffMs % 3600000) / 60000);
    const dias = Math.floor(horas / 24);
    const tiempoLabel = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h ${minutos}m`;
    const bukLabel = mark.enviado_buk ? "Buk OK" : `Buk: ${mark.buk_status || "sin enviar"}`;

    lineas.push([
      dni,
      nombre,
      cargo,
      empresa,
      mark.fecha,
      String(mark.hora).slice(0, 5),
      mark.jornada || mark.fecha,
      tiempoLabel,
      bukLabel
    ].map(escapeCsv).join(";"));
  });

  const csv = "﻿" + lineas.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `turnos-abiertos-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  setMessage(elements.openTurnsStatus, `${rows.length} fila(s) exportadas a CSV.`, "success");
}

async function quickCloseTurn(dni) {
  if (!state.isAdmin) return;
  if (!dni) return;
  showTab("admin");
  elements.manualDniInput.value = dni;
  elements.manualDniInput.focus();
  elements.manualDniInput.scrollIntoView({ behavior: "smooth", block: "center" });
  setMessage(elements.manualMessage, "Completa fecha, hora y motivo para cerrar este turno.", "success");
}

function confirmGraphical(title, text, acceptLabel = "Confirmar", cancelLabel = "Cancelar") {
  return new Promise((resolve) => {
    elements.confirmTitle.textContent = title;
    elements.confirmText.textContent = text;
    elements.confirmAccept.textContent = acceptLabel;
    elements.confirmCancel.textContent = cancelLabel;
    elements.confirmOverlay.classList.remove("hidden");

    const cleanup = () => {
      elements.confirmOverlay.classList.add("hidden");
      elements.confirmAccept.removeEventListener("click", onAccept);
      elements.confirmCancel.removeEventListener("click", onCancel);
    };
    const onAccept = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    elements.confirmAccept.addEventListener("click", onAccept);
    elements.confirmCancel.addEventListener("click", onCancel);
  });
}

async function loadLastEntradaForDni(dni) {
  const cleanDni = normalizeDni(dni);
  if (!cleanDni) {
    state.lastEntrada = null;
    return null;
  }
  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,jornada,sentido,enviado_buk,buk_status,colaboradores!inner(dni,nombre)")
    .eq("colaboradores.dni", cleanDni)
    .eq("sentido", "entrada")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(1);
  if (error) {
    state.lastEntrada = null;
    return null;
  }
  state.lastEntrada = data?.[0] || null;
  return state.lastEntrada;
}

async function lookupObraIdDeColaborador(dni) {
  try {
    const { data, error } = await supabaseClient.functions.invoke("consultar-colaborador-buk", {
      body: { dni_colaborador: dni }
    });
    if (error || !data?.ok) {
      console.warn("[BUK] lookup colaborador fallo", { error, data });
      return { obraId: null, lookup: data || { error: error?.message || "sin respuesta" } };
    }
    return { obraId: data.obra_id_principal || data.obra_ids?.[0] || null, lookup: data };
  } catch (error) {
    console.warn("[BUK] lookup colaborador excepcion", error);
    return { obraId: null, lookup: { error: error?.message || "excepcion en lookup" } };
  }
}

async function findEntradaToCloseSalida(dni, salidaFecha, salidaHora) {
  const cleanDni = normalizeDni(dni);
  if (!cleanDni) return null;

  const diaAnterior = addDays(salidaFecha, -1);

  const { data, error } = await supabaseClient
    .from("asistencias")
    .select("id,fecha,hora,jornada,sentido,colaboradores!inner(dni)")
    .eq("colaboradores.dni", cleanDni)
    .eq("sentido", "entrada")
    .in("fecha", [salidaFecha, diaAnterior])
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(20);

  if (error || !Array.isArray(data)) return null;

  const salidaHoraNorm = String(salidaHora || "").length === 5 ? `${salidaHora}:00` : salidaHora;
  const salidaTs = new Date(`${salidaFecha}T${salidaHoraNorm}`).getTime();
  if (Number.isNaN(salidaTs)) return null;

  return data.find((row) => {
    const horaNorm = String(row.hora || "").slice(0, 8);
    const ts = new Date(`${row.fecha}T${horaNorm}`).getTime();
    return !Number.isNaN(ts) && ts < salidaTs;
  }) || null;
}

function bukRespuestaMencionaEntradaPrevia(bukData) {
  if (!bukData) return false;
  const textos = [
    bukData?.error,
    bukData?.respuesta?.error,
    ...(Array.isArray(bukData?.intentos) ? bukData.intentos.map((i) => i?.error || i?.respuesta?.error) : [])
  ].filter(Boolean).map(String);
  return textos.some((t) => /no existe una marca de entrada previa/i.test(t));
}

function computeJornadaForMark(sentido, fechaMarca, lastEntradaFecha) {
  if (sentido !== "salida") return fechaMarca;
  const lastFecha = lastEntradaFecha
    ?? (state.lastAttendance?.sentido === "entrada" ? state.lastAttendance.fecha : null);
  if (lastFecha && lastFecha < fechaMarca) return lastFecha;
  return fechaMarca;
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
  const desde = (elements.adminDateFromInput.value || "").trim();
  const hasta = (elements.adminDateToInput.value || "").trim();

  if (desde && hasta && desde > hasta) {
    elements.adminMarksStatus.textContent = "El rango de fechas es invalido (Desde > Hasta).";
    return;
  }

  elements.adminMarksStatus.textContent = "Cargando marcas...";

  const conRango = Boolean(desde || hasta);
  const PAGE = 1000;
  const TOPE = conRango ? 20000 : 1000;
  let acumulado = [];
  let offset = 0;

  while (offset < TOPE) {
    let query = supabaseClient
      .from("asistencias")
      .select("id,fecha,hora,sentido,origen,observacion,enviado_buk,buk_status,colaboradores(dni,nombre)")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);
    query = query.range(offset, offset + PAGE - 1);

    elements.adminMarksStatus.textContent = `Cargando marcas... (${acumulado.length})`;
    const { data, error } = await query;
    if (error) {
      elements.adminMarksStatus.textContent = "No se pudieron cargar las marcas.";
      return;
    }
    const batch = data || [];
    acumulado = acumulado.concat(batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
    if (!conRango) break;
  }

  state.adminMarks = acumulado;
  populateAdminCargoFilter();
  state.adminPage = 1;
  renderAdminMarks();
}

function renderAdminMarks() {
  const nameQuery = elements.adminNameSearchInput.value.trim().toLowerCase();
  const dniQuery = normalizeDni(elements.adminDniSearchInput.value);
  const desde = (elements.adminDateFromInput.value || "").trim();
  const hasta = (elements.adminDateToInput.value || "").trim();
  const selectedCargos = getSelectedAdminCargos();
  const rows = buildAdminJourneys(state.adminMarks).filter((item) => {
    const dni = item.dni || "";
    const name = item.nombre || getDisplayNameForDni(dni);
    const cargo = getCargoForDni(dni);

    if (nameQuery && !name.toLowerCase().includes(nameQuery)) return false;
    if (dniQuery && !normalizeDni(dni).includes(dniQuery)) return false;
    if (desde || hasta) {
      const fechas = [item.fecha, item.salidaFecha].filter(Boolean);
      const dentro = fechas.some((f) => (!desde || f >= desde) && (!hasta || f <= hasta));
      if (!dentro) return false;
    }
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
  const todos = state.sonarDrivers || [];
  const drivers = todos.filter((driver) => {
    if (!query) return true;
    return [driver.cedula, driver.nombre, driver.dr_id]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  elements.sonarDriverSelect.innerHTML = `
    <option value="">Selecciona conductor Sonar</option>
    ${todos.map((driver) => `
      <option
        value="${escapeHtml(driver.dr_id)}"
        data-cedula="${escapeHtml(driver.cedula || "")}"
        data-nombre="${escapeHtml(driver.nombre || "")}"
      >${escapeHtml(driver.cedula || "Sin cédula")} - ${escapeHtml(driver.nombre || "Sin nombre")}</option>
    `).join("")}
  `;
  if (state.selectedSonarDriverId) {
    elements.sonarDriverSelect.value = state.selectedSonarDriverId;
  }

  const visibles = drivers.slice(0, 50);
  if (!drivers.length) {
    elements.sonarDriverList.innerHTML = `<li class="sonar-driver-list-empty">${todos.length ? "No hay conductores para mostrar con ese filtro." : "Carga la base con Consumir conductores."}</li>`;
  } else {
    elements.sonarDriverList.innerHTML = visibles.map((driver) => {
      const seleccionado = state.selectedSonarDriverId === driver.dr_id;
      return `
        <li class="sonar-driver-item ${seleccionado ? "selected" : ""}"
            data-driver-id="${escapeHtml(driver.dr_id)}"
            data-cedula="${escapeHtml(driver.cedula || "")}"
            data-nombre="${escapeHtml(driver.nombre || "")}"
            role="option"
            aria-selected="${seleccionado}">
          <div>
            <div>${escapeHtml(driver.nombre || "Sin nombre")}</div>
            <div class="driver-meta">CC ${escapeHtml(driver.cedula || "Sin cedula")} &middot; dr_id ${escapeHtml(driver.dr_id)}</div>
          </div>
          ${seleccionado ? '<i data-lucide="check"></i>' : ""}
        </li>
      `;
    }).join("");
    if (drivers.length > visibles.length) {
      elements.sonarDriverList.innerHTML += `<li class="sonar-driver-list-empty">Mostrando ${visibles.length} de ${drivers.length}. Refina la busqueda para ver mas.</li>`;
    }
    renderIcons();
  }

  elements.sonarAdminStatus.className = "result-box";
  elements.sonarAdminStatus.innerHTML = drivers.length
    ? `<strong>${drivers.length}</strong> conductor(es) coinciden con "${escapeHtml(query) || "todos"}".`
    : (todos.length ? "No hay conductores para mostrar con ese filtro." : "Aun no hay conductores cargados.");

  renderSonarDriverSelectedLabel();
}

function renderSonarDriverSelectedLabel() {
  if (!elements.sonarDriverSelected) return;
  const driver = (state.sonarDrivers || []).find((d) => d.dr_id === state.selectedSonarDriverId);
  if (!driver) {
    elements.sonarDriverSelected.innerHTML = '<span class="muted">Ningun conductor seleccionado.</span>';
    return;
  }
  elements.sonarDriverSelected.innerHTML = `
    Conductor: <strong>${escapeHtml(driver.nombre || "Sin nombre")}</strong> &middot;
    CC ${escapeHtml(driver.cedula || "Sin cedula")} &middot;
    dr_id <strong>${escapeHtml(driver.dr_id)}</strong>
  `;
}

function selectSonarDriver(driverId) {
  state.selectedSonarDriverId = driverId || null;
  elements.sonarDriverSelect.value = driverId || "";
  renderSonarDriverOptions();
  updateSonarSelectionBox();
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
      .select("sentido,fecha,hora")
      .eq("colaborador_id", colaborador.id)
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    const last = lastRows?.[0];
    if (!last || last.sentido !== "entrada") {
      const detalle = last
        ? `La ultima marca fue una ${last.sentido} el ${last.fecha} ${String(last.hora).slice(0, 5)}.`
        : "El colaborador no tiene marcas registradas.";
      setMessage(elements.manualMessage, "No se puede registrar salida manual: el colaborador no tiene entrada abierta.", "error");
      showAlertModal(
        "Sin entrada abierta",
        `No se puede registrar la salida manual: ${detalle} Verifica con el colaborador antes de continuar.`
      );
      return;
    }

    const jornadaBuk = computeJornadaForMark("salida", fecha, last.fecha);

    if (jornadaBuk !== fecha) {
      showAlertModal(
        "Cierre de turno nocturno",
        `Esta salida cerrara la jornada ${jornadaBuk} (entrada del ${last.fecha} a las ${String(last.hora).slice(0, 5)}).`
      );
    }

    const observacion = `Salida manual. Motivo: ${motivo}`;
    const { data: insertedAttendance, error: insertError } = await supabaseClient
      .from("asistencias")
      .insert({
        colaborador_id: colaborador.id,
        obra_id: colaborador.obra_id,
        fecha,
        hora,
        jornada: jornadaBuk,
        sentido: "salida",
        origen: "manual",
        registrado_por: state.user.id,
        observacion
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const { obraId: obraIdReal } = await lookupObraIdDeColaborador(colaborador.dni);
    const obraIdAUsar = obraIdReal || BUK_OBRA_ID;

    const { data: bukData, error: bukError } = await supabaseClient.functions.invoke("enviar-asistencia-buk", {
      body: {
        asistencia_id: insertedAttendance.id,
        obra_id: obraIdAUsar,
        dni_colaborador: colaborador.dni,
        jornada: jornadaBuk,
        fecha,
        hora,
        sentido: "salida"
      }
    });

    const bukOk = !bukError && !!bukData?.ok;

    await notifyManualAdminExitWebhook({
      colaborador,
      colaboradorCsv: csvCollaborator,
      entrada: last,
      salida: { fecha, hora, jornada: jornadaBuk },
      motivo,
      bukOk,
      bukResultado: bukData ?? { error: bukError?.message || "sin respuesta" },
      asistenciaId: insertedAttendance.id
    });

    if (!bukOk) {
      setMessage(elements.manualMessage, "Salida guardada, pero no se pudo enviar a Buk/Ctrlit. Administracion fue notificada.", "error");
    } else {
      setMessage(elements.manualMessage, "Salida manual registrada y enviada a Buk/Ctrlit. Administracion fue notificada.", "success");
    }

    elements.manualReasonInput.value = "";
    await loadAdminMarks();
    loadOpenTurns().catch(() => {});
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
elements.overdueDriversToastClose.addEventListener("click", dismissOverdueDriversToast);
elements.overdueDriversToastGo.addEventListener("click", () => {
  dismissOverdueDriversToast();
  showTab("admin");
  showAdminSubtab("alerts");
  document.getElementById("overdueTurnsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.adminSubtabs?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-admin-tab]");
  if (!btn) return;
  showAdminSubtab(btn.dataset.adminTab);
});
elements.attendanceForm.addEventListener("submit", submitAttendance);
elements.reportDateInput.addEventListener("input", () => { state.reportDateTouched = true; });
elements.reportTimeInput.addEventListener("input", () => { state.reportTimeTouched = true; });
elements.sentidoEntradaButton.addEventListener("click", () => setSentido("entrada"));
elements.sentidoSalidaButton.addEventListener("click", () => setSentido("salida"));
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
  hideAlertModal();
  const registerVisible = !elements.registerPanel.classList.contains("hidden");
  if (state.csvCandidate && registerVisible) {
    await startCamera();
  }
});
elements.pendingExitCancel.addEventListener("click", () => {
  closePendingExitModal();
});
elements.pendingExitForm.addEventListener("submit", submitPendingExitFromModal);
elements.openTurnsReloadButton.addEventListener("click", loadOpenTurns);
elements.openTurnsExportButton.addEventListener("click", exportOpenTurnsToCSV);
elements.overdueTurnsExportButton.addEventListener("click", exportOverdueTurnsToCSV);
elements.overdueTurnsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-close-turn]");
  if (!button) return;
  quickCloseTurn(button.dataset.closeTurn);
});
elements.openTurnsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-close-turn]");
  if (!button) return;
  quickCloseTurn(button.dataset.closeTurn);
});
elements.openTurnsSearchInput.addEventListener("input", () => renderOpenTurns());
elements.openTurnsCargoFilter.addEventListener("change", () => renderOpenTurns());
elements.reloadCsvButton.addEventListener("click", loadCollaboratorsCsv);
elements.csvSearchInput.addEventListener("input", renderCsvTable);
elements.manualExitForm.addEventListener("submit", registerManualExit);
elements.sonarAdminForm.addEventListener("submit", assignSonarDriverManually);
elements.loadSonarDriversButton.addEventListener("click", loadSonarDrivers);
elements.sonarDriverSearchInput.addEventListener("input", renderSonarDriverOptions);
elements.sonarDriverSelect.addEventListener("change", () => {
  state.selectedSonarDriverId = elements.sonarDriverSelect.value || null;
  renderSonarDriverSelectedLabel();
  updateSonarSelectionBox();
});
elements.sonarDriverList.addEventListener("click", (event) => {
  const item = event.target.closest(".sonar-driver-item[data-driver-id]");
  if (!item) return;
  selectSonarDriver(item.dataset.driverId);
});
elements.sonarVehicleSelect.addEventListener("change", updateSonarSelectionBox);
elements.reloadMarksButton.addEventListener("click", loadAdminMarks);
elements.adminDniSearchInput.addEventListener("input", () => {
  state.adminPage = 1;
  renderAdminMarks();
});
elements.adminDateFromInput.addEventListener("change", () => {
  state.adminPage = 1;
  loadAdminMarks();
});
elements.adminDateToInput.addEventListener("change", () => {
  state.adminPage = 1;
  loadAdminMarks();
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

init();

(function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) {
          mostrarBannerActualizacion(reg);
        }

        reg.addEventListener("updatefound", () => {
          const nuevoSw = reg.installing;
          if (!nuevoSw) return;
          nuevoSw.addEventListener("statechange", () => {
            if (nuevoSw.state === "installed" && navigator.serviceWorker.controller) {
              mostrarBannerActualizacion(reg);
            }
          });
        });

        reg.update().catch(() => {});
        setInterval(() => { reg.update().catch(() => {}); }, 5 * 60 * 1000);

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => {});
          }
        });
      })
      .catch((error) => console.warn("[PWA] no se pudo registrar SW", error));

    let recargandoPorSw = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargandoPorSw) return;
      recargandoPorSw = true;
      window.location.reload();
    });
  });
})();

function mostrarBannerActualizacion(reg) {
  const banner = document.getElementById("updateBanner");
  const boton = document.getElementById("updateBannerButton");
  if (!banner || !boton) return;
  banner.classList.remove("hidden");
  boton.onclick = () => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };
}

(function configurarInstalacionPWA() {
  let deferredPrompt = null;
  const boton = document.getElementById("installPwaButton");

  const yaInstaladaStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (yaInstaladaStandalone()) {
    if (boton) boton.classList.add("hidden");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (boton) boton.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (boton) boton.classList.add("hidden");
  });

  if (boton) {
    boton.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          boton.classList.add("hidden");
        }
      } catch (error) {
        console.warn("[PWA] no se pudo mostrar prompt de instalacion", error);
      } finally {
        deferredPrompt = null;
      }
    });
  }
})();
