import React from 'react';

const Hero = () => {
  return (
    <section className="h-screen bg-gray-900">
      <div className="container mx-auto p-4 pt-6 md:p-6 lg:p-12 xl:p-24">
        <h1 className="text-5xl font-bold text-white mb-4">Welcome to our Ecommerce Website</h1>
        <p className="text-xl text-gray-300 mb-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet nulla auctor, vestibulum magna sed, convallis ex.</p>
        <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Shop Now</button>
      </div>
    </section>
  );
};

export default Hero;