const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기를 브라우저 창 크기에 맞게 설정하는 함수
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 초기 캔버스 크기 설정
resizeCanvas();

// 창 크기 변경 시 캔버스 크기 업데이트
window.addEventListener('resize', () => {
    resizeCanvas();
    generateMap(); // 필요시 맵 재생성 또는 조정
});

// HUD 요소
const healthElem = document.getElementById('health');
const hungerElem = document.getElementById('hunger');
const sleepElem = document.getElementById('sleep');
const timeElem = document.getElementById('time');
const weaponElem = document.getElementById('weapon');
const inventoryList = document.getElementById('inventory-list');
const mapXElem = document.getElementById('map-x');
const mapYElem = document.getElementById('map-y');
const survivorZoneElem = document.getElementById('survivor-zone');
const zoneXElem = document.getElementById('zone-x');
const zoneYElem = document.getElementById('zone-y');
const levelElem = document.getElementById('level');
const experienceElem = document.getElementById('experience');

// 시작 화면 및 재시작 버튼
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameContainer = document.getElementById('game-container');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const difficultySelect = document.getElementById('difficulty');

// 사운드 요소
const backgroundMusic = document.getElementById('background-music');
const attackSound = new Audio('assets/sounds/attack.mp3');
const zombieAttackSound = new Audio('assets/sounds/zombie_attack.mp3');

// 이미지 로딩
const images = {};
const imageSources = {
    player: 'assets/images/player.png',
    zombie: 'assets/images/zombie.png',
    food: 'assets/images/food.png',
    bed: 'assets/images/bed.png',
    knife: 'assets/images/knife.png',
    gun: 'assets/images/gun.png',
    mapItem: 'assets/images/map_item.png',
    wall: 'assets/images/wall.png',
    road: 'assets/images/road.png', // 도로 이미지 추가
    // 추가 이미지가 있다면 여기에 추가
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

for (let key in imageSources) {
    images[key] = new Image();
    images[key].src = imageSources[key];
    images[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            // 모든 이미지가 로드된 후 시작 버튼 활성화
            startButton.disabled = false;
            console.log(`${key} 이미지 로드 완료`);
        }
    };
    images[key].onerror = () => {
        console.error(`${key} 이미지 로드 실패: ${imageSources[key]}`);
    };
}

// 게임 상태
let player;
let zombies = [];
let foods = [];
let beds = [];
let weapons = [];
let mapItems = [];
let walls = [];
let roads = [];
let day = true;
let gameOver = false;

let invincibleDuration = 3000;
let invincibleStartTime = null;

let weather = 'clear'; // 'clear', 'rain', 'snow'
let difficulty = 'normal'; // 'easy', 'normal', 'hard'

// 맵 시스템
let currentMapX = 0;
let currentMapY = 0;
let survivorZone = { x: 0, y: 0 };
let survivorZoneRevealed = false;

// 키 입력 상태
const keys = {};

// 이벤트 리스너
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && player.weapon) {
        useWeapon();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 시작 버튼 클릭 시 게임 시작
startButton.addEventListener('click', () => {
    difficulty = difficultySelect.value;
    startGame();
});

// 재시작 버튼 클릭 시 게임 재시작
restartButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    startGame();
});

// 게임 시작 함수
function startGame() {
    resetGameState();
    setDifficulty(difficulty);

    // 캔버스 크기에 맞춰 플레이어 초기 위치 설정
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    // 생존자 보호 구역 랜덤 설정 (-10 ~ +10 맵)
    survivorZone = {
        x: Math.floor(Math.random() * 21) - 10,
        y: Math.floor(Math.random() * 21) - 10
    };

    startScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    gameOverScreen.style.display = 'none';

    backgroundMusic.volume = 0.5;
    backgroundMusic.play();

    generateMap();
    requestAnimationFrame(gameLoop);
}

// 메시지 표시 함수
function showMessage(text, duration = 2000) { // duration은 밀리초 단위
    const messageElem = document.getElementById('game-message');
    messageElem.textContent = text;
    messageElem.style.display = 'block';

    // 지정된 시간이 지나면 메시지 숨기기
    setTimeout(() => {
        messageElem.style.display = 'none';
    }, duration);
}

