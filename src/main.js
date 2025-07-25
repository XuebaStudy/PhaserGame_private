import Phaser from 'phaser';

import './styles/style.css';

// Vite静态资源自动加hash，需用import方式
import platformImgUrl from '/assets/Tiled/Tilemap/platformer_1.png?url';
import backgroundImgUrl from '/assets/Tiled/Tilemap/background_1.png?url';
import map1Url from '/assets/Tiled/map1.json?url';
import backgroundMap1Url from '/assets/Tiled/background_1.json?url';
import charactersImgUrl from '/assets/Tiled/Tilemap/characters_1.png?url';
import thingsImgUrl from '/assets/Tiled/Tilemap/platformer_1.png?url';

import { createObjectsFromTiled, setObjectCollisionBox, checkBodyOverlap, getItemFrameId } from './game/utils/GameUtils.js';
import { ScoreBoard } from './game/ui/ScoreBoard.js';
import { Inventory } from './game/ui/Inventory.js';
import { SignTip } from './game/ui/SignTip.js';
import { Player } from './game/object/Player.js';
import { Insect } from './game/object/Insect.js';

// 全局配置常量
const CONFIG = {
    PLAYER_SPAWN: { x: 50, y: 150 },
    GAME_SCALE: 1,
    DEPTH: {
        background: 0,
        platform: 2,
        thing: 4,
        player: 5,
        falling_water: 7,
        foreground: 10
    }
};

class Example extends Phaser.Scene {
    constructor() {
        super();
        this.maps = {};
        this.tiles = {};
        this.layers = {};
        this.colliders = {};

        this.hasKey = false;
        this.score = 0;
    }

    preload () {
        this.load.image('platform_img', platformImgUrl);
        this.load.tilemapTiledJSON('map1', map1Url);
        this.load.image('background_img', backgroundImgUrl);
        this.load.tilemapTiledJSON('backgroundMap1', backgroundMap1Url);

        this.load.spritesheet('characters', charactersImgUrl, { frameWidth: 24, frameHeight: 24, margin: 0, spacing: 1 });
        this.load.spritesheet('things', thingsImgUrl, { frameWidth: 18, frameHeight: 18, margin: 0, spacing: 1 });
    }

    create() {
        this.createMap();
        this.createPlayer();
        this.createAnimations();
        this.createKeys();
        this.createLockedChests();

        Insect.createInsectsFromTiled(this);
        this.createSprings();
        this.createSpikes();
        this.createCoins();
        this.createControls();
        this.createCamera();
        this.createInventory();
        this.ScoreBoard = new ScoreBoard(this, CONFIG);
        this.SignTip = new SignTip(this, CONFIG);
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
        this.layers.platform.setDepth(CONFIG.DEPTH.platform);
        this.layers.falling_water = this.maps.map.createLayer(1, this.tiles.map, 0, 0);
        this.layers.falling_water.setDepth(CONFIG.DEPTH.falling_water);
        this.layers.thing = this.maps.map.createLayer(2, this.tiles.map, 0, 0);
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
        this.player = new Player(this, CONFIG);
        this.add.existing(this.player);
        this.colliders.playerPlatform = this.physics.add.collider(this.player, this.layers.platform);
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

    // 批量创建金币对象
    createCoins() {
        createObjectsFromTiled({
            scene: this,
            arrayName: 'coins',
            tilesetName: 'platformer_1',
            propertyName: 'isCoin',
            propertyValue: true,
            spriteKey: 'things',
            customInit: (coin, obj) => {
                coin.setFrame(151);
                coin._coinAnimState = 0;
                coin._coinAnimTimer = 0;
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
        // 提示文字对象由SignTip类管理，无需重复创建
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

    // 更新物品栏UI
    updateInventory() {
        // 只在第一个格子显示钥匙图标
        const keyFrameId = getItemFrameId(this, 'platformer_1', 'isKey', true);
        if (this.Inventory) {
            this.Inventory.update(this.hasKey, keyFrameId);
        }
    }

    // 告示牌提示文字逻辑
    updateSignTipText() {
        let signFound = false;
        let tipText = '';
        if (this.signs && this.signs.length) {
            for (let i = 0; i < this.signs.length; i++) {
                const sign = this.signs[i];
                if (checkBodyOverlap(this.player, sign)) {
                    tipText = sign._signText || '';
                    signFound = true;
                    break;
                }
            }
        }
        if (this.SignTip) {
            this.SignTip.update(tipText, signFound);
        }
    }

    // 玩家获得钥匙（可在碰撞检测或收集逻辑中调用此方法）
    collectKey(keySprite) {
        if (!this.hasKey) {
            this.hasKey = true;
            keySprite.setVisible(false);
            this.updateInventory();
        }
    }

    // 宝箱开启
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

    update (time, delta){
        const dt = delta / 1000;

        // 告示牌提示文字逻辑
        this.updateSignTipText();
        // 更新物品栏UI
        this.updateInventory();

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
    
        // coin动画与收集判定
        if (this.coins && this.coins.length) {
            for (let i = 0; i < this.coins.length; i++) {
                const coin = this.coins[i];
                // coin动画：151/152帧交替
                coin._coinAnimTimer += delta;
                if (coin._coinAnimTimer > 200) {
                    coin._coinAnimState = 1 - coin._coinAnimState;
                    coin.setFrame(coin._coinAnimState ? 152 : 151);
                    coin._coinAnimTimer = 0;
                }
                // coin收集判定
                if (coin.visible && checkBodyOverlap(this.player, coin)) {
                    coin.setVisible(false);
                    this.score += 2;
                    if (this.ScoreBoard) {
                        this.ScoreBoard.update(this.score);
                    }
                }
            }
        }

        // insect 随机游走
        if (this.insects && this.insects.length) {
            for (let i = 0; i < this.insects.length; i++) {
                const insect = this.insects[i];
                insect.update(dt);
                // 检测玩家与insect碰撞体重叠，重叠则死亡
                if (checkBodyOverlap(this.player, insect)) {
                    this.player.die();
                    return;
                }
            }
        }

        // spike碰撞检测
        if (this.spikes && this.spikes.length) {
            for (let i = 0; i < this.spikes.length; i++) {
                if (checkBodyOverlap(this.player, this.spikes[i])) {
                    this.player.die();
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
                    if (this.ScoreBoard) {
                        this.ScoreBoard.update(this.score);
                    }
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
        
        // 玩家控制更新
        this.player.updateControls(this.wasdKeys, this.colliders, this.layers);
        
        // 掉出世界边界处理
        if (this.player.y > this.maps.map.heightInPixels) {
            this.player.die();
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