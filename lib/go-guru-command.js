'use babel';

import path from 'path';

class GuruCommand {
    constructor(goconfigFunc, gogetFunc) {
        this.goconfig = goconfigFunc;
        this.goget = gogetFunc;
    }

    onCommandComplete(callback) {
        this.complete = callback;
    }

    run(mode) {
        let config = this.goconfig();
        if (!config || !config.executor) {
            this.result = {
                success: false,
                result: null
            };
            return;
        }

        let args = this.computeArgs(mode);
        this.exec(args);
    }

    exec(args) {
        let config = this.goconfig();
        if (!config || !config.executor) {
            return;
        }
        return config.executor.exec('guru', args).then((r) => {
            if (r.error) {
                atom.notifications.addError('Failed to execute guru', {
                    detail: r.message + '\r\n' + r.stderr.trim(),
                    dismissable: true
                });
                this.result = {
                    success: false,
                    result: r
                };

                return false;
            }

            let message = r.stderr.trim() + '\r\n' + r.stdout.trim();
            if (r.exitcode !== 0 || r.stderr && r.stderr.trim() !== '') {
                atom.notifications.addWarning('Guru error', {
                    detail: message.trim(),
                    dismissable: true
                });

                this.result = {
                    success: false,
                    result: r
                };

                return false;
            }
            this.result = {
                success: true,
                result: message.trim()
            };

            this.complete();
            return true;
        });
    }

    computeArgs(mode) {
        filePath = this.getPath();
        pos = this.getPosition();
        start = pos[0];
        end = pos[1];

        // retrieve the atom project root from the current file.
        let relPath = atom.project.relativizePath(filePath);
        let scope = '';
        if (relPath && relPath.length > 0) {
            // Make it relative to GOPATH because guru tool requires it.
            let goconfig = this.goconfig();
            if (goconfig && goconfig.locator) {
                let gopath = goconfig.locator.gopath();
                if (gopath) {
                    scope = path.relative(gopath + '/src', relPath[0]);
                }
            }
        }
        args = ['-json', '-scope', scope, `${mode}`, `${filePath}:#${start},#${end}`];
        return args;
    }

    getPath() {
        editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            return editor.getPath();
        }
        return undefined;
    }

    getPosition() {
        editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            cursor = editor.getLastCursor();
            buffer = editor.getBuffer();

            if (cursor && buffer) {
                wordPosition = cursor.getCurrentWordBufferRange();
                start = buffer.characterIndexForPosition(wordPosition.start);
                end = buffer.characterIndexForPosition(wordPosition.end);
                return [start, end];
            }
        }

        return undefined;
    }
}

export {
    GuruCommand
};
