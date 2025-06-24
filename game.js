// ----------- DETECCIÓN DE DISPOSITIVO Y CONTROLES -----------
function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}
let usarControlesTouch = false;

// Si es móvil, pregunta si quiere controles táctiles:
function selectorControles() {
  const div = document.getElementById('selector-controles');
  if (isMobile()) {
    div.innerHTML = `
    <b>¿Quieres usar controles táctiles en pantalla?</b><br>
    <button onclick="elegirControles('touch')"
     style="background:#13b713;color:#fff;font-size:1.2em;border-radius:9px;margin:12px 16px 0 0;padding:6px 18px;border:none;box-shadow:0 2px 10px #2225;">Sí, botones táctiles</button>
    <button onclick="elegirControles('teclado')"
     style="background:#1976d2;color:#fff;font-size:1.2em;border-radius:9px;margin:12px 0 0 0;padding:6px 18px;border:none;box-shadow:0 2px 10px #2225;">No, usaré teclado</button>
    <br><small>Puedes cambiar después recargando la página.</small>`;
    div.style.display = "block";
  } else {
    usarControlesTouch = false;
  }
}
window.elegirControles = function(tipo) {
  usarControlesTouch = tipo==="touch";
  document.getElementById('selector-controles').style.display = "none";
  document.getElementById('controles-movil').style.display = usarControlesTouch ? "flex" : "none";
}
selectorControles();

if (!isMobile()) {
  document.getElementById('selector-controles').style.display = "none";
  document.getElementById('controles-movil').style.display = "none";
}

// ----------- VARIABLES GENERALES DEL JUEGO -----------
let modoEmbriagado = false;
let puntaje = 0, mejorPuntaje = 0;
let tiempoInicio = Date.now();
const alerta = document.getElementById('alerta');
const puntajeDiv = document.getElementById('puntaje');
const modoDiv = document.getElementById('modo');
let steer = 0;
let leftPressed = false, rightPressed = false;
let curva = 0, curvaDir = 1;

// ----------- VIDAS/INTENTOS Y DIPLOMA -----------
let intentosRestantes = 5; // Cambia este valor para más/menos vidas
let intentosJugados = 0;   // Para controlar cuando mostrar diploma

const diplomaDiv = document.getElementById('diploma-digital');
const diplomaNombreDiv = document.getElementById('diploma-nombre');
const btnReiniciarTodo = document.getElementById('btn-reiniciar-todo');
const btnDescargarDiploma = document.getElementById('btn-descargar-diploma');

// ----------- DIFICULTAD Y OBSTÁCULOS -----------
let nivelDificultad = "media";
let velocidadBase = 0.3;
let obstaculos = [];
let frecuenciaObstaculos = 800; // milisegundos (se ajusta con dificultad)
let maxAutos = 3;
const colorCono = 0xff8200; // Obstáculo tipo cono naranja

// ----------- THREE.JS BÁSICO -----------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#5cb5f9");
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xbfd8ff, 1.2));

// Carretera y líneas
const roadWidth = 8, roadLength = 80;
const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 40, 1);
const roadMat = new THREE.MeshPhongMaterial({color: 0x333333, side: THREE.DoubleSide});
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI/2;
road.position.y = -1;
scene.add(road);

// Líneas blancas
const lines = [];
for(let i=0; i<12; i++) {
  const geo = new THREE.BoxGeometry(0.3, 0.01, 2.5);
  const mat = new THREE.MeshPhongMaterial({color:0xffffff});
  const line = new THREE.Mesh(geo, mat);
  line.position.set(0, -0.98, i*7-42);
  scene.add(line);
  lines.push(line);
}

// Barandas laterales
for(let i=0; i<2; i++) {
  const geo = new THREE.BoxGeometry(0.2, 0.1, roadLength);
  const mat = new THREE.MeshPhongMaterial({color:0xAAAAAA});
  const baranda = new THREE.Mesh(geo, mat);
  baranda.position.set(i===0?-3.8:3.8, -0.95, -1);
  scene.add(baranda);
}

// Suelo/pasto
const groundGeo = new THREE.PlaneGeometry(roadLength+40, roadLength+40);
const groundMat = new THREE.MeshPhongMaterial({color:0x1d942c});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.y = -1.1;
scene.add(ground);

