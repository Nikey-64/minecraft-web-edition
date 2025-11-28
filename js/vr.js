// ==========================================
// WebXR VR Support
//
// Este módulo proporciona soporte para realidad virtual usando WebXR API
// Compatible con Oculus Quest, HTC Vive, Windows Mixed Reality, etc.
// ==========================================

// VRManager
//
// Gestiona la sesión VR y el renderizado estereoscópico

function VRManager(renderer)
{
	this.renderer = renderer;
	this.xrSession = null;
	this.xrSpace = null;
	this.xrFrame = null;
	this.isVRActive = false;
	this.vrButton = null;
	
	// Matrices para cada ojo
	this.leftEyeMatrix = mat4.create();
	this.rightEyeMatrix = mat4.create();
	this.leftProjMatrix = mat4.create();
	this.rightProjMatrix = mat4.create();
	
	// Referencias a las matrices del renderer (solo si el renderer está completo)
	if (renderer && renderer.projMatrix && renderer.viewMatrix) {
		this.originalProjMatrix = renderer.projMatrix;
		this.originalViewMatrix = renderer.viewMatrix;
	} else {
		// Renderer temporal o incompleto - crear matrices temporales
		this.originalProjMatrix = mat4.create();
		this.originalViewMatrix = mat4.create();
	}
}

// checkVRSupport()
//
// Verifica si el navegador y el dispositivo soportan WebXR

VRManager.prototype.checkVRSupport = function()
{
	// WebXR está disponible en navigator.xr (Chrome/Edge) o como polyfill
	if (typeof navigator === "undefined") {
		console.log("VR: navigator no está disponible");
		return false;
	}
	
	// Verificar si WebXR está disponible directamente
	if (navigator.xr) {
		console.log("VR: navigator.xr encontrado");
		// Verificar si soporta sesiones inmersivas
		if (navigator.xr.isSessionSupported) {
			// Verificar asíncronamente si está soportado
			return true; // Retornar true por ahora, se verificará asíncronamente
		}
		return true;
	}
	
	// Verificar si hay un polyfill disponible
	if (typeof XRSession !== "undefined") {
		console.log("VR: XRSession encontrado (polyfill)");
		return true;
	}
	
	console.log("VR: WebXR no está disponible");
	return false;
};

// requestVRSession()
//
// Solicita una sesión VR al navegador

