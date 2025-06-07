const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load assets
const carImg = new Image();
carImg.src = 'images/car.png';

const bgImg = new Image();
bgImg.src = 'images/background.png';

// Car object
let car = {
    x: 100,
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
let boostForce = 5;

let obstacles = [];
let lastObstacleX = 0;
const obstacleSpacing = 600; // distance between obstacles


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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set car size and position relative to screen
    car.width = canvas.width * 0.10;
    car.height = canvas.height * 0.08;
    car.carStartY = canvas.height * 0.80;
    
    gravity = canvas.height * 0.0004;
    jumpForce = -canvas.height * 0.02;
    boostForce = canvas.width * 0.004;
    
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

    // Boost left/right input
    car.velocityX = 0;
    if (keys['ArrowRight'] && car.onGround) car.velocityX = boostForce;
    if (keys['ArrowLeft'] && car.onGround) car.velocityX = -boostForce;

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
            y: car.carStartY + car.height - 50, // aligned with ground
            width: 50,
            height: 50,
            hit: false
        };
        obstacles.push(newObstacle);
        lastObstacleX = scrollOffset;
    }


    obstacles.forEach((obstacle) => {
        obstacle.x -= scrollSpeed;

        if (
            !obstacle.hit &&
            car.x < obstacle.x + obstacle.width &&
            car.x + car.width > obstacle.x &&
            car.y < obstacle.y + obstacle.height &&
            car.y + car.height > obstacle.y
        ) {
            car.spinOut = true;
            obstacle.hit = true;
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background looping
    const bgWidth = canvas.width; // or use bgImg.width if your image has a fixed width

    const bgX = -(scrollOffset % bgWidth);
    ctx.drawImage(bgImg, bgX, 0, bgWidth, canvas.height);
    ctx.drawImage(bgImg, bgX + bgWidth, 0, bgWidth, canvas.height);


    // Car (with spin-out support)
    ctx.save();
    ctx.translate(car.x + car.width / 2, car.y + car.height / 2);
    if (car.spinOut) {
        ctx.rotate(car.spinAngle);
    }
    ctx.drawImage(carImg, -car.width / 2, -car.height / 2, car.width, car.height);
    ctx.restore();

    // Obstacles
    ctx.fillStyle = 'red';
    obstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
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
        resizeCanvas();
        setupTiltControl();
        requestAnimationFrame(loop);
    }
}

carImg.onload = startGameWhenReady;
bgImg.onload = startGameWhenReady;

