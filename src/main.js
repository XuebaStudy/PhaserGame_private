import Phaser from 'phaser';
import './styles/style.css';

// 全局配置常量
const CONFIG = {
    PLAYER_SPAWN: { x: 50, y: 150 },
    GAME_SCALE: 1,
    DEPTH: {
        background: 0,
        thing: 1,
        player: 3,
        foreground: 10
    }
};

import { createObjectsFromTiled, getTilePropertyFromRawTileset, setObjectCollisionBox, checkBodyOverlap, getItemFrameId } from './game/utils/GameUtils.js';
import { ScoreBoard } from './game/ui/ScoreBoard.js';
import { Inventory } from './game/ui/Inventory.js';

class Example extends Phaser.Scene {
    // 分数板UI创建
    createScoreBoard() {
        this.ScoreBoard = new ScoreBoard(this, CONFIG);
        this.ScoreBoard.create();
    }

    // 分数板UI刷新
    updateScoreBoard() {
        if (this.ScoreBoard) {
            this.ScoreBoard.update(this.score);
        }
    }
    // 播放宝箱开启动画
    openChest(chestSprite) {
        // 只允许未打开的宝箱触发
        if (chestSprite._isOpened) return;
        chestSprite._isOpened = true;
        // 播放交替动画（10、11帧），最后变为9帧
        let frameList = [10, 11];
        let frameIdx = 0;
        let repeatCount = 0;
        const maxRepeat = 6; // 动画交替次数
        const animate = () => {
            if (repeatCount < maxRepeat) {
                chestSprite.setFrame(frameList[frameIdx % 2]);
                frameIdx++;
                repeatCount++;
                this.time.delayedCall(80, animate);
            } else {
                chestSprite.setFrame(9); // 最终打开状态
                // 动画结束后生成钻石
                const diamondFrame = 67;
                const diamond = this.physics.add.sprite(chestSprite.x, chestSprite.y - chestSprite.body.height - 12, 'things', diamondFrame);
                diamond.setDepth(CONFIG.DEPTH.thing + 1);
                diamond.body.allowGravity = false;
                diamond._isDiamond = true;
                this.diamonds = this.diamonds || [];
                this.diamonds.push(diamond);
            }
        };
        animate();
    }
    constructor() {
        super();
        this.player = null;
        this.cursors = null;
        this.wasdKeys = null;
        this.maps = {};
        this.tiles = {};
        this.layers = {};
        this.colliders = {};

        this.keys = [];
        this.lockedChests = [];
        this.insects = [];
        this.spikes = [];
        this.springs = [];
        this.diamonds = [];

        // 物品栏相关
        this.Inventory = null;
        this.inventorySlots = [];
        this.inventoryIcons = [];
        this.hasKey = false;

        // 分数
        this.score = 0;

        // 分数板UI
        this.ScoreBoard = null;
    }

    playerDie() {
        // 死亡动画：更明显的闪烁，死亡期间禁用输入
        if (this._isDying) return;
        this._isDying = true;
        this.player.setVelocity(0, 0);
        this.player.body.enable = false; // 禁用物理体，防止移动
        let flashCount = 0;
        const maxFlash = 8;
        const flash = () => {
            if (!this.player) return;
            if (flashCount % 2 === 0) {
                this.player.setTint(0xffffff);
                this.player.setAlpha(1);
            } else {
                this.player.setTint(0x000000);
                this.player.setAlpha(0.3);
            }
            flashCount++;
            if (flashCount < maxFlash) {
                this.time.delayedCall(70, flash);
            } else {
                this.player.clearTint();
                this.player.setAlpha(1);
                this.player.setPosition(CONFIG.PLAYER_SPAWN.x, CONFIG.PLAYER_SPAWN.y);
                this.player.body.enable = true;
                this._isDying = false;
            }
        };
        flash();
    }