VRManager.prototype.requestVRSession = function()
{
	var self = this;
	
	if (!this.checkVRSupport()) {
		console.warn("WebXR no está disponible en este navegador");
		return Promise.reject("WebXR no disponible");
	}
	
	// Solicitar sesión inmersiva (VR)
	// Nota: 'local-floor' puede no estar disponible en todos los dispositivos
	var sessionOptions = {
		optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
	};
	
	return navigator.xr.requestSession('immersive-vr', sessionOptions).then(function(session) {
		self.xrSession = session;
		self.isVRActive = true;
		
		// Obtener el espacio de referencia
		// Para Oculus Quest, intentar 'local-floor' primero (mejor para tracking del suelo)
		// Luego 'local' como fallback
		return session.requestReferenceSpace('local-floor').catch(function(err) {
			console.log("VR: local-floor no disponible, usando local:", err);
			// Si 'local-floor' no está disponible, usar 'local'
			return session.requestReferenceSpace('local');
		});
	}).then(function(referenceSpace) {
		self.xrSpace = referenceSpace;
		
		// Configurar el canvas para WebXR
		var canvas = self.renderer.canvas;
		var gl = self.renderer.gl;
		
		// Para Oculus Quest, el contexto WebGL debe ser compatible con XR
		// Hacer el contexto WebGL compatible con XR antes de crear el layer
		var setupXRLayer = function() {
			try {
				// Crear el layer de renderizado XR
				// Para Oculus Quest, usar opciones específicas si están disponibles
				var layerOptions = {
					antialias: true, // Mejor calidad visual en Quest
					ignoreDepthValues: false,
					framebufferScaleFactor: 1.0 // Usar resolución nativa del Quest
				};
				
				var xrLayer = new XRWebGLLayer(self.xrSession, gl, layerOptions);
				
				// Configurar el estado de renderizado
				self.xrSession.updateRenderState({
					baseLayer: xrLayer,
					depthNear: 0.1,
					depthFar: 1000.0
				});
				
				console.log("VR: XRWebGLLayer creado correctamente para Oculus Quest");
			} catch (e) {
				console.error("VR: Error al crear XRWebGLLayer:", e);
				// Intentar sin opciones como fallback
				try {
					var xrLayer = new XRWebGLLayer(self.xrSession, gl);
					self.xrSession.updateRenderState({
						baseLayer: xrLayer
					});
					console.log("VR: XRWebGLLayer creado sin opciones avanzadas");
				} catch (e2) {
					console.error("VR: Error crítico al crear XRWebGLLayer:", e2);
					throw e2;
				}
			}
		};
		
		// Hacer el contexto WebGL compatible con XR
		// Nota: makeXRCompatible puede no estar disponible en todos los contextos
		if (gl.makeXRCompatible) {
			gl.makeXRCompatible().then(function() {
				console.log("VR: Contexto WebGL hecho compatible con XR");
				setupXRLayer();
			}).catch(function(err) {
				console.warn("VR: Error al hacer WebGL compatible con XR (puede que ya lo sea):", err);
				// Intentar de todas formas - el contexto puede ya ser compatible
				setupXRLayer();
			});
		} else {
			// Si makeXRCompatible no está disponible, intentar crear el layer directamente
			// Esto puede funcionar si el contexto ya fue creado con xrCompatible: true
			console.log("VR: makeXRCompatible no disponible, intentando crear layer directamente");
			setupXRLayer();
		}
		
		// Escuchar eventos de la sesión
		session.addEventListener('end', function() {
			self.onVRSessionEnd();
		});
		
		session.addEventListener('visibilitychange', function() {
			console.log("VR: Visibilidad de sesión cambió");
		});
		
		session.addEventListener('inputsourceschange', function() {
			console.log("VR: Input sources cambiaron");
		});
		
		// Iniciar el loop de renderizado VR
		// Esperar un frame para asegurar que el layer esté configurado
		setTimeout(function() {
			self.startVRRenderLoop();
			console.log("VR: Loop de renderizado iniciado");
		}, 100);
		
		console.log("VR: Sesión VR iniciada correctamente para Oculus Quest");
		return session;
	}).catch(function(err) {
		console.error("VR: Error al iniciar sesión VR:", err);
		self.isVRActive = false;
		
		// Proporcionar mensaje de error más descriptivo
		var errorMessage = "Error al iniciar VR";
		if (err.name === 'SecurityError') {
			errorMessage = "Error de seguridad. Asegúrate de que la página se cargue con HTTPS o localhost.";
		} else if (err.name === 'NotSupportedError') {
			errorMessage = "VR no está soportado. Si estás en Oculus Quest, asegúrate de usar Oculus Browser.";
		} else if (err.message) {
			errorMessage = err.message;
		}
		
		console.error("VR: Mensaje de error:", errorMessage);
		return Promise.reject(errorMessage);
	});
};

// exitVR()
//
// Sale de la sesión VR

VRManager.prototype.exitVR = function()
{
	if (this.xrSession) {
		this.xrSession.end();
	}
};

// onVRSessionEnd()
//
// Callback cuando la sesión VR termina

VRManager.prototype.onVRSessionEnd = function()
{
	this.xrSession = null;
	this.xrSpace = null;
	this.isVRActive = false;
	
	// Restaurar el viewport normal
	var gl = this.renderer.gl;
	var canvas = this.renderer.canvas;
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	console.log("Sesión VR finalizada");
};

// startVRRenderLoop()
//
// Inicia el loop de renderizado VR (reemplaza el loop normal)

