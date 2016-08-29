'use babel'

import {GuruView} from './go-guru-view'

export default {
  dependenciesInstalled: null,
  view: null,
  goget: null,
  goconfig: null,

  activate () {
    require('atom-package-deps').install('go-guru').then(() => {
      this.dependenciesInstalled = true
    }).catch((e) => {
      console.log(e)
    })
    this.view = new GuruView(
      () => {
        return this.getGoconfig()
      },
      () => {
        return this.getGoget()
      })
  },

  deactivate () {
    if (this.view) {
      this.view.destroy()
    }
    this.view = null
  },

  getGoget () {
    if (this.goget) {
      return this.goget
    }
    return false
  },
  consumeGoget (service) {
    this.goget = service
  },

  getGoconfig () {
    if (this.goconfig) {
      return this.goconfig
    }
    return false
  },
  consumeGoconfig (service) {
    this.goconfig = service
  }
}
