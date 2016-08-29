'use babel'

import {CompositeDisposable} from 'atom'
import {GuruCommand} from './go-guru-command'

class GuruView {
  constructor (goconfigFunc, gogetFunc) {
    this.goconfig = goconfigFunc
    this.goget = gogetFunc

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'go-guru:describe': () => this.describe(),
      'go-guru:callers': () => this.callers()
    }))

    this.element = document.createElement('div')
    this.element.classList.add('go-guru')

    this.guruCommand = new GuruCommand(
      () => {
        return this.goconfig()
      },
      () => {
        return this.goget()
      })
    this.guruCommand.onCommandComplete(() => {
      this.onComplete()
    })
  }

  destroy () {
    this.modalPanel.destroy()
    this.subscriptions.dispose()
  }

  describe () {
    if (!this.checkTool()) {
      return
    }
    this.guruCommand.run('describe')
  }

  callers () {
    if (!this.checkTool()) {
      return
    }
    this.guruCommand.run('callers')
  }

  onComplete () {
    let result = this.guruCommand.result
    if (this.modalPanel) {
      this.modalPanel.destroy()
    }
    if (result.success) {
      this.element.textContent = result.result
      this.modalPanel = atom.workspace.addBottomPanel({
        item: this.element
      })
    }
  }

  checkTool () {
    let config = this.goconfig()
    if (!config || !config.locator) {
      return false
    }
    return config.locator.findTool('guru').then((cmd) => {
      if (!cmd) {
        let goget = this.goget()
        if (!goget) {
          return false
        }

        goget.get({
          name: 'go-guru',
          packageName: 'guru',
          packagePath: 'golang.org/x/tools/cmd/guru',
          type: 'missing'
        }).then((r) => {
          if (!r.success) {
            return false
          }

          return true
        })
      }
    })
  }
}

export {GuruView}
