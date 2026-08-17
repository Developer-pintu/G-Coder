import type { NextPage } from 'next';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';

const Home: NextPage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <ProductGrid />
    </>
  );
};

export default Home;