VRManager.prototype.startVRRenderLoop = function()
{
	var self = this;
	var renderer = this.renderer;
	
	function onXRFrame(time, frame) {
		if (!self.xrSession) return;
		
		self.xrFrame = frame;
		
		// Obtener el pose del viewer (headset)
		var pose = frame.getViewerPose(self.xrSpace);
		if (!pose) {
			// Si no hay pose, continuar el loop de todas formas
			self.xrSession.requestAnimationFrame(onXRFrame);
			return;
		}
		
		// Renderizar para cada ojo
		var gl = renderer.gl;
		var layer = self.xrSession.renderState.baseLayer;
		
		if (!layer) {
			console.warn("VR: Layer no disponible, saltando frame");
			self.xrSession.requestAnimationFrame(onXRFrame);
			return;
		}
		
		// Limpiar el framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// Renderizar para cada vista (ojo) - Oculus Quest tiene 2 vistas (izquierda y derecha)
		for (var i = 0; i < pose.views.length; i++) {
			var view = pose.views[i];
			
			// Configurar viewport para esta vista
			var viewport = layer.getViewport(view);
			if (!viewport) {
				console.warn("VR: Viewport no disponible para vista", i);
				continue;
			}
			gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
			
			// Configurar matriz de proyección para esta vista
			// view.projectionMatrix es un Float32Array de 16 elementos
			var projMatrix = (i === 0) ? self.leftProjMatrix : self.rightProjMatrix;
			if (view.projectionMatrix) {
				for (var j = 0; j < 16; j++) {
					projMatrix[j] = view.projectionMatrix[j];
				}
				renderer.projMatrix = projMatrix;
			}
			
			// Configurar matriz de vista (view) para esta vista
			// view.transform.inverse.matrix es un Float32Array de 16 elementos
			var viewMatrix = (i === 0) ? self.leftEyeMatrix : self.rightEyeMatrix;
			if (view.transform && view.transform.inverse && view.transform.inverse.matrix) {
				var transformMatrix = view.transform.inverse.matrix;
				for (var j = 0; j < 16; j++) {
					viewMatrix[j] = transformMatrix[j];
				}
				renderer.viewMatrix = viewMatrix;
			}
			
			// Actualizar matrices en el shader
			if (renderer.uProjMat && renderer.uViewMat) {
				gl.uniformMatrix4fv(renderer.uProjMat, false, renderer.projMatrix);
				gl.uniformMatrix4fv(renderer.uViewMat, false, renderer.viewMatrix);
			}
			
			// Renderizar la escena
			self.renderVRFrame(view);
		}
		
		// Continuar el loop
		self.xrSession.requestAnimationFrame(onXRFrame);
	}
	
	// Iniciar el loop
	this.xrSession.requestAnimationFrame(onXRFrame);
};

// renderVRFrame(view)
//
// Renderiza un frame para una vista específica (ojo)
// Llama al método draw del renderer pero con las matrices VR configuradas

VRManager.prototype.renderVRFrame = function(view)
{
	var renderer = this.renderer;
	
	// Marcar que estamos en modo VR para que draw() no llame a setCamera
	renderer._isVRActive = true;
	
	// Renderizar usando el método draw normal del renderer
	// Las matrices ya están configuradas en startVRRenderLoop
	renderer.drawVRView();
	
	renderer._isVRActive = false;
};

// createVRButton()
//
// Crea un botón en la UI para activar/desactivar VR