// Árboles
function addTree(x, z) {
  const troncoGeo = new THREE.CylinderGeometry(0.12, 0.15, 1, 8);
  const troncoMat = new THREE.MeshPhongMaterial({color:0x7e4c21});
  const tronco = new THREE.Mesh(troncoGeo, troncoMat);
  tronco.position.set(x, -0.4, z);
  scene.add(tronco);

  const copaGeo = new THREE.SphereGeometry(0.5, 8, 8);
  const copaMat = new THREE.MeshPhongMaterial({color:0x26780f});
  const copa = new THREE.Mesh(copaGeo, copaMat);
  copa.position.set(x, 0.2, z);
  scene.add(copa);
}
for(let i=-40; i<40; i+=6) {
  addTree(-7, i+Math.random()*2-1);
  addTree(7, i+Math.random()*2-1);
}

// Vehículo propio visible
function crearVehiculoPropio() {
  const auto = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1.4, 0.45, 2.7);
  const bodyMat = new THREE.MeshPhongMaterial({color: 0x1e88e5});
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.25;
  body.position.z = 1;
  auto.add(body);

  const roofGeo = new THREE.BoxGeometry(1.0, 0.22, 1.3);
  const roofMat = new THREE.MeshPhongMaterial({color: 0xffffff});
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.5, 1.15);
  auto.add(roof);

  const glassGeo = new THREE.BoxGeometry(1.18, 0.18, 0.13);
  const glassMat = new THREE.MeshPhongMaterial({color: 0x8ecae6, transparent: true, opacity:0.88});
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 0.47, 2.22);
  auto.add(glass);

  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 16);
  const wheelMat = new THREE.MeshPhongMaterial({color: 0x111111});
  for(let dx of [-0.5, 0.5]) {
    for(let dz of [0.65, 1.9]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(dx, 0.05, dz);
      wheel.rotation.z = Math.PI/2;
      auto.add(wheel);
    }
  }
  auto.position.set(0, -0.68, 2.0);
  return auto;
}
const vehiculoPropio = crearVehiculoPropio();
scene.add(vehiculoPropio);

// Autos rivales
function crearAuto3D(x, z, color = 0xff4444) {
  const car = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 2);
  const bodyMat = new THREE.MeshPhongMaterial({color: color});
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.2;
  car.add(body);

  const roofGeo = new THREE.BoxGeometry(0.8, 0.25, 1.2);
  const roofMat = new THREE.MeshPhongMaterial({color: 0xffffff});
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.5, -0.1);
  car.add(roof);

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 16);
  const wheelMat = new THREE.MeshPhongMaterial({color: 0x222222});
  for(let dx of [-0.45, 0.45]) {
    for(let dz of [0.75, -0.75]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(dx, 0.05, dz);
      wheel.rotation.z = Math.PI/2;
      car.add(wheel);
    }
  }
  car.position.set(x, -0.7, z);
  scene.add(car);
  return car;
}
let otherCars = [
  crearAuto3D(1.5, -15, 0xe53935),
  crearAuto3D(-2, -28, 0xfbc02d),
  crearAuto3D(0, -55, 0x43a047)
];

// Luz direccional
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(0,12,10);
scene.add(light);

camera.position.set(0, 1.2, 4);

// --- CONTROLES FÍSICOS O TÁCTILES ---
document.addEventListener('keydown', function(e){
  if(!usarControlesTouch) {
    if(e.key === "ArrowLeft") leftPressed = true;
    if(e.key === "ArrowRight") rightPressed = true;
    if(e.key === "e" || e.key === "E") alternarModo();
  }
});
document.addEventListener('keyup', function(e){
  if(!usarControlesTouch) {
    if(e.key === "ArrowLeft") leftPressed = false;
    if(e.key === "ArrowRight") rightPressed = false;
  }
});

// BOTONES TÁCTILES
const btnIzq = document.getElementById('btn-izq');
const btnDer = document.getElementById('btn-der');
const btnModo = document.getElementById('btn-modo');
if(btnIzq && btnDer && btnModo) {
  btnIzq.addEventListener('touchstart', e=>{ leftPressed=true; e.preventDefault(); });
  btnIzq.addEventListener('touchend',   e=>{ leftPressed=false; e.preventDefault(); });
  btnDer.addEventListener('touchstart', e=>{ rightPressed=true; e.preventDefault(); });
  btnDer.addEventListener('touchend',   e=>{ rightPressed=false; e.preventDefault(); });
  btnModo.addEventListener('touchstart', e=>{ alternarModo(); e.preventDefault(); });
  btnIzq.addEventListener('mousedown', ()=>{ leftPressed=true; });
  btnIzq.addEventListener('mouseup',   ()=>{ leftPressed=false; });
  btnDer.addEventListener('mousedown', ()=>{ rightPressed=true; });
  btnDer.addEventListener('mouseup',   ()=>{ rightPressed=false; });
  btnModo.addEventListener('click', ()=>{ alternarModo(); });
}

