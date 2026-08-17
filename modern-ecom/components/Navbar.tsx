import React from 'react';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 bg-opacity-50 backdrop-blur-sm z-10">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Ecommerce Website</h1>
        <ul className="flex items-center space-x-4">
          <li className="hover:scale-110 transition-all duration-200"><a href="#" className="text-white">Home</a></li>
          <li className="hover:scale-110 transition-all duration-200"><a href="#" className="text-white">Products</a></li>
          <li className="hover:scale-110 transition-all duration-200"><a href="#" className="text-white">About</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;