    preload () {
        this.load.image('platform_img', '/assets/Tiled/Tilemap/platformer_1.png');
        this.load.tilemapTiledJSON('map1', '/assets/Tiled/map1.json');
        this.load.image('background_img', '/assets/Tiled/Tilemap/background_1.png');
        this.load.tilemapTiledJSON('backgroundMap1', '/assets/Tiled/background_1.json');

        this.load.spritesheet('characters', '/assets/Tiled/Tilemap/characters_1.png', { frameWidth: 24, frameHeight: 24, margin: 0, spacing: 1 });
        this.load.spritesheet('things', '/assets/Tiled/Tilemap/platformer_1.png', { frameWidth: 18, frameHeight: 18, margin: 0, spacing: 1 });
    }

    create() {
        this.createMap();
        this.createPlayer();
        this.createAnimations();
        this.createKeys();
        this.createLockedChests();
        this.createInsects();
        this.createSprings();
        this.createSpikes();
        this.createControls();
        this.createCamera();
        this.createInventory();
        this.createScoreBoard();
        this.createSignsWithTip();
    }

    // 创建物品栏UI（左侧半透明格子）
    createInventory() {
        // 使用Inventory类创建物品栏
        const slotCount = 3;
        const slotSize = 28;
        const slotMargin = 0;
        const startX = 4;
        const startY = 80;
        if (!this.Inventory) {
            this.Inventory = new Inventory(this, CONFIG);
        }
        this.Inventory.create(slotCount, slotSize, slotMargin, startX, startY);
    }

    // 更新物品栏UI（显示钥匙图标）
    updateInventory() {
        // 只在第一个格子显示钥匙图标
        const keyFrameId = getItemFrameId(this, 'platformer_1', 'isKey', true);
        if (this.Inventory) {
            this.Inventory.update(this.hasKey, keyFrameId);
        }
    }

    // ...existing code...

    createMap() {
        // 创建背景地图、tileset、图层
        this.maps.background = this.make.tilemap({ key: 'backgroundMap1' });
        this.tiles.background = this.maps.background.addTilesetImage('background_1', 'background_img');
        this.layers.background = this.maps.background.createLayer(0, this.tiles.background, 0, 0);
        this.layers.background.setDepth(CONFIG.DEPTH.background);

        // 创建主地图、tileset、图层
        this.maps.map = this.make.tilemap({ key: 'map1' });
        this.tiles.map = this.maps.map.addTilesetImage('platformer_1', 'platform_img');
        this.layers.platform = this.maps.map.createLayer(0, this.tiles.map, 0, 0);
        this.layers.thing = this.maps.map.createLayer(1, this.tiles.map, 0, 0);
        this.layers.thing.setDepth(CONFIG.DEPTH.thing);

        // 设置基于 Solid 属性的碰撞检测
        this.layers.platform.setCollisionByProperty({ isSolid: true });
        this.layers.platform.forEachTile(tile => {
            if (tile.properties.isUpSolid) {
                tile.setCollision(false, false, true, false); // left, right, top, bottom
            }
        });
    }

    createPlayer() {
        this.player = this.physics.add.sprite(CONFIG.PLAYER_SPAWN.x, CONFIG.PLAYER_SPAWN.y, 'characters', 0);
        this.player.setFlipX(true);
        this.player.setDepth(CONFIG.DEPTH.player);
        this.player.body.setSize(20, 22, true);
        this.colliders.playerPlatform = this.physics.add.collider(this.player, this.layers.platform);
    }

