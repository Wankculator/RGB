// Mobile WebGL fixes and optimizations
export class MobileWebGLFix {
    static checkCompatibility() {
        const issues = [];
        
        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            issues.push('WebGL not supported');
            return { supported: false, issues };
        }
        
        // Check for required extensions
        const requiredExtensions = [
            'OES_texture_float',
            'OES_standard_derivatives'
        ];
        
        for (const ext of requiredExtensions) {
            if (!gl.getExtension(ext)) {
                issues.push(`Missing extension: ${ext}`);
            }
        }
        
        // Check memory constraints
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (maxTextureSize < 2048) {
            issues.push(`Low texture size limit: ${maxTextureSize}`);
        }
        
        // Check iOS specific issues
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            // iOS WebGL limitations
            if (!canvas.getContext('webgl', { preserveDrawingBuffer: true })) {
                issues.push('iOS requires preserveDrawingBuffer');
            }
        }
        
        return {
            supported: issues.length === 0,
            issues,
            maxTextureSize,
            isIOS
        };
    }
    
    static getOptimizedRendererParams(isMobile) {
        if (!isMobile) {
            return {
                antialias: true,
                powerPreference: 'high-performance'
            };
        }
        
        // Mobile optimized parameters
        return {
            antialias: false,
            alpha: false,
            depth: true,
            stencil: false,
            powerPreference: 'low-power',
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            precision: 'mediump',
            logarithmicDepthBuffer: false,
            failIfMajorPerformanceCaveat: false
        };
    }
    
    static optimizeForMobile(renderer, scene) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) return;
        
        // Reduce pixel ratio
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        
        // Disable shadows
        renderer.shadowMap.enabled = false;
        
        // Use lower quality settings
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        
        // Reduce texture sizes
        scene.traverse((object) => {
            if (object.material && object.material.map) {
                const texture = object.material.map;
                if (texture.image && texture.image.width > 512) {
                    texture.minFilter = THREE.LinearMipMapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                }
            }
        });
        
        // Handle context loss
        const canvas = renderer.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.log('WebGL context lost, attempting recovery...');
            setTimeout(() => {
                renderer.forceContextRestore();
            }, 1000);
        });
        
        canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
        });
    }
    
    static setupMobileAudioContext() {
        // iOS requires user interaction to start audio
        const startAudio = () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create empty buffer and play it
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            // Remove listener after first interaction
            document.removeEventListener('touchstart', startAudio);
            document.removeEventListener('click', startAudio);
        };
        
        document.addEventListener('touchstart', startAudio);
        document.addEventListener('click', startAudio);
    }
}