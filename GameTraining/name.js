// Game configuration
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight;
const PLAYER_RADIUS = 10;
const MAX_PLAYER_SPEED = 5;
const INITIAL_BLOB_COUNT = 30;
const INITIAL_ENEMY_COUNT = 3;
const BLOB_RADIUS_MIN = 5;
const BLOB_RADIUS_MAX = 15;
const SPEED_BOOST_FACTOR = 2; // Speed boost factor when clicking the mouse button
const BOUNCING_BLOB_RADIUS = 20;
const BOUNCING_BLOB_HITS = 3;
const GAME_BORDERS=200; //how many points borders are far from (0,0) left right corner
let functionCalled = false;

const fullScreen = document.getElementById('fullscreen');
fullScreen.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});
// Create the game canvas
const canvas = document.createElement('canvas');
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
document.getElementById('gameCanvas').appendChild(canvas);

// Get the canvas 2D context
const context = canvas.getContext('2d');

// Reference to the mass display element
const massDisplay = document.getElementById('massDisplay');

var upgradeButtons = document.getElementById('updateButtons');
var isUpgradeVisible = false;

// Apply CSS styles to the mass display element
massDisplay.style.position = 'absolute';
massDisplay.style.top = '10px';
massDisplay.style.left = '10px';
massDisplay.style.fontFamily = 'Arial, sans-serif';
massDisplay.style.fontSize = '18px';
massDisplay.style.color = 'black';

// Player object
const player = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  radius: PLAYER_RADIUS,
  score: 0,
  color: '#FF0000',
  speed: 0,
  isBoosting: false,
  rotation: 0, // Current rotation angle of the player
  playerType: 0,
  maxHP: 2,
  currentHP: 2,
  isDead: false,
  tier: 1,
  availableUpgrades: [101,102,103,201,202,301]
};

function triggerAbility() {
  switch (player.playerType) {
    case 101:
      // Default ability code
      player.color="#FFA500";
      console.log("Default ability triggered");
      break;
    case 102:
      // Type 1 ability code
      player.color="#FFA5FF";
      console.log("Type 1 ability triggered");
      break;
    case 103:
      // Type 2 ability code
      player.color="#FFFFFF";
      console.log("Type 2 ability triggered");
      break;
    default:
      // Default case for unknown player types
      player.color="#000000";
      console.log("Unknown player type");
      break;
  }
}

// Enemy object
const enemies = [];
// Edible enemies
const edibleEnemies = [];

// Blob object
const blobs = [];

// Bouncing Blob object
const bouncingBlobs = [];

// Camera object
const camera = {
  x: 0,
  y: 0,
};

// Enemy class
class Enemy {
  constructor(x, y, radius, maxHits) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = "#541E1B";
    this.speed = randomRange(1, 3);
    this.directionX = randomRange(-1, 1);
    this.directionY = randomRange(-1, 1);
    this.hits = 0;
    this.maxHits = maxHits||Infinity;
    this.isDestroyed = false;
  }

  update() {
    if (this.isDestroyed) return;

    this.x += this.directionX * this.speed;
    this.y += this.directionY * this.speed;

    // Check collision with player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < player.radius + this.radius) {
      this.bounce();
      this.hits++;
      player.currentHP--;
      if (this.hits >= this.maxHits) {
        this.destroy();
      }
    }

    // Check collision with boundaries
    if (
      this.x + this.radius >= GAME_WIDTH ||
      this.x - this.radius <= -200
    ) {
      this.directionX *= -1;
    }
    if (
      this.y + this.radius >= GAME_HEIGHT ||
      this.y - this.radius <= -200
    ) {
      this.directionY *= -1;
    }
  }

  bounce() {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const angle = Math.atan2(dy, dx);
    const targetX = Math.cos(angle);
    const targetY = Math.sin(angle);
    this.directionX = targetX;
    this.directionY = targetY;
  }

  draw() {
    if (this.isDestroyed) return;

    context.beginPath();
    context.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = this.color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#000000';
    context.stroke();
  }

  destroy() {
    this.isDestroyed = true;
  }
}

function checkScore() {
  if (player.score >= 10 && !functionCalled) {
    // Call your function here
    showUpgradePopup();

    // Set the flag to true to indicate that the function has been called
    functionCalled = true;
  }
}

// Update the player's mass display
function updateMassDisplay() {
  massDisplay.textContent = `Mass: ${player.score}`;
}



// Update enemies
function updateEnemies(enemyList) {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemyList[i];
    enemy.update();
  }
}

// Draw enemies
function drawEnemies(enemyList) {
  for (let i = 0; i < enemies.length; i++) {
    var enemy = enemyList[i];
    enemy.draw();
  }
}