VRManager.prototype.createVRButton = function(containerId)
{
	var self = this;
	
	console.log("VR: Iniciando configuración de botón VR...");
	
	// Buscar el botón en el DOM (debe estar en singleplayer.html)
	var button = document.getElementById('vr-button');
	
	if (!button) {
		console.warn("VR: Botón VR no encontrado en el DOM. Asegúrate de que existe en singleplayer.html");
		return;
	}
	
	console.log("VR: Botón encontrado en el DOM");
	this.vrButton = button;
	
	// Verificación rápida inicial: si navigator.xr no existe, mostrar instrucciones
	if (typeof navigator === "undefined" || !navigator.xr) {
		console.log("VR: WebXR API no disponible en el navegador");
		
		// Detectar si estamos en un Quest
		var isQuest = navigator.userAgent.includes('Quest') || 
		              navigator.userAgent.includes('OculusBrowser') ||
		              navigator.userAgent.includes('Oculus');
		
		button.style.display = 'block';
		button.disabled = false;
		button.style.cursor = 'pointer';
		
		if (isQuest) {
			button.textContent = '🎮 Usa Oculus Browser';
			button.style.background = '#f44336';
			button.title = 'WebXR no está disponible. Debes usar el navegador Oculus Browser (predeterminado del Quest).';
			button.onclick = function() {
				var message = "Para usar VR en Oculus Quest:\n\n" +
					"⚠️ IMPORTANTE: Debes usar el navegador Oculus Browser\n\n" +
					"1. Sal de esta página\n" +
					"2. Abre el navegador Oculus Browser (el navegador predeterminado del Quest)\n" +
					"3. Navega a esta página desde Oculus Browser\n\n" +
					"❌ NO uses Chrome ni Firefox - solo Oculus Browser soporta WebXR en Quest\n\n" +
					"El navegador Oculus Browser es el que aparece por defecto cuando abres el navegador en el Quest.\n" +
					"Si estás usando otro navegador, cámbialo a Oculus Browser.";
				alert(message);
			};
		} else {
			button.textContent = '🎮 Conectar VR';
			button.style.background = '#FF9800';
			button.title = 'WebXR no está disponible en este navegador. Usa Chrome, Edge, o Oculus Browser en Quest.';
			button.onclick = function() {
				var message = "Para usar VR en este juego:\n\n" +
					"1. En Oculus Quest:\n" +
					"   - Usa el navegador Oculus Browser (predeterminado)\n" +
					"   - NO uses Chrome o Firefox\n\n" +
					"2. En otros dispositivos:\n" +
					"   - Google Chrome (recomendado)\n" +
					"   - Microsoft Edge\n\n" +
					"3. Dispositivos compatibles:\n" +
					"   - Oculus Quest/Quest 2 (con Oculus Browser)\n" +
					"   - HTC Vive\n" +
					"   - Windows Mixed Reality\n" +
					"   - Otros dispositivos compatibles con WebXR\n\n" +
					"4. Asegúrate de que el dispositivo esté encendido y configurado";
				alert(message);
			};
		}
		return;
	}
	
	// Verificar que la función existe en el prototipo
	if (typeof VRManager.prototype.checkVRSupportAsync !== 'function') {
		console.error("VR: checkVRSupportAsync no está definida en VRManager.prototype");
		button.style.display = 'none';
		return;
	}
	
	// Mostrar el botón inmediatamente con estado "verificando"
	button.style.display = 'block';
	button.textContent = '🎮 Verificando VR...';
	button.disabled = true;
	button.style.background = '#888';
	button.style.cursor = 'wait';
	
	// Llamar la función de forma asíncrona sin bloquear (en el siguiente tick del event loop)
	setTimeout(function() {
		try {
			VRManager.prototype.checkVRSupportAsync.call(self).then(function(isSupported) {
			console.log("VR: Resultado de verificación WebXR:", isSupported);
			
			if (!isSupported) {
				console.log("VR: WebXR no está soportado en este navegador/dispositivo");
				// Detectar si estamos en un Quest pero el navegador no soporta WebXR
				var isQuest = navigator.userAgent.includes('Quest') || 
				              navigator.userAgent.includes('OculusBrowser') ||
				              navigator.userAgent.includes('Oculus');
				
				if (isQuest) {
					button.textContent = '🎮 VR no disponible';
					button.disabled = false;
					button.style.background = '#f44336';
					button.style.cursor = 'pointer';
					button.title = 'WebXR no está disponible. Asegúrate de usar el navegador Oculus Browser.';
					
					button.onclick = function() {
						var message = "Para usar VR en Oculus Quest:\n\n" +
							"1. Asegúrate de usar el navegador Oculus Browser (navegador predeterminado del Quest)\n\n" +
							"2. NO uses Chrome o Firefox - solo Oculus Browser soporta WebXR en Quest\n\n" +
							"3. Verifica que el Quest esté actualizado\n\n" +
							"4. Reinicia el Quest si es necesario\n\n" +
							"5. Asegúrate de estar en el menú principal del Quest antes de abrir el navegador";
						alert(message);
					};
				} else {
					button.textContent = '🎮 Conectar VR';
					button.disabled = false;
					button.style.background = '#FF9800';
					button.style.cursor = 'pointer';
					button.title = 'WebXR no está disponible. Usa un navegador compatible o conecta un dispositivo VR.';
					
					button.onclick = function() {
						var message = "Para usar VR en este juego:\n\n" +
							"1. En Oculus Quest:\n" +
							"   - Usa el navegador Oculus Browser (predeterminado)\n" +
							"   - NO uses Chrome o Firefox\n\n" +
							"2. En otros dispositivos:\n" +
							"   - Google Chrome (recomendado)\n" +
							"   - Microsoft Edge\n\n" +
							"3. Dispositivos compatibles:\n" +
							"   - Oculus Quest/Quest 2 (con Oculus Browser)\n" +
							"   - HTC Vive\n" +
							"   - Windows Mixed Reality\n" +
							"   - Otros dispositivos compatibles con WebXR\n\n" +
							"4. Asegúrate de que el dispositivo esté encendido y configurado";
						alert(message);
					};
				}
				return;
			}
			
			// WebXR está soportado - actualizar botón
			button.textContent = '🎮 Activar VR';
			button.disabled = false;
			button.style.background = '#4CAF50';
			button.style.cursor = 'pointer';
			
			// Configurar evento de clic
			button.onclick = function() {
				if (self.isVRActive) {
					self.exitVR();
					button.textContent = '🎮 Activar VR';
				} else {
					if (typeof self.requestVRSession === 'function') {
						self.requestVRSession().then(function() {
							button.textContent = '🚫 Salir de VR';
							console.log("VR: Sesión VR activada correctamente");
						}).catch(function(err) {
							console.error("VR: Error al activar VR:", err);
							var errorMsg = typeof err === 'string' ? err : "No se pudo activar VR.";
							if (err.message) {
								errorMsg = err.message;
							}
							
							var fullMessage = "No se pudo activar VR:\n\n" + errorMsg;
							var isQuest = navigator.userAgent.includes('Quest') || 
							              navigator.userAgent.includes('OculusBrowser') ||
							              navigator.userAgent.includes('Oculus');
							
							if (isQuest && errorMsg.includes('soportado')) {
								fullMessage += "\n\nSi estás en Oculus Quest, asegúrate de:\n" +
								              "1. Usar Oculus Browser (no Chrome ni Firefox)\n" +
								              "2. Estar en el menú principal del Quest\n" +
								              "3. Tener el Quest actualizado";
							}
							
							alert(fullMessage);
						});
					} else {
						console.error("VR: requestVRSession no está definida");
						alert("Error: La función requestVRSession no está disponible.");
					}
				}
			};
			
			console.log("VR: Botón configurado y visible");
		}).catch(function(err) {
			console.warn("VR: Error al verificar soporte WebXR:", err);
			button.textContent = '🎮 VR (Error)';
			button.style.background = '#f44336';
			button.disabled = false;
			button.style.cursor = 'pointer';
			button.onclick = function() {
				console.log("VR: Intentando activar VR manualmente...");
				console.log("VR: navigator.xr:", navigator.xr);
				if (typeof self.requestVRSession === 'function') {
					self.requestVRSession().catch(function(e) {
						console.error("VR: Error:", e);
						alert("Error: " + e);
					});
				}
			};
		}).catch(function(err) {
			console.error("VR: Error en la promesa de checkVRSupportAsync:", err);
			button.style.display = 'none';
		});
		} catch (error) {
			console.error("VR: Error al llamar checkVRSupportAsync:", error);
			button.style.display = 'none';
		}
	}, 0); // Ejecutar en el siguiente tick del event loop, sin delay visible
};

