/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  shipping: {
    free_shipping: boolean;
  };
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Replace HTTP with HTTPS for thumbnails
  const imageUrl = product.thumbnail.replace('http://', 'https://');
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('es-AR').format(product.price);

  return (
    <a href={product.permalink} target="_blank" rel="noopener noreferrer" className="product-card">
      <div className="product-image-container">
        <img src={imageUrl} alt={product.title} className="product-image" loading="lazy" />
      </div>
      <div className="product-info">
        <h2 className="product-title">{product.title}</h2>
        <div className="product-price">
          <span className="product-currency">$</span>
          <span>{formattedPrice}</span>
        </div>
        {product.shipping.free_shipping && (
          <div className="product-shipping">Envío gratis</div>
        )}
      </div>
    </a>
  );
}