// Cambia modo embriagado
function alternarModo() {
  modoEmbriagado = !modoEmbriagado;
  modoDiv.innerText = "Modo: " + (modoEmbriagado ? "EMBRIAGADO 🍺" : "SOBRIO 🚦");
  modoDiv.style.background = modoEmbriagado ? "rgba(183,70,90,0.7)" : "rgba(24,24,24,0.65)";
  document.body.style.filter = modoEmbriagado ? "contrast(1.03) blur(0.7px)" : "none";
}

// Colisiones
function showCollision() {
  alerta.style.display = 'block';
  setTimeout(()=>{alerta.style.display = 'none';}, 1200);
}

// ----------- OBSTÁCULOS: CONOS Y GESTIÓN DE DIFICULTAD -----------
function crearCono(x, z) {
  const conoGeo = new THREE.CylinderGeometry(0, 0.28, 0.5, 18, 1);
  const conoMat = new THREE.MeshPhongMaterial({color: colorCono});
  const cono = new THREE.Mesh(conoGeo, conoMat);
  cono.position.set(x, -0.48, z);
  scene.add(cono);
  return cono;
}

let intervaloObstaculos;
function startObstaculos() {
  if (intervaloObstaculos) clearInterval(intervaloObstaculos);
  intervaloObstaculos = setInterval(()=>{
    let posiblesX = [-2, 0, 2];
    let x = posiblesX[Math.floor(Math.random()*posiblesX.length)] + (Math.random()-0.5)*0.4;
    let cono = crearCono(x, -55 - Math.random()*10);
    obstaculos.push(cono);
    if (obstaculos.length > 6) {
      let viejo = obstaculos.shift();
      scene.remove(viejo);
    }
  }, frecuenciaObstaculos);
}

// ----------------- PANTALLA BIENVENIDA Y FIN DE PARTIDA -----------------
let nombreJugador = "";
const pantallaBienvenida = document.getElementById("pantalla-bienvenida");
const pantallaFin = document.getElementById("pantalla-fin");
const resumenPartida = document.getElementById("resumen-partida");
const mensajeEducativo = document.getElementById("mensaje-educativo");
const btnComenzar = document.getElementById("btn-comenzar");
const btnReiniciar = document.getElementById("btn-reiniciar");

const mensajesEducativosArr = [
  "Nunca conduzcas bajo los efectos del alcohol. ¡Podrías perderlo todo en un instante!",
  "La conducción ebria multiplica el riesgo de accidentes mortales.",
  "Cuidar tu vida y la de otros está en tus manos. ¡Conduce sobrio!",
  "El alcohol reduce tus reflejos y tu capacidad de reacción.",
  "Un segundo de distracción puede cambiar tu vida para siempre.",
  "Si tomas, entrega las llaves. ¡Siempre hay una alternativa!",
  "No pongas en riesgo tu vida ni la de los demás. ¡Sé responsable!"
];

function mostrarBienvenida() {
  pantallaBienvenida.style.display = "flex";
  pantallaFin.style.display = "none";
  diplomaDiv.style.display = "none";
  renderer.domElement.style.filter = "";
}

function iniciarJuego() {
  nombreJugador = document.getElementById("input-nombre").value.trim();
  if (!nombreJugador) {
    alert("Por favor, ingresa tu nombre.");
    return;
  }
  nivelDificultad = document.getElementById("nivel-dificultad").value;
  if (nivelDificultad === "facil") {
    velocidadBase = 0.23;
    frecuenciaObstaculos = 1300;
    maxAutos = 2;
  } else if (nivelDificultad === "media") {
    velocidadBase = 0.3;
    frecuenciaObstaculos = 900;
    maxAutos = 3;
  } else {
    velocidadBase = 0.36;
    frecuenciaObstaculos = 600;
    maxAutos = 5;
  }
  pantallaBienvenida.style.display = "none";
  puntaje = 0;
  tiempoInicio = Date.now();
  while (otherCars.length > maxAutos) {
    let c = otherCars.pop();
    scene.remove(c);
  }
  while (otherCars.length < maxAutos) {
    let car = crearAuto3D([-2,0,2][Math.floor(Math.random()*3)], -25-Math.random()*30, Math.random()*0xffffff);
    otherCars.push(car);
  }
  obstaculos.forEach(o=>scene.remove(o));
  obstaculos = [];
  startObstaculos();
  actualizarVidasVisual();
}