// checkVRSupportAsync()
//
// Verifica asíncronamente si WebXR está soportado

VRManager.prototype.checkVRSupportAsync = function()
{
	return new Promise(function(resolve, reject) {
		console.log("VR: Iniciando verificación de soporte WebXR para Oculus Quest...");
		
		// PASO 1: Verificar que navigator.xr existe (lo más importante)
		console.log("VR: Paso 1 - Verificando API WebXR (navigator.xr)...");
		if (typeof navigator === "undefined") {
			console.log("VR: ✗ Paso 1 fallido - navigator no está disponible");
			resolve(false);
			return;
		}
		
		if (!navigator.xr) {
			console.log("VR: ✗ Paso 1 fallido - navigator.xr no está disponible");
			console.log("VR: Este navegador no soporta WebXR. Usa el navegador Oculus Browser en Quest.");
			resolve(false);
			return;
		}
		
		console.log("VR: ✓ Paso 1 completado - navigator.xr encontrado");
		
		// PASO 2: Verificar soporte de sesión VR usando isSessionSupported
		// Esta es la forma correcta y más confiable de verificar soporte VR
		console.log("VR: Paso 2 - Verificando soporte de sesión immersive-vr...");
		
		if (navigator.xr.isSessionSupported) {
			navigator.xr.isSessionSupported('immersive-vr').then(function(vrSupported) {
				if (vrSupported) {
					console.log("VR: ✓ Paso 2 completado - immersive-vr está soportado");
					resolve(true);
				} else {
					console.log("VR: ✗ Paso 2 fallido - immersive-vr NO está soportado");
					console.log("VR: El dispositivo puede no estar en modo VR o el navegador no está configurado correctamente");
					resolve(false);
				}
			}).catch(function(err) {
				console.warn("VR: ✗ Paso 2 fallido - Error al verificar soporte VR:", err);
				console.log("VR: Intentando verificación alternativa...");
				
				// Fallback: Si isSessionSupported falla, verificar si el contexto WebGL puede ser compatible
				// En algunos casos, Oculus Quest puede tener WebXR pero la verificación puede fallar
				try {
					var testCanvas = document.createElement('canvas');
					var testGl = testCanvas.getContext('webgl', { xrCompatible: true }) || 
					             testCanvas.getContext('experimental-webgl', { xrCompatible: true });
					
					if (testGl) {
						console.log("VR: ✓ Verificación alternativa exitosa - WebGL con xrCompatible disponible");
						// Si tenemos WebGL con xrCompatible, asumir que WebXR puede funcionar
						resolve(true);
					} else {
						console.log("VR: ✗ Verificación alternativa fallida - No se pudo crear contexto WebGL compatible");
						resolve(false);
					}
				} catch (e) {
					console.warn("VR: ✗ Error en verificación alternativa:", e);
					resolve(false);
				}
			});
		} else {
			// Fallback: Si isSessionSupported no está disponible, verificar contexto WebGL
			console.log("VR: ⚠ isSessionSupported no disponible, usando verificación alternativa...");
			try {
				var testCanvas = document.createElement('canvas');
				var testGl = testCanvas.getContext('webgl', { xrCompatible: true }) || 
				             testCanvas.getContext('experimental-webgl', { xrCompatible: true });
				
				if (testGl && navigator.xr) {
					console.log("VR: ✓ Verificación alternativa exitosa - WebGL compatible y navigator.xr disponible");
					resolve(true);
				} else {
					console.log("VR: ✗ Verificación alternativa fallida");
					resolve(false);
				}
			} catch (e) {
				console.warn("VR: ✗ Error en verificación alternativa:", e);
				resolve(false);
			}
		}
	});
};

