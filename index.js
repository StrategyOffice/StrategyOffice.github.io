!function () {
    "use strict";

    window.onerror = function (...args) {
        const e = JSON.stringify(args, null, 2);
        console.error(e);
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


    // mute video when marker is invisible
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


    // interaction logic. There can be only one!
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
                if (this.el.object3D.rotation.x > 0) this.el.object3D.rotation.x = 0;
                if (this.el.object3D.rotation.x < -1) this.el.object3D.rotation.x = -1;
                console.log(this.el.object3D.rotation.x);
            };

            const rotateY = (amount) => this.el.object3D.rotateY(amount * rotateSpeed);

            this._wheel_handler = (ev) => scale(Math.sign(ev.deltaY) * wheelZoomSpeed);

            this._pointerdown_handler = (ev) => {
                // Start of a touch interaction.
                // This event is cached to support 2-finger gestures
                evCache.push(ev);

                if (evCache.length === 1) {
                    prevX = ev.clientX;
                    prevY = ev.clientY;
                }
            };

            // 2-pointer pinch to zoom.
            this._pointermove_handler = (ev) => {
                // Find this event in the cache and update its record with this event
                for (let i = 0; i < evCache.length; i++) {
                    if (ev.pointerId == evCache[i].pointerId) {
                        evCache[i] = ev;
                        break;
                    }
                }

                if (evCache.length === 1) {
                    // TODO: Rotate model
                    const dx = evCache[0].clientX - prevX;
                    const dy = evCache[0].clientY - prevY;
                    prevX = evCache[0].clientX;
                    prevY = evCache[0].clientY;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        rotateY(dx);
                    } else {
                        rotateX(dy);
                    }
                }

                // If two pointers are down, check for pinch gestures
                if (evCache.length === 2) {
                    // Calculate the distance between the two pointers
                    const curDiff = Math.hypot(
                        evCache[0].clientX - evCache[1].clientX,
                        evCache[0].clientY - evCache[1].clientY,
                    );

                    if (prevDiff > 0) {
                        const move = curDiff - prevDiff;
                        //this.el.object3D.scale.multiplyScalar(1 + move / 150);
                        scale(move * pinchZoomSpeed);
                    }

                    // Cache the distance for the next move event
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

                // If the number of pointers down is less than two then reset diff tracker
                if (evCache.length < 2) prevDiff = -1;
            };
        },


        play: function () {
            console.log('interaction: play');

            window.addEventListener('wheel', this._wheel_handler);

            // pinch-zoom will NOT work on firefox for android at the time of writing, because the engine version is quite old and does not support the pointer-events specification
            // Global vars to cache event state
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


    // replace the material on a named mesh in the model with the given video
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

        /*
            this.data	Parsed component properties computed from the schema default values, mixins, and the entity’s attributes.
                        Important: Do not modify the data attribute directly. It is updated internally by A-Frame. To modify a component, use setAttribute.
            this.el	    Reference to the entity as an HTML element.
            this.el.sceneEl	Reference to the scene as an HTML element.
            this.id	    If the component can have multiple instances, the ID of the individual instance of the component (e.g., foo from sound__foo).
        */
        init: function () {
            // Wait until the model is loaded, then insert video
            this.el.addEventListener('model-loaded', () => this.__insertVideo());

            this._startVideo = async () => {
                try {
                    await this.data.video.play();
                    this._events.map((e) => window.removeEventListener(e, this._startVideo));
                } catch (e) {
                    console.error(e);
                }
            };
        },

        __insertVideo: async function () {
            if (this.__init_done) return;
            console.log('attach video')

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

                    const mat = new THREE.MeshBasicMaterial(); // not affected by lighting
                    mat.map = new THREE.VideoTexture(this.data.video);

                    // The model should have a default "poster" texture where the video will be.
                    // This would also act as a fallback, if the video can not be loaded for whatever reason.
                    // Could use the timeupdate event to detect when when the video actually plays to do this.
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
                    await this.data.video.play();
                } catch (e) {
                    console.warn("failed to start video. try with interaction handler.");
                    this._events.map((e) => window.addEventListener(e, this._startVideo, { passive: true }));
                }
            } else {
                console.error('insertvideo: object not found');
            }

            this.__init_done = true;
        }
    });


    // Controls the window content
    // This is a mainly workaround for tracking not working correcly in portrait mode on chrome.
    // It also shows a warning when the page was not loaded from a server.
    function init() {
        const $ = document.querySelector.bind(document);

        // get the templates
        const scene = $('#ar-scene').content;
        const landscapeWarn = $('#landscape-warning').content;

        // function to replace body content
        const setContent = (content) => {
            document.body.innerHTML = '';
            const frag = content.cloneNode(true);
            document.body.appendChild(frag);
        };

        const init = () => {
            if (screen.orientation.type.startsWith('landscape')) {
                setContent(scene);
            } else {
                setContent(landscapeWarn);
                $('#landscape-btn').addEventListener('click', () =>
                    document.body.requestFullscreen({
                        navigationUI: 'hide',
                    }),
                );
            }
        };


        window.addEventListener('fullscreenerror', (ev) => window.onerror && window.onerror.call(null, ev));

        window.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                console.log('entered fullscreen');
                screen.orientation.lock('landscape');
            } else {
                console.log('exited fullscreen');
                screen.orientation.unlock();
            }
        });

        window.addEventListener('orientationchange', init);
        init();
    }

    window.addEventListener('DOMContentLoaded', init);
}();
