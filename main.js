import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'


// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// WebXR (VR) Setup
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// GLTF Loader
const loader = new GLTFLoader();

// Handle Model Upload
document.getElementById('model-upload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        loadModel(url);
    }
});

// let currentModel;
// function loadModel(url) {
//     if (currentModel) {
//         scene.remove(currentModel);
//     }
//     loader.load(url, (gltf) => {
//         currentModel = gltf.scene;

//         // --- START: Add this code to center the model ---
//         const box = new THREE.Box3().setFromObject(currentModel);
//         const center = box.getCenter(new THREE.Vector3());
//         currentModel.position.sub(center); 
//         // --- END: Centering code ---

//         scene.add(currentModel);
//     }, undefined, (error) => {
//         console.error(error);
//     });
// }
let currentModel;
function loadModel(url) {
    if (currentModel) {
        scene.remove(currentModel);
    }
    loader.load(url, (gltf) => {
        currentModel = gltf.scene;
        // Center the base model
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.sub(center);
        scene.add(currentModel);

        // 2. NOW, LOAD THE YOGA MODEL
        loader.load('./models/yoga_pose.glb', (yogaGltf) => {
            const yogaModel = yogaGltf.scene;

            yogaModel.scale.set(0.3, 0.3, 0.3);

            yogaModel.rotation.y = -(Math.PI / 2.3);
            
            // Center the yoga model first
            const yogaBox = new THREE.Box3().setFromObject(yogaModel);
            const yogaCenter = yogaBox.getCenter(new THREE.Vector3());
            yogaModel.position.sub(yogaCenter);

            // Position it on top of the other model
            // You may need to adjust the 'y' value depending on the models' sizes
            yogaModel.position.y = -8; 
            yogaModel.position.x = 10; 

            scene.add(yogaModel);
        });

    }, undefined, (error) => {
        console.error(error);
    });
}



// Call the function to load the base model
loadModel('./models/crystal.glb');

// Animation Loop
function animate() {
    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

// Skybox / Environment
// const textureLoader = new THREE.TextureLoader();
// const texture = textureLoader.load(
//     './textures/your_calm_sky.jpg', // Replace with your 360 image
//     () => {
//         const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
//         rt.fromEquirectangularTexture(renderer, texture);
//         scene.background = rt.texture;
//     }
// );
const hdrLoader = new RGBELoader();
hdrLoader.load('./textures/your_environment.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // Set both the background and the environment
    scene.background = texture;
    scene.environment = texture; // This is the crucial part for lighting and reflections
});

// Ambient Audio
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('./audio/ambient_sound.mp3', function(buffer) { // Replace with your audio file
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.3);
    // sound.play(); // Uncomment or trigger this with a user interaction
});

// A "click to start" is needed for audio to play in modern browsers
window.addEventListener('click', () => {
    if (!sound.isPlaying) {
        sound.play();
    }
}, { once: true });

// Meditation Timer
const meditationDurationInput = document.getElementById('meditation-duration');
const startMeditationBtn = document.getElementById('start-meditation');
const pauseMeditationBtn = document.getElementById('pause-meditation');
const resetMeditationBtn = document.getElementById('reset-meditation');
const meditationDisplay = document.getElementById('meditation-timer-display');

