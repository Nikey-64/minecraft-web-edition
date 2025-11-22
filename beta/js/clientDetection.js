/**
 * Client capability detection for adaptive rendering settings
 */
function detectClientCapabilities() {
    var clientInfo = {
        isLowEnd: false,
        isMobile: false,
        isTablet: false,
        hasWebGL: false,
        maxTextureSize: 0,
        renderer: '',
        vendor: '',
        memoryGB: 0,
        cores: navigator.hardwareConcurrency || 1
    };

    // Detect mobile/tablet
    var userAgent = navigator.userAgent.toLowerCase();
    clientInfo.isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    clientInfo.isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);

    // WebGL detection and capabilities
    try {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            clientInfo.hasWebGL = true;
            var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                clientInfo.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                clientInfo.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            }
            clientInfo.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        }
    } catch (e) {
        clientInfo.hasWebGL = false;
    }

    // Memory estimation (rough heuristic)
    if ('deviceMemory' in navigator) {
        clientInfo.memoryGB = navigator.deviceMemory;
    } else {
        // Fallback estimation based on device type
        if (clientInfo.isMobile) {
            clientInfo.memoryGB = 2; // Assume 2GB for mobile
        } else {
            clientInfo.memoryGB = 8; // Assume 8GB for desktop
        }
    }

    // Low-end detection criteria
    clientInfo.isLowEnd = (
        clientInfo.memoryGB < 4 ||
        clientInfo.cores < 2 ||
        clientInfo.maxTextureSize < 2048 ||
        clientInfo.isMobile ||
        /integrated|intel hd|intel uhd|radeon r[1-5]|geforce [1-9][0-9][0-9][0-9]?|gtx [1-9][0-9][0-9]/i.test(clientInfo.renderer)
    );

    return clientInfo;
}

// Make clientInfo globally available
var clientInfo = detectClientCapabilities();
