/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface ProductData {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  permalink: string;
  isCatalog?: boolean;
}

interface ProductCardProps {
  product: ProductData;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.imageUrl || 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__large_plus.png';
  
  return (
    <a href={product.permalink} target="_blank" rel="noopener noreferrer" className="product-card">
      <div className="product-image-container">
        <img src={imageUrl} alt={product.name} className="product-image" loading="lazy" />
      </div>
      <div className="product-info">
        <h2 className="product-title" style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {product.name}
        </h2>
        
        <div style={{ marginTop: 'auto' }}>
          {product.price > 0 && (
            <div className="product-price" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', verticalAlign: 'top', marginRight: '2px' }}>$</span>
              {product.price.toLocaleString('es-AR')}
            </div>
          )}
          
          <span style={{
            display: 'inline-block',
            background: product.isCatalog ? 'var(--accent-primary)' : '#3483fa',
            color: product.isCatalog ? '#000' : '#fff',
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            width: '100%',
            textAlign: 'center'
          }}>
            {product.isCatalog ? 'Ver catálogo' : 'Ver producto'}
          </span>
        </div>
      </div>
    </a>
  );
}

