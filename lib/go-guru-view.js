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

    this.element = document.createElement('go-guru-panel')
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
    let mode = this.guruCommand.mode
    let obj = JSON.parse(result.result)
    if (this.modalPanel) {
      this.modalPanel.destroy()
    }
    if (result.success) {
      if (mode === 'describe') {
        this.element = this.createDescribeNode(mode, obj)
      }

      this.modalPanel = atom.workspace.addBottomPanel({
        item: this.element,
        className: 'tool-panel bottom-panel'
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

  createDescribeNode (mode, jsonObj) {
    let root = document.createElement('div')
    root.classList.add('go-guru')
    let spanTitle = document.createElement('span')
    spanTitle.textContent = ('go-guru: ' + mode)
    spanTitle.classList.add('badge')
    spanTitle.classList.add('badge-flexible')
    root.appendChild(spanTitle)

    let objPos = document.createElement('a')
    let infoPos = document.createElement('span')
    objPos.textContent = 'declared here'
    objPos.addEventListener('click', () => {
      // the position is in the form : fileName:row:col
      let infos = jsonObj[jsonObj.detail].objpos.split(':')
      if (infos.length === 3) {
        let fileName = infos[0]
        let line = Number(infos[1]) - 1
        let col = Number(infos[2]) - 1
        atom.workspace.open(fileName, {initialLine: line, initialColumn: col})
      }
    })
    objPos.appendChild(infoPos)

    root.appendChild(objPos)
    return root
  }
}

export {GuruView}
