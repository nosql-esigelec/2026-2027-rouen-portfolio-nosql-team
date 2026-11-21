import { API_URL } from '../config'

// Affichage commun des états "chargement" et "erreur" d'un appel API
export default function ApiState({ state, route, children }) {
  // Pendant un rechargement (ex. changement de filtre), on garde l'affichage précédent
  if (state.loading && !state.data) {
    return (
      <div className="api-state">
        <span className="api-state__spinner" /> Réception du signal… <code>{route}</code>
      </div>
    )
  }
  if (state.error) {
    const offline = !state.error.status
    return (
      <div className="api-state api-state--error">
        <b>{offline ? 'Signal perdu' : `Erreur ${state.error.status}`}</b>
        <span>
          {offline
            ? `Impossible de joindre l'API (${API_URL}). Lance le backend : just up && just seed && just dev`
            : state.error.message}
        </span>
        <code>{route}</code>
      </div>
    )
  }
  return children(state.data)
}
