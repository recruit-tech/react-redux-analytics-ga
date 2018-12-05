import debugFactory from 'debug'
import isBrowser from 'is-in-browser';
import { pickBy } from 'lodash/fp'
import defaultConfig from './default.config.js'
import { composeLocationString } from './utils'
import * as reactGA from 'react-ga'
import { 
  configKeyGa,
  debugNamespace,
  errorNamespace,
  TYPE_EVENT,
  TYPE_PAGEVIEW,
} from './const'

const debug = debugFactory(debugNamespace)
const error = debugFactory(errorNamespace)

/**
 *  Google Analytics Javascript SDK wrapper
 */
 export default class GoogleAnalytics {
  constructor({
    config = {},
  }) {
    if(!isBrowser){
      error('react-ga cannot be used outside browser!')
      return
    }
    //state initialization
    this.isFirstPageView = true

    //config
    this.config = this.mergeConfig(defaultConfig, config)
    this.debugLogConfig()

    //instantiate react-ga
    const gaConfig = this.config[configKeyGa]
    this.reactGA = reactGA;
    this.reactGA.initialize(gaConfig);
    debug('initialized react-ga with following config')
    debug(gaConfig)

    //helpers
    this.composeLocation = this.config.urlFormat ? 
      composeLocationString(this.config.urlFormat) : (location) => location
  }

  //protected:
  mergeConfig(defaultConfig, config = {}) {
    return {
      ...defaultConfig,
      ...config,
      [configKeyGa]: {
        ...defaultConfig[configKeyGa],
        ...config[configKeyGa],
      },
    }
  }

  //called only once when entered the site
  firstPage({ location }) {
    //document.referrer is correct only at the first page
    this.location = {
      current: location,
      referrer: document.referrer,
    }
    this.isFirstPageView = false
  }

  //called when the (virtual) page is moved
  pageChanged({ location = null }) {
    //referrer has to be set manually with SPA
    this.location.referrer = this.location.current
    this.location.current = location || this.location.current
  }
  
  //protected:
  debugLogConfig(){
    this.config.dryRun && debug(`***** working in dry-run mode (track will not be sent) *****`)
    debug(`page view track will be recored in '${this.config.pageViewTable}' table`)
    debug(`event track will be recored in '${this.config.eventTable}' table`)
    debug(`falsy values in variables will ${this.config.sendFalsyValues ? 'be sent' : 'be omitted'}`)
    debug(`track type will be set to '${this.config.trackTypeKey}' key`)
    this.config.sendReferrer && debug(`referrer will be set to '${this.config.referrerKey}' key`)
    this.config.sendLocation && debug(`location will be set to '${this.config.locationKey}' key`)
    debug(`eventName will be set to '${this.config.eventNameKey}' key`)
    this.config.urlFormat && debug(`location and referrer will be formatted. rule: ${JSON.stringify(this.config.urlFormat)}`)
    debug(`config set: ${JSON.stringify(this.config)}`)
  }

  async sendPageView({location, variables}){
    if (this.isFirstPageView) {
      this.firstPage({location})
    }else{
      this.pageChanged({location})
    }
    const composedVars = this.composeVariables({ variables, type: TYPE_PAGEVIEW})
    try {
      if (location != null) {
        this.reactGA.set({ page: location.pathname + location.search })
      }
      this.reactGA.ga('send', 'pageview');
      debug(`${this.config.dryRun ? '(dry-run)': '(tracked)'} pageview: ${JSON.stringify(composedVars)}`)
    }catch(e){
      error(`failed to send event track to the server: ${JSON.stringify(e)}`)
      throw e
    }
  }

  async sendEvent({ variables, eventName }){
    const composedVars = this.composeVariables({ variables, eventName, type: TYPE_EVENT })
    try{
      this.ga('send', 'event', composedVars) //FIXME
      debug(`${this.config.dryRun ? '(dry-run)': '(tracked)'} event(${eventName}): ${JSON.stringify(composedVars)}`)
    }catch(e){
      error(`failed to send event track to the server: ${JSON.stringify(e)}`)
      throw e
    }
  }

  //protected:
  getTableName(type){
    if(type === TYPE_PAGEVIEW){
      return this.config.pageViewTable
    }
    if(type === TYPE_EVENT){
      return this.config.eventTable
    }
    return null
  }

  //protected:
  composeVariables({ variables, eventName, type }) {
    const composed = { ...variables } 
    composed[this.config.trackTypeKey] = type
    if(type === TYPE_PAGEVIEW){
      if(this.config.sendReferrer){
        composed[this.config.referrerKey] = this.composeLocation(this.location.referrer)
      }
      if(this.config.sendLocation){
        composed[this.config.locationKey] = this.composeLocation(this.location.current)
      }
    }
    if(eventName){
      composed[this.config.eventNameKey] = eventName
    }
    return this.config.sendFalsyValues ? composed : pickBy(Boolean)(composed)
  }
}
