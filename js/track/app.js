const app = {
    debug: false, // bool, enable/disable debug
    init: function() {
        const webcam = document.getElementById('content');

        // Variables pour stocker la position de départ de la div
        let startX, startY;

        // Fonction qui sera appelée lorsque l'utilisateur commence à déplacer la div
        function startDrag(e) {
            startX = e.clientX - webcam.offsetLeft;
            startY = e.clientY - webcam.offsetTop;
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
        }

        // Fonction qui sera appelée pendant que l'utilisateur déplace la div
        function drag(e) {
            webcam.style.left = e.clientX - startX + 'px';
            webcam.style.top = e.clientY - startY + 'px';
        }

        // Fonction qui sera appelée lorsque l'utilisateur arrête de déplacer la div
        function stopDrag() {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        }

        // Événement qui démarre le drag and drop
        webcam.addEventListener('dragstart', startDrag);

        // btn: WebCam ON/OFF
        document.getElementById('toggle_webcam').addEventListener('click', function (e) {
            app.toggleWebcam(e);
        });
    },

    // handle toggle button
    toggleWebcam: function (e) {
        const btn = e.target
        if (btn.classList.contains("btn-primary")) {
            document.getElementById('wrapper').classList.add("invisible")
            document.getElementById('content').classList.add('webcam_off')
            btn.classList.replace("btn-primary", "btn-danger")
        } else {
            document.getElementById('wrapper').classList.remove("invisible")
            document.getElementById('content').classList.remove('webcam_off')
            btn.classList.replace("btn-danger", "btn-primary")
        }
    },

    // handle toggle button
    toggleDebug: function() {
        if (app.debug) {
            app.debug = false;
            document.getElementById('info_debug').innerHTML = '';
            console.log('Debug OFF');
        } else {
            app.debug = true;
            console.log('Debug ON');
        }
    },

    // draw status
    updateStatus: function(msg) {
        document.getElementById('status').innerHTML = msg;
    },

    // draw counter
    updateCounter: function(poses) {
        let i = 0;
        if (poses) {
            i = poses.length;
        }
        document.getElementById('info_counter').innerHTML = i;
    },

    // draw debug coords
    updateDebug: function(poses) {
        if (!app.debug) {
            return;
        }
        let str = '',
            n = 0,
            i = 0;
        for (let pose of poses) {
            str = str + '[ pose ' + i + ' ]<br>';
            for (let kp of pose.keypoints) {
                str = str + i + ': ' + kp.name;
                str = str + ', ';
                str = str + 'x:' + kp.x;
                str = str + ', ';
                str = str + 'y:' + kp.y;
                if (typeof kp.z !== 'undefined') {
                    str = str + ', ';
                    str = str + 'z:' + kp.z;
                }
                str = str + ', ';
                str = str + 's:' + kp.score;
                str = str + '<br>';
                i++;
            }
            n++;
        }
        document.getElementById('info_debug').innerHTML = str;
    },
}