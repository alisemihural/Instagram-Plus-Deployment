const KEY = 'token'
let timer = null

export const getToken = () => localStorage.getItem(KEY) || ''

export const clearToken = () => {
    localStorage.removeItem(KEY)
    if (timer) clearTimeout(timer)
    timer = null
}

const getExpMs = token => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload?.exp ? payload.exp * 1000 : 0
    } catch {
        return 0
    }
}

const startTimerFromToken = token => {
    if (timer) clearTimeout(timer)
    const exp = getExpMs(token)
    if (!exp) return
    const ms = Math.max(0, exp - Date.now())
    timer = setTimeout(() => {
        clearToken()
        window.location.href = '/login'
    }, ms)
}

export const setToken = token => {
    localStorage.setItem(KEY, token)
    startTimerFromToken(token)
}

export const initAuth = () => {
    const t = getToken()
    if (!t) return
    const exp = getExpMs(t)
    if (!exp || Date.now() >= exp) {
        clearToken()
        window.location.href = '/login'
    } else {
        startTimerFromToken(t)
    }
}
