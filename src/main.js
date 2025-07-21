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

class Example extends Phaser.Scene {
    // 分数板UI创建
    createScoreBoard() {
        const pad = 8;
        const w = 70, h = 32;
        const x = this.cameras.main.width - w - pad;
        const y = pad;
        // 木板底色（半透明）
        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0x8B5A2B, 0.82); // 木色半透明（更不透明）
        this.scoreBg.fillRoundedRect(x, y, w, h, 10);
        // 木板纹理（简单横线，半透明）
        for (let i = 0; i < 4; i++) {
            this.scoreBg.lineStyle(1, 0xA67C52, 0.55);
            this.scoreBg.beginPath();
            this.scoreBg.moveTo(x + 10, y + 8 + i * 7);
            this.scoreBg.lineTo(x + w - 10, y + 8 + i * 7);
            this.scoreBg.strokePath();
        }
        // 边框（半透明）
        this.scoreBg.lineStyle(3, 0x5C3317, 0.82);
        this.scoreBg.strokeRoundedRect(x, y, w, h, 10);
        this.scoreBg.setScrollFactor(0);
        this.scoreBg.setDepth(CONFIG.DEPTH.foreground + 2);
        // 分数文字
        this.scoreText = this.add.text(0, 0, 'Score: 0', {
            fontFamily: 'Arial Narrow',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#5C3317',
            strokeThickness: 2,
            align: 'center',
        });
        // 居中分数文字
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(CONFIG.DEPTH.foreground + 3);
        this.scoreText.setOrigin(0.5, 0.5);
        this.scoreText.x = x + w / 2;
        this.scoreText.y = y + h / 2;
    }

    // 分数板UI刷新
    updateScoreBoard() {
        if (this.scoreText) {
            this.scoreText.setText('Score: ' + this.score);
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
    // 通用工厂：批量创建对象
    static createObjectsFromTiled({
        scene,
        arrayName,
        tilesetName,
        propertyName,
        propertyValue = true,
        spriteKey,
        customInit,
        isStatic = true
    }) {
        scene[arrayName] = [];
        scene.layers.object = scene.maps.map.getObjectLayer('object');
        const rawMap = scene.cache.tilemap.get('map1').data;
        const phaserTileset = scene.maps.map.tilesets.find(ts => ts.name === tilesetName);
        scene.layers.object.objects.forEach(obj => {
            if (!phaserTileset || obj.gid < phaserTileset.firstgid || obj.gid >= phaserTileset.firstgid + phaserTileset.tileCount) return;
            const frameId = obj.gid - phaserTileset.firstgid;
            const match = Example.getTilePropertyFromRawTileset({
                mapCache: rawMap,
                tilesetName,
                frameId,
                propertyName,
                propertyValue
            });
            if (match) {
                // 所有对象都用 sprite 创建
                let sprite = scene.physics.add.sprite(obj.x + obj.width / 2, obj.y - obj.height / 2, spriteKey, frameId);
                // 如果是静态体，设置 immovable、moves=false、allowGravity=false
                if (isStatic) {
                    sprite.body.immovable = true;
                    sprite.body.moves = false;
                    sprite.body.allowGravity = false;
                } else {
                    sprite.body.allowGravity = false;
                }
                sprite.setDepth(CONFIG.DEPTH.thing);
                Example.setObjectCollisionBox(obj, sprite, scene.maps.map);
                if (customInit) customInit(sprite, obj, frameId);
                scene[arrayName].push(sprite);
            }
        });
    }

    // 通用：从原始 Tiled tileset 判断某帧是否有指定属性
    static getTilePropertyFromRawTileset({ mapCache, tilesetName, frameId, propertyName, propertyValue }) {
        if (!mapCache || !mapCache.tilesets) return false;
        const rawTileset = mapCache.tilesets.find(ts => ts.name === tilesetName);
        if (!rawTileset || !rawTileset.tiles || !Array.isArray(rawTileset.tiles)) return false;
        const tileObj = rawTileset.tiles.find(t => t.id === frameId);
        if (tileObj && tileObj.properties) {
            return tileObj.properties.some(p => p.name === propertyName && p.value === propertyValue);
        }
        return false;
    }

    // 静态工具：根据 Tiled 对象或 tile 设置碰撞体，自动兼容 object/tile 两种输入
    static setObjectCollisionBox(objOrTile, sprite, map) {
        // 支持 Tiled object（obj.gid）或 tile（obj.index）或 tile.index
        let gid = undefined;
        let tileInfo = undefined;
        let tileset = undefined;
        if (objOrTile.gid !== undefined) {
            // Tiled object（Object Layer）
            gid = objOrTile.gid;
        } else if (objOrTile.index !== undefined) {
            // tile 或 Tiled object（Tile Layer 或 Object Layer）
            gid = objOrTile.index;
        } else if (typeof objOrTile === 'object' && objOrTile.tilemapLayer && objOrTile.index !== undefined) {
            // tile 对象
            gid = objOrTile.index;
        }
        if (gid === undefined) return;
        tileset = map.tilesets.find(ts => gid >= ts.firstgid && gid < ts.firstgid + ts.total);
        if (!tileset) return;
        const frameId = gid - tileset.firstgid;
        tileInfo = tileset.tileData && tileset.tileData[frameId];
        const objectgroup = tileInfo && tileInfo.objectgroup;
        if (objectgroup && objectgroup.objects && objectgroup.objects.length > 0) {
            const box = objectgroup.objects[0];
            sprite.body.width = box.width;
            sprite.body.height = box.height;
            if (sprite.body.offset && typeof sprite.body.offset.set === 'function') {
                sprite.body.offset.set(box.x, box.y);
            } else {
                sprite.body.offset = new Phaser.Math.Vector2(box.x, box.y);
            }
        } else {
            // 没有objectgroup时，默认用tile本身
            sprite.body.width = objOrTile.width;
            sprite.body.height = objOrTile.height;
            if (sprite.body.offset && typeof sprite.body.offset.set === 'function') {
                sprite.body.offset.set(0, 0);
            } else {
                sprite.body.offset = new Phaser.Math.Vector2(0, 0);
            }
        }
    }

    // 静态工具：检测两个物理体是否重叠
    static checkBodyOverlap(a, b) {
        const ab = a.body;
        const bb = b.body;
        return Phaser.Geom.Intersects.RectangleToRectangle(
            new Phaser.Geom.Rectangle(ab.x, ab.y, ab.width, ab.height),
            new Phaser.Geom.Rectangle(bb.x, bb.y, bb.width, bb.height)
        );
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
        this.inventoryUI = null;
        this.inventorySlots = [];
        this.inventoryIcons = [];
        this.hasKey = false;

        // 分数
        this.score = 0;
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
        this.createInventoryUI();
        // 分数板UI封装
        this.createScoreBoard();
        // 添加文字显示，位置根据镜头和界面常数设置
        this.uiText = this.add.text(16, 16, 'Collect key, and open the chest!', {
            fontFamily: 'Arial Narrow, Consolas, Courier New, Lucida Console, Menlo, Monaco, monospace',
            fontSize: '24px',
            fontStyle: 'bold',
            fill: '#000',
            // stroke: '#222',
            // strokeThickness: 2
        });
        // this.uiText.setScrollFactor(0);
        this.uiText.setDepth(CONFIG.DEPTH.foreground);
    }

    // 创建物品栏UI（左侧半透明格子）
    createInventoryUI() {
        const slotCount = 3;
        const slotSize = 28;
        const slotMargin = 0;
        const startX = 4;
        const startY = 80;
        this.inventorySlots = [];
        this.inventoryIcons = [];
        // 用 Graphics 绘制半透明格子
        for (let i = 0; i < slotCount; i++) {
            const g = this.add.graphics();
            g.fillStyle(0x000000, 0.35);
            g.fillRoundedRect(startX, startY + i * (slotSize + slotMargin), slotSize, slotSize, 8);
            g.lineStyle(2, 0xffffff, 0.5);
            g.strokeRoundedRect(startX, startY + i * (slotSize + slotMargin), slotSize, slotSize, 8);
            g.setDepth(CONFIG.DEPTH.foreground);
            g.setScrollFactor(0);
            this.inventorySlots.push(g);
            // 默认隐藏物品图标
            const icon = this.add.image(startX + slotSize / 2, startY + i * (slotSize + slotMargin) + slotSize / 2, 'things', 0);
            icon.setVisible(false);
            icon.setDepth(CONFIG.DEPTH.foreground + 1);
            icon.setScrollFactor(0);
            icon.setScale(1.0);
            this.inventoryIcons.push(icon);
        }
    }

    // 更新物品栏UI（显示钥匙图标）
    updateInventoryUI() {
        // 只在第一个格子显示钥匙图标
        if (this.hasKey) {
            // 通用方法获取钥匙帧号
            const keyFrameId = Example.getItemFrameId(this, 'platformer_1', 'isKey', true);
            this.inventoryIcons[0].setFrame(keyFrameId);
            this.inventoryIcons[0].setVisible(true);
        } else {
            this.inventoryIcons[0].setVisible(false);
        }
    }

    /**
     * 通用方法：获取第一个具有指定属性的帧号
     * @param {Phaser.Scene} scene - 当前场景
     * @param {string} tilesetName - tileset名称
     * @param {string} propertyName - 属性名（如'isKey', 'isSpring', 'isLockedChest'等）
     * @param {any} propertyValue - 属性值（通常为true）
     * @returns {number} 帧号（未找到则返回0）
     */
    static getItemFrameId(scene, tilesetName, propertyName, propertyValue = true) {
        const rawMap = scene.cache.tilemap.get('map1').data;
        const tileset = rawMap.tilesets.find(ts => ts.name === tilesetName);
        if (!tileset || !tileset.tiles) return 0;
        for (let i = 0; i < tileset.tiles.length; i++) {
            const frameId = tileset.tiles[i].id;
            if (Example.getTilePropertyFromRawTileset({
                mapCache: rawMap,
                tilesetName,
                frameId,
                propertyName,
                propertyValue
            })) {
                return frameId;
            }
        }
        return 0;
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
        Example.createObjectsFromTiled({
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
        Example.createObjectsFromTiled({
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
        Example.createObjectsFromTiled({
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
            this.updateInventoryUI();
        }
    }

    createLockedChests() {
        Example.createObjectsFromTiled({
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
                Example.setObjectCollisionBox(tile, fakeSprite, this.maps.map);

                fakeSprite.body.x = worldX + (fakeSprite.body.offset ? fakeSprite.body.offset.x : 0);
                fakeSprite.body.y = worldY + (fakeSprite.body.offset ? fakeSprite.body.offset.y : 0);
                this.spikes.push({ body: fakeSprite.body });
            }
        });
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
                if (Example.checkBodyOverlap(this.player, spring)) {
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
                                Example.setObjectCollisionBox(spring._springObj.poppedBox, spring, this.maps.map);
                            }
                        } else if (spring._springState === 'popped') {
                            // 弹出状态，给予较小向上速度，切回未弹出
                            this.player.setVelocityY(-120);
                            spring.setFrame(107);
                            spring._springState = 'normal';
                            // 切换碰撞框
                            Example.setObjectCollisionBox(spring._springObj, spring, this.maps.map);
                        }
                    }
                }
            }
        }
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
                if (Example.checkBodyOverlap(this.player, insect)) {
                    this.playerDie();
                    return;
                }
            }
        }

        // spike碰撞检测（与insect一致，直接用checkBodyOverlap）
        if (this.spikes && this.spikes.length) {
            for (let i = 0; i < this.spikes.length; i++) {
                if (Example.checkBodyOverlap(this.player, this.spikes[i])) {
                    this.playerDie();
                    return;
                }
            }
        }

        // 宝箱开启动画与钥匙消耗
        if (this.lockedChests && this.lockedChests.length && this.hasKey) {
            for (let i = 0; i < this.lockedChests.length; i++) {
                const chest = this.lockedChests[i];
                if (!chest._isOpened && Example.checkBodyOverlap(this.player, chest)) {
                    this.hasKey = false;
                    this.updateInventoryUI();
                    this.openChest(chest);
                    break;
                }
            }
        }
        // 钻石收集判定
        if (this.diamonds && this.diamonds.length) {
            for (let i = 0; i < this.diamonds.length; i++) {
                const diamond = this.diamonds[i];
                if (diamond.visible && Example.checkBodyOverlap(this.player, diamond)) {
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
                if (keySprite.visible && Example.checkBodyOverlap(this.player, keySprite)) {
                    this.collectKey(keySprite);
                    break;
                }
            }
        }

        // 更新物品栏UI（防止UI丢失）
        this.updateInventoryUI();

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