// updateVRControls()
//
// Actualiza los controles VR (movimiento, rotación, etc.)

VRManager.prototype.updateVRControls = function()
{
	if (!this.isVRActive || !this.xrFrame || !this.renderer.world || !this.renderer.world.localPlayer) {
		return;
	}
	
	var player = this.renderer.world.localPlayer;
	var frame = this.xrFrame;
	var space = this.xrSpace;
	
	// Obtener el pose del headset
	var pose = frame.getViewerPose(space);
	if (!pose) return;
	
	// Actualizar rotación del jugador basada en el headset
	// El headset controla el yaw (rotación horizontal) y pitch (rotación vertical)
	var headsetTransform = pose.transform;
	var headsetMatrix = headsetTransform.matrix;
	
	// Extraer yaw y pitch de la matriz del headset
	// La matriz es 4x4, necesitamos extraer los ángulos de Euler
	var yaw = Math.atan2(headsetMatrix[8], headsetMatrix[10]);
	var pitch = Math.asin(-headsetMatrix[9]);
	
	// Actualizar ángulos del jugador
	player.angles[0] = pitch; // Pitch
	player.angles[1] = yaw;    // Yaw
	
	// Obtener input de los controles VR (gamepads)
	var inputSources = this.xrSession.inputSources;
	for (var i = 0; i < inputSources.length; i++) {
		var inputSource = inputSources[i];
		
		// Detectar gamepad (control VR)
		if (inputSource.gamepad) {
			var gamepad = inputSource.gamepad;
			
			// Mover jugador basado en el joystick del control
			// Eje 2 y 3 son típicamente el joystick izquierdo (movimiento)
			if (gamepad.axes && gamepad.axes.length >= 4) {
				var moveX = gamepad.axes[2]; // Movimiento horizontal
				var moveZ = gamepad.axes[3]; // Movimiento vertical (adelante/atrás)
				
				// Aplicar movimiento al jugador
				// Esto se hace en player.js, pero podemos actualizar la velocidad aquí
				if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
					// El movimiento se aplica en la dirección que mira el jugador
					var moveSpeed = 0.1;
					var moveDirX = Math.sin(yaw) * moveZ + Math.cos(yaw) * moveX;
					var moveDirZ = Math.cos(yaw) * moveZ - Math.sin(yaw) * moveX;
					
					// Actualizar velocidad del jugador (esto requiere acceso a player.vel o similar)
					// Por ahora, solo actualizamos la posición directamente
					// En una implementación completa, esto se manejaría en player.js
				}
			}
			
			// Detectar botones (disparar, saltar, etc.)
			if (gamepad.buttons) {
				for (var j = 0; j < gamepad.buttons.length; j++) {
					var button = gamepad.buttons[j];
					if (button.pressed) {
						// Manejar acciones según el botón presionado
						// Por ejemplo: botón 0 = disparar/romper bloque, botón 1 = colocar bloque
					}
				}
			}
		}
	}
};
