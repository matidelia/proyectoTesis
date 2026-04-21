/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface CatalogProduct {
  id: string;
  name: string;
  pictures?: { url: string }[];
  permalink?: string;
}

interface ProductCardProps {
  product: CatalogProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Use the first picture or a placeholder
  const imageUrl = product.pictures && product.pictures.length > 0 
    ? product.pictures[0].url.replace('http://', 'https://') 
    : 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__large_plus.png';
  
  // As this is a generic catalog product, there is no direct permalink to buy it in the API response,
  // but we can direct them to search for this product ID on the site.
  const productLink = `https://listado.mercadolibre.com.ar/${product.id}`;

  return (
    <a href={productLink} target="_blank" rel="noopener noreferrer" className="product-card">
      <div className="product-image-container">
        <img src={imageUrl} alt={product.name} className="product-image" loading="lazy" />
      </div>
      <div className="product-info">
        <h2 className="product-title" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          {product.name}
        </h2>
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <span style={{
            display: 'inline-block',
            background: 'var(--accent-primary)',
            color: '#000',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            Ver catálogo
          </span>
        </div>
      </div>
    </a>
  );
}
