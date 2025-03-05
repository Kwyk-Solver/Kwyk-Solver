// Configuration de la télémétrie
const telemetryConfig = {
  endpoint: "https://www.extension-randomize.me/telemetry",
  debug: false,
  enabled: true
};

// Fonction pour envoyer les données de télémétrie
function sendTelemetryData(eventType, eventData = {}) {
  if (!telemetryConfig.enabled) return;
  
  // Ajouter des informations communes à toutes les données de télémétrie
  const telemetryData = {
    eventType: eventType,
    timestamp: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    eventData: eventData,
    sessionId: getOrCreateSessionId(),
    browser: getBrowserInfo(),
    platform: getPlatformInfo()
  };

  if (telemetryConfig.debug) {
    console.log("Sending telemetry:", telemetryData);
  }

  // Ajout d'un paramètre timestamp pour éviter la mise en cache
  const nocacheUrl = `${telemetryConfig.endpoint}?_t=${Date.now()}`;

  // Envoi des données au serveur avec cache-control: no-cache
  fetch(nocacheUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: JSON.stringify(telemetryData)
  }).catch(error => {
    if (telemetryConfig.debug) {
      console.error("Telemetry error:", error);
    }
  });
}

// Détection du navigateur
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = "unknown";
  
  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
  } else if (userAgent.indexOf("Edge") > -1) {
    browserName = "Edge";
  } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
    browserName = "Opera";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
  }
  
  return browserName;
}

// Détection de la plateforme
function getPlatformInfo() {
  const userAgent = navigator.userAgent;
  let platform = "unknown";
  
  if (userAgent.indexOf("Windows") > -1) {
    platform = "Windows";
  } else if (userAgent.indexOf("Mac") > -1) {
    platform = "MacOS";
  } else if (userAgent.indexOf("Linux") > -1) {
    platform = "Linux";
  } else if (userAgent.indexOf("Android") > -1) {
    platform = "Android";
  } else if (userAgent.indexOf("iOS") > -1) {
    platform = "iOS";
  }
  
  return platform;
}

// Générer ou récupérer l'ID de session
function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem('telemetry_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('telemetry_session_id', sessionId);
  }
  return sessionId;
}

// Écouter les messages de télémétrie depuis popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'telemetry') {
    sendTelemetryData(message.eventType, message.eventData);
    sendResponse({success: true});
  }
  return true;
});

// Démarrer la télémétrie lors du chargement de l'extension
chrome.runtime.onInstalled.addListener(() => {
  sendTelemetryData('extension_installed');
});

// Suivre l'ouverture du popup
chrome.action.onClicked.addListener(() => {
  sendTelemetryData('popup_opened');
});