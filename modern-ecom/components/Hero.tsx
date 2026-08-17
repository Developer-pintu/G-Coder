import type { FC } from 'react';

const Hero: FC = () => {
  return (
    <section className="bg-gray-900 text-white p-4 mt-4">
      <div className="container mx-auto flex flex-col items-center justify-center h-screen">
        <h1 className="text-5xl font-bold mb-4">Welcome to our E-Commerce Site</h1>
        <p className="text-2xl mb-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet nulla auctor, vestibulum magna sed, convallis ex.</p>
        <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Shop Now</button>
      </div>
    </section>
  );
};

export default Hero;