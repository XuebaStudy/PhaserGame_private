// 告示牌提示类，负责提示文字的创建和刷新
export class SignTip {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.tipText = null;

        this.create();
    }

    create() {
        this.tipText = this.scene.add.text(this.scene.cameras.main.width / 2, 48, '', {
            fontFamily: 'Arial Narrow',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#000000',
            backgroundColor: '#fffbe6',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
            align: 'center',
        });
        this.tipText.setOrigin(0.5, 0);
        this.tipText.setScrollFactor(0);
        this.tipText.setDepth(this.config.DEPTH.foreground + 10);
        this.tipText.setVisible(false);
    }

    update(text, visible) {
        if (this.tipText) {
            this.tipText.setText(text || '');
            this.tipText.setVisible(!!visible);
        }
    }
}
