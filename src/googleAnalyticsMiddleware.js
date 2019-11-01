import { SEND_PAGE_VIEW, SEND_EVENT, FALLBACK_PAGEVIEW } from 'react-redux-analytics'
import isBrowser from 'is-in-browser'
import GoogleAnalytics from './GoogleAnalytics'

export default (config) => {
  if (!isBrowser) {
    return () => next => action => next(action)
  }
  const ga = new GoogleAnalytics(config)

  return () => next => (action) => {
    const { type, payload } = action
    switch (type) {
      case SEND_PAGE_VIEW:
        ga.sendPageView({
          location: payload.location,
          variables: payload.variables,
        })
        break
      case SEND_EVENT:
        ga.sendEvent({
          eventName: payload.eventName || 'event',
          variables: payload.variables,
        })
        break
      case FALLBACK_PAGEVIEW:
        ga.sendPageView({
          location: payload.location,
          variables: { ...payload.variables, fallbackPageView: true },
        })
        break
      default:
        break
    }
    return next(action)
  }
}
