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
      'go-guru:callers': () => this.callers(),
      'core:cancel': () => this.hidePanel(),
      'core:close': () => this.hidePanel()
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

      if (mode === 'callers') {
        this.element = this.createCallersNode(mode, obj)
      }

      this.modalPanel = atom.workspace.addBottomPanel({
        item: this.element,
        className: 'tool-panel bottom-panel'
      })
    }
  }

  hidePanel() {
      if (this.modalPanel) {
          // just hide it since next invocation will destroy it anyways.
          this.modalPanel.hide()
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

  createRootNode (mode) {
    let root = document.createElement('div')
    root.classList.add('go-guru')
    let spanTitle = document.createElement('span')
    spanTitle.textContent = ('go-guru: ' + mode)
    spanTitle.classList.add('badge')
    spanTitle.classList.add('badge-flexible')
    root.appendChild(spanTitle)
    return root
  }

  createLink (pos, title) {
    if (pos) {
      let objPos = document.createElement('a')
      if (title) {
        objPos.textContent = title
      } else {
        objPos.textContent = 'declared here'
      }
      objPos.addEventListener('click', () => {
        // the position is in the form : fileName:row:col
        // If objpos is undefined, then the location might be in namepos.
        // If both of them are undefined, then the result is of type DescribePackage.
        let infos = pos.split(':')
        if (infos.length === 3) {
          atom.workspace.open(infos[0], {initialLine: Number(infos[1]) - 1, initialColumn: Number(infos[2]) - 1})
        }
      })
      return objPos
    }
  }

  createDescribeNode (mode, jsonObj) {
    let root = this.createRootNode(mode)

    // There are three possible description (package, type and value)
    // returned by the guru tool.

    // Package description doesn't have a type field.
    if (jsonObj[jsonObj.detail].type) {
      let type = document.createElement('span')
      type.textContent = 'type ' + jsonObj[jsonObj.detail].type
      root.appendChild(type)
    }

    // Create the position element.
    if (jsonObj[jsonObj.detail].objpos) {
      root.appendChild(this.createLink(jsonObj[jsonObj.detail].objpos))
    } else if (jsonObj[jsonObj.detail].namepos) {
      root.appendChild(this.createLink(jsonObj[jsonObj.detail].namepos))
    }

    if (jsonObj[jsonObj.detail].path) {
      let path = document.createElement('span')
      path.textContent = 'package ' + jsonObj[jsonObj.detail].path
      root.appendChild(path)
    }

    // A type description contains a field methods.
    let methods = this.createMethodNode(jsonObj[jsonObj.detail].methods)
    if (methods) {
      root.appendChild(methods)
    }

    // A package description contains a field members
    let members = this.createMemberNode(jsonObj[jsonObj.detail].members)
    if (members) {
      root.appendChild(members)
    }

    return root
  }

  createCallersNode (mode, jsonObj) {
    let root = this.createRootNode(mode)
    let list = document.createElement('ul')

    for (let caller of jsonObj) {
      list.appendChild(this.createCallerNode(caller))
    }
    root.appendChild(list)
    return root
  }

  createCallerNode (caller) {
    let item = document.createElement('li')
    let desc = document.createElement('span')
    let name = document.createElement('span')

    desc.textContent = caller.desc
    name.textContent = caller.caller

    item.appendChild(name)
    item.appendChild(desc)
    item.appendChild(this.createLink(caller.pos, 'here'))
    return item
  }

  createMemberNode (members) {
    if (!members) {
      return null
    }

    let root = document.createElement('ul')
    for (let member of members) {
      let memberElement = document.createElement('li')
      let memberName = document.createElement('span')
      let memberKind = document.createElement('span')

      memberKind.textContent = member.kind
      memberElement.appendChild(memberKind)
      memberName.textContent = member.name
      memberElement.appendChild(memberName)

      if (member.kind === 'const') {
        let memberValue = document.createElement('span')
        memberValue.textContent = 'value = ' + member.value
        memberElement.appendChild(memberValue)
      }

      if (member.pos) {
        memberElement.appendChild(this.createLink(member.pos))
      }
      let methods = this.createMethodNode(member.methods)
      if (methods) {
        memberElement.appendChild(methods)
      }
      root.appendChild(memberElement)
    }

    return root
  }

  createMethodNode (methods) {
    if (!methods) {
      return null
    }
    let root = document.createElement('ul')
    for (let method of methods) {
      let methodElement = document.createElement('li')
      let nameElement = document.createElement('span')
      nameElement.textContent = method.name

      let posElement = document.createElement('a')
      posElement.textContent = 'declared here'
      posElement.addEventListener('click', () => {
        if (method.pos) {
          let infos = method.pos.split(':')
          if (infos.length === 3) {
            atom.workspace.open(infos[0], {initialLine: Number(infos[1]) - 1, initialColumn: Number(infos[2]) - 1})
          }
        }
      })
      methodElement.appendChild(nameElement)
      methodElement.appendChild(posElement)
      root.appendChild(methodElement)
    }

    return root
  }
}

export {GuruView}