class EdibleEnemy extends Enemy{
  constructor(x, y, radius) {
    super(x, y, radius);
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = "#5DBB63";
    this.speed = randomRange(1, 3);
    this.directionX = randomRange(-1, 1);
    this.directionY = randomRange(-1, 1);
    this.hits = 0;
    this.maxHits = 3;
    this.isDestroyed = false;
  }
  


}


// Generate random new enemies
function generateEnemies(count, enemyType, enemyList) {
  for (let i = 0; i < count; i++) {
    const x = randomRange(0, GAME_WIDTH);
    const y = randomRange(0, GAME_HEIGHT);
    const radius = randomRange(BLOB_RADIUS_MIN, BLOB_RADIUS_MAX);
    enemyList.push(new enemyType(x, y, radius));
  }
}

// Update player position
function updatePlayerPosition() {
  let speed = player.speed;
  if (player.isBoosting) {
    speed *= SPEED_BOOST_FACTOR;
  }

  const newX = player.x + player.directionX * speed;
  const newY = player.y + player.directionY * speed;

  // Check if the new position is within the game boundaries
  if (newX - player.radius > -GAME_BORDERS && newX + player.radius < GAME_WIDTH) {
    player.x = newX;
  }
  if (newY - player.radius > -GAME_BORDERS && newY + player.radius < GAME_HEIGHT) {
    player.y = newY;
  }
  updateMassDisplay();
}

// Calculate player speed based on distance
function calculatePlayerSpeed(distance) {
  const maxDistance = Math.sqrt(GAME_WIDTH * GAME_WIDTH/4 + GAME_HEIGHT * GAME_HEIGHT/4);
  const normalizedDistance = distance / maxDistance;

  // Define the distance at which the player reaches the maximum speed
  const maxSpeedDistance = 150; // Adjust this value as desired

  let speed;

  // Use a square function to increase the speed gradually and then reach maximum speed
  if (distance < maxSpeedDistance) {
    speed = (normalizedDistance) * MAX_PLAYER_SPEED;
  } else {
    speed = MAX_PLAYER_SPEED/5;
  }

  player.speed = speed;
}

// Update camera position
function updateCameraPosition() {
  camera.x = player.x - GAME_WIDTH / 2;
  camera.y = player.y - GAME_HEIGHT / 2;
}

// Draw the player on the canvas
function drawPlayer() {
  context.save(); // Save the current canvas state
  context.translate(player.x - camera.x, player.y - camera.y); // Translate the canvas to the player's position
  context.rotate(player.rotation); // Rotate the canvas to match the player's rotation

  // Draw the player circle
  context.beginPath();
  context.arc(0, 0, player.radius, 0, 2 * Math.PI, false);
  context.fillStyle = player.color;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = '#000000';
  context.stroke();

  // Draw the mark indicating the direction the player is looking
  context.beginPath();
  context.moveTo(0, 0); // Start from the center of the player
  context.lineTo(player.radius, 0); // Draw a line in the direction the player is looking
  context.lineWidth = 2;
  context.strokeStyle = '#000000';
  context.stroke();

  context.restore(); // Restore the previous canvas state
}

// Update player rotation
function updatePlayerRotation() {
  player.rotation = Math.atan2(player.directionY, player.directionX);
}

// Draw grid lines on the canvas
function drawGrid() {
  context.beginPath();
  for (let x = -GAME_WIDTH; x <= GAME_WIDTH * 2; x += 20) {
    context.moveTo(x - camera.x, -camera.y - GAME_HEIGHT);
    context.lineTo(x - camera.x, GAME_HEIGHT * 2 - camera.y);
  }
  for (let y = -GAME_HEIGHT; y <= GAME_HEIGHT * 2; y += 20) {
    context.moveTo(-camera.x - GAME_WIDTH, y - camera.y);
    context.lineTo(GAME_WIDTH * 2 - camera.x, y - camera.y);
  }
  context.strokeStyle = '#CCCCCC';
  context.stroke();
}

// Draw borders on the canvas
function drawBorders() {
  context.beginPath();
  context.lineWidth = 2;
  context.strokeStyle = '#000000';
  context.rect(-GAME_BORDERS - camera.x, -GAME_BORDERS - camera.y, GAME_WIDTH+GAME_BORDERS, GAME_HEIGHT+GAME_BORDERS);
  context.stroke();
}

