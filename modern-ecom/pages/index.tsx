import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';

const Home = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      <ProductGrid />
    </div>
  );
};

export default Home;