import { Link } from 'react-router-dom';
import './navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h1>Instagram</h1>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/messages">Messages</Link></li>
        <li><Link to="/post">Post</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/login">Login</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