function setDifficulty(level) {
    switch(level) {
        case 'easy':
            invincibleDuration = 5000;
            player.speed = 3;
            zombies.forEach(zombie => {
                zombie.speed = 0.3;
                zombie.baseHealth = 50; // 쉬움 난이도 기본 체력
            });
            break;
        case 'normal':
            invincibleDuration = 3000;
            player.speed = 2;
            zombies.forEach(zombie => {
                zombie.speed = 0.5;
                zombie.baseHealth = 70; // 보통 난이도 기본 체력
            });
            break;
        case 'hard':
            invincibleDuration = 2000;
            player.speed = 1.8;
            zombies.forEach(zombie => {
                zombie.speed = 0.7;
                zombie.baseHealth = 90; // 어려움 난이도 기본 체력
            });
            break;
    }
}

// 게임 상태 초기화
function resetGameState() {
    player = {
        x: 50, // 맵 중앙에 위치
        y: 50,
        health: 100,
        hunger: 100,
        sleep: 100,
        speed: 2,
        size: 20,
        invincible: true,
        weapon: null,
        weaponKillCount: 0,
        inventory: [],
        experience: 0,
        level: 1,
        weaponDamageMultiplier: 1
    };
    zombies = [];
    foods = [];
    beds = [];
    weapons = [];
    mapItems = [];
    walls = [];
    roads = [];
    day = true;
    gameOver = false;
    currentMapX = 0;
    currentMapY = 0;
    survivorZoneRevealed = false;
    mapXElem.textContent = currentMapX;
    mapYElem.textContent = currentMapY;
    survivorZoneElem.style.display = 'none';
}

// 좀비 체력 설정 함수
function getZombieHealth() {
    switch(difficulty) {
        case 'easy':
            return 60; // 칼로 3번 공격 시 죽임 (칼 데미지: 20 * 3 = 60)
        case 'normal':
            return 100; // 예: 일반 난이도에서 좀비 체력
        case 'hard':
            return 150; // 예: 어려운 난이도에서 좀비 체력
        default:
            return 100; // 기본값
    }
}

const ZOMBIE_TYPES = {
    STANDARD: 'standard',
    FAST: 'fast',
    TANK: 'tank',
    RANGED: 'ranged'
};

// 좀비 클래스
class Zombie {
    constructor(x, y, type = ZOMBIE_TYPES.STANDARD) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.type = type;
        this.speed = this.getSpeed();
        this.baseHealth = this.getBaseHealth();
        this.health = this.getInitialHealth();
        this.target = null;
        this.hidden = day;
        this.hitTime = 0;
        this.attackCooldown = 2000; // 공격 쿨타임 (밀리초)
        this.lastAttackTime = 0;
    }

    getSpeed() {
        switch(this.type) {
            case ZOMBIE_TYPES.FAST:
                return 1.0;
            case ZOMBIE_TYPES.TANK:
                return 0.3;
            case ZOMBIE_TYPES.RANGED:
                return 0.5;
            default:
                return 0.5;
        }
    }

    getBaseHealth() {
        switch(this.type) {
            case ZOMBIE_TYPES.FAST:
                return 40;
            case ZOMBIE_TYPES.TANK:
                return 100;
            case ZOMBIE_TYPES.RANGED:
                return 60;
            default:
                return 70;
        }
    }

    getInitialHealth() {
        return this.baseHealth + (player.level * 10);
    }

    update(currentTime) {
        if (!this.hidden) {
            let dx = player.x - this.x;
            let dy = player.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                let moveX = (dx / distance) * this.speed;
                let moveY = (dy / distance) * this.speed;

                // 벽과의 충돌 체크
                if (!isCollision(this.x + moveX, this.y + moveY, this.size, walls)) {
                    this.x += moveX;
                    this.y += moveY;
                }
            }

            // 플레이어와의 충돌
            let dxPlayer = player.x - this.x;
            let dyPlayer = player.y - this.y;
            let distancePlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
            if (distancePlayer < this.size / 2 + player.size / 2 && !player.invincible) {
                // 공격 쿨타임 체크
                if (currentTime - this.lastAttackTime > this.attackCooldown) {
                    player.health -= this.getAttackDamage();
                    this.lastAttackTime = currentTime;

                    zombieAttackSound.currentTime = 0;
                    zombieAttackSound.play();

                    if (player.health <= 0) {
                        gameOver = true;
                        endGame();
                    }
                }
            }
        } else if (!day) {
            this.hidden = false;
        }
    }

    getAttackDamage() {
        switch(this.type) {
            case ZOMBIE_TYPES.FAST:
                return 1.0;
            case ZOMBIE_TYPES.TANK:
                return 2.0;
            case ZOMBIE_TYPES.RANGED:
                return 1.5;
            default:
                return 1.0;
        }
    }

    draw() {
        // 피격 후 일정 시간 동안 빨간색으로 표시
        if (performance.now() - this.hitTime < 200) {
            ctx.filter = 'brightness(150%) sepia(100%) hue-rotate(0deg) saturate(300%)'; // 빨간 필터
        } else {
            ctx.filter = 'none'; // 기본 이미지
        }

        ctx.drawImage(images.zombie, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.filter = 'none'; // 다른 오브젝트에 영향 주지 않도록 필터 제거

        // 헬스 바 그리기
        this.drawHealthBar();
    }

    drawHealthBar() {
        const barWidth = this.size;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 10; // 좀비 이미지 위에 위치

        // 체력 비율 계산
        const healthRatio = Math.max(this.health / this.getInitialHealth(), 0);
        const currentBarWidth = barWidth * healthRatio;

        // 배경 바 (회색)
        ctx.fillStyle = 'gray';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 현재 체력 바 (녹색)
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, currentBarWidth, barHeight);
    }

    takeDamage(damage) {
        this.health -= damage;
        this.hitTime = performance.now(); // 피격 시간 기록
    }

    isDead() {
        return this.health <= 0;
    }
}