    createInsects() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'insects',
            tilesetName: 'characters_1',
            propertyName: 'isInsect',
            spriteKey: 'characters',
            customInit: (insect) => {
                insect.anims.play('flying insect', true);
                insect.setVelocity(0, 0);
                insect._flyOriginX = insect.x;
                insect._flyOriginY = insect.y;
                insect._flyVX = 0;
                insect._flyVY = 0;
                insect._flyMaxDist = 800 + Math.random() * 16;
                insect._flyRandom = 480 + Math.random() * 160;
                insect._flyReturn = 0.18 + Math.random() * 0.04;
                insect._flyDamping = 0.92 + Math.random() * 0.04;
            }
        });
    }

    createSprings() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'springs',
            tilesetName: 'platformer_1',
            propertyName: 'isSpring',
            spriteKey: 'things',
            customInit: (spring, obj) => {
                spring.setFrame(107);
                spring._springState = 'normal';
                spring._springObj = obj;
            }
        });
    }
    
    createKeys() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'keys',
            tilesetName: 'platformer_1',
            propertyName: 'isKey',
            spriteKey: 'things'
        });
    }

    // 玩家获得钥匙（可在碰撞检测或收集逻辑中调用此方法）
    collectKey(keySprite) {
        if (!this.hasKey) {
            this.hasKey = true;
            keySprite.setVisible(false);
            this.updateInventory();
        }
    }

    createLockedChests() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'lockedChests',
            tilesetName: 'platformer_1',
            propertyName: 'isLockedChest',
            spriteKey: 'things',
            isStatic: true,
            customInit: (chest, obj, frameId) => {
                this.physics.add.collider(this.player, chest);
            }
        });
    }

    // 只保留spike的碰撞检测框（不创建sprite，不重新绘制）
    createSpikes() {
        this.spikes = [];
        if (!this.layers.thing) return;
        this.layers.thing.forEachTile(tile => {
            if (tile && tile.properties && tile.properties.isSpike) {
                const worldX = tile.getLeft();
                const worldY = tile.getTop();
                const fakeSprite = { body: {} };
                setObjectCollisionBox(tile, fakeSprite, this.maps.map);

                fakeSprite.body.x = worldX + (fakeSprite.body.offset ? fakeSprite.body.offset.x : 0);
                fakeSprite.body.y = worldY + (fakeSprite.body.offset ? fakeSprite.body.offset.y : 0);
                this.spikes.push({ body: fakeSprite.body });
            }
        });
    }
    
    // 批量创建告示牌对象并封装提示文字
    createSignsWithTip() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'signs',
            tilesetName: 'platformer_1',
            propertyName: 'isSign',
            propertyValue: true,
            spriteKey: 'things',
            customInit: (sign, obj, frameId) => {
                let text = '';
                if (Array.isArray(obj.properties)) {
                    const textProp = obj.properties.find(p => p.name === 'text');
                    if (textProp) text = textProp.value;
                }
                sign._signText = text;
            }
        });
        // 创建提示文字对象
        this.signTipText = this.add.text(this.cameras.main.width / 2, 48, '', {
            fontFamily: 'Arial Narrow',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#000000',
            backgroundColor: '#fffbe6',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
            align: 'center',
        });
        this.signTipText.setOrigin(0.5, 0);
        this.signTipText.setScrollFactor(0);
        this.signTipText.setDepth(CONFIG.DEPTH.foreground + 10);
        this.signTipText.setVisible(false);
    }

    // 告示牌提示文字逻辑
    updateSignTipText() {
        let signFound = false;
        if (this.signs && this.signs.length) {
            for (let i = 0; i < this.signs.length; i++) {
                const sign = this.signs[i];
                if (checkBodyOverlap(this.player, sign)) {
                    this.signTipText.setText(sign._signText || '');
                    this.signTipText.setVisible(true);
                    signFound = true;
                    break;
                }
            }
        }
        if (!signFound) {
            this.signTipText.setVisible(false);
        }
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
    }

    createCamera() {
        this.cameras.main.setBounds(0, 0, this.maps.map.widthInPixels, this.maps.map.heightInPixels);
        this.cameras.main.setZoom(CONFIG.GAME_SCALE);
        this.cameras.main.scrollX = 0;
        this.cameras.main.startFollow(this.player, false, 1, 1, 0, 0);
    }

    createAnimations() {
        this.anims.create({
            key: 'idle',
            frames: [{ key: 'characters', frame: 0 }],
            frameRate: 10
        });
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('characters', { start: 0, end: 1 }),
            frameRate: 12,
            repeat: -1
        });
        this.anims.create({
            key: 'jump',
            frames: [{ key: 'characters', frame: 1 }],
            frameRate: 10
        });
        this.anims.create({
            key: 'flying insect',
            frames: this.anims.generateFrameNumbers('characters', { start: 24, end: 26 }),
            frameRate: 8,
            repeat: -1
        });
    }

    update (time, delta){
        const dt = delta / 1000;
        // 弹簧逻辑
        if (this.springs && this.springs.length) {
            for (let i = 0; i < this.springs.length; i++) {
                const spring = this.springs[i];
                // 检查玩家是否从上方碰撞弹簧
                if (checkBodyOverlap(this.player, spring)) {
                    // 判断玩家是否从上方碰撞（玩家底部在弹簧顶部上方一定距离内，且y速度向下）
                    const playerBottom = this.player.body.y + this.player.body.height;
                    const springTop = spring.body.y;
                    const playerDownward = this.player.body.velocity.y > 0;
                    if (playerBottom <= springTop + 8 && playerDownward) {
                        if (spring._springState === 'normal') {
                            // 未弹出，给予较大向上速度，切换为弹出
                            this.player.setVelocityY(-320);
                            spring.setFrame(108);
                            spring._springState = 'popped';
                            // 切换碰撞框
                            if (spring._springObj && spring._springObj.poppedBox) {
                                setObjectCollisionBox(spring._springObj.poppedBox, spring, this.maps.map);
                            }
                        } else if (spring._springState === 'popped') {
                            // 弹出状态，给予较小向上速度，切回未弹出
                            this.player.setVelocityY(-120);
                            spring.setFrame(107);
                            spring._springState = 'normal';
                            // 切换碰撞框
                            setObjectCollisionBox(spring._springObj, spring, this.maps.map);
                        }
                    }
                }
            }
        }
        // 告示牌提示文字逻辑
        this.updateSignTipText();

    
        // insect 随机游走动画
        if (this.insects && this.insects.length) {
            for (let i = 0; i < this.insects.length; i++) {
                const insect = this.insects[i];
                // insect 位移逻辑
                insect._flyVX += (Math.random() - 0.5) * 2 * insect._flyRandom * dt;
                insect._flyVY += (Math.random() - 0.5) * 2 * insect._flyRandom * dt;
                // 回原点吸引
                insect._flyVX += (insect._flyOriginX - insect.x) * insect._flyReturn * dt;
                insect._flyVY += (insect._flyOriginY - insect.y) * insect._flyReturn * dt;
                // 阻尼
                insect._flyVX *= insect._flyDamping;
                insect._flyVY *= insect._flyDamping;
                // 移动
                insect.x += insect._flyVX * dt;
                insect.y += insect._flyVY * dt;
                // 限制最大活动半径
                const dx = insect.x - insect._flyOriginX;
                const dy = insect.y - insect._flyOriginY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > insect._flyMaxDist) {
                    insect.x = insect._flyOriginX + dx / dist * insect._flyMaxDist;
                    insect.y = insect._flyOriginY + dy / dist * insect._flyMaxDist;
                    insect._flyVX *= 0.5;
                    insect._flyVY *= 0.5;
                }
                // 检测玩家与insect碰撞体重叠，重叠则死亡
                if (checkBodyOverlap(this.player, insect)) {
                    this.playerDie();
                    return;
                }
            }
        }

        // spike碰撞检测（与insect一致，直接用checkBodyOverlap）
        if (this.spikes && this.spikes.length) {
            for (let i = 0; i < this.spikes.length; i++) {
                if (checkBodyOverlap(this.player, this.spikes[i])) {
                    this.playerDie();
                    return;
                }
            }
        }

        // 宝箱开启动画与钥匙消耗
        if (this.lockedChests && this.lockedChests.length && this.hasKey) {
            for (let i = 0; i < this.lockedChests.length; i++) {
                const chest = this.lockedChests[i];
                if (!chest._isOpened && checkBodyOverlap(this.player, chest)) {
                    this.hasKey = false;
                    this.updateInventory();
                    this.openChest(chest);
                    break;
                }
            }
        }
        // 钻石收集判定
        if (this.diamonds && this.diamonds.length) {
            for (let i = 0; i < this.diamonds.length; i++) {
                const diamond = this.diamonds[i];
                if (diamond.visible && checkBodyOverlap(this.player, diamond)) {
                    diamond.setVisible(false);
                    this.score += 10;
                    this.updateScoreBoard();
                }
            }
        }

        // 检查玩家是否获得钥匙（与钥匙碰撞）
        if (this.keys && this.keys.length && !this.hasKey) {
            for (let i = 0; i < this.keys.length; i++) {
                const keySprite = this.keys[i];
                if (keySprite.visible && checkBodyOverlap(this.player, keySprite)) {
                    this.collectKey(keySprite);
                    break;
                }
            }
        }

        // 更新物品栏UI（防止UI丢失）
        this.updateInventory();

        // 梯子检测
        let onLadder = false;
        const ladderTile = this.layers.thing.getTileAtWorldXY(this.player.x, this.player.y + this.player.body.height / 2);
        if (ladderTile && ladderTile.properties && ladderTile.properties.isLadder === true) {
            onLadder = true;
        }

        if (onLadder) {
            this.player.body.allowGravity = false;
            if (this.wasdKeys.W.isDown) {
                this.player.setVelocityY(-100);
            } else if (this.wasdKeys.S.isDown) {
                this.player.setVelocityY(100);
            } else {
                this.player.setVelocityY(0);
            }
        } else {
            this.player.body.allowGravity = true;
        }
        
        // 检查地面状态
        const isOnGround = this.player.body.touching.down;
        const isBlocked = this.player.body.blocked.down;
        
        // 下穿平台（S键）
        if (this.colliders.playerPlatform) {
            if (this.wasdKeys.S.isDown && (isOnGround || isBlocked)) {
                this.colliders.playerPlatform.active = false;
                this._dropFromPlatform = true;
                // 强制给玩家一个向下速度，避免卡在平台内
                this.player.setVelocityY(150);
            }
            if (this._dropFromPlatform) {
                // 获取玩家正下方tile
                const tile = this.layers.platform.getTileAtWorldXY(this.player.x, this.player.y + this.player.body.height / 2);
                // 恢复碰撞
                if (!tile || !tile.properties.isUpSolid) {
                    this.colliders.playerPlatform.active = true;
                    this._dropFromPlatform = false;
                }
            }
        }
        
        // 跳跃控制（W键）
        if (this.wasdKeys.W.isDown) {
            if (isOnGround || isBlocked) {
                this.player.setVelocityY(-200);
            }
        }
        
        // 人物左右移动控制（AD键）
        const accel = 800; // 加速度
        const maxSpeed = 160; // 最大速度
        if (this.wasdKeys.A.isDown) {
            this.player.setAccelerationX(-accel);
            this.player.setFlipX(false);
        } else if (this.wasdKeys.D.isDown) {
            this.player.setAccelerationX(accel);
            this.player.setFlipX(true);
        } else {
            this.player.setAccelerationX(0);
            // 摩擦力减速
            if (Math.abs(this.player.body.velocity.x) < 5) {
                this.player.setVelocityX(0);
            } else {
                this.player.setVelocityX(this.player.body.velocity.x * 0.85);
            }
        }
        // 限制最大速度
        if (this.player.body.velocity.x > maxSpeed) this.player.setVelocityX(maxSpeed);
        if (this.player.body.velocity.x < -maxSpeed) this.player.setVelocityX(-maxSpeed);

        // 动画控制 - 根据状态优先级播放动画
        const isGrounded = isOnGround || isBlocked;
        if (!isGrounded) {
            // 在空中 - 播放跳跃动画
            this.player.anims.play('jump', true);
        }
        else if (this.wasdKeys.A.isDown || this.wasdKeys.D.isDown) {
            // 在地面且移动 - 播放行走动画
            this.player.anims.play('walk', true);
        }
        else {
            // 在地面且静止 - 播放静止动画
            this.player.anims.play('idle', true);
        }
        
        // 掉出世界边界处理
        if (this.player.y > this.cameras.main.height) {
            this.playerDie();
        }
        // 左右边界限制（基于地图宽度和角色宽度）
        const halfW = this.player.body.width / 2;
        if (this.player.x < halfW) {
            this.player.x = halfW;
        }
        if (this.player.x > this.maps.map.widthInPixels - halfW) {
            this.player.x = this.maps.map.widthInPixels - halfW;
        }
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 600,
    height: 360 * CONFIG.GAME_SCALE,
    backgroundColor: '#ffffff',
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }
        }
    },
    scene: Example
};
new Phaser.Game(config);