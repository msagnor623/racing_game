const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let waitingToStart = true;

// Load assets

const selectedCol = parseInt(localStorage.getItem('selectedCarCol')) || 0;
const selectedRow = parseInt(localStorage.getItem('selectedCarRow')) || 0;

const carSpriteSheet = new Image();
carSpriteSheet.src = 'images/cars/cars.png';

const carSpriteColumns = 5;
const carSpriteRows = 6;
const spriteWidth = 1142 / carSpriteColumns;
const spriteHeight = 800 / carSpriteRows;



function drawCar() {
  ctx.save();
  ctx.translate(car.x + car.width / 2, car.y + car.height / 2);
  if (car.spinOut) ctx.rotate(car.spinAngle);
  ctx.drawImage(
    carSpriteSheet,
    selectedCol * spriteWidth,
    selectedRow * spriteHeight,
    spriteWidth,
    spriteHeight,
    -car.width / 2,
    -car.height / 2,
    car.width,
    car.height
  );
  ctx.restore();
}

const backgroundImage = localStorage.getItem('selectedBG') || 'city.png';


const bgImg = new Image();
bgImg.src = `images/backgrounds/${backgroundImage}`;


// Car object
let car = {
    x: 0,
    y: 0,
    carStartY: 0,
    width: 50,
    height: 30,
    velocityY: 0,
    velocityX: 0,
    boost: false,
    onGround: true,
    spinOut: false,
    spinAngle: 0
};

let moveLeft = false;
let moveRight = false;
let jumpRequested = false;
let useTilt = true;

let scrollOffset = 0;
let gravity = 0.5;
let jumpForce = -10;
let acceleration = 5;

let obstacles = [];
let lastObstacleX = 0;
let obstacleSpace = 6
const obstacleSpacing = car.width * obstacleSpace; // distance between obstacles


let keys = {};

// Desktop keys
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// Prevent default long-press behavior on mobile
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
});

// Mobile controls
document.getElementById('leftBtn').addEventListener('touchstart', () => moveLeft = true);
document.getElementById('leftBtn').addEventListener('touchend', () => moveLeft = false);

document.getElementById('rightBtn').addEventListener('touchstart', () => moveRight = true);
document.getElementById('rightBtn').addEventListener('touchend', () => moveRight = false);

document.getElementById('jumpBtn').addEventListener('touchstart', e => {
    e.preventDefault();
    jumpRequested = true;
});


let availableVoices = [];
let speechInitialized = false;

resizeCanvas();

document.addEventListener('click', () => {
    if (!speechInitialized) {
        availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length === 0) {
            setTimeout(() => {
                availableVoices = speechSynthesis.getVoices();
            }, 100);
        }
        const silentMsg = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(silentMsg);
        speechInitialized = true;
        console.log("Speech synthesis initialized.");

        if (assetsLoaded === 2) {
            waitingToStart = false;
            resizeCanvas();
            setupTiltControl();
            requestAnimationFrame(loop);
            sayLetter('Lets Race', 2);
            sayLetter('Jump over all the letters!');
        }
    }
}, { once: true });

function sayLetter(letter, volume = 1, pitch = 1, voiceName = 'Google US English') {
    // Only attempt to speak if speech has been initialized by user interaction
    if (!speechInitialized) {
        console.warn("Speech synthesis not yet initialized by user interaction.");
        return;
    }

    const msg = new SpeechSynthesisUtterance(letter);
    const selectedVoice = availableVoices.find(
        voice => voice.name.includes(voiceName) || voice.lang === "en-US"
    );
    if (selectedVoice) {
        msg.voice = selectedVoice;
    } else {
        // Fallback if specific voice not found (e.g., 'Google US English' not on iOS)
        // iOS often provides "Alex" (en-US), "Samantha" (en-US), etc.
        // You might want to filter by lang: 'en-US' directly if voiceName fails.
        const genericEnglishVoice = availableVoices.find(voice => voice.lang === "en-US");
        if (genericEnglishVoice) {
            msg.voice = genericEnglishVoice;
        } else {
            console.warn("No suitable English voice found. Using default.");
        }
    }
    msg.volume = volume;
    msg.pitch = pitch;

    // Add error handling to see if speaking fails
    msg.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
    };

    window.speechSynthesis.speak(msg);
    console.log("Speaking:", letter, "Voice:", msg.voice ? msg.voice.name : "Default");
}


function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    draw();
    
    // Set car size and position relative to screen
    car.width = canvas.width * 0.20;
    car.height = canvas.height * 0.16;
    car.carStartY = canvas.height * .73;
    
    gravity = canvas.height * 0.0004;
    jumpForce = -canvas.height * 0.02;
    acceleration = canvas.width * 0.004;
    
    // If car was on ground, update position to match new ground height
    if (car.onGround) {
        car.y = car.carStartY;
    }
}

