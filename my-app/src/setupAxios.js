import axios from 'axios'
import { getToken, clearToken } from './auth/simpleAuth'

// axios.defaults.baseURL = 'http://localhost:5000'

axios.interceptors.request.use(cfg => {
    const t = getToken()
    if (t) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${t}` }
    return cfg
})

axios.interceptors.response.use(
    r => r,
    err => {
        const status = err?.response?.status
        const code = err?.response?.data?.code
        const www = err?.response?.headers?.['www-authenticate'] || ''
        if (status === 401 && (code === 'TOKEN_EXPIRED' || /expired/i.test(www))) {
            clearToken()
            window.location.href = '/login'
            return
        }
        return Promise.reject(err)
    }
)
