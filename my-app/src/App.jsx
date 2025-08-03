import { useState } from 'react';
import Navbar from "./navbar.jsx";
import Home from "./home.jsx"
import { BrowserRouter, Routes, Route } from "react-router";

function App() {
  return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />}/>
            </Routes>
        </BrowserRouter>
  )
}

export default App