function update(deltaTime = 1) {
    const scrollSpeed = 2 * deltaTime;
    scrollOffset += scrollSpeed;

    // Movement input
    if (moveLeft) car.x -= 3 * deltaTime;
    if (moveRight) car.x += 3 * deltaTime;

    car.x += car.velocityX * deltaTime;

    // Gravity and vertical movement
    if (!car.onGround) {
        car.velocityY += gravity * deltaTime;
        car.y += car.velocityY * deltaTime;
        if (car.y >= car.carStartY) {
            car.y = car.carStartY;
            car.onGround = true;
            car.velocityY = 0;
        }
    }

    // Jump input (desktop or mobile)
    if ((keys['ArrowUp'] || jumpRequested) && car.onGround) {
        car.velocityY = jumpForce;
        car.onGround = false;
        jumpRequested = false;
    }

    // accelerate left/right input
    car.velocityX = 0;
    if (keys['ArrowRight'] && car.onGround) car.velocityX = acceleration;
    if (keys['ArrowLeft'] && car.onGround) car.velocityX = -acceleration;

    car.x += car.velocityX;

    // Clamp car within screen bounds
    car.x = Math.max(0, Math.min(canvas.width - car.width, car.x));

    // Move obstacle left with world scroll
    obstacles.forEach((obstacle) => {
        obstacle.x -= scrollSpeed;
        // ...
    });


    if (scrollOffset - lastObstacleX > obstacleSpacing) {
        const newObstacle = {
            x: canvas.width + scrollOffset,
            y: car.carStartY + car.height * 0.9, // aligned with ground
            width: canvas.width * 0.1,
            height: 50,
            hit: false,
            jumped: false,
            char: String.fromCharCode(65 + Math.floor(Math.random() * 26))
        };
        obstacles.push(newObstacle);
        lastObstacleX = scrollOffset;
    }


    obstacles.forEach((obstacle) => {
        obstacle.x -= scrollSpeed;

        if (
            !obstacle.hit &&
            car.x + car.width < obstacle.x + obstacle.width &&
            car.x + car.width > obstacle.x &&
            car.y < obstacle.y + obstacle.height &&
            car.y + car.height > obstacle.y
        ) {
            obstacle.hit = true;
            car.x = 0;
        }

        if (
            !obstacle.hit &&
            !obstacle.jumped &&
            car.x + car.width > obstacle.x + obstacle.width &&
            car.y + car.height <= obstacle.y
        ) {
            obstacle.jumped = true;
            car.spinOut = true; // optional: fun spin on success
            sayLetter(obstacle.char.toLowerCase());
        }
    });

    obstacles = obstacles.filter(ob => ob.x + ob.width > 0);

    if (car.spinOut) {
        car.spinAngle += 0.1; // control spin speed
        if (car.spinAngle >= Math.PI * 2) {
            car.spinAngle = 0;
            car.spinOut = false; // reset after full spin
        }
    }

}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background looping
    const bgWidth = canvas.width; // or use bgImg.width if your image has a fixed width

    const bgX = -(scrollOffset % bgWidth);
    ctx.drawImage(bgImg, bgX, 0, bgWidth, canvas.height);
    ctx.drawImage(bgImg, bgX + bgWidth -1, 0, bgWidth, canvas.height);

    if (waitingToStart) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${canvas.height * 0.15}px "Fredoka One", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Lets Race!', canvas.width / 2, canvas.height / 2);
        return;
    }

    drawCar();

    const fontSize = canvas.height * 0.15;


    // Obstacles
    ctx.fillStyle = 'red';
    ctx.font = `bold ${fontSize}px "Fredoka One", sans-serif`;

    obstacles.forEach((obstacle) => {
        ctx.fillText(obstacle.char, obstacle.x, obstacle.y);
    });

}


let lastTime = 0;

function loop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 16.67; // 60 FPS baseline
    lastTime = timestamp;

    update(deltaTime);
    draw();
    requestAnimationFrame(loop);
}


function setupTiltControl() {
    if (window.DeviceOrientationEvent && useTilt) {
        window.addEventListener('deviceorientation', (e) => {
            const tiltLR = e.gamma;

            if (tiltLR < -5) {
                moveLeft = true;
                moveRight = false;
            } else if (tiltLR > 5) {
                moveRight = true;
                moveLeft = false;
            } else {
                moveLeft = false;
                moveRight = false;
            }
        }, { once: true }); // Use once to avoid duplicates
    }
}

// Initial setup
window.addEventListener('resize', resizeCanvas);


let assetsLoaded = 0;

function startGameWhenReady() {
    assetsLoaded++;
    if (assetsLoaded === 2) {
        if (speechInitialized) {
            resizeCanvas();
            setupTiltControl();
            requestAnimationFrame(loop);
            sayLetter('Lets Race', 2);
            sayLetter('Jump over all the letters!');
        }
    }
    console.log("Assets loaded:", assetsLoaded);
}


carSpriteSheet.onload = startGameWhenReady;
bgImg.onload = startGameWhenReady;

