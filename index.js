!function () {
    "use strict";

    // This is supposed to alert the developer to an error on mobile devices where debugging is difficult
    window.onerror = function (...args) {
        const e = JSON.stringify(args, null, 2);
        alert(e);
        //document.body.innerText = e;
    };


    // just log markers being found and lost
    AFRAME.registerComponent('markerlog', {
        init: function () {
            const scene = document.querySelector('a-scene');
            scene.addEventListener('markerFound', (ev, target) => console.log(ev, target));
            scene.addEventListener('markerLost', (ev, target) => console.log(ev, target));
        },
    });


    // interaction logic. There can be only one!
    AFRAME.registerComponent('interaction', {
        init: function () {
            console.log('cursor indicator init');

            window.addEventListener('wheel', (ev) => this.el.object3D.scale.multiplyScalar(ev.deltaY < 0 ? 1.03 : 0.97));

            /* START pinch-zoom */
            // This will NOT work on firefox for android at the time of writing, because the engine version is quite old and does not support the pointer-events specification
            // Global vars to cache event state
            const evCache = [];
            let prevDiff = -1;

            const pointerdown_handler = (ev) => {
                // Start of a touch interaction.
                // This event is cached to support 2-finger gestures
                evCache.push(ev);
            };

            // 2-pointer pinch to zoom.
            const pointermove_handler = (ev) => {
                // Find this event in the cache and update its record with this event
                for (let i = 0; i < evCache.length; i++) {
                    if (ev.pointerId == evCache[i].pointerId) {
                        evCache[i] = ev;
                        break;
                    }
                }

                // If two pointers are down, check for pinch gestures
                if (evCache.length == 2) {
                    // Calculate the distance between the two pointers
                    const curDiff = Math.hypot(
                        evCache[0].clientX - evCache[1].clientX,
                        evCache[0].clientY - evCache[1].clientY,
                    );

                    if (prevDiff > 0) {
                        const move = curDiff - prevDiff;
                        this.el.object3D.scale.multiplyScalar(1 + move / 150);
                    }

                    // Cache the distance for the next move event
                    prevDiff = curDiff;
                }
            };

            const pointerup_handler = (ev) => {
                for (let i = 0; i < evCache.length; i++) {
                    if (evCache[i].pointerId == ev.pointerId) {
                        evCache.splice(i, 1);
                        break;
                    }
                }

                // If the number of pointers down is less than two then reset diff tracker
                if (evCache.length < 2) {
                    prevDiff = -1;
                }
            };

            window.addEventListener('pointerdown', pointerdown_handler);
            window.addEventListener('pointermove', pointermove_handler);
            window.addEventListener('pointerup', pointerup_handler);
            window.addEventListener('pointerout', pointerup_handler);
            window.addEventListener('pointercancel', pointerup_handler);
            window.addEventListener('pointerleave', pointerup_handler);
            /* END pinch-zoom */
        },
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

        /*
            this.data	Parsed component properties computed from the schema default values, mixins, and the entity’s attributes.
                        Important: Do not modify the data attribute directly. It is updated internally by A-Frame. To modify a component, use setAttribute.
            this.el	    Reference to the entity as an HTML element.
            this.el.sceneEl	Reference to the scene as an HTML element.
            this.id	    If the component can have multiple instances, the ID of the individual instance of the component (e.g., foo from sound__foo).
        */
        init: function () {
            // Note: mesh and/or video are not yet ready in this callback
            const events = ['mousedown', 'touchstart', 'keydown'];

            const startVideo = async () => {
                try {
                    await this.data.video.play();
                    events.map((e) => window.removeEventListener(e, startVideo));
                } catch (e) {
                    console.error(e);
                }
            };

            events.map((e) => window.addEventListener(e, startVideo, { passive: true }));
        },

        play: function () {
            // Note: In this callback, video and mesh should be ready
            if (this.__init_done) return;

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
                    console.log(o);

                    // TODO:
                    // The model should have a default "poster" texture where the video will be.
                    // Maybe use some kind of ready state logic, to replace the material once the video is ready to play.
                    // This would also act as a fallback, if the video can not be loaded for whatever reason.
                    // Could use the timeupdate event to detect when when the video actually plays to do this.
                    this.data.video.addEventListener('timeupdate', () => {
                        //console.log(this.data.video.currentTime);
                    });

                    const mat = new THREE.MeshBasicMaterial(); // not affected by lighting
                    mat.map = new THREE.VideoTexture(this.data.video);
                    o.material = mat;
                }
            });

            if (found) {
                console.log('insertvideo: object found');
            } else {
                console.error('insertvideo: object not found');
            }

            this.__init_done = true;
        },
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
