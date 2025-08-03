import React from "react";
import "./navbar.css";

const Navbar = () => {
    return (
        <nav className="navbar">
            <h1>Instagram</h1>
            <ul>
                <li>Home</li>
                <li>Messages</li>
                <li>Post</li>
                <li>Profile</li>
            </ul>
        </nav>
    );
};

export default Navbar;