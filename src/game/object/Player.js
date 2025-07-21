import Phaser from 'phaser';

// 玩家类，继承自Phaser.Physics.Arcade.Sprite
export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, config) {
        super(scene, config.PLAYER_SPAWN.x, config.PLAYER_SPAWN.y, 'characters', 0);
        this.scene = scene;
        this.config = config;
        this._isDying = false;
        scene.physics.add.existing(this);
        this.setFlipX(true);
        this.setDepth(config.DEPTH.player);
        this.body.setSize(20, 22, true);
    }

    die(spawn) {
        if (this._isDying) return;
        this._isDying = true;
        this.setVelocity(0, 0);
        this.body.enable = false;
        let flashCount = 0;
        const maxFlash = 8;
        // 容错处理，spawn为undefined时使用初始出生点
        let spawnPos;
        if (spawn && typeof spawn.x === 'number' && typeof spawn.y === 'number') {
            spawnPos = { x: spawn.x, y: spawn.y };
        } else if (this.config && this.config.PLAYER_SPAWN) {
            spawnPos = { x: this.config.PLAYER_SPAWN.x, y: this.config.PLAYER_SPAWN.y };
        } else {
            spawnPos = { x: 0, y: 0 };
        }
        const flash = () => {
            if (!this) return;
            if (flashCount % 2 === 0) {
                this.setTint(0xffffff);
                this.setAlpha(1);
            } else {
                this.setTint(0x000000);
                this.setAlpha(0.3);
            }
            flashCount++;
            if (flashCount < maxFlash) {
                this.scene.time.delayedCall(70, flash);
            } else {
                this.clearTint();
                this.setAlpha(1);
                this.setPosition(spawnPos.x, spawnPos.y);
                this.body.enable = true;
                this._isDying = false;
            }
        };
        flash();
    }

    updateControls(wasdKeys, colliders, layers) {
        this.body.allowGravity = true;

        // 地面状态
        const isOnGround = this.body.touching.down;
        const isBlocked = this.body.blocked.down;

        // 下穿平台（S键）
        if (colliders.playerPlatform) {
            if (wasdKeys.S.isDown && (isOnGround || isBlocked)) {
                colliders.playerPlatform.active = false;
                this._dropFromPlatform = true;
                this.setVelocityY(150);
            }
            if (this._dropFromPlatform) {
                const tile = layers.platform.getTileAtWorldXY(this.x, this.y + this.body.height / 2);
                if (!tile || !tile.properties.isUpSolid) {
                    colliders.playerPlatform.active = true;
                    this._dropFromPlatform = false;
                }
            }
        }

        // 跳跃控制（W键）
        if (wasdKeys.W.isDown) {
            if (isOnGround || isBlocked) {
                this.setVelocityY(-200);
            }
        }

        // 人物左右移动控制（AD键）
        const accel = 800;
        const maxSpeed = 160;
        if (wasdKeys.A.isDown) {
            this.setAccelerationX(-accel);
            this.setFlipX(false);
        } else if (wasdKeys.D.isDown) {
            this.setAccelerationX(accel);
            this.setFlipX(true);
        } else {
            this.setAccelerationX(0);
            if (Math.abs(this.body.velocity.x) < 5) {
                this.setVelocityX(0);
            } else {
                this.setVelocityX(this.body.velocity.x * 0.85);
            }
        }
        if (this.body.velocity.x > maxSpeed) this.setVelocityX(maxSpeed);
        if (this.body.velocity.x < -maxSpeed) this.setVelocityX(-maxSpeed);

        // 动画控制
        const isGrounded = isOnGround || isBlocked;
        if (!isGrounded) {
            this.anims.play('jump', true);
        }
        else if (wasdKeys.A.isDown || wasdKeys.D.isDown) {
            this.anims.play('walk', true);
        }
        else {
            this.anims.play('idle', true);
        }
    }
}
