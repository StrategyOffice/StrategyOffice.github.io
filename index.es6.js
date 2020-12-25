"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
window.onerror = function (...args) {
    const e = JSON.stringify(args, null, 2);
    console.error(e);
    alert(e);
};
!function () {
    const $ = document.querySelector.bind(document);
    const $$ = selector => {
        const r = $(selector);
        return r && r.content || null;
    };
    AFRAME.registerComponent('material-log', {
        init: function () {
            console.log("material-log: init");
            const fun = () => {
                this.el.object3D.traverse(function (node) {
                    if (node.isMesh) {
                        console.log(`${node.name}: ${node.material.type}`);
                    }
                });
            };
            this.el.addEventListener('model-loaded', fun);
        },
    });
    AFRAME.registerComponent('environment', {
        schema: {
            map: {
                type: 'selector',
                default: '#environment-map',
            },
        },
        init: function () {
            console.log("environment: init");
            if (!this.data.map || this.data.map.tagName != "IMG") {
                console.error("environment map not found");
                return;
            }
            const fun = () => {
                const targetCube = new THREE.WebGLRenderTargetCube(512, 512);
                const renderer = this.el.sceneEl.renderer;
                const texture = new THREE.Texture(this.data.map);
                texture.needsUpdate = true;
                const cubeTex = targetCube.fromEquirectangularTexture(renderer, texture);
                this.el.object3D.traverse(function (node) {
                    if (node.material && !node.material.envMap) {
                        console.log(`Setting envMap for ${node.name}: ${node.material.type}`);
                        node.material.envMap = cubeTex.texture;
                        node.material.envMap.intensity = 3;
                        node.material.needsUpdate = true;
                    }
                });
            };
            this.el.addEventListener('model-loaded', fun);
        },
    });
    AFRAME.registerComponent('marker-mute', {
        schema: {
            video: {
                type: 'selector',
                default: '#thevideo',
            },
        },
        init: function () {
            this._markerFound = () => {
                console.log("marker found, unmute video");
                this.data.video.muted = false;
            };
            this._markerLost = () => {
                console.log("marker lost, mute video");
                this.data.video.muted = true;
            };
        },
        play: function () {
            if (this.el.sceneEl && this.data.video) {
                this.el.sceneEl.addEventListener('markerFound', this._markerFound);
                this.el.sceneEl.addEventListener('markerLost', this._markerLost);
            }
        },
        pause: function () {
            if (this.el.sceneEl) {
                this.el.sceneEl.removeEventListener('markerFound', this._markerFound);
                this.el.sceneEl.removeEventListener('markerLost', this._markerLost);
            }
        },
    });
    AFRAME.registerComponent('interaction', {
        init: function () {
            const wheelZoomSpeed = -0.05;
            const pinchZoomSpeed = 0.007;
            const rotateSpeed = 0.005;
            const evCache = [];
            let prevX = -1;
            let prevY = -1;
            let prevDiff = -1;
            const scale = (amount) => this.el.object3D.scale.multiplyScalar(1 + amount);
            const rotateX = (amount) => {
                this.el.object3D.rotateX(amount * rotateSpeed);
                if (this.el.object3D.rotation.x > 0)
                    this.el.object3D.rotation.x = 0;
                if (this.el.object3D.rotation.x < -1)
                    this.el.object3D.rotation.x = -1;
                console.log(this.el.object3D.rotation.x);
            };
            const rotateY = (amount) => this.el.object3D.rotateY(amount * rotateSpeed);
            this._wheel_handler = (ev) => scale(Math.sign(ev.deltaY) * wheelZoomSpeed);
            this._pointerdown_handler = (ev) => {
                evCache.push(ev);
                if (evCache.length === 1) {
                    prevX = ev.clientX;
                    prevY = ev.clientY;
                }
            };
            this._pointermove_handler = (ev) => {
                for (let i = 0; i < evCache.length; i++) {
                    if (ev.pointerId == evCache[i].pointerId) {
                        evCache[i] = ev;
                        break;
                    }
                }
                if (evCache.length === 1) {
                    const dx = evCache[0].clientX - prevX;
                    const dy = evCache[0].clientY - prevY;
                    prevX = evCache[0].clientX;
                    prevY = evCache[0].clientY;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        rotateY(dx);
                    }
                    else {
                    }
                }
                if (evCache.length === 2) {
                    const curDiff = Math.hypot(evCache[0].clientX - evCache[1].clientX, evCache[0].clientY - evCache[1].clientY);
                    if (prevDiff > 0) {
                        const move = curDiff - prevDiff;
                        scale(move * pinchZoomSpeed);
                    }
                    prevDiff = curDiff;
                }
            };
            this._pointerup_handler = (ev) => {
                for (let i = 0; i < evCache.length; i++) {
                    if (evCache[i].pointerId == ev.pointerId) {
                        evCache.splice(i, 1);
                        break;
                    }
                }
                if (evCache.length < 1) {
                    prevX = -1;
                    prevY = -1;
                }
                if (evCache.length < 2)
                    prevDiff = -1;
            };
        },
        play: function () {
            console.log('interaction: play');
            window.addEventListener('wheel', this._wheel_handler);
            window.addEventListener('pointerdown', this._pointerdown_handler);
            window.addEventListener('pointermove', this._pointermove_handler);
            window.addEventListener('pointerup', this._pointerup_handler);
            window.addEventListener('pointerout', this._pointerup_handler);
            window.addEventListener('pointercancel', this._pointerup_handler);
            window.addEventListener('pointerleave', this._pointerup_handler);
        },
        pause: function () {
            console.log('interaction: pause');
            window.removeEventListener('wheel', this._wheel_handler);
            window.removeEventListener('pointerdown', this._pointerdown_handler);
            window.removeEventListener('pointermove', this._pointermove_handler);
            window.removeEventListener('pointerup', this._pointerup_handler);
            window.removeEventListener('pointerout', this._pointerup_handler);
            window.removeEventListener('pointercancel', this._pointerup_handler);
            window.removeEventListener('pointerleave', this._pointerup_handler);
        }
    });
    AFRAME.registerComponent('insertvideo', {
        schema: {
            video: {
                type: 'selector',
                default: '#thevideo',
            },
            meshName: {
                type: 'string',
                default: 'Video',
            },
        },
        __init_done: false,
        _events: ['mousedown', 'touchstart', 'keydown'],
        init: function () {
            this.el.addEventListener('model-loaded', () => this.__insertVideo());
            this._startVideo = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.data.video.play();
                    this._events.map((e) => window.removeEventListener(e, this._startVideo));
                }
                catch (e) {
                    console.error(e);
                }
            });
        },
        __insertVideo: function () {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.__init_done)
                    return;
                console.log('attach video');
                if (!this.data.video) {
                    console.error('insertvideo: no video');
                    return;
                }
                if (!this.el.object3D || typeof this.el.object3D.traverse !== 'function') {
                    console.error('insertvideo: no object3D');
                    return;
                }
                let found = false;
                this.el.object3D.traverse((o) => {
                    if (!found && o.type === 'Mesh' && o.name === this.data.meshName) {
                        found = true;
                        const mat = new THREE.MeshBasicMaterial();
                        mat.map = new THREE.VideoTexture(this.data.video);
                        const setMaterial = () => {
                            o.material = mat;
                            this.data.video.removeEventListener('timeupdate', setMaterial);
                        };
                        this.data.video.addEventListener('timeupdate', setMaterial);
                    }
                });
                if (found) {
                    console.log('insertvideo: object found');
                    try {
                        yield this.data.video.play();
                    }
                    catch (e) {
                        console.warn("failed to start video. try with interaction handler.");
                        this._events.map((e) => window.addEventListener(e, this._startVideo, { passive: true }));
                    }
                }
                else {
                    console.error('insertvideo: object not found');
                }
                this.__init_done = true;
            });
        }
    });
    function hasVideoInput() {
        return __awaiter(this, void 0, void 0, function* () {
            return navigator.mediaDevices.enumerateDevices().then(mdi => mdi.some(m => m.kind === 'videoinput'));
        });
    }
    function getPermission() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stream = yield window.navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: "environment",
                        width: 32,
                        height: 32,
                    }
                });
                for (const track of stream.getTracks()) {
                    track.stop();
                }
                return true;
            }
            catch (e) {
                console.error(e);
            }
            return false;
        });
    }
    function load() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const isFallback = new URL(location).searchParams.has("fallback");
            const supportsOrientation = 'screen' in window && 'orientation' in window.screen && 'type' in window.screen.orientation;
            const supportsFullscreen = supportsOrientation && 'lock' in window.screen.orientation && 'unlock' in window.screen.orientation;
            if (supportsOrientation) {
                document.body.classList.add("supports-orientation");
            }
            if (supportsFullscreen) {
                document.body.classList.add("supports-fullscreen");
            }
            if (isFallback) {
                const temp = $('#ar-scene');
                temp.innerHTML = temp.innerHTML.replace("sourceType: webcam;", "sourceType: image; sourceUrl: FallbackSource.png;");
            }
            const tNoCamera = $$('#no-camera');
            const tPermCheck = $$('#permission-check');
            const tPermDenied = $$('#permission-denied');
            const scene = $$('#ar-scene');
            const landscapeWarn = $$('#landscape-warning');
            const setContent = (content) => {
                document.body.innerHTML = '';
                document.body.removeAttribute("style");
                const frag = content.cloneNode(true);
                document.body.appendChild(frag);
            };
            const landscapeMode = () => {
                setContent(scene);
                if (supportsOrientation) {
                    window.addEventListener('orientationchange', () => document.location.reload(), { once: true });
                }
            };
            const portraitMode = () => {
                setContent(landscapeWarn);
                if (supportsOrientation) {
                    $('#landscape-btn').addEventListener('click', () => document.body.requestFullscreen({ navigationUI: 'hide' }));
                    window.addEventListener('orientationchange', landscapeMode, { once: true });
                }
            };
            if (supportsFullscreen) {
                window.addEventListener('fullscreenerror', (ev) => window.onerror && window.onerror.call(null, ev));
                window.addEventListener('fullscreenchange', () => {
                    if (document.fullscreenElement) {
                        console.log('entered fullscreen');
                        screen.orientation.lock('landscape');
                    }
                    else {
                        console.log('exited fullscreen');
                        screen.orientation.unlock();
                    }
                });
            }
            if (!isFallback) {
                const cameraAvailable = yield hasVideoInput();
                if (tNoCamera && !cameraAvailable) {
                    setContent(tNoCamera);
                    return;
                }
                if (tPermCheck) {
                    setContent(tPermCheck);
                }
                const granted = yield getPermission();
                if (tPermDenied && !granted) {
                    setContent(tPermDenied);
                    return;
                }
            }
            if (supportsOrientation) {
                if ((_b = (_a = screen === null || screen === void 0 ? void 0 : screen.orientation) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.startsWith('landscape')) {
                    landscapeMode();
                }
                else {
                    portraitMode();
                }
            }
            else {
                landscapeMode();
            }
        });
    }
    window.addEventListener('DOMContentLoaded', load);
}();
//# sourceMappingURL=index.es6.js.map