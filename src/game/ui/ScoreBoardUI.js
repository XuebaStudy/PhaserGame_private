// 分数板UI类，负责分数板的创建和刷新
export class ScoreBoardUI {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.scoreBg = null;
        this.scoreText = null;
    }

    create() {
        const pad = 8;
        const w = 75, h = 32;
        const x = pad;
        const y = pad;
        // 桦木风格底色（偏淡，半透明）
        this.scoreBg = this.scene.add.graphics();
        this.scoreBg.fillStyle(0xF5E9C6, 0.82); // 桦木色（淡黄白）
        this.scoreBg.fillRoundedRect(x, y, w, h, 10);
        // 桦木纹理（横线，淡灰色，半透明）
        for (let i = 0; i < 4; i++) {
            this.scoreBg.lineStyle(1, 0xD8CFC4, 0.55);
            this.scoreBg.beginPath();
            this.scoreBg.moveTo(x + 10, y + 8 + i * 7);
            this.scoreBg.lineTo(x + w - 10, y + 8 + i * 7);
            this.scoreBg.strokePath();
        }
        // 边框（淡棕色，半透明）
        this.scoreBg.lineStyle(3, 0xBCA77B, 0.82);
        this.scoreBg.strokeRoundedRect(x, y, w, h, 10);
        this.scoreBg.setScrollFactor(0);
        this.scoreBg.setDepth(this.config.DEPTH.foreground + 2);
        // 分数文字
        this.scoreText = this.scene.add.text(0, 0, 'Score: 0', {
            fontFamily: 'Arial Narrow',
            fontSize: '16px',
            fontStyle: 'bold',
            color: "#000000",
            align: 'center',
        });
        // 居中分数文字
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(this.config.DEPTH.foreground + 3);
        this.scoreText.setOrigin(0.5, 0.5);
        this.scoreText.x = x + w / 2;
        this.scoreText.y = y + h / 2;
    }

    update(score) {
        if (this.scoreText) {
            this.scoreText.setText('Score: ' + score);
        }
    }
}
