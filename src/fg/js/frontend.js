class ADOHFront {

    constructor() {

        this.point = null;
        this.note = null;
        this.activateKey = 17; // shift 16, ctrl 17, alt 18
        this.enabled = true;
        this.popup = new Popup();
        this.timeout = null;

        window.addEventListener('mousemove', e => this.onMouseMove(e));
        window.addEventListener('mousedown', e => this.onMouseDown(e));
        window.addEventListener('keydown', e => this.onKeyDown(e));

        chrome.runtime.onMessage.addListener(this.onBgMessage.bind(this));
        window.addEventListener('message', e => this.onFrameMessage(e));
        document.addEventListener('selectionchange', e => this.userSelectionChanged(e));
        window.addEventListener('selectionend', e => this.onSelectionEnd(e));
    }

    onKeyDown(e) {
        if (this.enabled && this.point !== null && (e.keyCode === this.activateKey || e.charCode === this.activateKey)) {
            const range = document.caretRangeFromPoint(point.x, point.y);
            if (range !== null) {
                let textSource = new TextSourceRange(range);
                textSource.selectText();
            }
        }
    }

    onMouseDown(e) {
        this.popup.hide();
    }

    onMouseMove(e) {
        this.point = {
            x: e.clientX,
            y: e.clientY,
        };
    }

    userSelectionChanged(e) {

        if (!this.enabled)
            return;

        // wait 500 ms after the last selection change event
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
            var selEndEvent = new CustomEvent("selectionend");
            window.dispatchEvent(selEndEvent);
        }, 500);
    }

    onSelectionEnd(e) {

        if (!this.enabled)
            return;

            // reset selection timeout
        this.timeout = null;

        const selection = window.getSelection();
        const word = (selection.toString() || '').trim();
        if (isInvalid(word)) {
            return;
        };

        let request = {
            action: 'getTranslation',
            params: {
                word
            },
        };
        chrome.runtime.sendMessage(request, defs => {
            if (defs == null)
                return;

            let sent = getSentence();
            this.note = {
                word,
                defs,
                sent,
            };
            let content = this.renderPopup(this.note);
            this.popup.showNextTo({
                x: this.point.x,
                y: this.point.y,
            }, content);
        });

    }

    onBgMessage({
        action,
        params
    }, sender, callback) {
        const method = this['api_' + action];
        if (typeof (method) === 'function') {
            params.callback = callback;
            method.call(this, params);
        }

        callback();
    }

    api_setOptions(params) {
        let {
            options,
            callback
        } = params;

        this.enabled = options.enabled;
        callback();
    }

    onFrameMessage(e) {
        if (e.data == 'createNote') {
            let request = {
                action: 'createNote',
                params: {
                    note: this.note
                },
            };
            chrome.runtime.sendMessage(request, () => {});
        }
        return;
    }

    renderPopup(note) {
        let {
            word,
            defs,
            sent
        } = note;

        let css = chrome.extension.getURL('fg/css/frame.css');
        let js = chrome.extension.getURL('fg/js/frame.js');
        let img = chrome.extension.getURL('fg/img/plus.png');

        var content = `\
        <html lang="zh-CN">\
            <head><meta charset="UTF-8"><title></title>\
                <link rel="stylesheet" href="${css}">\
            </head>\
            <body style="margin:3px;">\
            <div class="abkl-content">\
                <div class="abkl-sect abkl-word">${word}<span class="abkl-createnote"><img src="${img}"/></span></div>\
                <div class="abkl-sect abkl-defs">${defs}</div>\
                <div class="abkl-sect abkl-sent">${sent}</div>\
            </div>\
            <script src="${js}"></script>\
            </body>\
        </html>`;
        return content;
    }

}

window.adohfront = new ADOHFront();