function mostrarFinPartida(modo) {
  pantallaFin.style.display = "flex";
  resumenPartida.innerHTML = `
    <b>Nombre:</b> ${nombreJugador}<br>
    <b>Puntaje:</b> ${puntaje}<br>
    <b>Dificultad:</b> ${nivelDificultad.charAt(0).toUpperCase() + nivelDificultad.slice(1)}<br>
    <b>Modo:</b> ${modo ? 'EMBRIAGADO' : 'SOBRIO'}
  `;
  mensajeEducativo.innerHTML = mensajesEducativosArr[Math.floor(Math.random()*mensajesEducativosArr.length)];
  if (intervaloObstaculos) clearInterval(intervaloObstaculos);

  // Intentos/vidas
  intentosRestantes--;
  intentosJugados++;
  actualizarVidasVisual();
  if (intentosRestantes <= 0) {
    setTimeout(mostrarDiploma, 600);
  }
}

function reiniciarJuego() {
  pantallaFin.style.display = "none";
  puntaje = 0;
  tiempoInicio = Date.now();
  otherCars.forEach((c, i) => {
    c.position.z = -55 - Math.random()*10;
    c.position.x = [-2,0,2][Math.floor(Math.random()*3)] + (Math.random()-0.5);
    c.userStartX = c.position.x;
  });
  obstaculos.forEach(o=>scene.remove(o));
  obstaculos = [];
  startObstaculos();
  actualizarVidasVisual();
}

// Actualiza visual de vidas/intentos
function actualizarVidasVisual() {
  puntajeDiv.innerHTML = `
    Puntaje: ${puntaje}
    <br>
    <small style="font-size:0.7em; color:#ddd;">Mejor: ${mejorPuntaje}</small>
    <br>
    <span style="font-size:1.1em; color:#e53935; font-weight:bold;">
      Intentos restantes: ${intentosRestantes}
    </span>
  `;
}

// Diploma digital
function mostrarDiploma() {
  diplomaDiv.style.display = "flex";
  diplomaNombreDiv.innerHTML = nombreJugador
    ? `<span style="color:#1976d2;">${nombreJugador}</span>`
    : '';
  pantallaFin.style.display = "none";
}

// Reinicia TODO el ciclo del juego
if(btnReiniciarTodo){
  btnReiniciarTodo.onclick = function() {
    intentosRestantes = 5;
    intentosJugados = 0;
    diplomaDiv.style.display = "none";
    mostrarBienvenida();
    actualizarVidasVisual();
  };
}

