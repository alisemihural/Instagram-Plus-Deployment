import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || ''
        const parts = authHeader.split(' ')
        const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null

        if (!token) return res.status(401).json({ message: 'Unauthorized' })

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.id
        return next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.set(
                'WWW-Authenticate',
                'Bearer error="invalid_token", error_description="The access token expired"'
            )
            return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' })
        }

        return res.status(403).json({ message: 'Forbidden' })
    }
}

export default auth