// Draw blobs on the canvas
class Blob {
  constructor(x, y, radius, color, speed, MaxHP) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.speed = speed;
    this.MaxHP = MaxHP;
    this.currentHP = MaxHP;
    this.isDamaged = false;
    this.directionX = 0;
    this.directionY = 0;
    this.damageTimer = 0;
  }

  update() {
    // Update the position of the blob based on its speed and direction
    this.x += this.directionX * this.speed;
    this.y += this.directionY * this.speed;
    if (this.isDamaged) {
      this.damageTimer -= deltaTime;

      if (this.damageTimer <= 0) {
        this.isDamaged = false;
      }
    }
  }

  draw() {
    // Draw the blob on the canvas
    context.beginPath();
    context.arc(this.x-camera.x, this.y-camera.y, this.radius, 0, 2 * Math.PI, false);
    context.fillStyle = this.color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#000000';
    context.stroke();
  }

  collide(player) {
    // Check if the blob collides with the player
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.radius + player.radius && !this.isDamaged) {
      // Apply collision response
      const angle = Math.atan2(dy, dx);
      const targetX = this.x + Math.cos(angle) * 10;
      const targetY = this.y + Math.sin(angle) * 10;

      this.x = targetX;
      this.y = targetY;

      // Inflict damage on the blob
      this.currentHP--;
      this.isDamaged = true;
      this.damageTimer = this.damageDelay;

      if (this.currentHP <= 0) {
        // Blob is destroyed
        this.destroy();
      }
    }
  }
}

function drawBlobs(){
  blobs.forEach(function(blob){
    blob.draw()
  }
  )
}

// Draw bouncing blobs on the canvas
function drawBouncingBlobs() {
  for (let i = 0; i < bouncingBlobs.length; i++) {
    const bouncingBlob = bouncingBlobs[i];
    context.beginPath();
    context.arc(
      bouncingBlob.x - camera.x,
      bouncingBlob.y - camera.y,
      bouncingBlob.radius,
      0,
      2 * Math.PI,
      false
    );
    context.fillStyle = bouncingBlob.color;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = '#000000';
    context.stroke();
  }
}

// Clear the canvas
function clearCanvas() {
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}



// Generate random number within a range
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate random blobs
function generateBlobs(count) {
  for (let i = 0; i < count; i++) {
    const x = randomRange(0, GAME_WIDTH);
    const y = randomRange(0, GAME_HEIGHT);
    const radius = randomRange(BLOB_RADIUS_MIN, BLOB_RADIUS_MAX);
    const color = '#00FF00';
    blobs.push(new Blob(x, y, radius, color));
  }
}

// Generate bouncing blobs
function generateBouncingBlobs(count) {
  for (let i = 0; i < count; i++) {
    const x = randomRange(0, GAME_WIDTH);
    const y = randomRange(0, GAME_HEIGHT);
    const radius = BOUNCING_BLOB_RADIUS;
    const color = '#0000FF';
    bouncingBlobs.push({ x, y, radius, color, hits: BOUNCING_BLOB_HITS });
  }
}

// Check collision between player and blobs
function checkCollision() {
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const dx = player.x - blob.x;
    const dy = player.y - blob.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < player.radius + blob.radius) {
      player.score++;
      player.radius += blob.radius / 10; // Increase player radius
      blobs.splice(i, 1); // Remove the eaten blob
      
    }
  }

  for (let i = 0; i < bouncingBlobs.length; i++) {
    const bouncingBlob = bouncingBlobs[i];
    const dx = player.x - bouncingBlob.x;
    const dy = player.y - bouncingBlob.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < player.radius + bouncingBlob.radius) {
      // Bounce off the player
      bouncingBlob.x += dx / distance * (player.radius + bouncingBlob.radius - distance);
      bouncingBlob.y += dy / distance * (player.radius + bouncingBlob.radius - distance);

      bouncingBlob.hits--;
      if (bouncingBlob.hits <= 0) {
        player.radius += bouncingBlob.radius / 10; // Increase player radius
        bouncingBlobs.splice(i, 1); // Remove the eaten bouncing blob
      }
    }
  }
}

// Update bouncing blob positions
function updateBouncingBlobPositions() {
  for (let i = 0; i < bouncingBlobs.length; i++) {
    const bouncingBlob = bouncingBlobs[i];
    bouncingBlob.x += randomRange(-2, 2);
    bouncingBlob.y += randomRange(-2, 2);

    // Check if the bouncing blob hits the game boundaries
    if (
      bouncingBlob.x - bouncingBlob.radius < -2000 ||
      bouncingBlob.x + bouncingBlob.radius > GAME_WIDTH
    ) {
      bouncingBlob.x -= randomRange(-2, 2);
    }
    if (
      bouncingBlob.y - bouncingBlob.radius < -2000 ||
      bouncingBlob.y + bouncingBlob.radius > GAME_HEIGHT
    ) {
      bouncingBlob.y -= randomRange(-2, 2);
    }
  }
}