// Descargar diploma como imagen
if(btnDescargarDiploma) {
  btnDescargarDiploma.onclick = function() {
    const diplomaContenedor = document.querySelector('.diploma-contenido');
    html2canvas(diplomaContenedor, {
      backgroundColor: "#fff",
      useCORS: true
    }).then(function(canvas) {
      const link = document.createElement('a');
      link.download = (nombreJugador ? `Diploma_${nombreJugador.replace(/\s+/g,'_')}` : 'Diploma_SotuSeguros')+'.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }
}

// Botones pantalla bienvenida y fin
if(btnComenzar) btnComenzar.onclick = iniciarJuego;
if(btnReiniciar) btnReiniciar.onclick = reiniciarJuego;

// ----------- ANIMACIÓN PRINCIPAL -----------
function animate() {
  requestAnimationFrame(animate);

  if (pantallaBienvenida.style.display === "flex" ||
      pantallaFin.style.display === "flex" ||
      diplomaDiv.style.display === "flex") {
    renderer.render(scene, camera);
    return;
  }

  puntaje = Math.floor((Date.now()-tiempoInicio)/25);

  // Vehiculo propio sigue el movimiento lateral del usuario (con delay leve en modo embriagado)
  if (!modoEmbriagado) {
    vehiculoPropio.position.x += ((steer * 2) - vehiculoPropio.position.x) * 0.5;
  } else {
    vehiculoPropio.position.x += ((steer * 2) - vehiculoPropio.position.x) * 0.12 + Math.sin(Date.now()*0.007)*0.05;
  }

  // Movimiento lateral de la cámara
  let steerReal = steer;
  if(modoEmbriagado) {
    steerReal += Math.sin(Date.now()*0.005) * 0.18;
    if (Math.random()<0.015) steerReal *= -1;
    steerReal *= 0.8;
  }
  camera.position.x = steerReal * 2;

  // Curva carretera
  curva += 0.002 * curvaDir * (modoEmbriagado?1.3:1);
  if(curva > 0.25) curvaDir = -1;
  if(curva < -0.25) curvaDir = 1;

  for(let i=0; i<road.geometry.attributes.position.count; i++) {
    let pos = road.geometry.attributes.position;
    let z = pos.getZ(i);
    let x = Math.sin(z * 0.1 + curva * 6) * curva * 10;
    pos.setX(i, x);
  }
  road.geometry.attributes.position.needsUpdate = true;

  for(let l of lines) {
    l.position.z += 0.3;
    if(l.position.z > 4) l.position.z -= 84;
    l.position.x = Math.sin(l.position.z*0.1 + curva*6) * curva * 10;
  }

  // Autos rivales (con dificultad)
  for(let idx in otherCars) {
    let car = otherCars[idx];
    let moveZ = (modoEmbriagado ? velocidadBase+0.05+Math.random()*0.07 : velocidadBase);
    car.position.z += moveZ;
    if(car.position.z > 6) {
      car.position.z = -55 - Math.random()*10;
      car.position.x = [-2,0,2][Math.floor(Math.random()*3)] + (Math.random()-0.5);
    }
    car.position.x = (car.userStartX ?? car.position.x) + Math.sin(car.position.z*0.1 + curva*6) * curva * 0.2;
    car.userStartX = car.position.x - Math.sin(car.position.z*0.1 + curva*6) * curva * 0.2;

    if (
      car.position.z > 2.2 && car.position.z < 4.8 &&
      Math.abs(car.position.x - vehiculoPropio.position.x) < 1.2
    ) {
      showCollision();
      mejorPuntaje = Math.max(mejorPuntaje, puntaje);
      mostrarFinPartida(modoEmbriagado);
      return;
    }
  }

  // Movimiento y colisión de obstáculos (conos)
  for (let i = 0; i < obstaculos.length; i++) {
    let cono = obstaculos[i];
    let moveZ = (modoEmbriagado ? velocidadBase+0.09 : velocidadBase+0.05);
    cono.position.z += moveZ;
    if (cono.position.z > 2.2 && cono.position.z < 4.8 &&
        Math.abs(cono.position.x - vehiculoPropio.position.x) < 1.1) {
      showCollision();
      mejorPuntaje = Math.max(mejorPuntaje, puntaje);
      mostrarFinPartida(modoEmbriagado);
      return;
    }
    if (cono.position.z > 10) {
      scene.remove(cono);
      obstaculos.splice(i, 1);
      i--;
    }
  }

  // Efectos visuales EMBRIAGADO
  if (modoEmbriagado) {
    camera.rotation.z = Math.sin(Date.now()*0.001)*0.09;
    camera.rotation.x = Math.sin(Date.now()*0.0011)*0.04;
    renderer.domElement.style.filter = "blur(1.2px) contrast(1.07) brightness(1.04)";
    document.body.style.background = "#c97";
    modoDiv.innerHTML = 'Modo: EMBRIAGADO 🍺<br><span style="font-weight:normal;font-size:0.8em">Reacción lenta, visión borrosa,<br>controles torpes y pantalla mareada.<br>¡Nunca manejes así!</span>';
  } else {
    camera.rotation.z = 0;
    camera.rotation.x = 0;
    renderer.domElement.style.filter = "";
    document.body.style.background = "#5cb5f9";
    modoDiv.innerText = "Modo: SOBRIO 🚦";
  }

  if (!usarControlesTouch) {
    if (leftPressed) steer -= 0.08;
    if (rightPressed) steer += 0.08;
  } else {
    if (leftPressed) steer -= 0.11;
    if (rightPressed) steer += 0.11;
  }
  steer *= 0.92;
  steer = THREE.MathUtils.clamp(steer, -2, 2);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Muestra bienvenida al cargar
mostrarBienvenida();
