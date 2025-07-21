// 告示牌提示文字UI类，负责提示文字的创建和显示
export class SignTipUI {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.signTipText = null;
    }

    create() {
        this.signTipText = this.scene.add.text(this.scene.cameras.main.width / 2, 48, '', {
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
        this.signTipText.setDepth(this.config.DEPTH.foreground + 10);
        this.signTipText.setVisible(false);
    }

    show(text) {
        if (this.signTipText) {
            this.signTipText.setText(text || '');
            this.signTipText.setVisible(true);
        }
    }

    hide() {
        if (this.signTipText) {
            this.signTipText.setVisible(false);
        }
    }
}