function drawScore() {
  scoreContext.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  scoreContext.fillStyle = '#ffffff';
  scoreContext.font = '24px Arial';
  scoreContext.fillText(`Score: ${score}`, 10, 30);
}

function showUpgradePopup() {
  upgradeButtons.style.display = "flex"; // Show the 
  let numBoxes = 0
  player.availableUpgrades.forEach(function(upgradeCode){
    if(upgradeCode-player.tier*100>0&&upgradeCode-player.tier*100<100){
      numBoxes++;
    }
  })
  for (var i = 0; i < numBoxes; i++) {
    var box = document.createElement("div");
    box.className = "box";
    box.textContent = i + 1; // Example: Display box number
    upgradeButtons.appendChild(box);

    box.addEventListener("click", function() {
      performUpgrade(box.textContent)
    });
  }
}

function performUpgrade(choice) {
  player.playerType=player.tier*100+parseInt(choice);
  player.tier++;
  upgradeButtons.style.display = "none"; // Hide the upgrade section
  // Perform the necessary upgrade logic based on the selected choice
  // ...
}

function drawMap(){
  drawGrid();
  drawBorders();
}

function generateAllEnemies(){
  generateEnemies(40, Enemy, enemies);
  //generateEnemies(5, EdibleEnemy, edibleEnemies);
}

function updateAllEnemies(){
  updateEnemies(enemies);
  //updateEnemies(edibleEnemies);
}

function drawAllEnemies(){
  drawEnemies(enemies);
  //drawEnemies(edibleEnemies);
}

function playAnimation(x, y) {
  const animationImages = [
    'image1.png',
    'image2.png',
    'image3.png',
    'image4.png',
    'image5.png',
    'image6.png',
    'image7.png',

    // Add more image URLs as needed
  ];

  let currentImageIndex = 0;
  const animationInterval = setInterval(() => {
    const image = new Image();
    image.src = animationImages[currentImageIndex];
    image.onload = () => {
      context.drawImage(image, x, y);
    };

    currentImageIndex++;
    if (currentImageIndex >= animationImages.length) {
      clearInterval(animationInterval);
    }
  }, 200); // Adjust the interval duration as needed
}



// Game loop
function gameLoop() {
  if(player.currentHP<=0){
    return;
  }
  clearCanvas();
  updateMassDisplay();
  updatePlayerPosition();
  updateAllEnemies();
  updateCameraPosition();
  updateBouncingBlobPositions();
  drawGrid();
  drawBlobs();
  drawBouncingBlobs();
  drawPlayer();
  drawAllEnemies();
  drawBorders();
  checkCollision();
  checkScore();
  requestAnimationFrame(gameLoop);
}

const maxDistance = 30; // Maximum distance to stop increasing
const minDistance = 10; // Minimum distance to turn to zero

// Handle mouse move event
function handleMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left + camera.x;
  const mouseY = event.clientY - rect.top + camera.y;
  const dx = mouseX - player.x;
  const dy = mouseY - player.y;
  let distance = Math.sqrt(dx * dx + dy * dy);
  player.directionX = dx / distance;
  player.directionY = dy / distance;
  calculatePlayerSpeed(distance);
  updatePlayerRotation();
}

// Handle mouse down event
function handleMouseDown(event) {
  if (event.button === 0) {
    player.isBoosting = true;
  }
  if (event.button===2){
    const x = event.clientX - canvas.offsetLeft + camera.x;
    const y = event.clientY - canvas.offsetTop + camera.y;
    createBlob(x, y);
    triggerAbility();
  }
}
function createBlob(x, y) {
  const radius = 20; // Adjust the radius as needed
  const color = 'red'; // Adjust the color as needed
  blobs.push(new Blob(x, y, radius, color ));
  //const newBlob = new Blob(x, y, radius, color);
  // Add the new blob to your game logic or data structure
}
// Handle mouse up event
function handleMouseUp(event) {
  if (event.button === 0) {
    player.isBoosting = false;
  }
  if (event.button===2){
    player.color="#FF0000";
  }
}

// Bind mouse move event to the canvas
canvas.addEventListener('mousemove', handleMouseMove);

// Bind mouse down event to the canvas
canvas.addEventListener('mousedown', handleMouseDown);

// Bind mouse up event to the canvas
canvas.addEventListener('mouseup', handleMouseUp);

// Generate initial blobs
generateBlobs(INITIAL_BLOB_COUNT);
// Generate initial bouncing blobs
generateBouncingBlobs(10);
// Generate initial enemies
generateAllEnemies();

// Start the game loop
gameLoop();