// 음식 클래스
class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
    }

    draw() {
        ctx.drawImage(images.food, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

// 침대 클래스
class Bed {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
    }

    draw() {
        ctx.drawImage(images.bed, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}

// 무기 클래스
class Weapon {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.type = type; // 예: 'knife', 'gun'
        this.baseDamage = type === 'knife' ? 20 : 50;
        this.damage = this.baseDamage * player.weaponDamageMultiplier; // 레벨에 따른 데미지 배수 적용
        this.range = type === 'knife' ? 50 : 100;
    }

    draw() {
        ctx.drawImage(images[this.type], this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

// 지도 아이템 클래스
class MapItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
    }

    draw() {
        ctx.drawImage(images.mapItem, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

// 벽 클래스
class Wall {
    constructor(x, y, width, height) {
        this.x = x; // 왼쪽 상단 x
        this.y = y; // 왼쪽 상단 y
        this.width = width;
        this.height = height;
    }

    draw() {
        if (images.wall.complete) { // 이미지가 로드된 경우에만 그리기
            ctx.drawImage(images.wall, this.x, this.y, this.width, this.height);
        } else {
            // 이미지가 로드되지 않았다면 대체 색상으로 그리기
            ctx.fillStyle = 'gray';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // 충돌 감지 함수
    isColliding(objX, objY, objSize) {
        // 원과 사각형의 충돌 체크
        let nearestX = Math.max(this.x, Math.min(objX, this.x + this.width));
        let nearestY = Math.max(this.y, Math.min(objY, this.y + this.height));
        let dx = objX - nearestX;
        let dy = objY - nearestY;
        return (dx * dx + dy * dy) < (objSize / 2) * (objSize / 2);
    }
}

// 도로 클래스
class Road {
    constructor(x, y, width, height) {
        this.x = x; // 왼쪽 상단 x
        this.y = y; // 왼쪽 상단 y
        this.width = width;
        this.height = height;
    }

    draw() {
        // 도로는 회색으로 그리기 (도로 이미지가 있다면 대체)
        if (images.road.complete) {
            ctx.drawImage(images.road, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#555';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// 레벨업 함수 수정
function levelUp() {
    player.level++;
    player.health = Math.min(100, player.health + 20);
    player.speed += 0.1;
    player.weaponDamageMultiplier += 0.2; // 레벨당 데미지 배수 증가
    gainExperience(0); // 경험치 초기화 및 추가 처리
    showMessage(`레벨업! 현재 레벨: ${player.level}`, 2000); 

    // 인벤토리에 있는 무기들의 데미지 업데이트
    player.inventory.forEach(weapon => {
        weapon.damage = weapon.baseDamage * player.weaponDamageMultiplier;
    });

    // 현재 장착된 무기의 데미지도 업데이트
    if (player.weapon) {
        player.weapon.damage = player.weapon.baseDamage * player.weaponDamageMultiplier;
    }
}

// 경험치 시스템 수정
function gainExperience(amount) {
    player.experience += amount;
    if (player.experience >= player.level * 100) {
        player.experience = 0;
        levelUp();
    }
}

// 날씨 효과 적용
function applyWeather() {
    if (weather === 'rain') {
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        player.speed = 1.5;
    } else if (weather === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        player.speed = 1.0;
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
        player.speed = 2;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 무기 사용
let attackEffect = { active: false, x: 0, y: 0, size: 0, duration: 200, startTime: 0 };

// 무기 사용
function useWeapon() {
    if (!player.weapon) return; // 무기가 없으면 공격 불가

    // 현재 레벨에 따른 무기 데미지 계산
    const weaponDamage = player.weapon.baseDamage * player.weaponDamageMultiplier;

    attackSound.currentTime = 0;
    attackSound.play(); // 공격 소리 재생

    zombies.forEach(zombie => {
        let dx = player.x - zombie.x;
        let dy = player.y - zombie.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.weapon.range) { // 무기 사거리 내의 좀비 공격
            zombie.takeDamage(weaponDamage); // 좀비 체력 감소
            zombie.target = { x: player.x, y: player.y }; // 좀비가 플레이어를 타겟으로 설정

            // 공격 이펙트 활성화 (좀비 위치에)
            attackEffect = {
                active: true,
                x: zombie.x,
                y: zombie.y,
                size: 50, // 이펙트 크기
                duration: 200, // 이펙트 지속 시간
                startTime: performance.now()
            };

            if (zombie.isDead()) {
                gainExperience(50); // 좀비 처치 시 경험치 획득
                player.weaponKillCount++; // 무기로 처치한 좀비 수 증가

                // 무기로 두 마리의 좀비를 죽였으면 무기 파괴
                if (player.weaponKillCount >= 2) {
                    removeWeaponFromInventory();
                    player.weapon = null; // 무기 파괴
                    player.weaponKillCount = 0; // 처치 횟수 초기화
                    weaponElem.textContent = '없음'; // HUD에서 무기 표시 제거
                    showMessage('무기가 파괴되었습니다!', 2000);
                }
            }
        }
    });

    // 체력이 다 깎인 좀비는 제거
    zombies = zombies.filter(zombie => !zombie.isDead());
}

// 인벤토리에서 무기를 제거하는 함수
function removeWeaponFromInventory() {
    if (player.weapon) {
        const weaponIndex = player.inventory.indexOf(player.weapon);
        if (weaponIndex > -1) {
            player.inventory.splice(weaponIndex, 1); // 인벤토리에서 무기 제거
            updateInventoryUI(); // 인벤토리 UI 업데이트
        }
    }
}

// 공격 이펙트 그리기 함수
function drawAttackEffect(timestamp) {
    if (!attackEffect.active) return; // 이펙트가 활성화된 상태가 아니면 리턴

    const elapsed = timestamp - attackEffect.startTime;
    if (elapsed < attackEffect.duration) { // 이펙트가 지속 시간 내에 있을 때
        ctx.beginPath();
        ctx.arc(attackEffect.x, attackEffect.y, attackEffect.size, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // 반투명 빨간색 이펙트
        ctx.fill();
    } else {
        attackEffect.active = false; // 이펙트 종료
    }
}

// 방 생성 함수
function createRoom(x, y, width, height, wallThickness = 10, entranceSize = 30) {
    // 입구가 위치할 벽의 방향을 랜덤하게 선택 (0: 상, 1: 하, 2: 좌, 3: 우)
    const entranceSide = Math.floor(Math.random() * 4);

    switch (entranceSide) {
        case 0: // 상단에 입구
            // 상단 왼쪽 벽
            walls.push(new Wall(x, y, (width - entranceSize) / 2, wallThickness));
            // 상단 오른쪽 벽
            walls.push(new Wall(x + (width + entranceSize) / 2, y, (width - entranceSize) / 2, wallThickness));
            // 하단 벽
            walls.push(new Wall(x, y + height - wallThickness, width, wallThickness));
            // 좌측 벽
            walls.push(new Wall(x, y, wallThickness, height));
            // 우측 벽
            walls.push(new Wall(x + width - wallThickness, y, wallThickness, height));
            break;
        case 1: // 하단에 입구
            // 상단 벽
            walls.push(new Wall(x, y, width, wallThickness));
            // 하단 왼쪽 벽
            walls.push(new Wall(x, y + height - wallThickness, (width - entranceSize) / 2, wallThickness));
            // 하단 오른쪽 벽
            walls.push(new Wall(x + (width + entranceSize) / 2, y + height - wallThickness, (width - entranceSize) / 2, wallThickness));
            // 좌측 벽
            walls.push(new Wall(x, y, wallThickness, height));
            // 우측 벽
            walls.push(new Wall(x + width - wallThickness, y, wallThickness, height));
            break;
        case 2: // 좌측에 입구
            // 상단 벽
            walls.push(new Wall(x, y, width, wallThickness));
            // 하단 벽
            walls.push(new Wall(x, y + height - wallThickness, width, wallThickness));
            // 좌측 위쪽 벽
            walls.push(new Wall(x, y, wallThickness, (height - entranceSize) / 2));
            // 좌측 아래쪽 벽
            walls.push(new Wall(x, y + (height + entranceSize) / 2, wallThickness, (height - entranceSize) / 2));
            // 우측 벽
            walls.push(new Wall(x + width - wallThickness, y, wallThickness, height));
            break;
        case 3: // 우측에 입구
            // 상단 벽
            walls.push(new Wall(x, y, width, wallThickness));
            // 하단 벽
            walls.push(new Wall(x, y + height - wallThickness, width, wallThickness));
            // 좌측 벽
            walls.push(new Wall(x, y, wallThickness, height));
            // 우측 위쪽 벽
            walls.push(new Wall(x + width - wallThickness, y, wallThickness, (height - entranceSize) / 2));
            // 우측 아래쪽 벽
            walls.push(new Wall(x + width - wallThickness, y + (height + entranceSize) / 2, wallThickness, (height - entranceSize) / 2));
            break;
    }

    // 방 내부에 침대 배치 (방 중앙에 배치)
    beds.push(new Bed(x + width / 2, y + height / 2));
}

// 방이 기존의 벽이나 도로와 겹치는지 확인하는 함수
function isRoomOverlapping(x, y, width, height) {
    for (let wall of walls) {
        if (
            x < wall.x + wall.width &&
            x + width > wall.x &&
            y < wall.y + wall.height &&
            y + height > wall.y
        ) {
            return true; // 겹침
        }
    }
    return false; // 겹치지 않음
}


// 맵 생성
// 맵 생성
function generateMap() {
    // 아이템 초기화
    zombies = [];
    foods = [];
    beds = [];
    weapons = [];
    mapItems = [];
    walls = [];
    roads = [];

    // 벽과 도로 생성 (도시 형태)
    createWallsAndRoads();

    // 방 생성
    const roomCount = 3; // 생성할 방의 수 (예: 3개)
    for (let i = 0; i < roomCount; i++) {
        const roomWidth = 200; // 방의 너비
        const roomHeight = 150; // 방의 높이
        let pos;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            pos = getRandomPositionAvoidingWallsAndRoads(roomWidth, roomHeight);
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('방 생성 실패: 최대 시도 횟수 초과');
                break;
            }
        } while (isRoomOverlapping(pos.x, pos.y, roomWidth, roomHeight));

        if (pos) {
            createRoom(pos.x, pos.y, roomWidth, roomHeight);
        }
    }

    // 음식 생성
    for (let i = 0; i < 5; i++) { // 월드 확장에 맞게 음식 증가
        let pos = getRandomPositionAvoidingWallsAndRoads();
        foods.push(new Food(pos.x, pos.y));
    }

    // 무기 생성
    const weaponTypes = ['knife', 'gun'];
    for (let i = 0; i < 3; i++) { // 무기 증가
        let type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        let pos = getRandomPositionAvoidingWallsAndRoads();
        weapons.push(new Weapon(pos.x, pos.y, type));
    }

    // 지도 아이템 생성 (20% 확률)
    if (Math.random() < 0.2) { 
        let pos = getRandomPositionAvoidingWallsAndRoads();
        mapItems.push(new MapItem(pos.x, pos.y));
    }
    // 좀비 생성
    const zombieCount = 30; // 좀비 수 증가
    const spawnDistance = 300;
    for (let i = 0; i < zombieCount; i++) {
        let x, y, distance;
        do {
            let pos = getRandomPositionAvoidingWallsAndRoads();
            x = pos.x;
            y = pos.y;
            let dx = player.x - x;
            let dy = player.y - y;
            distance = Math.sqrt(dx * dx + dy * dy);
        } while (distance < spawnDistance || isPointInsideWall(x, y) || isPointInsideRoad(x, y));

        // 좀비 유형 랜덤 선택
        let type;
        const rand = Math.random();
        if (rand < 0.5) {
            type = ZOMBIE_TYPES.STANDARD;
        } else if (rand < 0.7) {
            type = ZOMBIE_TYPES.FAST;
        } else if (rand < 0.9) {
            type = ZOMBIE_TYPES.TANK;
        } else {
            type = ZOMBIE_TYPES.RANGED;
        }

        zombies.push(new Zombie(x, y, type));
    }
}
// 벽과 도로 생성 함수 (도시 형태)
function createWallsAndRoads() {
    walls = [];
    roads = [];

    // 랜덤하게 도로 방향 결정 (수평 또는 수직)
    const horizontalRoad = Math.random() > 0.5;
    const verticalRoad = !horizontalRoad;

    // 맵 중앙을 통과하는 도로 생성
    if (horizontalRoad) {
        roads.push(new Road(0, canvas.height / 2 - 10, canvas.width, 20)); // 수평 도로
    }
    if (verticalRoad) {
        roads.push(new Road(canvas.width / 2 - 10, 0, 20, canvas.height)); // 수직 도로
    }

    // 추가 도로 생성 (랜덤)
    const additionalRoads = Math.floor(Math.random() * 2); // 추가로 0~1개의 도로 생성
    for (let i = 0; i < additionalRoads; i++) {
        if (Math.random() > 0.5) {
            // 수평 도로
            let y = Math.random() * (canvas.height - 20);
            roads.push(new Road(0, y, canvas.width, 20));
        } else {
            // 수직 도로
            let x = Math.random() * (canvas.width - 20);
            roads.push(new Road(x, 0, 20, canvas.height));
        }
    }

    // 건물 벽 생성 (도로를 피해 랜덤하게 배치)
    const wallCount = Math.floor(Math.random() * 5) + 5; // 5~9개의 벽 생성
    for (let i = 0; i < wallCount; i++) {
        let width = Math.floor(Math.random() * 80) + 40; // 40~120
        let height = Math.floor(Math.random() * 80) + 40; // 40~120
        let pos = getRandomPositionAvoidingWallsAndRoads(width, height);
        walls.push(new Wall(pos.x, pos.y, width, height));
    }
}

// 랜덤 위치 생성 시 벽과 도로를 피하도록 함
function getRandomPositionAvoidingWallsAndRoads(width = 20, height = 20) {
    let x, y, colliding;
    do {
        x = Math.random() * (canvas.width - width - 20) + 10; // 여유 공간 확보
        y = Math.random() * (canvas.height - height - 20) + 10;
        colliding = isPointInsideWall(x, y) || isPointInsideRoad(x, y);
    } while (colliding);
    return { x, y };
}


// 특정 지점이 벽 내부에 있는지 확인
function isPointInsideWall(x, y) {
    for (let wall of walls) {
        if (x >= wall.x && x <= wall.x + wall.width &&
            y >= wall.y && y <= wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

// 특정 지점이 도로 내부에 있는지 확인
function isPointInsideRoad(x, y) {
    for (let road of roads) {
        if (x >= road.x && x <= road.x + road.width &&
            y >= road.y && y <= road.y + road.height) {
            return true;
        }
    }
    return false;
}

// 날씨 변경
function changeWeather() {
    const weatherTypes = ['clear', 'rain', 'snow'];
    weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
}

// 60초마다 날씨 변경
setInterval(changeWeather, 60000);

// 플레이어 이동
function movePlayer() {
    let newX = player.x;
    let newY = player.y;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        newY -= player.speed;
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        newY += player.speed;
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        newX -= player.speed;
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        newX += player.speed;
    }

    // 맵 경계 체크 및 맵 이동
    let moved = false;
    if (newX < 0) {
        currentMapX -= 1;
        newX = canvas.width;
        moved = true;
    } else if (newX > canvas.width) {
        currentMapX += 1;
        newX = 0;
        moved = true;
    }

    if (newY < 0) {
        currentMapY -= 1;
        newY = canvas.height;
        moved = true;
    } else if (newY > canvas.height) {
        currentMapY += 1;
        newY = 0;
        moved = true;
    }

    // 벽과의 충돌 체크
    if (!isCollision(newX, newY, player.size, walls)) {
        player.x = newX;
        player.y = newY;
    }

    if (moved) {
        mapXElem.textContent = currentMapX;
        mapYElem.textContent = currentMapY;
        generateMap();
        checkSurvivorZone();
    }
}

// 생존자 보호 구역 도달 체크
function checkSurvivorZone() {
    if (currentMapX === survivorZone.x && currentMapY === survivorZone.y) {
        gameOver = true;
        endGame(true); // 클리어로 처리
    }
}

// 충돌 체크 함수 (플레이어 및 좀비용)
function isCollision(x, y, size, wallsArray) {
    for (let wall of wallsArray) {
        // 원과 사각형의 충돌 체크
        let nearestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
        let nearestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
        let dx = x - nearestX;
        let dy = y - nearestY;
        if ((dx * dx + dy * dy) < (size / 2) * (size / 2)) {
            return true;
        }
    }
    return false;
}

// 충돌 체크
function checkCollisions() {
    // 음식과 충돌
    for (let i = foods.length - 1; i >= 0; i--) {
        let food = foods[i];
        let dx = player.x - food.x;
        let dy = player.y - food.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.size / 2 + food.size) {
            player.hunger = 100;
            foods.splice(i, 1);
        }
    }

    // 침대와 충돌 (수면 회복)
    for (let bed of beds) {
        let dx = player.x - bed.x;
        let dy = player.y - bed.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.size / 2 + Math.max(bed.width, bed.height) / 2) {
            player.sleep = Math.min(player.sleep + 0.5, 100); // 침대에 있을 때 수면 회복
        }
    }

    // 지도 아이템과 충돌 (지도 획득)
    for (let i = mapItems.length - 1; i >= 0; i--) {
        let mapItem = mapItems[i];
        let dx = player.x - mapItem.x;
        let dy = player.y - mapItem.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.size / 2 + mapItem.size / 2) {
            survivorZoneRevealed = true;
            zoneXElem.textContent = survivorZone.x;
            zoneYElem.textContent = survivorZone.y;
            survivorZoneElem.style.display = 'block';
            showMessage('생존자 보호 구역의 좌표는 (${survivorZone.x}, ${survivorZone.y}) 입니다!', 10000);
            mapItems.splice(i, 1);
        }
    }

    // 무기와 충돌
    for (let i = weapons.length - 1; i >= 0; i--) {
        let weapon = weapons[i];
        let dx = player.x - weapon.x;
        let dy = player.y - weapon.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.size / 2 + weapon.size / 2) {
            player.inventory.push(weapon);
            updateInventoryUI();
            weapons.splice(i, 1);
        }
    }

    // 좀비와 플레이어의 벽 충돌
    zombies.forEach(zombie => {
        if (isCollision(zombie.x, zombie.y, zombie.size, walls)) {
            // 좀비가 벽 안으로 들어가면 좀비의 위치를 원래대로 되돌림
            zombie.x -= (zombie.x - player.x) / zombie.speed;
            zombie.y -= (zombie.y - player.y) / zombie.speed;
        }
    });
}

// 인벤토리 UI 업데이트 함수
function updateInventoryUI() {
    inventoryList.innerHTML = '';
    player.inventory.forEach((item, index) => {
        let li = document.createElement('li');
        li.textContent = `${index + 1}. ${item.type}`; // 숫자 표시 추가
        // 클릭 이벤트 리스너 (선택 사항)
        li.addEventListener('click', () => {
            equipWeapon(index);
        });
        inventoryList.appendChild(li);
    });
}

// 무기 장착 함수 (인벤토리에서 클릭하여 무기 장착)
function equipWeapon(index) {
    let weapon = player.inventory[index];
    player.weapon = weapon;
    weaponElem.textContent = weapon.type;

    // 무기 데미지 업데이트
    weapon.damage = weapon.baseDamage * player.weaponDamageMultiplier;
}

// 상태 업데이트
function updateStatus(deltaTime) {
    player.hunger -= deltaTime * 0.001; // 배고픔 감소 속도 조정
    player.sleep -= deltaTime * 0.0005; // 수면 감소 속도 조정

    player.hunger = Math.max(0, player.hunger);
    player.sleep = Math.max(0, player.sleep);

    if (player.hunger <= 0 || player.sleep <= 0) {
        gameOver = true;
        endGame();
    }
}

// 게임 오버 처리 함수
function endGame(victory = false) {
    if (victory) {
        gameOverScreen.innerHTML = `
            <h1>축하합니다! 생존자 보호 구역에 도착했습니다.</h1>
            <button id="restart-button">재시작</button>
        `;
    } else {
        gameOverScreen.innerHTML = `
            <h1>게임 오버</h1>
            <button id="restart-button">재시작</button>
        `;
    }
    gameOverScreen.style.display = 'flex';
    gameContainer.style.display = 'none';

    // 재시작 버튼 이벤트 재설정
    const newRestartButton = document.getElementById('restart-button');
    newRestartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startGame();
    });
}

// 게임 루프
let lastTime = 0;

// 게임 루프 수정
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        movePlayer();
        checkCollisions();
        updateStatus(deltaTime);
        applyWeather();

        // 벽 그리기 (다른 오브젝트보다 먼저 그리기)
        walls.forEach(wall => wall.draw());

        // 도로 그리기
        roads.forEach(road => road.draw());

        // 음식, 침대, 무기, 지도 아이템, 좀비 그리기
        foods.forEach(food => food.draw());
        beds.forEach(bed => bed.draw());
        weapons.forEach(weapon => weapon.draw());
        mapItems.forEach(mapItem => mapItem.draw());
        zombies.forEach(zombie => {
            zombie.update();
            zombie.draw(); // 헬스 바가 포함된 좀비 그리기
        });

        // 공격 이펙트 그리기
        drawAttackEffect(timestamp);

        if (player.invincible && timestamp - invincibleStartTime > invincibleDuration) {
            player.invincible = false;
        }

        // 플레이어 이미지 그리기
        ctx.drawImage(images.player, player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);

        healthElem.textContent = Math.floor(player.health);
        hungerElem.textContent = Math.floor(player.hunger);
        sleepElem.textContent = Math.floor(player.sleep);
        timeElem.textContent = day ? '낮' : '밤';
        weaponElem.textContent = player.weapon ? player.weapon.type : '없음';
        mapXElem.textContent = currentMapX;
        mapYElem.textContent = currentMapY;
        levelElem.textContent = player.level; // 레벨 표시
        experienceElem.textContent = Math.floor(player.experience); // 경험치 표시

        if (survivorZoneRevealed) {
            zoneXElem.textContent = survivorZone.x;
            zoneYElem.textContent = survivorZone.y;
            survivorZoneElem.style.display = 'block';
        } else {
            survivorZoneElem.style.display = 'none';
        }

        // 시간 관리 (60초마다 낮/밤 전환)
        if (Math.floor(timestamp / 1000) % 60 === 0 && timestamp % 1000 < 50) {
            day = !day;
            zombies.forEach(zombie => zombie.hidden = day);
        }

        requestAnimationFrame(gameLoop);
    }
}

// 좀비와 음식 추가 함수
function addZombiesAndFood() {
    // 랜덤 좀비 추가
    const newZombieCount = Math.floor(Math.random() * 5) + 3; // 하루에 3~7마리 추가
    for (let i = 0; i < newZombieCount; i++) {
        let pos = getRandomPositionAvoidingWallsAndRoads();
        zombies.push(new Zombie(pos.x, pos.y));
    }

    // 랜덤 음식 추가
    const newFoodCount = Math.floor(Math.random() * 5) + 2; // 하루에 2~6개 추가
    for (let i = 0; i < newFoodCount; i++) {
        let pos = getRandomPositionAvoidingWallsAndRoads();
        foods.push(new Food(pos.x, pos.y));
    }

    // 랜덤 지도 아이템 추가 (드물게)
    const newMapItemCount = Math.floor(Math.random() * 2); // 하루에 0~1개 추가
    for (let i = 0; i < newMapItemCount; i++) {
        let pos = getRandomPositionAvoidingWallsAndRoads();
        mapItems.push(new MapItem(pos.x, pos.y));
    }
}

document.addEventListener('keydown', (e) => {
    const key = e.key;
    const num = parseInt(key);

    // 숫자 키 1-9에 해당하는지 확인
    if (!isNaN(num) && num >= 1 && num <= player.inventory.length) {
        equipWeapon(num - 1); // 인덱스는 0부터 시작
    }

    // 기존의 스페이스바 공격 기능 유지
    if (e.key === ' ' && player.weapon) {
        useWeapon();
    }
});

// 하루가 지날 때마다 좀비와 음식 추가 (60초마다 추가)
setInterval(addZombiesAndFood, 60000); // 60초마다 실행 (하루)