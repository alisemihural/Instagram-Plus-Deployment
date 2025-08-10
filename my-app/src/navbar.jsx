import { Link, useNavigate } from 'react-router-dom'
import './navbar.css'

const Navbar = ({ isLoggedIn, setIsLoggedIn }) => {
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        setIsLoggedIn(false)
        navigate('/login')
    }

    return (
        <nav className="navbar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '0px 0px 0px 10px' }}>
            <h1>Instagram</h1>
            <ul style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, listStyle: 'none', padding: 0 }}>
                <li><Link to="/">Home</Link></li>

                {isLoggedIn && (
                    <>
                        <li><Link to="/messages">Messages</Link></li>
                        <li><Link to="/post">Post</Link></li>
                        <li><Link to="/profile">Profile</Link></li>
                        <li><Link to="/create">Create</Link></li>
                        <li><Link to="/create_story">Create Story</Link></li>
                    </>
                )}

                {!isLoggedIn && (
                    <>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/signup">Signup</Link></li>
                    </>
                )}
            </ul>

            {isLoggedIn && (
                <div style={{ marginTop: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
                    <Link to="/profile" style={{ fontWeight: 'bold', padding: '0px 0px 10px 10px' }}>
                        Profile
                    </Link>
                    <Link
                        onClick={handleLogout}
                        className="logout-button"
                        style={{ fontWeight: 'bold', padding: '0px 0px 10px 10px' }}
                    >
                        Logout
                    </Link>
                </div>
            )}
        </nav>
    )
}

export default Navbar
