import React from 'react';

const ProductGrid = () => {
  return (
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto p-4 pt-6 md:p-6 lg:p-12 xl:p-24">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Products</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md">
            <img src="https://via.placeholder.com/150" alt="Product 1" className="w-full h-48 object-cover"/>
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900">Product 1</h2>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Buy Now</button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md">
            <img src="https://via.placeholder.com/150" alt="Product 2" className="w-full h-48 object-cover"/>
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900">Product 2</h2>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Buy Now</button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md">
            <img src="https://via.placeholder.com/150" alt="Product 3" className="w-full h-48 object-cover"/>
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900">Product 3</h2>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Buy Now</button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md">
            <img src="https://via.placeholder.com/150" alt="Product 4" className="w-full h-48 object-cover"/>
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900">Product 4</h2>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              <button className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Buy Now</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;