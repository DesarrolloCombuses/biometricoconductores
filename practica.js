// Práctica y examen del biométrico. Página independiente de la app de marcas:
// no se conecta a Supabase ni a Buk; las pantallas son capturas con datos de ejemplo
// (practica-capturas.js) y el resultado se comparte por WhatsApp.
(() => {
  "use strict";

  const CAPTURAS = window.PRACTICA_CAPTURAS || {};
  const EXAMEN_TOTAL = 10;
  const EXAMEN_TOQUES = 4;
  const EXAMEN_APRUEBA = 8;
  const TOLERANCIA = 2; // % de margen alrededor del botón al tocar la pantalla
  const ROLES = {
    conductor: { nombre: "Conductor", grupo: "conductor" },
    movilidad: { nombre: "Gestor de movilidad", grupo: "gestor" },
    servicios: { nombre: "Gestor de servicios y embarque", grupo: "gestor" }
  };

  // Banco de preguntas en el orden del flujo de la app. rol: "todos" | "conductor" | "gestor".
  // tipo "opcion": la primera opción es la correcta (se barajan al mostrar).
  // tipo "toque": captura + zona correcta de practica-capturas.js.
  const PREGUNTAS = [
    { id: "t-login", tipo: "toque", rol: "todos", tema: "Paso 1 · Entrar",
      texto: "Ya escribiste tu usuario y tu contraseña. Toca donde entras a la app.",
      captura: "login", zona: "iniciar", respuesta: "«Iniciar sesión»",
      explica: "Con «Iniciar sesión» entras. Si abres la app desde el portal de enturnamiento, la sesión ya viene iniciada." },
    { id: "o-primero", tipo: "opcion", rol: "todos", tema: "Paso 2 · Cédula",
      texto: "Ya entraste a la app. ¿Cuál es el primer paso para marcar?",
      opciones: ["Escribir tu cédula y tocar «Validar»", "Tomar la foto de tu rostro", "Tocar «Registrar asistencia»", "Escribir el vehículo"],
      explica: "Siempre empiezas por la cédula: con ella la app sabe quién eres y qué marca te toca." },
    { id: "o-cedula", tipo: "opcion", rol: "todos", tema: "Paso 2 · Cédula",
      texto: "¿Cómo escribes tu cédula?",
      opciones: ["1234567890", "1.234.567.890", "1 234 567 890", "CC 1234567890"],
      explica: "Solo los números: sin puntos, sin espacios y sin letras." },
    { id: "t-validar", tipo: "toque", rol: "todos", tema: "Paso 2 · Cédula",
      texto: "Ya escribiste tu cédula. ¿Qué tocas ahora?",
      captura: "cedula", zona: "validar", respuesta: "«Validar»",
      explica: "«Validar» busca tu nombre y revisa si te toca ENTRADA o SALIDA." },
    { id: "o-no-soy", tipo: "opcion", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "La app muestra un nombre que no es el tuyo. ¿Qué haces?",
      opciones: ["Toco «No soy yo» y reviso la cédula que escribí", "Toco «Sí, soy yo» para no perder tiempo", "Sigo y tomo la foto igual", "Le aviso a mi líder la otra semana"],
      explica: "Si sigues con otro nombre, la marca le queda a otra persona. Revisa la cédula y vuelve a validar." },
    { id: "t-sentido", tipo: "toque", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "¿Dónde dice si vas a registrar ENTRADA o SALIDA? Tócalo.",
      captura: "eres_tu", zona: "sentido", respuesta: "La etiqueta «Vas a registrar tu ENTRADA»",
      explica: "Léela siempre antes de confirmar: ahí dice qué marca vas a hacer." },
    { id: "t-si-soy", tipo: "toque", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "Es tu nombre y vas llegando a trabajar. Toca para confirmar.",
      captura: "eres_tu", zona: "si_soy_yo", respuesta: "«Sí, soy yo · registrar mi ENTRADA»",
      explica: "Es tu nombre y la marca es ENTRADA: confirmas con «Sí, soy yo»." },
    { id: "t-confirma-entrada", tipo: "toque", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "Vas llegando a trabajar y la app te pregunta esto. Toca la respuesta correcta.",
      captura: "confirmar", zona: "aceptar", respuesta: "«Sí, es mi ENTRADA»",
      explica: "Llegas a trabajar: es tu ENTRADA." },
    { id: "t-no-revisar", tipo: "toque", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "Vas saliendo del turno, pero la app te pregunta por tu ENTRADA. Toca la respuesta correcta.",
      captura: "confirmar", zona: "revisar", respuesta: "«No, revisar»",
      explica: "No confirmes una marca equivocada. Toca «No, revisar» y elige SALIDA en los botones de abajo. La marca queda con una nota para que el administrador la revise." },
    { id: "o-dos-veces", tipo: "opcion", rol: "todos", tema: "Paso 3 · Confirmar",
      texto: "¿Por qué la app te pregunta dos veces si es ENTRADA o SALIDA?",
      opciones: ["Para que lo revises bien: es el paso que más errores evita", "Porque la app está fallando", "Para que marques dos veces", "Porque siempre hay que tocar «No, revisar»"],
      explica: "Una marca con el tipo equivocado descuadra tu jornada. Lee bien antes de confirmar." },
    { id: "o-foto", tipo: "opcion", rol: "todos", tema: "Paso 4 · Foto",
      texto: "¿Cómo debe salir tu foto?",
      opciones: ["De frente, dentro del óvalo y con buena luz", "De lado, para que se vea el bus", "Con gafas oscuras y gorra", "Lejos de la cámara"],
      explica: "La cara completa, de frente, dentro del óvalo y bien iluminada." },
    { id: "t-capturar", tipo: "toque", rol: "todos", tema: "Paso 4 · Foto",
      texto: "Tu cara está dentro del óvalo. Toca para tomar la foto.",
      captura: "foto", zona: "capturar", respuesta: "«Capturar rostro»",
      explica: "Con «Capturar rostro» se toma la foto. La X de arriba cierra la cámara." },
    { id: "o-repetir-foto", tipo: "opcion", rol: "conductor", tema: "Paso 4 · Foto",
      texto: "Eres conductor y la app te pide repetir la foto. ¿Por qué?",
      opciones: ["Porque verifica tu rostro y la foto salió de lado, oscura o tapada", "Porque ya marcaste hoy", "Porque la foto es para el carné", "Porque no hay internet"],
      explica: "En los conductores la app compara tu rostro. Repite la foto de frente y con buena luz." },
    { id: "o-datos-conductor", tipo: "opcion", rol: "conductor", tema: "Solo conductores",
      texto: "¿Qué datos pide la app solo a los conductores?",
      opciones: ["El vehículo (interno o placa) y la base operativa", "La licencia de conducción", "El kilometraje del bus", "La dirección de la casa"],
      explica: "Los conductores escriben el vehículo del día y la base operativa. Los gestores no." },
    { id: "t-vehiculo", tipo: "toque", rol: "conductor", tema: "Solo conductores",
      texto: "Eres conductor. Toca donde escribes el vehículo de hoy.",
      captura: "vehiculo", zona: "vehiculo", respuesta: "El campo «Vehículo»",
      explica: "Escribe el interno o la placa y elige el vehículo de la lista." },
    { id: "o-llenos", tipo: "opcion", rol: "conductor", tema: "Solo conductores",
      texto: "El vehículo y la base ya aparecen llenos. ¿Qué haces?",
      opciones: ["Reviso que sean los de hoy antes de registrar", "Los borro siempre", "No los miro", "Escribo cualquier vehículo"],
      explica: "Si están en tu programación, la app los llena sola. Igual revisa que sean los correctos." },
    { id: "o-sin-turno", tipo: "opcion", rol: "gestor", tema: "Gestores",
      texto: "Eres gestor. ¿Por qué la app muestra «Sin turno programado»?",
      opciones: ["Porque los gestores no tienen programación: la app decide por tu última marca y tú la revisas", "Porque estás de vacaciones", "Porque la app se dañó", "Porque los gestores no marcan"],
      explica: "Sin programación, la app propone ENTRADA o SALIDA según tu última marca. Por eso debes revisarla siempre." },
    { id: "t-anuncio", tipo: "toque", rol: "gestor", tema: "Gestores",
      texto: "Eres gestor. ¿Dónde dice qué marca vas a registrar? Tócalo.",
      captura: "gestor", zona: "anuncio", respuesta: "El aviso «Va a registrar ENTRADA»",
      explica: "Como no tienes turno programado, sale de tu última marca. Revísalo antes de confirmar." },
    { id: "o-gestor-vehiculo", tipo: "opcion", rol: "gestor", tema: "Gestores",
      texto: "Eres gestor. ¿Tienes que escribir vehículo y base?",
      opciones: ["No, eso es solo para conductores", "Sí, siempre", "Solo los lunes", "Solo cuando marcas SALIDA"],
      explica: "Los gestores hacen los mismos pasos, pero sin vehículo ni base." },
    { id: "o-gestor-olvido", tipo: "opcion", rol: "gestor", tema: "Gestores",
      texto: "Eres gestor. Ayer olvidaste marcar la salida y hoy, al llegar, la app te propone SALIDA. ¿Qué haces?",
      opciones: ["No la marco y le aviso a mi líder", "Marco SALIDA y después ENTRADA", "Marco SALIDA y ya", "No vuelvo a marcar"],
      explica: "Esa SALIDA quedaría con la hora de hoy y dañaría tu jornada. Tu líder cierra el día anterior con la hora real." },
    { id: "t-ubicacion", tipo: "toque", rol: "todos", tema: "Paso 5 · Registrar",
      texto: "La ubicación no se activó sola. Toca para activarla.",
      captura: "ubicacion", zona: "activar", respuesta: "«Activar ubicación»",
      explica: "Toca «Activar ubicación» y permite el GPS. Sin ubicación no se puede registrar." },
    { id: "o-ubicacion", tipo: "opcion", rol: "todos", tema: "Paso 5 · Registrar",
      texto: "La ubicación es…",
      opciones: ["Obligatoria: si no se activa sola, toco «Activar ubicación»", "Opcional", "Solo para los conductores", "Solo para la SALIDA"],
      explica: "La app no registra la marca sin ubicación. En el celular, el GPS debe estar encendido." },
    { id: "t-tipo-salida", tipo: "toque", rol: "todos", tema: "Paso 5 · Registrar",
      texto: "Vas a marcar tu SALIDA, pero está elegida ENTRADA. Toca el tipo de marca correcto.",
      captura: "tipo_marca", zona: "salida", respuesta: "«Salida»",
      explica: "Revisa siempre el tipo de marca antes de registrar." },
    { id: "o-whatsapp", tipo: "opcion", rol: "todos", tema: "Paso 5 · Registrar",
      texto: "El celular para el comprobante por WhatsApp es…",
      opciones: ["Opcional: si lo escribes, te llega el comprobante", "Obligatorio", "El número de tu líder", "Para iniciar sesión"],
      explica: "Puedes dejarlo vacío. Si escribes tu celular, te llega el comprobante de la marca por WhatsApp." },
    { id: "t-registrar", tipo: "toque", rol: "todos", tema: "Paso 5 · Registrar",
      texto: "Ya revisaste todo. Toca para terminar tu marca.",
      captura: "registrar", zona: "registrar", respuesta: "«Registrar asistencia»",
      explica: "El botón verde «Registrar asistencia» guarda tu marca." },
    { id: "o-termine", tipo: "opcion", rol: "todos", tema: "Paso 6 · Listo",
      texto: "¿Qué pantalla te dice que terminaste?",
      opciones: ["«Asistencia registrada»", "«Captura de rostro»", "«¿Eres tú?»", "«Digita una cédula para validar»"],
      explica: "Cuando ves «Asistencia registrada», tu marca quedó guardada." },
    { id: "o-pendiente", tipo: "opcion", rol: "todos", tema: "Paso 6 · Listo",
      texto: "Al final te sale «Marca guardada (pendiente de Buk)». ¿Qué haces?",
      opciones: ["Nada más: mi marca quedó guardada. No la repito", "Marco otra vez", "Desinstalo la app", "Marco al día siguiente"],
      explica: "Administración la reenvía a Buk. Si la repites, queda duplicada." },
    { id: "t-entendido", tipo: "toque", rol: "todos", tema: "Paso 6 · Listo",
      texto: "Ya terminaste. Toca para cerrar este resumen.",
      captura: "exito", zona: "entendido", respuesta: "«Entendido»",
      explica: "«Entendido» cierra el resumen. Tu marca ya quedó." },
    { id: "o-bloqueada", tipo: "opcion", rol: "todos", tema: "Si algo falla",
      texto: "La cámara o la ubicación están bloqueadas. ¿Qué haces?",
      opciones: ["Toco el candado junto a la dirección, elijo «Permitir» y recargo la página", "Marco sin foto", "Espero al otro día", "Borro la app"],
      explica: "Los permisos se dan en el candado junto a la dirección. En el celular, revisa también que el GPS esté encendido." },
    { id: "o-sesion", tipo: "opcion", rol: "todos", tema: "Si algo falla",
      texto: "Aparece «La sesión venció». ¿Qué haces?",
      opciones: ["Recargo la página e inicio sesión otra vez", "Escribo la cédula otra vez sin recargar", "Desinstalo la app", "No marco"],
      explica: "Al recargar e iniciar sesión, la app vuelve a funcionar." },
    { id: "o-verificar", tipo: "opcion", rol: "todos", tema: "Si algo falla",
      texto: "La app dice «No se pudo verificar…» tu última marca. ¿Qué haces?",
      opciones: ["Reviso el internet y toco «Validar» otra vez", "Marco ENTRADA de una vez", "Marco dos veces por si acaso", "Cierro la app y no marco"],
      explica: "Casi siempre es la conexión. Con internet, al validar otra vez la app revisa tu última marca." },
    { id: "o-dos-marcas", tipo: "opcion", rol: "todos", tema: "Antes de irte",
      texto: "¿Cuántas marcas haces en cada turno?",
      opciones: ["Dos: ENTRADA al llegar y SALIDA al irte", "Una sola, al llegar", "Una sola, al irme", "Las que quiera"],
      explica: "Siempre las dos. Sin la SALIDA, tu jornada queda abierta." },
    { id: "t-mis-registros", tipo: "toque", rol: "todos", tema: "Antes de irte",
      texto: "Quieres revisar las marcas que ya hiciste. Toca la pestaña correcta.",
      captura: "pestanas", zona: "mis_registros", respuesta: "«Mis registros»",
      explica: "En «Mis registros» ves tus marcas." },
    { id: "o-avisar", tipo: "opcion", rol: "todos", tema: "Antes de irte",
      texto: "Si algo quedó mal en tu marca, ¿cuándo le avisas a tu líder?",
      opciones: ["El mismo día", "A fin de mes", "Cuando me pregunten", "No hace falta avisar"],
      explica: "Corregirlo a tiempo es mucho más fácil." },
    { id: "o-companero", tipo: "opcion", rol: "todos", tema: "Antes de irte",
      texto: "¿Puedes hacerle la marca a un compañero?",
      opciones: ["No. Cada persona marca con su cédula y su propia cara", "Sí, si me presta su cédula", "Sí, con mi foto", "Sí, si llega tarde"],
      explica: "La foto debe ser de quien marca. Si tu compañero no tiene celular, puede marcar en el tuyo con su cédula y su cara." }
  ];

  // ---------------------------------------------------------------- utilidades
  const $ = (id) => document.getElementById(id);
  const LETRAS = ["A", "B", "C", "D", "E"];

  function barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function leer(clave) {
    try { return JSON.parse(localStorage.getItem(`practica-biometrico:${clave}`) || "null"); } catch (_) { return null; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(`practica-biometrico:${clave}`, JSON.stringify(valor)); } catch (_) { /* sin almacenamiento */ }
  }

  function ahoraColombia() {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    }).format(new Date());
  }

  // Texto con «etiquetas» en negrita, sin innerHTML con datos del usuario.
  function pintarTexto(el, texto) {
    el.textContent = "";
    texto.split(/(«[^»]*»)/).forEach((parte) => {
      if (!parte) return;
      if (parte.startsWith("«")) {
        const b = document.createElement("b");
        b.textContent = parte;
        el.appendChild(b);
      } else {
        el.appendChild(document.createTextNode(parte));
      }
    });
  }

  function preguntasDelRol(rol) {
    const grupo = ROLES[rol].grupo;
    return PREGUNTAS.filter((p) => (p.rol === "todos" || p.rol === grupo) && (p.tipo === "opcion" || CAPTURAS[p.captura]));
  }

  function armarExamen(rol) {
    const pool = preguntasDelRol(rol);
    const grupo = ROLES[rol].grupo;
    const toques = barajar(pool.filter((p) => p.tipo === "toque")).slice(0, EXAMEN_TOQUES);
    let opciones = barajar(pool.filter((p) => p.tipo === "opcion")).slice(0, EXAMEN_TOTAL - toques.length);
    // Siempre al menos una pregunta propia del cargo.
    if (![...toques, ...opciones].some((p) => p.rol === grupo)) {
      const propia = barajar(pool.filter((p) => p.rol === grupo && p.tipo === "opcion"))[0];
      if (propia) opciones = [propia, ...opciones.slice(0, opciones.length - 1)];
    }
    const orden = new Map(PREGUNTAS.map((p, i) => [p.id, i]));
    return [...toques, ...opciones].sort((a, b) => orden.get(a.id) - orden.get(b.id));
  }

  // ---------------------------------------------------------------- estado
  const st = {
    rol: null, modo: null, lista: [], i: 0, resultados: [],
    seleccion: null, respondida: false, aprendida: false, opcionesMostradas: [], nombre: "", cedula: ""
  };

  const vistas = ["vInicio", "vDatos", "vPregunta", "vResultado"];
  function mostrar(id) {
    vistas.forEach((v) => $(v).classList.toggle("hidden", v !== id));
    $("salirButton").classList.toggle("hidden", id !== "vPregunta");
    if (id !== "vInicio" && !video.paused) video.pause(); // que no siga sonando detrás de las preguntas
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- inicio
  function elegirRol(rol) {
    st.rol = rol;
    document.querySelectorAll(".pr-rol").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.rol === rol)));
    actualizarHabilitados();
    $("practicarInfo").textContent = `Las ${preguntasDelRol(rol).length} preguntas, en orden, con la explicación de cada una.`;
    $("topSub").textContent = ROLES[rol].nombre;
    guardar("rol", rol);
  }

  function empezar(modo) {
    st.modo = modo;
    st.lista = modo === "examen" ? armarExamen(st.rol) : preguntasDelRol(st.rol);
    st.i = 0;
    st.resultados = [];
    mostrar("vPregunta");
    renderPregunta();
  }

  // ---------------------------------------------------------------- pregunta
  function renderPregunta() {
    const p = st.lista[st.i];
    const total = st.lista.length;
    st.seleccion = null;
    st.respondida = false;
    st.aprendida = false;

    $("pNumero").textContent = `Pregunta ${st.i + 1} de ${total}`;
    $("pModo").textContent = st.modo === "examen" ? "Examen" : "Práctica";
    $("pModo").classList.toggle("examen", st.modo === "examen");
    $("pBarra").style.width = `${(st.i / total) * 100}%`;
    $("pTema").textContent = p.tema;
    pintarTexto($("pTexto"), p.texto);
    $("pFeedback").className = "pr-feedback hidden";
    $("pSiguiente").disabled = true;
    $("pSiguiente").textContent = st.i + 1 === total ? "Ver resultado" : "Siguiente";

    const esToque = p.tipo === "toque";
    $("pOpciones").classList.toggle("hidden", esToque);
    $("pToque").classList.toggle("hidden", !esToque);
    $("pPista").classList.toggle("hidden", !esToque);

    if (esToque) {
      const cap = CAPTURAS[p.captura];
      const img = $("pImagen");
      img.src = cap.src;
      img.width = cap.ancho;
      img.height = cap.alto;
      img.alt = `Pantalla de la app. ${p.texto}`;
      $("pZona").className = "pr-zona hidden";
      $("pMarca").className = "pr-marca hidden";
      $("pZonaToque").classList.remove("bloqueada");
    } else {
      st.opcionesMostradas = barajar(p.opciones.map((texto, idx) => ({ texto, correcta: idx === 0 })));
      const cont = $("pOpciones");
      cont.textContent = "";
      st.opcionesMostradas.forEach((op, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pr-op";
        b.setAttribute("aria-pressed", "false");
        const letra = document.createElement("span");
        letra.className = "pr-op-letra";
        letra.textContent = LETRAS[idx];
        const txt = document.createElement("span");
        pintarTexto(txt, op.texto);
        b.append(letra, txt);
        b.addEventListener("click", () => elegirOpcion(idx));
        cont.appendChild(b);
      });
    }
    precargar(st.lista[st.i + 1]);
  }

  function precargar(p) {
    if (p && p.tipo === "toque" && CAPTURAS[p.captura]) {
      const im = new Image();
      im.src = CAPTURAS[p.captura].src;
    }
  }

  // Cuenta solo el primer intento (para la nota), pero no deja seguir hasta acertar:
  // si se equivoca, se le muestra la respuesta y tiene que tocarla él mismo.
  function elegirOpcion(idx) {
    if (st.aprendida) return;
    const p = st.lista[st.i];
    const ok = st.opcionesMostradas[idx].correcta;
    const botones = [...$("pOpciones").children];
    const primero = !st.respondida;
    if (primero) {
      st.respondida = true;
      st.resultados[st.i] = { p, ok };
    }
    if (ok) {
      botones.forEach((b, i) => {
        b.disabled = true;
        b.classList.toggle("correcta", i === idx);
        b.classList.remove("guia");
      });
      aprendio(p, primero);
    } else {
      botones[idx].classList.add("incorrecta");
      botones[idx].disabled = true;
      botones.forEach((b, i) => { if (st.opcionesMostradas[i].correcta) b.classList.add("guia"); });
      vibrar();
      avisar("mal", primero ? "No es correcto" : "Todavía no",
        ["La respuesta correcta está en verde. Tócala para seguir."]);
    }
  }

  function tocarPantalla(ev) {
    if (st.aprendida) return;
    const p = st.lista[st.i];
    if (!p || p.tipo !== "toque") return;
    const r = $("pImagen").getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 100;
    const y = ((ev.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const ok = esCorrecta(p, { x, y });
    const primero = !st.respondida;
    if (primero) {
      st.respondida = true;
      st.resultados[st.i] = { p, ok };
    }
    const m = $("pMarca");
    m.style.left = `${x}%`;
    m.style.top = `${y}%`;
    m.className = `pr-marca ${ok ? "ok" : "mal"}`;
    if (ok) {
      $("pZona").classList.add("lograda");
      $("pZonaToque").classList.add("bloqueada");
      aprendio(p, primero);
    } else {
      mostrarZona(p);
      vibrar();
      avisar("mal", primero ? "No es ahí" : "Todavía no",
        [`Mira el recuadro verde: ahí está ${p.respuesta}. Tócalo para seguir.`]);
    }
  }

  // Acertó (a la primera o después de que se le mostró dónde): explica y deja seguir.
  function aprendio(p, aLaPrimera) {
    st.aprendida = true;
    avisar("ok", aLaPrimera ? "¡Correcto!" : "¡Eso es! Así se hace.", [p.explica]);
    $("pSiguiente").disabled = false;
  }

  function avisar(clase, titulo, parrafos) {
    const fb = $("pFeedback");
    fb.className = `pr-feedback ${clase}`;
    fb.textContent = "";
    const t = document.createElement("strong");
    t.textContent = titulo;
    fb.appendChild(t);
    parrafos.forEach((txt) => {
      const e = document.createElement("p");
      pintarTexto(e, txt);
      fb.appendChild(e);
    });
    // En las de pantalla el recuadro verde es lo importante: no se baja hasta el aviso
    // mientras falte acertar, para no sacarlo de la vista.
    const p = st.lista[st.i];
    if (clase === "ok" || p.tipo === "opcion") fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function vibrar() {
    try { if (navigator.vibrate) navigator.vibrate(120); } catch (_) { /* sin vibración */ }
  }

  function esCorrecta(p, sel) {
    if (sel == null) return false;
    if (p.tipo === "opcion") return st.opcionesMostradas[sel].correcta;
    const [zx, zy, zw, zh] = CAPTURAS[p.captura].zonas[p.zona];
    return sel.x >= zx - TOLERANCIA && sel.x <= zx + zw + TOLERANCIA
      && sel.y >= zy - TOLERANCIA && sel.y <= zy + zh + TOLERANCIA;
  }

  function respuestaCorrecta(p) {
    return p.tipo === "opcion" ? p.opciones[0] : p.respuesta;
  }

  function mostrarZona(p) {
    const [zx, zy, zw, zh] = CAPTURAS[p.captura].zonas[p.zona];
    const z = $("pZona");
    z.style.left = `${zx}%`;
    z.style.top = `${zy}%`;
    z.style.width = `${zw}%`;
    z.style.height = `${zh}%`;
    z.classList.toggle("abajo", zy < 9); // si el botón está muy arriba, el «Toca aquí» va debajo
    z.classList.remove("hidden", "lograda");
  }

  function siguiente() {
    if (!st.aprendida) return;
    if (st.i + 1 < st.lista.length) {
      st.i += 1;
      renderPregunta();
      window.scrollTo(0, 0);
    } else {
      renderResultado();
    }
  }

  // ---------------------------------------------------------------- resultado
  function renderResultado() {
    const total = st.lista.length;
    const buenas = st.resultados.filter((r) => r && r.ok).length;
    const examen = st.modo === "examen";
    const aprobado = examen && buenas >= EXAMEN_APRUEBA;
    const fecha = ahoraColombia();

    $("pBarra").style.width = "100%";
    $("rPuntaje").textContent = `${buenas}/${total}`;
    $("rTarjeta").className = `pr-resultado ${examen ? (aprobado ? "aprobado" : "reprobado") : ""}`;
    $("rEstado").textContent = examen ? (aprobado ? "Aprobado" : "No aprobado") : "Práctica terminada";
    $("rMensaje").textContent = examen
      ? (aprobado
        ? "¡Muy bien! Ya sabes marcar en el biométrico. Abajo está tu certificado: compártelo con tu líder."
        : `Necesitas ${EXAMEN_APRUEBA} buenas para aprobar. Repasa lo que fallaste y vuelve a intentarlo.`)
      : (buenas === total ? "¡Todas bien! Ya puedes presentar el examen." : "Repasa lo que fallaste y, cuando estés listo, presenta el examen.");

    const datos = $("rDatos");
    datos.textContent = "";
    const filas = examen
      ? [["Nombre", st.nombre], ["Cédula", st.cedula], ["Cargo", ROLES[st.rol].nombre], ["Fecha", fecha]]
      : [["Cargo", ROLES[st.rol].nombre]];
    filas.forEach(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      datos.append(dt, dd);
    });

    $("rCertificado").classList.toggle("hidden", !aprobado);
    if (aprobado) {
      prepararCertificado({
        nombre: st.nombre, cedula: st.cedula, cargo: ROLES[st.rol].nombre, buenas, total,
        fechaLarga: fechaLargaColombia(), fechaHora: fecha
      });
    }
    $("rRepetir").textContent = examen ? "Repetir examen" : "Repetir práctica";
    $("rExamen").classList.toggle("hidden", examen);
    $("rVideo").classList.toggle("hidden", !examen || aprobado);

    const errores = st.resultados.filter((r) => r && !r.ok);
    $("rErroresTitulo").classList.toggle("hidden", errores.length === 0);
    const lista = $("rErrores");
    lista.textContent = "";
    errores.forEach(({ p }) => {
      const li = document.createElement("li");
      const b = document.createElement("span"); b.className = "pr-err-tit"; pintarTexto(b, p.texto);
      const r = document.createElement("p"); r.className = "resp"; pintarTexto(r, `Respuesta: ${respuestaCorrecta(p)}`);
      const e = document.createElement("p"); pintarTexto(e, p.explica);
      li.append(b, r, e);
      lista.appendChild(li);
    });

    if (examen) guardar("ultimo", { buenas, total, aprobado, fecha, rol: st.rol });
    mostrar("vResultado");
  }

  // ---------------------------------------------------------------- certificado
  // Se dibuja en un canvas (A4 vertical) con los datos del examen. No se guarda en ningún
  // servidor: la persona lo descarga o lo comparte desde su celular.
  const CERT_W = 1240;
  const CERT_H = 1754;
  const CERT_FUENTE = "Inter, 'Segoe UI', system-ui, sans-serif";
  let certificadoActual = null; // { blob, nombreArchivo, texto }

  function fechaLargaColombia() {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric"
    }).format(new Date());
  }

  function cedulaConPuntos(c) {
    return String(c).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function cargarImagen(src) {
    return new Promise((ok, mal) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = mal;
      im.src = src;
    });
  }

  function textoEspaciado(ctx, texto, cx, y, espacio) {
    const anchos = [...texto].map((ch) => ctx.measureText(ch).width);
    const total = anchos.reduce((a, b) => a + b, 0) + espacio * (anchos.length - 1);
    let x = cx - total / 2;
    ctx.textAlign = "left";
    [...texto].forEach((ch, i) => { ctx.fillText(ch, x, y); x += anchos[i] + espacio; });
    ctx.textAlign = "center";
  }

  function lineasCentradas(ctx, texto, cx, y, ancho, alto) {
    const palabras = texto.split(" ");
    const lineas = [];
    let actual = "";
    palabras.forEach((p) => {
      const prueba = actual ? `${actual} ${p}` : p;
      if (actual && ctx.measureText(prueba).width > ancho) { lineas.push(actual); actual = p; } else { actual = prueba; }
    });
    if (actual) lineas.push(actual);
    lineas.forEach((l, i) => ctx.fillText(l, cx, y + i * alto));
    return y + lineas.length * alto;
  }

  async function dibujarCertificado(d) {
    try {
      await Promise.all(["400", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px Inter`)));
    } catch (_) { /* sigue con la fuente del sistema */ }
    const cv = document.createElement("canvas");
    cv.width = CERT_W;
    cv.height = CERT_H;
    const ctx = cv.getContext("2d");
    const cx = CERT_W / 2;
    const verde = "#0b6b3a", verdeOscuro = "#064526", tinta = "#172119", gris = "#5f6f63", acento = "#f4b000";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CERT_W, CERT_H);
    // Marco doble y esquinas en acento.
    ctx.strokeStyle = verde; ctx.lineWidth = 14;
    ctx.strokeRect(44, 44, CERT_W - 88, CERT_H - 88);
    ctx.strokeStyle = "#cbd9c4"; ctx.lineWidth = 3;
    ctx.strokeRect(72, 72, CERT_W - 144, CERT_H - 144);
    ctx.fillStyle = acento;
    [[44, 44], [CERT_W - 44, 44], [44, CERT_H - 44], [CERT_W - 44, CERT_H - 44]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    });

    try {
      const logo = await cargarImagen("./assets/logo-combuses.webp");
      const alto = 96;
      let ancho = (logo.width / logo.height) * alto;
      if (ancho > 560) ancho = 560;
      ctx.drawImage(logo, cx - ancho / 2, 150, ancho, (logo.height / logo.width) * ancho);
    } catch (_) {
      ctx.fillStyle = verde; ctx.font = `800 64px ${CERT_FUENTE}`; ctx.textAlign = "center";
      ctx.fillText("COMBUSES", cx, 220);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = acento;
    ctx.fillRect(cx - 80, 300, 160, 8);

    ctx.fillStyle = verdeOscuro;
    ctx.font = `800 96px ${CERT_FUENTE}`;
    textoEspaciado(ctx, "CERTIFICADO", cx, 430, 10);
    ctx.fillStyle = gris;
    ctx.font = `600 34px ${CERT_FUENTE}`;
    textoEspaciado(ctx, "DE APROBACIÓN", cx, 490, 8);

    ctx.fillStyle = tinta;
    ctx.font = `400 38px ${CERT_FUENTE}`;
    ctx.fillText("Combuses S.A. certifica que", cx, 610);

    // Nombre: se achica hasta que quepa.
    let tam = 66;
    ctx.font = `800 ${tam}px ${CERT_FUENTE}`;
    while (ctx.measureText(d.nombre).width > 1000 && tam > 34) {
      tam -= 2;
      ctx.font = `800 ${tam}px ${CERT_FUENTE}`;
    }
    ctx.fillStyle = verdeOscuro;
    ctx.fillText(d.nombre, cx, 720);
    ctx.strokeStyle = "#cbd9c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 460, 752); ctx.lineTo(cx + 460, 752); ctx.stroke();

    ctx.fillStyle = tinta;
    ctx.font = `400 36px ${CERT_FUENTE}`;
    ctx.fillText("con cédula de ciudadanía", cx, 820);
    ctx.font = `700 42px ${CERT_FUENTE}`;
    ctx.fillText(`No. ${cedulaConPuntos(d.cedula)}`, cx, 876);

    ctx.font = `400 36px ${CERT_FUENTE}`;
    lineasCentradas(ctx,
      `completó la capacitación en video y aprobó el examen de uso del biométrico para el registro de ENTRADA y SALIDA, en el cargo de ${d.cargo}, con ${d.buenas} de ${d.total} respuestas correctas.`,
      cx, 980, 960, 54);

    // Sello.
    const sy = 1345;
    ctx.fillStyle = verde;
    ctx.beginPath(); ctx.arc(cx, sy, 130, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, sy, 112, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(cx - 44, sy - 22); ctx.lineTo(cx - 12, sy + 10); ctx.lineTo(cx + 48, sy - 50); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 25px ${CERT_FUENTE}`;
    textoEspaciado(ctx, "APROBADO", cx, sy + 58, 2);

    ctx.fillStyle = tinta;
    ctx.font = `600 36px ${CERT_FUENTE}`;
    ctx.fillText(`Fecha: ${d.fechaLarga}`, cx, 1555);

    ctx.fillStyle = gris;
    ctx.font = `400 22px ${CERT_FUENTE}`;
    ctx.fillText(`Generado por la Práctica del biométrico de Combuses · ${d.fechaHora} (hora de Colombia)`, cx, 1640);

    return cv;
  }

  async function prepararCertificado(d) {
    certificadoActual = null;
    $("rCertImg").classList.add("hidden");
    $("rCertCargando").classList.remove("hidden");
    $("rCertNota").classList.add("hidden");
    $("rCompartir").disabled = true;
    $("rDescargar").disabled = true;
    try {
      const cv = await dibujarCertificado(d);
      const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
      const nombreArchivo = `Certificado biometrico - ${d.nombre} - ${d.cedula}.png`;
      const texto = [
        "*Certificado · Examen del biométrico · Combuses*",
        `Nombre: ${d.nombre}`,
        `Cédula: ${d.cedula}`,
        `Cargo: ${d.cargo}`,
        `Resultado: ${d.buenas}/${d.total} · APROBADO`,
        `Fecha: ${d.fechaHora}`
      ].join("\n");
      certificadoActual = { blob, nombreArchivo, texto };
      const img = $("rCertImg");
      img.src = URL.createObjectURL(blob);
      img.classList.remove("hidden");
      $("rCertCargando").classList.add("hidden");
      $("rCompartir").disabled = false;
      $("rDescargar").disabled = false;
    } catch (err) {
      $("rCertCargando").textContent = "No se pudo crear el certificado. Toca «Repetir examen» o recarga la página.";
    }
  }

  function descargarCertificado() {
    if (!certificadoActual) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(certificadoActual.blob);
    a.download = certificadoActual.nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function avisoCertificado(texto) {
    const n = $("rCertNota");
    n.textContent = texto;
    n.classList.remove("hidden");
  }

  async function compartirCertificado() {
    if (!certificadoActual) return;
    const archivo = new File([certificadoActual.blob], certificadoActual.nombreArchivo, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: "Certificado del biométrico", text: certificadoActual.texto });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // la persona cerró el menú de compartir
      }
    }
    // Sin «compartir archivos» (computador o navegador viejo): se descarga para enviarlo a mano.
    descargarCertificado();
    avisoCertificado("Se descargó tu certificado. Envíaselo a tu líder por WhatsApp como imagen.");
  }

  // ---------------------------------------------------------------- video
  // Obligatorio antes de practicar o presentar el examen. Solo cuenta lo visto de corrido
  // (no deja adelantar) y se recuerda mientras la pestaña siga abierta (sessionStorage), para
  // que en un celular o tableta compartidos la siguiente persona también lo tenga que ver.
  const video = $("videoCapacitacion");
  const VELOCIDAD_MAX = 2;
  const CLAVE_VIDEO = "practica-biometrico:video-visto";
  let maxVisto = 0;
  let videoVisto = false;
  try { videoVisto = sessionStorage.getItem(CLAVE_VIDEO) === "1"; } catch (_) { /* sin almacenamiento */ }

  function actualizarHabilitados() {
    const listo = Boolean(st.rol) && videoVisto;
    $("practicarButton").disabled = !listo;
    $("examenButton").disabled = !listo;
    let aviso;
    if (!st.rol && !videoVisto) aviso = "Elige tu cargo y mira el video completo para habilitar la práctica y el examen.";
    else if (!st.rol) aviso = "Elige tu cargo para seguir.";
    else if (!videoVisto) aviso = `Cargo: ${ROLES[st.rol].nombre}. Ahora mira el video completo para seguir.`;
    else aviso = `Cargo: ${ROLES[st.rol].nombre}. Ya puedes practicar o presentar el examen.`;
    $("rolAviso").textContent = aviso;
  }

  let avisoVideo = null;
  let avisoVideoHasta = 0;

  function pintarVideo(aviso) {
    // Un aviso (p. ej. «no se puede adelantar») se mantiene unos segundos aunque el video siga.
    if (aviso) { avisoVideo = aviso; avisoVideoHasta = Date.now() + 4000; }
    else if (Date.now() < avisoVideoHasta) aviso = avisoVideo;
    const dur = video.duration || 0;
    const pct = videoVisto ? 100 : (dur ? Math.min(99, Math.floor((maxVisto / dur) * 100)) : 0);
    $("videoBarra").style.width = `${pct}%`;
    $("videoEstado").classList.toggle("aviso", Boolean(aviso));
    let texto;
    if (videoVisto) texto = "✓ Ya viste el video. Puedes volver a verlo cuando quieras.";
    else if (aviso) texto = aviso;
    else if (pct > 0) texto = `Llevas el ${pct}% del video. Míralo hasta el final para seguir.`;
    else texto = "Dura 3 min y medio. Míralo hasta el final para seguir.";
    $("videoTexto").textContent = texto;
    video.closest(".pr-video").classList.toggle("visto", videoVisto);
  }

  function marcarVideoVisto() {
    if (videoVisto) return;
    videoVisto = true;
    try { sessionStorage.setItem(CLAVE_VIDEO, "1"); } catch (_) { /* sin almacenamiento */ }
    pintarVideo();
    actualizarHabilitados();
  }

  video.addEventListener("timeupdate", () => {
    if (videoVisto) return;
    const t = video.currentTime;
    // Avance normal entre dos actualizaciones (más si va a doble velocidad); un salto mayor es adelantar.
    const avanceNormal = 1.5 * Math.max(1, video.playbackRate);
    if (t > maxVisto && t - maxVisto <= avanceNormal) maxVisto = t;
    if (video.duration && maxVisto >= video.duration - 1) marcarVideoVisto();
    else pintarVideo();
  });
  video.addEventListener("seeking", () => {
    if (videoVisto) return;
    if (video.currentTime > maxVisto + 1) {
      video.currentTime = maxVisto;
      pintarVideo("Primero mira esta parte: el video no se puede adelantar.");
    }
  });
  video.addEventListener("ratechange", () => {
    if (video.playbackRate > VELOCIDAD_MAX) video.playbackRate = VELOCIDAD_MAX;
  });
  video.addEventListener("ended", () => {
    if (video.duration && maxVisto >= video.duration - 2) marcarVideoVisto();
  });
  video.addEventListener("loadedmetadata", () => pintarVideo());
  video.querySelector("source").addEventListener("error", () => {
    pintarVideo("No se pudo cargar el video. Revisa el internet y recarga la página.");
  });

  // ---------------------------------------------------------------- eventos
  document.querySelectorAll(".pr-rol").forEach((b) => b.addEventListener("click", () => elegirRol(b.dataset.rol)));
  $("practicarButton").addEventListener("click", () => empezar("practica"));
  $("examenButton").addEventListener("click", () => {
    const previo = leer("datos") || {};
    if (!$("nombreInput").value) $("nombreInput").value = previo.nombre || "";
    if (!$("cedulaInput").value) $("cedulaInput").value = previo.cedula || "";
    $("datosMensaje").textContent = "";
    mostrar("vDatos");
  });
  $("datosVolver").addEventListener("click", () => mostrar("vInicio"));
  // Se quitan puntos y espacios al escribir o pegar; el límite real (12) es de dígitos, no de
  // caracteres, para no cortar una cédula pegada con puntos (1.017.230.368).
  $("cedulaInput").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 12); });
  $("datosForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = $("nombreInput").value.trim().replace(/\s+/g, " ");
    const cedula = $("cedulaInput").value.trim();
    if (!/^\d{5,12}$/.test(cedula)) {
      $("datosMensaje").textContent = "Escribe tu cédula solo con números.";
      $("cedulaInput").focus();
      return;
    }
    if (nombre.length < 5 || !nombre.includes(" ")) {
      $("datosMensaje").textContent = "Escribe tu nombre y tu apellido.";
      $("nombreInput").focus();
      return;
    }
    st.nombre = nombre.toUpperCase();
    st.cedula = cedula;
    guardar("datos", { nombre, cedula });
    empezar("examen");
  });
  $("pZonaToque").addEventListener("click", tocarPantalla);
  $("pSiguiente").addEventListener("click", siguiente);
  $("salirButton").addEventListener("click", () => {
    const msg = st.modo === "examen" ? "¿Salir del examen? Perderás las respuestas." : "¿Salir de la práctica?";
    if (window.confirm(msg)) mostrar("vInicio");
  });
  $("rRepetir").addEventListener("click", () => {
    if (st.modo === "examen") empezar("examen"); else empezar("practica");
  });
  $("rExamen").addEventListener("click", () => $("examenButton").click());
  $("rCompartir").addEventListener("click", compartirCertificado);
  $("rDescargar").addEventListener("click", () => {
    descargarCertificado();
    avisoCertificado("Listo: el certificado quedó en tus descargas.");
  });
  $("rInicio").addEventListener("click", () => mostrar("vInicio"));

  $("rVideo").addEventListener("click", () => {
    mostrar("vInicio");
    $("videoTitulo").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const rolGuardado = leer("rol");
  if (rolGuardado && ROLES[rolGuardado]) elegirRol(rolGuardado);
  pintarVideo();
  actualizarHabilitados();
})();