let meditationInterval;
let remainingTime = 0; // Stores the time left when paused
let isTimerRunning = false;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function startTimer() {
    if (isTimerRunning) return; // Don't start if already running

    isTimerRunning = true;
    let duration;

    // If there's remaining time, use it. Otherwise, start a new timer.
    if (remainingTime > 0) {
        duration = remainingTime;
    } else {
        duration = parseInt(meditationDurationInput.value) * 60;
    }
    
    meditationInterval = setInterval(() => {
        if (duration <= 0) {
            clearInterval(meditationInterval);
            meditationDisplay.textContent = "Finished.";
            isTimerRunning = false;
            remainingTime = 0;
            return;
        }
        duration--;
        remainingTime = duration; // Update remaining time every second
        meditationDisplay.textContent = formatTime(duration);
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(meditationInterval);
}

function resetTimer() {
    isTimerRunning = false;
    clearInterval(meditationInterval);
    remainingTime = 0;
    meditationDisplay.textContent = "";
    meditationDurationInput.value = 5; // Reset input to default
}

startMeditationBtn.addEventListener('click', startTimer);
pauseMeditationBtn.addEventListener('click', pauseTimer);
resetMeditationBtn.addEventListener('click', resetTimer);
// Breathing Exercise
const startBreathingBtn = document.getElementById('start-breathing');
const breathingGuide = document.getElementById('breathing-guide');
const breathingCircle = document.getElementById('breathing-circle');
const breathingText = document.getElementById('breathing-text');

let isBreathing = false;
let timeout1, timeout2, timeout3, timeout4;

function breatheCycle() {
    // If the stop button was pressed, exit the loop.
    if (!isBreathing) return;

    // 1. INHALE (lasts 4 seconds)
    // The circle starts expanding.
    breathingText.textContent = 'Inhale';
    breathingCircle.className = 'breathing-circle inhale';
    
    // 2. HOLD FULL (starts after 4s, lasts 4s)
    // The circle stops expanding and stays full.
    timeout1 = setTimeout(() => {
        if (!isBreathing) return;
        breathingText.textContent = 'Hold';
    }, 4000);

    // 3. EXHALE (starts after 8s, lasts 4s)
    // The circle starts compressing.
    timeout2 = setTimeout(() => {
        if (!isBreathing) return;
        breathingText.textContent = 'Exhale';
        breathingCircle.className = 'breathing-circle exhale';
    }, 8000); // 4s inhale + 4s hold

    // 4. HOLD EMPTY (starts after 12s, lasts 4s)
    // The circle stops compressing and stays empty.
    timeout3 = setTimeout(() => {
        if (!isBreathing) return;
        breathingText.textContent = 'Hold';
    }, 12000); // 4s inhale + 4s hold + 4s exhale

    // 5. RESTART the cycle (after a total of 16 seconds)
    timeout4 = setTimeout(() => {
        if (!isBreathing) return;
        breatheCycle(); // This creates the loop
    }, 16000); // Full 4-stage cycle duration
}

function stopBreathing() {
    isBreathing = false;
    // Clear all scheduled timeouts
    clearTimeout(timeout1);
    clearTimeout(timeout2);
    clearTimeout(timeout3);
    clearTimeout(timeout4);
}

startBreathingBtn.addEventListener('click', () => {
    if (isBreathing) {
        // --- Code to STOP (This part is unchanged) ---
        stopBreathing();
        startBreathingBtn.textContent = 'Start';
        breathingGuide.style.display = 'none';
    } else {
        // --- Code to START (This part is updated) ---
        isBreathing = true;
        startBreathingBtn.textContent = 'Stop';

        // 1. Set the initial state of the circle to be compressed.
        breathingCircle.className = 'breathing-circle exhale';
        breathingText.textContent = 'Get Ready...';

        // 2. Make the guide visible.
        breathingGuide.style.display = 'block';

        // 3. Start the animation cycle after a tiny delay.
        // This gives the browser a moment to render the initial state.
        setTimeout(breatheCycle, 100); 
    }
});
// Google Fit Integration
const authorizeButton = document.getElementById('authorize-google-fit');
const fitDataDisplay = document.getElementById('fit-data-display');

const CLIENT_ID = ''; // Replace with your Client ID
const API_KEY = 'YOUR_API_KEY'; // Replace with your API Key (optional but recommended)
const SCOPES = 'https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.activity.read';

let tokenClient;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest'],
    });
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
}
// Manually bootstrap the GAPI and GIS client loading
gapiLoaded();
// Assuming GIS script is loaded, you'd call gisLoaded()
// Since we used `async src` in HTML, a more robust method is needed in production.
// For this example, we assume it loads. A `window.onload` wrapper is a simple solution.
window.onload = gisLoaded;


authorizeButton.addEventListener('click', () => {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        fitDataDisplay.innerText = "Successfully authorized! Fetching data...";
        await fetchFitnessData();
    };
    
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
});

async function fetchFitnessData() {
    try {
        const now = new Date();
        const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); // Start of today
        const endTime = now.getTime(); // Now
        
        const response = await gapi.client.fitness.users.dataset.aggregate({
            userId: 'me',
            requestBody: {
                aggregateBy: [{
                    dataTypeName: "com.google.heart_rate.bpm"
                }, {
                    dataTypeName: "com.google.step_count.delta"
                }],
                bucketByTime: { durationMillis: 86400000 }, // 1 day
                startTimeMillis: startTime,
                endTimeMillis: endTime
            }
        });
        
        const heartRateData = response.result.bucket[0].dataset[0].point;
        const stepData = response.result.bucket[0].dataset[1].point;
        
        let displayHTML = '<h4>Today\'s Data:</h4>';
        if (stepData.length > 0) {
            displayHTML += `<p>Steps: ${stepData[0].value[0].intVal}</p>`;
        } else {
            displayHTML += `<p>Steps: No data</p>`;
        }
        
        if (heartRateData.length > 0) {
            const lastHeartRate = heartRateData[heartRateData.length-1].value[0].fpVal;
            displayHTML += `<p>Last Heart Rate: ${lastHeartRate.toFixed(0)} bpm</p>`;
        } else {
            displayHTML += `<p>Heart Rate: No data</p>`;
        }

        fitDataDisplay.innerHTML = displayHTML;
        
    } catch (err) {
        console.error("Error fetching data:", err);
        fitDataDisplay.innerText = "Could not fetch fitness data.";
    }
}