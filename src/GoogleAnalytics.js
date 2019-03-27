import isBrowser from 'is-in-browser'
import * as reactGA from 'react-ga'

/**
 *  Google Analytics Javascript SDK wrapper
 */
export default class GoogleAnalytics {
  constructor(config = {}) {
    if (!isBrowser) {
      return
    }
    this.reactGA = reactGA
    this.reactGA.initialize(config.ga)
  }

  sendPageView({ location, variables }) {
    try {
      if (location != null) {
        this.reactGA.set({ page: location.pathname + location.search })
      }
      this.reactGA.set({ title: variables.title })
      this.reactGA.ga('send', 'pageview')
    } catch (e) {
      throw e
    }
  }

  sendEvent({ eventName, variables }) {
    try {
      this.reactGA[eventName](variables)
    } catch (e) {
      throw e
    }
  }
}
